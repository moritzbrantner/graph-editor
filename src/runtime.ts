import {
  applyEditorOperation,
  createEditorOperationRuntime,
  redoEditorOperationRuntime,
  undoEditorOperationRuntime,
  type ApplyEditorOperationOptions,
  type EditorOperation,
  type EditorOperationPreflightIssue,
  type EditorOperationRuntimeState,
} from "@moritzbrantner/editor-core/operations";
import { createStableEditorJsonEquals } from "@moritzbrantner/editor-core/json";
import {
  markEditorRuntimeSaved,
  resetEditorRuntime,
  setEditorRuntimeSelection,
  type EditorRuntimeState,
} from "@moritzbrantner/editor-core/runtime";

import {
  normalizeGraphEditorDocument,
  normalizeGraphEditorSelection,
  validateGraphEditorDocument,
  type GraphEditorConnectionValidationOptions,
  type GraphEditorDocument,
  type GraphEditorDocumentDiagnostic,
  type GraphEditorDocumentValidationOptions,
  type GraphEditorSelectionState,
} from "./core";
import type { GraphEditorOperation } from "./operations";
import {
  createGraphEditorPluginRegistry,
  resolveGraphEditorPluginRuntimeOptions,
  type GraphEditorPlugin,
} from "./plugins";

export type GraphEditorRuntimeState<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = EditorOperationRuntimeState<
  GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  GraphEditorSelectionState
> & {
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  selection: GraphEditorSelectionState;
  diagnostics: GraphEditorDocumentDiagnostic[];
  selectedDiagnostics: GraphEditorDocumentDiagnostic[];
};

export type GraphEditorRuntimeOptions<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  initialDocument: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  initialSelection?: GraphEditorSelectionState | null;
  historyLimit?: number;
  operationHistoryLimit?: number;
  validationOptions?: GraphEditorDocumentValidationOptions;
  connectionValidationOptions?: GraphEditorConnectionValidationOptions<
    TNodeData,
    TEdgeData,
    TPortType
  >;
  plugins?: readonly GraphEditorPlugin<
    GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    GraphEditorSelectionState
  >[];
  disableHistory?: boolean;
};

type GraphEditorRuntimeStateOptions<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = Omit<GraphEditorRuntimeOptions<TNodeData, TEdgeData, TPortType>, "initialDocument">;

const runtimeOptionsByState = new WeakMap<object, GraphEditorRuntimeStateOptions<any, any, any>>();
const graphEditorDocumentsEqual =
  createStableEditorJsonEquals<GraphEditorDocument<any, any, any>>();

export function createGraphEditorRuntime<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  options: GraphEditorRuntimeOptions<TNodeData, TEdgeData, TPortType>,
): GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType> {
  const normalizedDocument = normalizeGraphEditorDocument(options.initialDocument, {
    ...(options.validationOptions ?? {}),
    mode: "repair",
  });
  const runtimeOptions = toRuntimeStateOptions(options);
  const registry = createGraphEditorPluginRegistry(runtimeOptions.plugins ?? []);
  const preflight = (
    context: Parameters<
      NonNullable<
        Parameters<
          typeof createEditorOperationRuntime<
            GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
            GraphEditorSelectionState
          >
        >[0]["preflight"]
      >
    >[0],
  ) => [
    ...preflightGraphEditorOperation(
      context.document,
      context.operation,
      runtimeOptions.validationOptions,
    ),
    ...runtimePluginOptions.preflight(context),
  ];
  const baseRuntimeOptions = {
    initialDocument: normalizedDocument,
    initialSelection: normalizeGraphEditorSelection(
      normalizedDocument,
      options.initialSelection ?? { nodeIds: [], edgeIds: [] },
    ),
    history: {
      limit: options.historyLimit,
      equals: graphEditorDocumentsEqual,
      normalize: (document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>) =>
        normalizeGraphEditorDocument(document, {
          ...(options.validationOptions ?? {}),
          mode: "repair",
        }),
    },
    operationHistoryLimit: options.disableHistory ? 0 : options.operationHistoryLimit,
    validate: (document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>) =>
      validateGraphEditorDocument(document, options.validationOptions),
  };
  const runtimePluginOptions = resolveGraphEditorPluginRuntimeOptions(registry, baseRuntimeOptions);
  const state = createEditorOperationRuntime<
    GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    GraphEditorSelectionState
  >({
    ...runtimePluginOptions,
    operationHistoryLimit: options.disableHistory ? 0 : options.operationHistoryLimit,
    preflight,
  });

  return withGraphEditorRuntimeState(state, runtimeOptions);
}

