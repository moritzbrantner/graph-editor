import {
  createLocalStorageEditorStorage,
  type EditorStorageAdapter,
  type LocalStorageEditorStorageOptions,
} from "@moritzbrantner/editor-core/browser";
import {
  loadEditorRuntimePersistence,
  saveEditorRuntimePersistence,
  type EditorPersistenceState,
  type LoadEditorRuntimePersistenceOptions,
  type SaveEditorRuntimePersistenceOptions,
} from "@moritzbrantner/editor-core/persistence";

import {
  normalizeGraphEditorDocument,
  type GraphEditorDocument,
  type GraphEditorSelectionState,
} from "./core";
import { replaceGraphEditorRuntimeCoreState, type GraphEditorRuntimeState } from "./runtime";

export type GraphEditorStorageAdapter<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = EditorStorageAdapter<GraphEditorDocument<TNodeData, TEdgeData, TPortType>>;

export type GraphEditorLocalStorageOptions<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = LocalStorageEditorStorageOptions<GraphEditorDocument<TNodeData, TEdgeData, TPortType>>;

export type LoadGraphEditorRuntimePersistenceOptions<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = LoadEditorRuntimePersistenceOptions<
  GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  GraphEditorSelectionState
>;

export type SaveGraphEditorRuntimePersistenceOptions = SaveEditorRuntimePersistenceOptions;

export type LoadGraphEditorRuntimePersistenceResult<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  runtime: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType>;
  persistence: EditorPersistenceState;
};

export type SaveGraphEditorRuntimePersistenceResult<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = LoadGraphEditorRuntimePersistenceResult<TNodeData, TEdgeData, TPortType> & {
  saved: boolean;
  revision: number;
};

export function createGraphEditorLocalStorage<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  options: GraphEditorLocalStorageOptions<TNodeData, TEdgeData, TPortType>,
): GraphEditorStorageAdapter<TNodeData, TEdgeData, TPortType> {
  return createLocalStorageEditorStorage({
    ...options,
    parse: options.parse
      ? (input) => normalizeGraphEditorDocument(options.parse!(input))
      : (input) =>
          normalizeGraphEditorDocument(
            input as GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
          ),
    serialize: options.serialize,
  });
}

export function createGraphEditorMemoryStorage<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  initialDocument?: GraphEditorDocument<TNodeData, TEdgeData, TPortType> | null,
): GraphEditorStorageAdapter<TNodeData, TEdgeData, TPortType> {
  let document = initialDocument
    ? normalizeGraphEditorDocument(initialDocument, { mode: "repair" })
    : null;

  return {
    load: () => document,
    save(value) {
      document = normalizeGraphEditorDocument(value, { mode: "repair" });
    },
  };
}

export async function loadGraphEditorRuntimePersistence<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  state: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType>,
  storage: GraphEditorStorageAdapter<TNodeData, TEdgeData, TPortType>,
  options: LoadGraphEditorRuntimePersistenceOptions<TNodeData, TEdgeData, TPortType> = {},
): Promise<LoadGraphEditorRuntimePersistenceResult<TNodeData, TEdgeData, TPortType>> {
  const result = await loadEditorRuntimePersistence(state.runtime, storage, options);
  return {
    persistence: result.persistence,
    runtime: replaceGraphEditorRuntimeCoreState(state, result.runtime, {
      // Loading replaces the committed document snapshot, so old undo/redo entries no longer apply.
      clearOperationHistory: true,
    }),
  };
}

export async function saveGraphEditorRuntimePersistence<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  state: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType>,
  storage: GraphEditorStorageAdapter<TNodeData, TEdgeData, TPortType>,
  options: SaveGraphEditorRuntimePersistenceOptions = {},
): Promise<SaveGraphEditorRuntimePersistenceResult<TNodeData, TEdgeData, TPortType>> {
  const result = await saveEditorRuntimePersistence(state.runtime, storage, options);
  return {
    persistence: result.persistence,
    revision: result.revision,
    runtime: replaceGraphEditorRuntimeCoreState(state, result.runtime),
    saved: result.saved,
  };
}
