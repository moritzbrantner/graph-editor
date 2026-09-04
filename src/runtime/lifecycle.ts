import {
  applyEditorOperation,
  createEditorOperationRuntime,
  redoEditorOperationRuntime,
  undoEditorOperationRuntime,
  type ApplyEditorOperationOptions,
} from "@moritzbrantner/editor-core/operations";
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
  type GraphEditorDocument,
  type GraphEditorSelectionState,
} from "../core";
import type { GraphEditorOperation } from "../operations";
import {
  createGraphEditorPluginRegistry,
  resolveGraphEditorPluginRuntimeOptions,
} from "../plugins";
import {
  getGraphEditorRuntimeStateOptions,
  graphEditorDocumentsEqual,
  preflightGraphEditorOperation,
  resolveGraphEditorOperation,
  toRuntimeStateOptions,
  withGraphEditorRuntimeState,
} from "./state";
import {
  preserveEditorOperationRuntimeHistoryCompat,
  replaceEditorOperationRuntimeCoreStateCompat,
} from "./core-compat";
import type { GraphEditorRuntimeOptions, GraphEditorRuntimeState } from "./types";

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
  const historyEnabled =
    !runtimeOptions.disableHistory && operation.metadata?.graphEditor?.history !== false;
  const applyOptions: ApplyEditorOperationOptions & { recordHistory?: boolean } = {
    ...options,
    recordHistory: historyEnabled,
  };
  const appliedState = applyEditorOperation(state, resolvedOperation, applyOptions);
  const nextState = historyEnabled
    ? appliedState
    : preserveEditorOperationRuntimeHistoryCompat(state, appliedState);

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
    replaceEditorOperationRuntimeCoreStateCompat(state, runtime, {
      clearOperationHistory: true,
    }),
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
    replaceEditorOperationRuntimeCoreStateCompat(state, runtime),
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
    replaceEditorOperationRuntimeCoreStateCompat(state, markEditorRuntimeSaved(state.runtime)),
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
  return withGraphEditorRuntimeState(
    replaceEditorOperationRuntimeCoreStateCompat(state, runtime, options),
    getGraphEditorRuntimeStateOptions(state),
  );
}
