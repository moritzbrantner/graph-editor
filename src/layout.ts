import { graphlib, layout } from "@dagrejs/dagre";

import {
  detectGraphEditorCycles,
  normalizeGraphEditorDocument,
  type GraphEditorDocument,
  type GraphEditorNode,
} from "./core";
import {
  getGraphEditorNodeSize,
  type GraphEditorNodeLayoutOptions,
  type GraphEditorNodeSize,
} from "./node-metrics";

export type GraphEditorLayoutDirection = "right" | "down";

export type GraphEditorLayoutOptions<TNodeData = Record<string, unknown>> = {
  nodeIds?: readonly string[];
  direction?: GraphEditorLayoutDirection;
  nodeWidth?: number | ((node: GraphEditorNode<TNodeData>) => number);
  nodeHeight?: number | ((node: GraphEditorNode<TNodeData>) => number);
  rankSeparation?: number;
  nodeSeparation?: number;
  edgeSeparation?: number;
  marginX?: number;
  marginY?: number;
};

export { getGraphEditorNodeSize, type GraphEditorNodeLayoutOptions, type GraphEditorNodeSize };

export type GraphEditorLayoutResult<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  changedNodeIds: string[];
  cycles: string[][];
};

const defaultNodeWidth = 248;
const defaultNodeHeight = 124;

export function layoutGraphEditorDocument<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  options: GraphEditorLayoutOptions<TNodeData> = {},
): GraphEditorLayoutResult<TNodeData, TEdgeData, TPortType> {
  const cycles = detectGraphEditorCycles(document);
  const selectedNodeIds = options.nodeIds ? new Set(options.nodeIds) : null;
  const nodes = document.nodes.filter((node) => !selectedNodeIds || selectedNodeIds.has(node.id));
  if (nodes.length === 0) {
    return { document, changedNodeIds: [], cycles };
  }

  const graph = new graphlib.Graph();
  graph.setGraph({
    rankdir: options.direction === "down" ? "TB" : "LR",
    acyclicer: "greedy",
    ranksep: options.rankSeparation ?? 96,
    nodesep: options.nodeSeparation ?? 48,
    edgesep: options.edgeSeparation ?? 24,
    marginx: options.marginX ?? 0,
    marginy: options.marginY ?? 0,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    const measured = getGraphEditorNodeSize(node);
    graph.setNode(node.id, {
      width: resolveDimension(options.nodeWidth, node, measured.width, defaultNodeWidth),
      height: resolveDimension(options.nodeHeight, node, measured.height, defaultNodeHeight),
    });
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  for (const edge of document.edges) {
    if (nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId)) {
      graph.setEdge(edge.sourceNodeId, edge.targetNodeId, { id: edge.id });
    }
  }

  layout(graph);

  const previousBounds = pointBounds(nodes);
  const positionedNodes = nodes.flatMap((node) => {
    const layoutNode = graph.node(node.id) as {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    };
    if (!Number.isFinite(layoutNode?.x) || !Number.isFinite(layoutNode?.y)) {
      return [];
    }
    const width = Number.isFinite(layoutNode.width) ? Number(layoutNode.width) : defaultNodeWidth;
    const height = Number.isFinite(layoutNode.height)
      ? Number(layoutNode.height)
      : defaultNodeHeight;
    return [
      {
        id: node.id,
        x: Math.round(Number(layoutNode.x) - width / 2),
        y: Math.round(Number(layoutNode.y) - height / 2),
      },
    ];
  });

  if (positionedNodes.length === 0) {
    return { document, changedNodeIds: [], cycles };
  }

  const nextBounds = pointBounds(positionedNodes);
  const offsetX = previousBounds.x - nextBounds.x;
  const offsetY = previousBounds.y - nextBounds.y;
  const positionByNodeId = new Map(
    positionedNodes.map((node) => [node.id, { x: node.x + offsetX, y: node.y + offsetY }]),
  );
  const changedNodeIds: string[] = [];
  const nextNodes = document.nodes.map((node) => {
    const position = positionByNodeId.get(node.id);
    if (!position) {
      return node;
    }
    const nextNode = {
      ...node,
      x: Math.round(position.x),
      y: Math.round(position.y),
    };
    if (nextNode.x !== node.x || nextNode.y !== node.y) {
      changedNodeIds.push(node.id);
    }
    return nextNode;
  });

  return {
    document: normalizeGraphEditorDocument(
      { ...document, nodes: nextNodes },
      { allowCycles: true },
    ),
    changedNodeIds,
    cycles,
  };
}

function resolveDimension<TNodeData>(
  value: number | ((node: GraphEditorNode<TNodeData>) => number) | undefined,
  node: GraphEditorNode<TNodeData>,
  measured: number,
  fallback: number,
) {
  const resolved = typeof value === "function" ? value(node) : value;
  if (Number.isFinite(resolved) && Number(resolved) > 0) {
    return Number(resolved);
  }
  return Number.isFinite(measured) && measured > 0 ? measured : fallback;
}

function pointBounds(points: Array<{ x: number; y: number }>) {
  return {
    x: Math.min(...points.map((point) => point.x)),
    y: Math.min(...points.map((point) => point.y)),
  };
}
