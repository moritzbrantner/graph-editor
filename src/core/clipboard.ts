import { graphEditorClipboardFormat, graphEditorClipboardVersion } from "./constants";
import { normalizeGraphEditorDocument } from "./document";
import { normalizeGraphEditorSelection } from "./selection";
import type { GraphEditorDocument, GraphEditorSelectionState } from "./types";
import type {
  GraphEditorClipboardPayload,
  GraphEditorPasteOptions,
  GraphEditorPasteResult,
} from "./clipboard-types";
import {
  cloneGraphEditorEdge,
  cloneGraphEditorGroup,
  cloneGraphEditorNode,
  createUniqueId,
} from "./utils";

export function copyGraphEditorSelection<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  selection: GraphEditorSelectionState,
  options: { sourceDocumentId?: string; copiedAt?: string } = {},
): GraphEditorClipboardPayload<TNodeData, TEdgeData, TPortType> {
  const normalized = normalizeGraphEditorSelection(document, selection);
  const nodeIds = new Set(normalized.nodeIds);
  for (const group of document.groups ?? []) {
    if (normalized.groupIds?.includes(group.id)) {
      for (const nodeId of group.nodeIds) {
        nodeIds.add(nodeId);
      }
    }
  }
  const nodes = document.nodes.filter((node) => nodeIds.has(node.id)).map(cloneGraphEditorNode);
  const edges = document.edges
    .filter((edge) => nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId))
    .map(cloneGraphEditorEdge);
  const groups = (document.groups ?? [])
    .filter((group) => group.nodeIds.every((nodeId) => nodeIds.has(nodeId)))
    .map(cloneGraphEditorGroup);
  return {
    format: graphEditorClipboardFormat,
    version: graphEditorClipboardVersion,
    copiedAt: options.copiedAt ?? new Date().toISOString(),
    ...(options.sourceDocumentId ? { sourceDocumentId: options.sourceDocumentId } : {}),
    nodes,
    edges,
    ...(groups.length > 0 ? { groups } : {}),
  };
}

export function pasteGraphEditorClipboardPayload<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  payload: GraphEditorClipboardPayload<TNodeData, TEdgeData, TPortType>,
  options: GraphEditorPasteOptions = {},
): GraphEditorPasteResult<TNodeData, TEdgeData, TPortType> {
  if (
    payload.format !== graphEditorClipboardFormat ||
    payload.version !== graphEditorClipboardVersion
  ) {
    throw new Error("Unsupported graph editor clipboard payload");
  }
  const offsetX = options.offsetX ?? 48;
  const offsetY = options.offsetY ?? 48;
  const existingNodeIds = new Set(document.nodes.map((node) => node.id));
  const existingEdgeIds = new Set(document.edges.map((edge) => edge.id));
  const existingGroupIds = new Set((document.groups ?? []).map((group) => group.id));
  const nodeIdMap = new Map<string, string>();
  const nodes = payload.nodes.map((node) => {
    const id =
      options.createNodeId?.(node.id, existingNodeIds) ?? createUniqueId(node.id, existingNodeIds);
    existingNodeIds.add(id);
    nodeIdMap.set(node.id, id);
    return { ...cloneGraphEditorNode(node), id, x: node.x + offsetX, y: node.y + offsetY };
  });
  const edges = payload.edges.flatMap((edge) => {
    const sourceNodeId = nodeIdMap.get(edge.sourceNodeId);
    const targetNodeId = nodeIdMap.get(edge.targetNodeId);
    if (!sourceNodeId || !targetNodeId) {
      return [];
    }
    const id =
      options.createEdgeId?.(edge.id, existingEdgeIds) ?? createUniqueId(edge.id, existingEdgeIds);
    existingEdgeIds.add(id);
    return [{ ...cloneGraphEditorEdge(edge), id, sourceNodeId, targetNodeId }];
  });
  const groups = (payload.groups ?? []).flatMap((group) => {
    const nodeIds = group.nodeIds.flatMap((nodeId) => {
      const mapped = nodeIdMap.get(nodeId);
      return mapped ? [mapped] : [];
    });
    if (nodeIds.length === 0) {
      return [];
    }
    const id = createUniqueId(group.id, existingGroupIds);
    existingGroupIds.add(id);
    return [{ ...cloneGraphEditorGroup(group), id, nodeIds }];
  });
  return {
    document: normalizeGraphEditorDocument({
      ...document,
      nodes: [...document.nodes, ...nodes],
      edges: [...document.edges, ...edges],
      groups: [...(document.groups ?? []), ...groups],
    }),
    nodeIds: nodes.map((node) => node.id),
    edgeIds: edges.map((edge) => edge.id),
    ...(groups.length > 0 ? { groupIds: groups.map((group) => group.id) } : {}),
  };
}

export function duplicateGraphEditorSelection<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  selection: GraphEditorSelectionState,
  options: { offsetX?: number; offsetY?: number } = {},
) {
  return pasteGraphEditorClipboardPayload(
    document,
    copyGraphEditorSelection(document, selection),
    options,
  );
}
