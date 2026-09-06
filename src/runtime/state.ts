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
import { replaceEditorOperationRuntimeCoreStateCompat } from "./core-compat";
import type {
  GraphEditorRuntimeOptions,
  GraphEditorRuntimeState,
  GraphEditorRuntimeStateOptions,
} from "./types";

const runtimeOptionsByState = new WeakMap<object, GraphEditorRuntimeStateOptions<any, any, any>>();
export const graphEditorDocumentsEqual =
  createStableEditorJsonEquals<GraphEditorDocument<any, any, any>>();
const graphEditorSelectionsEqual = createStableEditorJsonEquals<GraphEditorSelectionState>();

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
  const selectionBefore = operation.selectionBefore ?? state.selection;
  let after: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  try {
    after = operation.apply(before);
  } catch {
    return {
      ...operation,
      selectionBefore,
      selectionAfter: operation.selectionAfter ?? state.selection,
    };
  }

  const canNormalizeSelection = canNormalizeGraphEditorSelection(after);
  const selectionAfter = canNormalizeSelection
    ? (operation.getSelectionAfter?.(before, after) ?? operation.selectionAfter ?? state.selection)
    : (operation.selectionAfter ?? state.selection);

  return {
    ...operation,
    apply: (document) => (document === before ? after : operation.apply(document)),
    selectionBefore,
    selectionAfter:
      selectionAfter && canNormalizeSelection
        ? normalizeGraphEditorSelection(after, selectionAfter)
        : state.selection,
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
  const runtimeSelection = state.runtime.selection ?? { nodeIds: [], edgeIds: [] };
  const selection = normalizeGraphEditorSelection(document, runtimeSelection);
  const coreState = graphEditorSelectionsEqual(selection, runtimeSelection)
    ? state
    : replaceEditorOperationRuntimeCoreStateCompat(
        state,
        setEditorRuntimeSelection(state.runtime, selection),
      );
  const diagnostics = validateGraphEditorDocument(document, options.validationOptions);
  const selectedDiagnostics = getGraphEditorSelectedDiagnostics(diagnostics, selection);
  const graphState = Object.assign(coreState, {
    document,
    selection,
    diagnostics,
    selectedDiagnostics,
  });
  runtimeOptionsByState.set(graphState, options);
  return graphState;
}

function canNormalizeGraphEditorSelection(document: unknown): document is GraphEditorDocument {
  if (typeof document !== "object" || document === null || Array.isArray(document)) {
    return false;
  }
  const record = document as Record<string, unknown>;
  return (
    isGraphEditorEntityCollection(record.nodes) &&
    isGraphEditorEntityCollection(record.edges) &&
    (record.groups === undefined || isGraphEditorEntityCollection(record.groups))
  );
}

function isGraphEditorEntityCollection(value: unknown) {
  return (
    Array.isArray(value) &&
    value.every(
      (entity) =>
        typeof entity === "object" &&
        entity !== null &&
        !Array.isArray(entity) &&
        typeof (entity as Record<string, unknown>).id === "string",
    )
  );
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
