import * as editorOperations from "@moritzbrantner/editor-core/operations";
import type { EditorOperationRuntimeState } from "@moritzbrantner/editor-core/operations";
import type { EditorRuntimeState } from "@moritzbrantner/editor-core/runtime";

type ReplaceEditorOperationRuntimeCoreState = <TDocument, TSelection = unknown>(
  state: EditorOperationRuntimeState<TDocument, TSelection>,
  runtime: EditorRuntimeState<TDocument, TSelection>,
  options?: { clearOperationHistory?: boolean },
) => EditorOperationRuntimeState<TDocument, TSelection>;

function getCoreStateReplacement() {
  return (
    editorOperations as unknown as {
      replaceEditorOperationRuntimeCoreState?: ReplaceEditorOperationRuntimeCoreState;
    }
  ).replaceEditorOperationRuntimeCoreState;
}

export function replaceEditorOperationRuntimeCoreStateCompat<TDocument, TSelection = unknown>(
  state: EditorOperationRuntimeState<TDocument, TSelection>,
  runtime: EditorRuntimeState<TDocument, TSelection>,
  options: { clearOperationHistory?: boolean } = {},
): EditorOperationRuntimeState<TDocument, TSelection> {
  const replaceCoreState = getCoreStateReplacement();
  if (replaceCoreState) {
    return replaceCoreState(state, runtime, options);
  }

  const operationHistory = options.clearOperationHistory
    ? { undoStack: [], redoStack: [] }
    : state.operationHistory;
  const mutable = state as unknown as {
    runtime: EditorRuntimeState<TDocument, TSelection>;
    operationHistory: EditorOperationRuntimeState<TDocument, TSelection>["operationHistory"];
    canUndo: boolean;
    canRedo: boolean;
    issues: EditorOperationRuntimeState<TDocument, TSelection>["issues"];
    lastMergeKey: string | null;
  };
  mutable.runtime = runtime;
  mutable.operationHistory = operationHistory;
  mutable.canUndo = operationHistory.undoStack.length > 0;
  mutable.canRedo = operationHistory.redoStack.length > 0;
  mutable.issues = [];
  mutable.lastMergeKey = options.clearOperationHistory ? null : state.lastMergeKey;
  return state;
}

export function preserveEditorOperationRuntimeHistoryCompat<TDocument, TSelection = unknown>(
  previous: EditorOperationRuntimeState<TDocument, TSelection>,
  next: EditorOperationRuntimeState<TDocument, TSelection>,
): EditorOperationRuntimeState<TDocument, TSelection> {
  if (getCoreStateReplacement()) {
    return next;
  }

  const mutable = next as unknown as {
    operationHistory: EditorOperationRuntimeState<TDocument, TSelection>["operationHistory"];
    canUndo: boolean;
    canRedo: boolean;
  };
  mutable.operationHistory = previous.operationHistory;
  mutable.canUndo = previous.operationHistory.undoStack.length > 0;
  mutable.canRedo = previous.operationHistory.redoStack.length > 0;
  return next;
}
