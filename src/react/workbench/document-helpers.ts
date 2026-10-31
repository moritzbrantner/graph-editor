import { createUniqueEditorId } from "@moenarch/editor-core/entities";
import { createStableEditorJsonEquals } from "@moenarch/editor-core/json";
import {
  normalizeGraphEditorDocument,
  type GraphEditorDocument,
  type GraphEditorSelectionState,
} from "../../core";
import { type GraphEditorOperation } from "../../operations";
import { getGraphEditorNodeSize } from "../../node-metrics";

export const emptySelection: GraphEditorSelectionState = { nodeIds: [], edgeIds: [] };

export function getGraphWorkbenchDocumentBounds(document: GraphEditorDocument<any, any, any>) {
  if (document.nodes.length === 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const boxes = document.nodes.map((node) => {
    const size = getGraphEditorNodeSize(node);
    return {
      x: node.x,
      y: node.y,
      width: size.width,
      height: size.height,
    };
  });
  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export const graphWorkbenchDocumentsEqual =
  createStableEditorJsonEquals<GraphEditorDocument<any, any, any>>();

export function normalizeGraphWorkbenchDocument<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  normalizeDocument?: (
    document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  ) => GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
) {
  return (
    normalizeDocument?.(document) ??
    normalizeGraphEditorDocument<TNodeData, TEdgeData, TPortType>(document, { mode: "repair" })
  );
}

export function selectionFromPasteResult(result: {
  nodeIds: string[];
  edgeIds: string[];
  groupIds?: string[];
}): GraphEditorSelectionState {
  const groupId = result.groupIds?.[0];
  const nodeId = result.nodeIds[0];
  const edgeId = result.edgeIds[0];

  return {
    nodeIds: result.nodeIds,
    edgeIds: result.edgeIds,
    ...(result.groupIds?.length ? { groupIds: result.groupIds } : {}),
    ...(groupId
      ? { primary: { type: "group" as const, id: groupId } }
      : nodeId
        ? { primary: { type: "node" as const, id: nodeId } }
        : edgeId
          ? { primary: { type: "edge" as const, id: edgeId } }
          : {}),
  };
}

export function createGraphWorkbenchDocumentOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  selection: GraphEditorSelectionState,
  history = true,
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  return {
    id: "graph.replace-document",
    label: "Update document",
    apply: () => document,
    selectionAfter: selection,
    metadata: { graphEditor: { history } },
  };
}

export function createGraphWorkbenchNodeId(
  baseId: string,
  document: GraphEditorDocument<any, any, any>,
) {
  return createUniqueEditorId(baseId, new Set(document.nodes.map((node) => node.id)));
}
