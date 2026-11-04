import {
  createGraphEditorSpatialIndex,
  type GraphEditorBounds,
  type GraphEditorDocument,
  type GraphEditorSpatialIndex,
} from "../../core";
import type { GraphCanvasEdge, GraphCanvasNodeData } from "./index-core";

/** Node count above which automatic virtualization starts culling off-screen nodes. */
export const graphCanvasVirtualizationDefaultThreshold = 500;
/** Default extra margin, in screen pixels, rendered around the visible viewport. */
export const graphCanvasVirtualizationDefaultOverscan = 400;

export type GraphCanvasVirtualizationOptions = {
  /** Culling activates only when the node count exceeds this value. Defaults to 500. */
  threshold?: number;
  /** Screen-pixel margin rendered around the visible area. Defaults to 400. */
  overscan?: number;
};

/**
 * `true`/omitted: automatic (cull above the default threshold). `false`: never cull. An object
 * keeps automatic behavior with a custom threshold and/or overscan.
 */
export type GraphCanvasVirtualization = boolean | GraphCanvasVirtualizationOptions;

export type GraphCanvasResolvedVirtualization = {
  enabled: boolean;
  threshold: number;
  overscan: number;
};

export function resolveGraphCanvasVirtualization(
  virtualization: GraphCanvasVirtualization | undefined,
): GraphCanvasResolvedVirtualization {
  if (virtualization === false) {
    return {
      enabled: false,
      threshold: graphCanvasVirtualizationDefaultThreshold,
      overscan: graphCanvasVirtualizationDefaultOverscan,
    };
  }
  const options = typeof virtualization === "object" ? virtualization : {};
  return {
    enabled: true,
    threshold: finiteNonNegative(options.threshold, graphCanvasVirtualizationDefaultThreshold),
    overscan: finiteNonNegative(options.overscan, graphCanvasVirtualizationDefaultOverscan),
  };
}

/** Screen-space viewport of the canvas surface. */
export type GraphCanvasVisibleArea = {
  /** Viewport translation and zoom applied to graph content. */
  viewport: { x: number; y: number; zoom: number };
  /** Surface scroll offset in screen pixels. */
  scrollLeft: number;
  scrollTop: number;
  /** Surface client size in screen pixels; non-positive sizes disable culling. */
  width: number;
  height: number;
};

/** Converts the visible surface area into graph-space bounds. */
export function getGraphCanvasVisibleGraphBounds(
  area: GraphCanvasVisibleArea,
): GraphEditorBounds | null {
  const zoom = area.viewport.zoom;
  if (!(area.width > 0) || !(area.height > 0) || !(zoom > 0) || !Number.isFinite(zoom)) {
    return null;
  }
  return {
    x: (area.scrollLeft - area.viewport.x) / zoom,
    y: (area.scrollTop - area.viewport.y) / zoom,
    width: area.width / zoom,
    height: area.height / zoom,
  };
}

/** Deterministic work counters for one render plan. */
export type GraphCanvasRenderPlanStats = {
  /** Visible (non-hidden) nodes in the document. */
  totalNodes: number;
  /** Nodes whose bounds were tested to build the plan. */
  nodesConsidered: number;
  /** Nodes the plan renders, including pinned nodes. */
  nodesRendered: number;
  /** Pinned nodes that were rendered only because they are pinned. */
  pinnedOutsideViewport: number;
};

export type GraphCanvasRenderPlan = {
  /** False when every node renders (small documents, virtualization off, unmeasured surface). */
  culling: boolean;
  /** Rendered node ids; `null` means all nodes render. */
  renderedNodeIds: ReadonlySet<string> | null;
  /** Graph-space bounds used for culling, including overscan; `null` when not culling. */
  queryBounds: GraphEditorBounds | null;
  stats: GraphCanvasRenderPlanStats;
};

