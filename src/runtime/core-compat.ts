import * as editorOperations from "@moritzbrantner/editor-core/operations";
import type { EditorOperationRuntimeState } from "@moritzbrantner/editor-core/operations";
import type { EditorRuntimeState } from "@moritzbrantner/editor-core/runtime";

type ReplaceEditorOperationRuntimeCoreState = <TDocument, TSelection = unknown>(
  state: EditorOperationRuntimeState<TDocument, TSelection>,
  runtime: EditorRuntimeState<TDocument, TSelection>,
  options?: { clearIssues?: boolean; clearOperationHistory?: boolean },
) => EditorOperationRuntimeState<TDocument, TSelection>;

type EditorOperationRuntimeFactory<TDocument, TSelection> = () => EditorOperationRuntimeState<
  TDocument,
  TSelection
>;

const legacyRuntimeFactoryByState = new WeakMap<
  object,
  EditorOperationRuntimeFactory<unknown, unknown>
>();

function getCoreStateReplacement() {
  return (
    editorOperations as unknown as {
      replaceEditorOperationRuntimeCoreState?: ReplaceEditorOperationRuntimeCoreState;
    }
  ).replaceEditorOperationRuntimeCoreState;
}

export function registerEditorOperationRuntimeCompat<TDocument, TSelection = unknown>(
  state: EditorOperationRuntimeState<TDocument, TSelection>,
  factory: EditorOperationRuntimeFactory<TDocument, TSelection>,
): EditorOperationRuntimeState<TDocument, TSelection> {
  legacyRuntimeFactoryByState.set(
    state,
    factory as EditorOperationRuntimeFactory<unknown, unknown>,
  );
  return state;
}

export function inheritEditorOperationRuntimeCompat<TDocument, TSelection = unknown>(
  previous: EditorOperationRuntimeState<TDocument, TSelection>,
  next: EditorOperationRuntimeState<TDocument, TSelection>,
): EditorOperationRuntimeState<TDocument, TSelection> {
  const factory = legacyRuntimeFactoryByState.get(previous);
  if (factory) {
    legacyRuntimeFactoryByState.set(next, factory);
  }
  return next;
}

function createLegacyReplacementState<TDocument, TSelection>(
  state: EditorOperationRuntimeState<TDocument, TSelection>,
): EditorOperationRuntimeState<TDocument, TSelection> {
  const factory = legacyRuntimeFactoryByState.get(state);
  if (!factory) {
    throw new Error("Legacy editor-core compatibility state is missing its runtime factory.");
  }

  const replacement = factory() as EditorOperationRuntimeState<TDocument, TSelection>;
  legacyRuntimeFactoryByState.set(replacement, factory);
  return replacement;
}

export function replaceEditorOperationRuntimeCoreStateCompat<TDocument, TSelection = unknown>(
  state: EditorOperationRuntimeState<TDocument, TSelection>,
  runtime: EditorRuntimeState<TDocument, TSelection>,
  options: { clearIssues?: boolean; clearOperationHistory?: boolean } = {},
): EditorOperationRuntimeState<TDocument, TSelection> {
  const replaceCoreState = getCoreStateReplacement();
  if (replaceCoreState) {
    return inheritEditorOperationRuntimeCompat(state, replaceCoreState(state, runtime, options));
  }

  const operationHistory = options.clearOperationHistory
    ? { undoStack: [], redoStack: [] }
    : state.operationHistory;
  const replacement = createLegacyReplacementState(state);
  const mutable = replacement as unknown as {
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
  mutable.issues = options.clearIssues ? [] : state.issues;
  mutable.lastMergeKey = options.clearOperationHistory ? null : state.lastMergeKey;
  return replacement;
}

export function preserveEditorOperationRuntimeHistoryCompat<TDocument, TSelection = unknown>(
  previous: EditorOperationRuntimeState<TDocument, TSelection>,
  next: EditorOperationRuntimeState<TDocument, TSelection>,
): EditorOperationRuntimeState<TDocument, TSelection> {
  if (getCoreStateReplacement()) {
    return inheritEditorOperationRuntimeCompat(previous, next);
  }

  const mutable = next as unknown as {
    operationHistory: EditorOperationRuntimeState<TDocument, TSelection>["operationHistory"];
    canUndo: boolean;
    canRedo: boolean;
  };
  mutable.operationHistory = previous.operationHistory;
  mutable.canUndo = previous.operationHistory.undoStack.length > 0;
  mutable.canRedo = previous.operationHistory.redoStack.length > 0;
  return inheritEditorOperationRuntimeCompat(previous, next);
}
