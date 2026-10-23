import {
  createGraphEditorSpatialIndex,
  type GraphEditorBounds,
  type GraphEditorSpatialIndex,
} from "../../core";
import type { GraphCanvasNodeData } from "./index-core";

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
  const rendered = new Set(index.query(visibleBounds, { overscan }));
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
 */
export function createGraphCanvasNodeIndexTracker(
  getNodeBounds: (node: GraphCanvasNodeData) => GraphEditorBounds,
  hiddenNodeIds: readonly string[],
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
