import {
  duplicateGraphEditorSelection,
  pasteGraphEditorClipboardPayload,
  type GraphEditorClipboardPayload,
  type GraphEditorPasteOptions,
  type GraphEditorSelectionState,
} from "../core";

import type { GraphEditorOperation } from "./types";

export function createGraphEditorDuplicateSelectionOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  selection: GraphEditorSelectionState,
  options: {
    offsetX?: number;
    offsetY?: number;
    selectionBefore?: GraphEditorSelectionState;
  } = {},
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  let result: ReturnType<
    typeof duplicateGraphEditorSelection<TNodeData, TEdgeData, TPortType>
  > | null = null;
  return {
    id: "graph.duplicate-selection",
    label: "Duplicate selection",
    apply: (document) => {
      result = duplicateGraphEditorSelection(document, selection, options);
      return result.document;
    },
    selectionBefore: options.selectionBefore ?? selection,
    getSelectionAfter: () => selectionFromPasteResult(result),
  };
}

export function createGraphEditorPasteOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  payload: GraphEditorClipboardPayload<TNodeData, TEdgeData, TPortType>,
  options: GraphEditorPasteOptions & {
    selectionBefore?: GraphEditorSelectionState;
  } = {},
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  let result: ReturnType<
    typeof pasteGraphEditorClipboardPayload<TNodeData, TEdgeData, TPortType>
  > | null = null;
  return {
    id: "graph.paste",
    label: "Paste",
    apply: (document) => {
      result = pasteGraphEditorClipboardPayload(document, payload, options);
      return result.document;
    },
    selectionBefore: options.selectionBefore,
    getSelectionAfter: () => selectionFromPasteResult(result),
  };
}

function selectionFromPasteResult(
  result: {
    nodeIds: string[];
    edgeIds: string[];
    groupIds?: string[];
  } | null,
): GraphEditorSelectionState | undefined {
  if (!result) {
    return undefined;
  }
  return {
    nodeIds: result.nodeIds,
    edgeIds: result.edgeIds,
    ...(result.groupIds?.length ? { groupIds: result.groupIds } : {}),
    primary:
      result.nodeIds.length > 0
        ? { type: "node", id: result.nodeIds.at(-1)! }
        : result.edgeIds.length > 0
          ? { type: "edge", id: result.edgeIds.at(-1)! }
          : result.groupIds?.length
            ? { type: "group", id: result.groupIds.at(-1)! }
            : undefined,
  };
}
