import { normalizeGraphEditorDocument } from "./core/document";
import type { GraphEditorDocument, GraphEditorNode } from "./core/types";
import { getGraphEditorNodeSize } from "./node-metrics";

export type GraphEditorAlignment =
  | "left"
  | "center-x"
  | "right"
  | "top"
  | "center-y"
  | "bottom";

export type GraphEditorDistributionAxis = "horizontal" | "vertical";

export type GraphEditorGridOptions = {
  size?: number;
  sizeX?: number;
  sizeY?: number;
  originX?: number;
  originY?: number;
};

export type GraphEditorSpatialResult<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  changedNodeIds: string[];
};

export function nudgeGraphEditorNodes<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  nodeIds: readonly string[],
  delta: { x: number; y: number },
): GraphEditorSpatialResult<TNodeData, TEdgeData, TPortType> {
  if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y)) {
    return { document, changedNodeIds: [] };
  }

  return updateSelectedNodes(document, nodeIds, (node) => ({
    x: node.x + delta.x,
    y: node.y + delta.y,
  }));
}

export function snapGraphEditorNodesToGrid<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  nodeIds: readonly string[],
  options: GraphEditorGridOptions = {},
): GraphEditorSpatialResult<TNodeData, TEdgeData, TPortType> {
  const fallback = positiveFinite(options.size) ?? 16;
  const sizeX = positiveFinite(options.sizeX) ?? fallback;
  const sizeY = positiveFinite(options.sizeY) ?? fallback;
  const originX = finiteOr(options.originX, 0);
  const originY = finiteOr(options.originY, 0);

  return updateSelectedNodes(document, nodeIds, (node) => ({
    x: snapCoordinate(node.x, originX, sizeX),
    y: snapCoordinate(node.y, originY, sizeY),
  }));
}

export function alignGraphEditorNodes<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  nodeIds: readonly string[],
  alignment: GraphEditorAlignment,
): GraphEditorSpatialResult<TNodeData, TEdgeData, TPortType> {
  const nodes = selectedNodes(document, nodeIds);
  if (nodes.length < 2) {
    return { document, changedNodeIds: [] };
  }

  const measured = nodes.map((node) => ({ node, size: getGraphEditorNodeSize(node) }));
  const left = Math.min(...measured.map(({ node }) => node.x));
  const top = Math.min(...measured.map(({ node }) => node.y));
  const right = Math.max(...measured.map(({ node, size }) => node.x + size.width));
  const bottom = Math.max(...measured.map(({ node, size }) => node.y + size.height));
  const centerX = left + (right - left) / 2;
  const centerY = top + (bottom - top) / 2;
  const targetIds = new Set(nodes.map((node) => node.id));

  return updateSelectedNodes(document, [...targetIds], (node) => {
    const size = getGraphEditorNodeSize(node);
    switch (alignment) {
      case "left":
        return { x: left, y: node.y };
      case "center-x":
        return { x: centerX - size.width / 2, y: node.y };
      case "right":
        return { x: right - size.width, y: node.y };
      case "top":
        return { x: node.x, y: top };
      case "center-y":
        return { x: node.x, y: centerY - size.height / 2 };
      case "bottom":
        return { x: node.x, y: bottom - size.height };
    }
  });
}

export function distributeGraphEditorNodes<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  nodeIds: readonly string[],
  axis: GraphEditorDistributionAxis,
): GraphEditorSpatialResult<TNodeData, TEdgeData, TPortType> {
  const nodes = selectedNodes(document, nodeIds);
  if (nodes.length < 3) {
    return { document, changedNodeIds: [] };
  }

  const measured = nodes.map((node) => ({ node, size: getGraphEditorNodeSize(node) }));
  const ordered = measured.toSorted((a, b) =>
    axis === "horizontal"
      ? a.node.x - b.node.x || a.node.id.localeCompare(b.node.id)
      : a.node.y - b.node.y || a.node.id.localeCompare(b.node.id),
  );
  const first = ordered[0]!;
  const last = ordered.at(-1)!;
  const totalSize = ordered.reduce(
    (sum, item) => sum + (axis === "horizontal" ? item.size.width : item.size.height),
    0,
  );
  const start = axis === "horizontal" ? first.node.x : first.node.y;
  const end =
    axis === "horizontal"
      ? last.node.x + last.size.width
      : last.node.y + last.size.height;
  const gap = (end - start - totalSize) / (ordered.length - 1);
  let cursor = start;
  const positionByNodeId = new Map<string, number>();

  for (const item of ordered) {
    positionByNodeId.set(item.node.id, cursor);
    cursor += (axis === "horizontal" ? item.size.width : item.size.height) + gap;
  }

  return updateSelectedNodes(document, nodeIds, (node) => {
    const position = positionByNodeId.get(node.id);
    if (position === undefined) {
      return { x: node.x, y: node.y };
    }
    return axis === "horizontal"
      ? { x: position, y: node.y }
      : { x: node.x, y: position };
  });
}

function selectedNodes<TNodeData, TEdgeData, TPortType>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  nodeIds: readonly string[],
): Array<GraphEditorNode<TNodeData, TPortType>> {
  const selected = new Set(nodeIds);
  return document.nodes.filter((node) => selected.has(node.id));
}

function updateSelectedNodes<TNodeData, TEdgeData, TPortType>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  nodeIds: readonly string[],
  position: (node: GraphEditorNode<TNodeData, TPortType>) => { x: number; y: number },
): GraphEditorSpatialResult<TNodeData, TEdgeData, TPortType> {
  const selected = new Set(nodeIds);
  const changedNodeIds: string[] = [];
  const nodes = document.nodes.map((node) => {
    if (!selected.has(node.id)) {
      return node;
    }
    const next = position(node);
    const x = normalizePosition(next.x);
    const y = normalizePosition(next.y);
    if (x === node.x && y === node.y) {
      return node;
    }
    changedNodeIds.push(node.id);
    return { ...node, x, y };
  });

  if (changedNodeIds.length === 0) {
    return { document, changedNodeIds };
  }

  return {
    document: normalizeGraphEditorDocument({ ...document, nodes }, { allowCycles: true }),
    changedNodeIds,
  };
}

function snapCoordinate(value: number, origin: number, size: number): number {
  return normalizePosition(origin + Math.round((value - origin) / size) * size);
}

function normalizePosition(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : 0;
}

function positiveFinite(value: number | undefined): number | undefined {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : undefined;
}

function finiteOr(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}
