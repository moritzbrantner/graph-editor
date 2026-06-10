import { createStableEditorJsonEquals } from "@moritzbrantner/editor-core/json";
import {
  type EditorOperation,
  type EditorOperationPreflightIssue,
  type EditorOperationRuntimeState,
} from "@moritzbrantner/editor-core/operations";
import { setEditorRuntimeSelection } from "@moritzbrantner/editor-core/runtime";

import {
  normalizeGraphEditorSelection,
  validateGraphEditorDocument,
  type GraphEditorDocument,
  type GraphEditorDocumentDiagnostic,
  type GraphEditorDocumentValidationOptions,
  type GraphEditorSelectionState,
} from "../core";
import type { GraphEditorOperation } from "../operations";
import type {
  GraphEditorRuntimeOptions,
  GraphEditorRuntimeState,
  GraphEditorRuntimeStateOptions,
} from "./types";

const runtimeOptionsByState = new WeakMap<object, GraphEditorRuntimeStateOptions<any, any, any>>();
export const graphEditorDocumentsEqual =
  createStableEditorJsonEquals<GraphEditorDocument<any, any, any>>();

export function resolveGraphEditorOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  state: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType>,
  operation: GraphEditorOperation<TNodeData, TEdgeData, TPortType>,
): EditorOperation<
  GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  GraphEditorSelectionState
> {
  const before = state.document;
  const after = operation.apply(before);
  const selectionBefore = operation.selectionBefore ?? state.selection;
  const selectionAfter =
    operation.getSelectionAfter?.(before, after) ?? operation.selectionAfter ?? state.selection;

  return {
    ...operation,
    apply: (document) => (document === before ? after : operation.apply(document)),
    selectionBefore,
    selectionAfter: selectionAfter
      ? normalizeGraphEditorSelection(after, selectionAfter)
      : { nodeIds: [], edgeIds: [] },
  };
}

export function preflightGraphEditorOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  operation: EditorOperation<
    GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    GraphEditorSelectionState
  >,
  validationOptions?: GraphEditorDocumentValidationOptions,
): readonly EditorOperationPreflightIssue[] {
  let nextDocument: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  try {
    nextDocument = operation.apply(document);
  } catch (error) {
    return [{ path: "$", message: error instanceof Error ? error.message : String(error) }];
  }

  return validateGraphEditorDocument(nextDocument, validationOptions).map((diagnostic) => ({
    path: diagnostic.path,
    message: diagnostic.message,
    severity: "error",
  }));
}

export function withGraphEditorRuntimeState<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  state: EditorOperationRuntimeState<
    GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    GraphEditorSelectionState
  >,
  options: GraphEditorRuntimeStateOptions<TNodeData, TEdgeData, TPortType>,
): GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType> {
  const document = state.runtime.document;
  const selection = normalizeGraphEditorSelection(
    document,
    state.runtime.selection ?? { nodeIds: [], edgeIds: [] },
  );
  if (selection !== state.runtime.selection) {
    state.runtime = setEditorRuntimeSelection(state.runtime, selection);
  }
  const diagnostics = validateGraphEditorDocument(document, options.validationOptions);
  const selectedDiagnostics = getGraphEditorSelectedDiagnostics(diagnostics, selection);
  const graphState = Object.assign(state, {
    document,
    selection,
    diagnostics,
    selectedDiagnostics,
  });
  runtimeOptionsByState.set(graphState, options);
  return graphState;
}

function getGraphEditorSelectedDiagnostics(
  diagnostics: GraphEditorDocumentDiagnostic[],
  selection: GraphEditorSelectionState,
) {
  const nodeIds = new Set(selection.nodeIds);
  const edgeIds = new Set(selection.edgeIds);
  const groupIds = new Set(selection.groupIds ?? []);
  return diagnostics.filter(
    (diagnostic) =>
      (diagnostic.nodeId && nodeIds.has(diagnostic.nodeId)) ||
      (diagnostic.sourceNodeId && nodeIds.has(diagnostic.sourceNodeId)) ||
      (diagnostic.targetNodeId && nodeIds.has(diagnostic.targetNodeId)) ||
      (diagnostic.edgeId && edgeIds.has(diagnostic.edgeId)) ||
      (diagnostic.groupId && groupIds.has(diagnostic.groupId)),
  );
}

export function getGraphEditorRuntimeStateOptions<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  state: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType>,
): GraphEditorRuntimeStateOptions<TNodeData, TEdgeData, TPortType> {
  return (runtimeOptionsByState.get(state) ?? {}) as GraphEditorRuntimeStateOptions<
    TNodeData,
    TEdgeData,
    TPortType
  >;
}

export function toRuntimeStateOptions<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  options: GraphEditorRuntimeOptions<TNodeData, TEdgeData, TPortType>,
): GraphEditorRuntimeStateOptions<TNodeData, TEdgeData, TPortType> {
  return {
    connectionValidationOptions: options.connectionValidationOptions,
    disableHistory: options.disableHistory,
    historyLimit: options.historyLimit,
    initialSelection: options.initialSelection,
    operationHistoryLimit: options.operationHistoryLimit,
    plugins: options.plugins,
    validationOptions: options.validationOptions,
  };
}