export type GraphCanvasRenderPlanInput = {
  nodes: readonly GraphCanvasNodeData[];
  hiddenNodeIds: ReadonlySet<string>;
  /** Retained index over the same nodes; required for culling. */
  index: Pick<GraphEditorSpatialIndex, "query" | "getStats"> | null;
  visibleBounds: GraphEditorBounds | null;
  zoom: number;
  virtualization: GraphCanvasResolvedVirtualization;
  /** Nodes that must render regardless of the viewport (focus, drag, connection, keyboard). */
  pinnedNodeIds: Iterable<string>;
};

export function shouldGraphCanvasCullNodes(
  nodeCount: number,
  virtualization: GraphCanvasResolvedVirtualization,
) {
  return virtualization.enabled && nodeCount > virtualization.threshold;
}

/**
 * Plans which nodes GraphCanvas renders. Below the threshold (or when virtualization is off or
 * the surface is unmeasured) every node renders, exactly as without virtualization.
 */
export function planGraphCanvasNodeRender({
  nodes,
  hiddenNodeIds,
  index,
  visibleBounds,
  zoom,
  virtualization,
  pinnedNodeIds,
}: GraphCanvasRenderPlanInput): GraphCanvasRenderPlan {
  const totalNodes = countVisibleNodes(nodes, hiddenNodeIds);
  if (!shouldGraphCanvasCullNodes(nodes.length, virtualization) || !index || !visibleBounds) {
    return {
      culling: false,
      renderedNodeIds: null,
      queryBounds: null,
      stats: {
        totalNodes,
        nodesConsidered: totalNodes,
        nodesRendered: totalNodes,
        pinnedOutsideViewport: 0,
      },
    };
  }

  const overscan = zoom > 0 ? virtualization.overscan / zoom : 0;
  const before = index.getStats().candidateVisits;
  const rendered = new Set<string>();
  for (const nodeId of index.query(visibleBounds, { overscan })) {
    // The canvas index also serves interactions (snapping includes hidden nodes), so it may hold
    // hidden nodes; they never render.
    if (!hiddenNodeIds.has(nodeId)) {
      rendered.add(nodeId);
    }
  }
  const nodesConsidered = index.getStats().candidateVisits - before;
  let pinnedOutsideViewport = 0;
  const knownNodeIds = new Set<string>();
  for (const pinnedId of pinnedNodeIds) {
    knownNodeIds.add(pinnedId);
  }
  for (const node of nodes) {
    if (knownNodeIds.has(node.id) && !hiddenNodeIds.has(node.id) && !rendered.has(node.id)) {
      rendered.add(node.id);
      pinnedOutsideViewport += 1;
    }
  }

  return {
    culling: true,
    renderedNodeIds: rendered,
    queryBounds: {
      x: visibleBounds.x - overscan,
      y: visibleBounds.y - overscan,
      width: visibleBounds.width + overscan * 2,
      height: visibleBounds.height + overscan * 2,
    },
    stats: {
      totalNodes,
      nodesConsidered,
      nodesRendered: rendered.size,
      pinnedOutsideViewport,
    },
  };
}

/**
 * Keeps one retained spatial index in sync with successive node arrays. Geometry-only changes
 * (same ids in the same order) update just the changed nodes; anything else rebuilds.
 * `hiddenNodeIds` defaults to none: GraphCanvas indexes every node and filters hidden ones per
 * query, because drag snapping also targets hidden nodes.
 */
export function createGraphCanvasNodeIndexTracker(
  getNodeBounds: (node: GraphCanvasNodeData) => GraphEditorBounds,
  hiddenNodeIds: readonly string[] = [],
) {
  let index: GraphEditorSpatialIndex | null = null;
  let indexedNodes: readonly GraphCanvasNodeData[] | null = null;

  return {
    sync(nodes: readonly GraphCanvasNodeData[]) {
      const document = { nodes: nodes as GraphCanvasNodeData[], edges: [] };
      if (!index || !indexedNodes) {
        index = createGraphEditorSpatialIndex(document, { getNodeBounds, hiddenNodeIds });
      } else if (indexedNodes !== nodes) {
        const previous = indexedNodes;
        const changed =
          previous.length === nodes.length
            ? nodes.flatMap((node, order) => (previous[order] === node ? [] : [node.id]))
            : null;
        if (changed === null) {
          index.rebuild(document);
        } else if (changed.length > 0) {
          index.updateNodes(document, changed);
        }
      }
      indexedNodes = nodes;
      return index;
    },
  };
}

