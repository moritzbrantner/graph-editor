import type { EditorOperation } from "@moritzbrantner/editor-core/operations";

import type {
  GraphEditorConnectionInput,
  GraphEditorConnectionValidationOptions,
  GraphEditorConnectionValidity,
  GraphEditorDocument,
  GraphEditorEdge,
  GraphEditorNode,
  GraphEditorNodeTemplate,
  GraphEditorSelectionState,
} from "../core";
import type { GraphEditorLayoutResult } from "../layout";
import type { GraphEditorDocumentPatch } from "../patches";

export type GraphEditorOperationId =
  | "graph.select"
  | "graph.add-node"
  | "graph.update-node"
  | "graph.move-nodes"
  | "graph.remove-selection"
  | "graph.add-edge"
  | "graph.update-edge"
  | "graph.remove-edge"
  | "graph.duplicate-selection"
  | "graph.paste"
  | "graph.create-group"
  | "graph.ungroup"
  | "graph.layout"
  | "graph.update-viewport"
  | "graph.replace-document"
  | "graph.patch";

export type GraphEditorOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = EditorOperation<
  GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  GraphEditorSelectionState
> & {
  id: GraphEditorOperationId;
  getSelectionAfter?: (
    before: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    after: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  ) => GraphEditorSelectionState | null | undefined;
  metadata?: Record<string, unknown> & {
    graphEditor?: {
      history?: boolean;
      layoutResult?: GraphEditorLayoutResult<TNodeData, TEdgeData, TPortType>;
      patch?: GraphEditorDocumentPatch;
    };
  };
};

export type CreateGraphEditorAddNodeOperationOptions<
  TNodeData = Record<string, unknown>,
  TPortType = unknown,
> =
  | {
      node: GraphEditorNode<TNodeData, TPortType>;
      selectionBefore?: GraphEditorSelectionState;
      selectionAfter?: GraphEditorSelectionState;
    }
  | {
      template: GraphEditorNodeTemplate<TNodeData, TPortType>;
      id: string;
      position: { x: number; y: number };
      selectionBefore?: GraphEditorSelectionState;
      selectionAfter?: GraphEditorSelectionState;
    };

export type CreateGraphEditorAddEdgeOperationOptions<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> =
  | {
      edge: GraphEditorEdge<TEdgeData>;
      selectionBefore?: GraphEditorSelectionState;
      selectionAfter?: GraphEditorSelectionState;
    }
  | {
      connection: GraphEditorConnectionInput;
      validationOptions?: GraphEditorConnectionValidationOptions<TNodeData, TEdgeData, TPortType>;
      createEdge?: (
        connection: GraphEditorConnectionInput,
        context: {
          document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
          validity: GraphEditorConnectionValidity;
        },
      ) => GraphEditorEdge<TEdgeData>;
      selectionBefore?: GraphEditorSelectionState;
      selectionAfter?: GraphEditorSelectionState;
    };
