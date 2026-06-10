import type { EditorOperationRuntimeState } from "@moritzbrantner/editor-core/operations";

import type {
  GraphEditorConnectionValidationOptions,
  GraphEditorDocument,
  GraphEditorDocumentDiagnostic,
  GraphEditorDocumentValidationOptions,
  GraphEditorSelectionState,
} from "../core";
import type { GraphEditorPlugin } from "../plugins";

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

export type GraphEditorRuntimeStateOptions<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = Omit<GraphEditorRuntimeOptions<TNodeData, TEdgeData, TPortType>, "initialDocument">;
