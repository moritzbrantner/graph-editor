import type {
  GraphEditorBounds,
  GraphEditorDocument,
  GraphEditorGroupBounds,
  GraphEditorNode,
} from "./types";

export function getGraphEditorGroupBounds<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  getNodeBounds: (node: GraphEditorNode<TNodeData, TPortType>) => GraphEditorBounds,
  options: { padding?: number; hiddenNodeIds?: readonly string[] } = {},
): GraphEditorGroupBounds[] {
  const padding = options.padding ?? 24;
  const hiddenNodeIds = new Set(options.hiddenNodeIds ?? []);
  const nodeById = new Map(document.nodes.map((node) => [node.id, node] as const));
  return (document.groups ?? []).flatMap((group) => {
    const boxes = group.nodeIds.flatMap((nodeId) => {
      const node = nodeById.get(nodeId);
      return node && !hiddenNodeIds.has(node.id) ? [getNodeBounds(node)] : [];
    });

    if (boxes.length === 0) {
      return [];
    }

    return [
      {
        groupId: group.id,
        nodeIds: group.nodeIds.filter(
          (nodeId) => nodeById.has(nodeId) && !hiddenNodeIds.has(nodeId),
        ),
        bounds: expandGraphEditorBounds(mergeGraphEditorBounds(boxes), padding),
      },
    ];
  });
}

export function graphEditorBoundsContainPoint(
  bounds: GraphEditorBounds,
  point: { x: number; y: number },
) {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

export function graphEditorBoundsIntersect(left: GraphEditorBounds, right: GraphEditorBounds) {
  return (
    left.x <= right.x + right.width &&
    left.x + left.width >= right.x &&
    left.y <= right.y + right.height &&
    left.y + left.height >= right.y
  );
}

export function normalizeGraphEditorBounds(bounds: GraphEditorBounds): GraphEditorBounds {
  const x = bounds.width < 0 ? bounds.x + bounds.width : bounds.x;
  const y = bounds.height < 0 ? bounds.y + bounds.height : bounds.y;
  return {
    x,
    y,
    width: Math.abs(bounds.width),
    height: Math.abs(bounds.height),
  };
}

function mergeGraphEditorBounds(bounds: readonly GraphEditorBounds[]): GraphEditorBounds {
  const minX = Math.min(...bounds.map((box) => box.x));
  const minY = Math.min(...bounds.map((box) => box.y));
  const maxX = Math.max(...bounds.map((box) => box.x + box.width));
  const maxY = Math.max(...bounds.map((box) => box.y + box.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function expandGraphEditorBounds(bounds: GraphEditorBounds, padding: number): GraphEditorBounds {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}