export function applyGraphEditorOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  state: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType>,
  operation: GraphEditorOperation<TNodeData, TEdgeData, TPortType>,
  options: ApplyEditorOperationOptions = {},
): GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType> {
  const runtimeOptions = getGraphEditorRuntimeStateOptions(state);
  const resolvedOperation = resolveGraphEditorOperation(state, operation);
  const nextState = applyEditorOperation(state, resolvedOperation, options);
  const historyEnabled =
    !runtimeOptions.disableHistory && operation.metadata?.graphEditor?.history !== false;

  if (!historyEnabled) {
    nextState.operationHistory = state.operationHistory;
    nextState.canUndo = state.operationHistory.undoStack.length > 0;
    nextState.canRedo = state.operationHistory.redoStack.length > 0;
  }

  return withGraphEditorRuntimeState(nextState, runtimeOptions);
}

export function undoGraphEditorRuntime<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  state: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType>,
): GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType> {
  return withGraphEditorRuntimeState(
    undoEditorOperationRuntime(state),
    getGraphEditorRuntimeStateOptions(state),
  );
}

export function redoGraphEditorRuntime<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  state: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType>,
): GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType> {
  return withGraphEditorRuntimeState(
    redoEditorOperationRuntime(state),
    getGraphEditorRuntimeStateOptions(state),
  );
}

export function resetGraphEditorRuntime<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  state: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType>,
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  options: {
    selection?: GraphEditorSelectionState | null;
    markSaved?: boolean;
  } = {},
): GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType> {
  const runtimeOptions = getGraphEditorRuntimeStateOptions(state);
  const normalizedDocument = normalizeGraphEditorDocument(document, {
    ...(runtimeOptions.validationOptions ?? {}),
    mode: "repair",
  });
  const runtime = resetEditorRuntime(state.runtime, normalizedDocument, {
    markSaved: options.markSaved,
    selection: normalizeGraphEditorSelection(
      normalizedDocument,
      options.selection ?? { nodeIds: [], edgeIds: [] },
    ),
  });

  return withGraphEditorRuntimeState(
    {
      ...state,
      issues: [],
      lastMergeKey: null,
      operationHistory: { undoStack: [], redoStack: [] },
      runtime,
    },
    runtimeOptions,
  );
}

export function setGraphEditorRuntimeSelection<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  state: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType>,
  selection: GraphEditorSelectionState | null,
): GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType> {
  const normalized = selection
    ? normalizeGraphEditorSelection(state.document, selection)
    : { nodeIds: [], edgeIds: [] };
  const runtime = setEditorRuntimeSelection(state.runtime, normalized);
  return withGraphEditorRuntimeState(
    {
      ...state,
      runtime,
    },
    getGraphEditorRuntimeStateOptions(state),
  );
}

export function markGraphEditorRuntimeSaved<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  state: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType>,
): GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType> {
  return withGraphEditorRuntimeState(
    {
      ...state,
      runtime: markEditorRuntimeSaved(state.runtime),
    },
    getGraphEditorRuntimeStateOptions(state),
  );
}

export function replaceGraphEditorRuntimeCoreState<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  state: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType>,
  runtime: EditorRuntimeState<
    GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    GraphEditorSelectionState
  >,
  options: {
    clearOperationHistory?: boolean;
  } = {},
): GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType> {
  const operationHistory = options.clearOperationHistory
    ? { undoStack: [], redoStack: [] }
    : state.operationHistory;
  return withGraphEditorRuntimeState(
    {
      ...state,
      canUndo: operationHistory.undoStack.length > 0,
      canRedo: operationHistory.redoStack.length > 0,
      issues: [],
      lastMergeKey: options.clearOperationHistory ? null : state.lastMergeKey,
      operationHistory,
      runtime,
    },
    getGraphEditorRuntimeStateOptions(state),
  );
}

function resolveGraphEditorOperation<
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

function preflightGraphEditorOperation<
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

function withGraphEditorRuntimeState<
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

function getGraphEditorRuntimeStateOptions<
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

function toRuntimeStateOptions<
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
