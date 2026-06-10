import {
  createGraphEditorGroup,
  normalizeGraphEditorDocument,
  ungroupGraphEditorGroup,
  type GraphEditorDocument,
  type GraphEditorSelectionState,
  type GraphEditorViewport,
} from "../core";
import {
  layoutGraphEditorDocument,
  type GraphEditorLayoutOptions,
  type GraphEditorLayoutResult,
} from "../layout";
import { applyGraphEditorDocumentPatch, type GraphEditorDocumentPatch } from "../patches";

import type { GraphEditorOperation } from "./types";

export function createGraphEditorCreateGroupOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  nodeIds: readonly string[],
  options: {
    id?: string;
    label?: string;
    selectionBefore?: GraphEditorSelectionState;
    selectionAfter?: GraphEditorSelectionState;
  } = {},
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  return {
    id: "graph.create-group",
    label: "Group selection",
    apply: (document) => createGraphEditorGroup(document, { ...options, nodeIds }),
    selectionBefore: options.selectionBefore,
    getSelectionAfter: (before, after) => {
      if (options.selectionAfter) {
        return options.selectionAfter;
      }
      const previousGroupIds = new Set((before.groups ?? []).map((group) => group.id));
      const group = (after.groups ?? []).find((candidate) => !previousGroupIds.has(candidate.id));
      return group
        ? {
            nodeIds: group.nodeIds,
            edgeIds: [],
            groupIds: [group.id],
            primary: { type: "group", id: group.id },
          }
        : undefined;
    },
  };
}

export function createGraphEditorUngroupOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  groupIds: readonly string[],
  options: {
    selectionBefore?: GraphEditorSelectionState;
    selectionAfter?: GraphEditorSelectionState;
  } = {},
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  return {
    id: "graph.ungroup",
    label: "Ungroup selection",
    apply: (document) =>
      groupIds.reduce(
        (currentDocument, groupId) => ungroupGraphEditorGroup(currentDocument, groupId),
        document,
      ),
    selectionBefore: options.selectionBefore,
    selectionAfter: options.selectionAfter,
  };
}

export function createGraphEditorLayoutOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  options: GraphEditorLayoutOptions<TNodeData> & {
    selectionBefore?: GraphEditorSelectionState;
    selectionAfter?: GraphEditorSelectionState;
  } = {},
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  let layoutResult: GraphEditorLayoutResult<TNodeData, TEdgeData, TPortType> | null = null;
  return {
    id: "graph.layout",
    label: "Auto layout",
    apply: (document) => {
      layoutResult = layoutGraphEditorDocument(document, options);
      return layoutResult.document;
    },
    metadata: {
      graphEditor: {
        get layoutResult() {
          return layoutResult ?? undefined;
        },
      },
    },
    selectionBefore: options.selectionBefore,
    selectionAfter: options.selectionAfter,
  };
}

export function createGraphEditorUpdateViewportOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  viewport: GraphEditorViewport,
  options: {
    history?: boolean;
    selectionBefore?: GraphEditorSelectionState;
    selectionAfter?: GraphEditorSelectionState;
  } = {},
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  return {
    id: "graph.update-viewport",
    label: "Update viewport",
    apply: (document) => ({ ...document, viewport }),
    mergeKey: "graph.viewport",
    metadata: { graphEditor: { history: options.history ?? true } },
    selectionBefore: options.selectionBefore,
    selectionAfter: options.selectionAfter,
  };
}

export function createGraphEditorPatchOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  patch: GraphEditorDocumentPatch,
  options: {
    label?: string;
    selectionBefore?: GraphEditorSelectionState;
    selectionAfter?: GraphEditorSelectionState;
    strict?: boolean;
  } = {},
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  return {
    id: "graph.patch",
    label: options.label ?? "Apply patch",
    apply: (document) =>
      applyGraphEditorDocumentPatch(document, patch, {
        strict: options.strict ?? true,
      }),
    metadata: {
      graphEditor: {
        patch,
      },
    },
    selectionBefore: options.selectionBefore,
    selectionAfter: options.selectionAfter,
  };
}

export function createGraphEditorReplaceDocumentOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  options: {
    label?: string;
    selectionBefore?: GraphEditorSelectionState;
    selectionAfter?: GraphEditorSelectionState;
  } = {},
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  const normalizedDocument = normalizeGraphEditorDocument(document, { mode: "repair" });

  return {
    id: "graph.replace-document",
    label: options.label ?? "Replace document",
    apply: () => normalizedDocument,
    selectionBefore: options.selectionBefore,
    selectionAfter: options.selectionAfter,
  };
}
