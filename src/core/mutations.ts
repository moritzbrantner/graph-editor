import { normalizeGraphEditorDocument } from "./document";
import { normalizeGraphEditorSelection } from "./selection";
import type {
  GraphEditorCreateGroupOptions,
  GraphEditorDocument,
  GraphEditorDuplicateNodeOptions,
  GraphEditorEdge,
  GraphEditorGroup,
  GraphEditorNode,
  GraphEditorSelectionState,
} from "./types";
import { cloneGraphEditorNode, createUniqueId, orderedUnique } from "./utils";

export function addGraphEditorNode<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  node: GraphEditorNode<TNodeData, TPortType>,
) {
  if (document.nodes.some((candidate) => candidate.id === node.id)) {
    throw new Error(`Duplicate graph node id: ${node.id}`);
  }
  return normalizeGraphEditorDocument({ ...document, nodes: [...document.nodes, node] });
}

export function updateGraphEditorNode<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  nodeId: string,
  patch: Partial<GraphEditorNode<TNodeData, TPortType>>,
) {
  return normalizeGraphEditorDocument({
    ...document,
    nodes: document.nodes.map((node) =>
      node.id === nodeId ? { ...node, ...patch, id: node.id } : node,
    ),
  });
}

export function removeGraphEditorNode<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>, nodeId: string) {
  return normalizeGraphEditorDocument({
    ...document,
    nodes: document.nodes.filter((node) => node.id !== nodeId),
    edges: document.edges.filter(
      (edge) => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId,
    ),
    groups: (document.groups ?? []).flatMap((group) => {
      const nodeIds = group.nodeIds.filter((id) => id !== nodeId);
      return nodeIds.length > 0 ? [{ ...group, nodeIds }] : [];
    }),
  });
}

export function moveGraphEditorNode<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  nodeId: string,
  position: { x: number; y: number },
) {
  return updateGraphEditorNode(document, nodeId, position);
}

export function addGraphEditorEdge<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  edge: GraphEditorEdge<TEdgeData>,
) {
  if (document.edges.some((candidate) => candidate.id === edge.id)) {
    throw new Error(`Duplicate graph edge id: ${edge.id}`);
  }
  return normalizeGraphEditorDocument({ ...document, edges: [...document.edges, edge] });
}

export function updateGraphEditorEdge<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  edgeId: string,
  patch: Partial<GraphEditorEdge<TEdgeData>>,
) {
  return normalizeGraphEditorDocument({
    ...document,
    edges: document.edges.map((edge) =>
      edge.id === edgeId ? { ...edge, ...patch, id: edge.id } : edge,
    ),
  });
}

export function removeGraphEditorEdge<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>, edgeId: string) {
  return normalizeGraphEditorDocument({
    ...document,
    edges: document.edges.filter((edge) => edge.id !== edgeId),
  });
}

export function duplicateGraphEditorNode<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  nodeId: string,
  options: GraphEditorDuplicateNodeOptions = {},
) {
  const node = document.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    return document;
  }
  const existingIds = new Set(document.nodes.map((candidate) => candidate.id));
  const id =
    options.createId?.(nodeId, existingIds) ?? createUniqueId(`${nodeId}-copy`, existingIds);
  return addGraphEditorNode(document, {
    ...cloneGraphEditorNode(node),
    id,
    label: `${node.label} Copy`,
    x: node.x + (options.offsetX ?? 48),
    y: node.y + (options.offsetY ?? 48),
  });
}

export function createGraphEditorGroup<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  options: GraphEditorCreateGroupOptions,
) {
  const existingIds = new Set((document.groups ?? []).map((group) => group.id));
  const nodeIds = orderedUnique(
    document.nodes.map((node) => node.id),
    options.nodeIds,
  );
  if (nodeIds.length < 1) {
    return document;
  }
  const group: GraphEditorGroup = {
    id:
      options.id && !existingIds.has(options.id)
        ? options.id
        : createUniqueId("group", existingIds),
    label: options.label ?? "Group",
    nodeIds,
  };
  return normalizeGraphEditorDocument({
    ...document,
    groups: [...(document.groups ?? []), group],
  });
}

export function updateGraphEditorGroup<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  groupId: string,
  patch: Partial<GraphEditorGroup>,
) {
  const groups: GraphEditorGroup[] = [];
  for (const group of document.groups ?? []) {
    groups.push(group.id === groupId ? { ...group, ...patch, id: group.id } : group);
  }

  return normalizeGraphEditorDocument({
    ...document,
    groups,
  });
}

export function moveGraphEditorGroup<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  groupId: string,
  delta: { x: number; y: number },
) {
  const group = document.groups?.find((candidate) => candidate.id === groupId);
  if (!group) {
    return document;
  }
  const nodeIds = new Set(group.nodeIds);
  return normalizeGraphEditorDocument({
    ...document,
    nodes: document.nodes.map((node) =>
      nodeIds.has(node.id) ? { ...node, x: node.x + delta.x, y: node.y + delta.y } : node,
    ),
  });
}

export function ungroupGraphEditorGroup<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>, groupId: string) {
  return normalizeGraphEditorDocument({
    ...document,
    groups: (document.groups ?? []).filter((group) => group.id !== groupId),
  });
}

export function removeGraphEditorSelection<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  selection: GraphEditorSelectionState,
) {
  const normalized = normalizeGraphEditorSelection(document, selection);
  const nodeIds = new Set(normalized.nodeIds);
  const edgeIds = new Set(normalized.edgeIds);
  const groupIds = new Set(normalized.groupIds ?? []);
  return normalizeGraphEditorDocument({
    ...document,
    nodes: document.nodes.filter((node) => !nodeIds.has(node.id)),
    edges: document.edges.filter(
      (edge) =>
        !edgeIds.has(edge.id) && !nodeIds.has(edge.sourceNodeId) && !nodeIds.has(edge.targetNodeId),
    ),
    groups: (document.groups ?? [])
      .filter((group) => !groupIds.has(group.id))
      .flatMap((group) => {
        const selectedNodeIds = group.nodeIds.filter((id) => !nodeIds.has(id));
        return selectedNodeIds.length > 0 ? [{ ...group, nodeIds: selectedNodeIds }] : [];
      }),
  });
}