/** Graph-space margin around an edge curve: half the 16px hit stroke. */
export const graphCanvasEdgeCurveMargin = 8;

/**
 * Bounds of the cubic curve GraphCanvas draws between two port points: the convex hull of its
 * control points, expanded by `graphCanvasEdgeCurveMargin`. Every point of the rendered edge and
 * its hit stroke lies inside.
 */
export function getGraphCanvasEdgeCurveBounds(
  source: { x: number; y: number },
  target: { x: number; y: number },
): GraphEditorBounds {
  const handle = Math.max(48, Math.abs(target.x - source.x) / 2);
  const minX = Math.min(source.x, target.x - handle) - graphCanvasEdgeCurveMargin;
  const maxX = Math.max(source.x + handle, target.x) + graphCanvasEdgeCurveMargin;
  const minY = Math.min(source.y, target.y) - graphCanvasEdgeCurveMargin;
  const maxY = Math.max(source.y, target.y) + graphCanvasEdgeCurveMargin;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Deterministic work counters for one edge render plan. */
export type GraphCanvasEdgeRenderPlanStats = {
  /** Visible (non-hidden) edges. */
  totalEdges: number;
  /** Edges whose curve bounds were tested to build the plan. */
  edgesConsidered: number;
  /** Edges the plan renders, i.e. edges whose geometry GraphCanvas generates. */
  edgesRendered: number;
  /** Pinned edges rendered only because they are pinned. */
  pinnedOutsideViewport: number;
};

export type GraphCanvasEdgeRenderPlan = {
  /** False when every visible edge renders. */
  culling: boolean;
  /** Rendered edge ids; `null` means all visible edges render. */
  renderedEdgeIds: ReadonlySet<string> | null;
  stats: GraphCanvasEdgeRenderPlanStats;
};

export type GraphCanvasEdgeRenderPlanInput = {
  /** Visible edges, i.e. without hidden edges. */
  edges: readonly Pick<GraphCanvasEdge, "id">[];
  /** Retained index over the same edges' curve bounds; required for culling. */
  index: Pick<GraphEditorSpatialIndex, "query" | "getStats"> | null;
  /** Culling bounds of the node render plan (`queryBounds`); `null` renders every edge. */
  queryBounds: GraphEditorBounds | null;
  /** Edges that must render regardless of the viewport (selected, hovered, rewired). */
  pinnedEdgeIds: Iterable<string>;
};

/**
 * Plans which edges GraphCanvas renders. Edge culling follows node culling: when the node plan
 * culls, only edges whose curve bounds intersect its culling bounds render (including edges whose
 * endpoints are both culled but whose curve crosses the viewport), plus pinned edges. Otherwise
 * every visible edge renders.
 */
export function planGraphCanvasEdgeRender({
  edges,
  index,
  queryBounds,
  pinnedEdgeIds,
}: GraphCanvasEdgeRenderPlanInput): GraphCanvasEdgeRenderPlan {
  const totalEdges = edges.length;
  if (!index || !queryBounds) {
    return {
      culling: false,
      renderedEdgeIds: null,
      stats: {
        totalEdges,
        edgesConsidered: totalEdges,
        edgesRendered: totalEdges,
        pinnedOutsideViewport: 0,
      },
    };
  }
  const before = index.getStats().candidateVisits;
  const rendered = new Set(index.query(queryBounds));
  const edgesConsidered = index.getStats().candidateVisits - before;
  const pinned = new Set(pinnedEdgeIds);
  let pinnedOutsideViewport = 0;
  if (pinned.size > 0) {
    for (const edge of edges) {
      if (pinned.has(edge.id) && !rendered.has(edge.id)) {
        rendered.add(edge.id);
        pinnedOutsideViewport += 1;
      }
    }
  }
  return {
    culling: true,
    renderedEdgeIds: rendered,
    stats: {
      totalEdges,
      edgesConsidered,
      edgesRendered: rendered.size,
      pinnedOutsideViewport,
    },
  };
}

/**
 * Keeps a retained spatial index over edge curve bounds in sync with successive edge and node
 * arrays. A new edge array rebuilds; node geometry changes (same node ids in the same order)
 * update only edges incident to the changed nodes; any other node change rebuilds.
 */
export function createGraphCanvasEdgeIndexTracker(
  getEdgeBounds: (edge: GraphCanvasEdge) => GraphEditorBounds,
) {
  let index: GraphEditorSpatialIndex | null = null;
  let indexedEdges: readonly GraphCanvasEdge[] | null = null;
  let indexedNodes: readonly GraphCanvasNodeData[] | null = null;
  let incidentEdgeIds = new Map<string, string[]>();
  // The index is node-shaped; edges stand in for nodes and only their ids are read directly.
  const asDocument = (edges: readonly GraphCanvasEdge[]) =>
    ({ nodes: edges, edges: [] }) as unknown as GraphEditorDocument;
  const options = {
    getNodeBounds: (edge: unknown) => getEdgeBounds(edge as GraphCanvasEdge),
  };

  function indexIncidence(edges: readonly GraphCanvasEdge[]) {
    incidentEdgeIds = new Map();
    for (const edge of edges) {
      for (const nodeId of [edge.sourceNodeId, edge.targetNodeId]) {
        const ids = incidentEdgeIds.get(nodeId);
        if (ids) {
          if (ids.at(-1) !== edge.id) ids.push(edge.id);
        } else {
          incidentEdgeIds.set(nodeId, [edge.id]);
        }
      }
    }
  }

  return {
    sync(edges: readonly GraphCanvasEdge[], nodes: readonly GraphCanvasNodeData[]) {
      if (!index) {
        index = createGraphEditorSpatialIndex(asDocument(edges), options);
        indexIncidence(edges);
      } else if (indexedEdges !== edges) {
        index.rebuild(asDocument(edges));
        indexIncidence(edges);
      } else if (indexedNodes !== nodes) {
        const previous = indexedNodes!;
        let changedEdgeIds: Set<string> | null = new Set();
        if (previous.length !== nodes.length) {
          changedEdgeIds = null;
        } else {
          for (let order = 0; order < nodes.length; order += 1) {
            const node = nodes[order]!;
            if (previous[order] === node) {
              continue;
            }
            if (previous[order]!.id !== node.id) {
              changedEdgeIds = null;
              break;
            }
            for (const edgeId of incidentEdgeIds.get(node.id) ?? []) {
              changedEdgeIds.add(edgeId);
            }
          }
        }
        if (changedEdgeIds === null) {
          index.rebuild(asDocument(edges));
        } else if (changedEdgeIds.size > 0) {
          index.updateNodes(asDocument(edges), [...changedEdgeIds]);
        }
      }
      indexedEdges = edges;
      indexedNodes = nodes;
      return index;
    },
  };
}

function countVisibleNodes(
  nodes: readonly GraphCanvasNodeData[],
  hiddenNodeIds: ReadonlySet<string>,
) {
  if (hiddenNodeIds.size === 0) {
    return nodes.length;
  }
  let count = 0;
  for (const node of nodes) {
    if (!hiddenNodeIds.has(node.id)) {
      count += 1;
    }
  }
  return count;
}

function finiteNonNegative(value: number | undefined, fallback: number) {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function boundsIntersect(a: GraphEditorBounds, b: GraphEditorBounds) {
  return (
    a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y
  );
}
