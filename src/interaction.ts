import {
  createEditorInteractionSession,
  type EditorInteractionState,
} from "@moritzbrantner/editor-core/interaction";
import type { EditorEntityId, EditorPoint } from "@moritzbrantner/editor-core/entities";

import {
  normalizeGraphEditorDocument,
  type GraphEditorConnectionInput,
  type GraphEditorDocument,
} from "./core";
import { createGraphEditorMoveNodesOperation, type GraphEditorOperation } from "./operations";
import { applyGraphEditorOperation, type GraphEditorRuntimeState } from "./runtime";

export type GraphEditorInteractionState =
  | EditorInteractionState
  | {
      kind: "graph-moving-nodes";
      nodeIds: readonly EditorEntityId[];
      origin: EditorPoint;
    }
  | {
      kind: "graph-connecting";
      connection: Partial<GraphEditorConnectionInput> & {
        sourceNodeId: EditorEntityId;
        sourcePortId: string;
      };
    }
  | {
      kind: "graph-rewiring-edge";
      edgeId: EditorEntityId;
      origin: "source" | "target";
    }
  | {
      kind: "graph-marquee-selecting";
      origin: EditorPoint;
      current: EditorPoint;
    };

export type GraphEditorInteractionSession<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  committedDocument: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  previewDocument: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  state: GraphEditorInteractionState;
};

export function createGraphEditorInteractionSession<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
): GraphEditorInteractionSession<TNodeData, TEdgeData, TPortType> {
  return createEditorInteractionSession(normalizeGraphEditorDocument(document));
}

export function beginGraphEditorMoveInteraction<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  session: GraphEditorInteractionSession<TNodeData, TEdgeData, TPortType>,
  options: {
    nodeIds: readonly EditorEntityId[];
    origin: EditorPoint;
  },
): GraphEditorInteractionSession<TNodeData, TEdgeData, TPortType> {
  return {
    committedDocument: session.committedDocument,
    previewDocument: session.committedDocument,
    state: {
      kind: "graph-moving-nodes",
      nodeIds: options.nodeIds,
      origin: options.origin,
    },
  };
}

export function previewGraphEditorMoveInteraction<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  session: GraphEditorInteractionSession<TNodeData, TEdgeData, TPortType>,
  positionsByNodeId: Readonly<Record<string, { x: number; y: number }>>,
): GraphEditorInteractionSession<TNodeData, TEdgeData, TPortType> {
  return {
    ...session,
    previewDocument: createGraphEditorMoveNodesOperation<TNodeData, TEdgeData, TPortType>(
      positionsByNodeId,
    ).apply(session.committedDocument),
  };
}

export function cancelGraphEditorInteraction<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  session: GraphEditorInteractionSession<TNodeData, TEdgeData, TPortType>,
): GraphEditorInteractionSession<TNodeData, TEdgeData, TPortType> {
  return createEditorInteractionSession(session.committedDocument);
}

export function commitGraphEditorInteraction<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  session: GraphEditorInteractionSession<TNodeData, TEdgeData, TPortType>,
): GraphEditorInteractionSession<TNodeData, TEdgeData, TPortType> {
  return createEditorInteractionSession(session.previewDocument);
}

export function commitGraphEditorInteractionOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  runtime: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType>,
  operation: GraphEditorOperation<TNodeData, TEdgeData, TPortType>,
): GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType> {
  return applyGraphEditorOperation(runtime, operation, { merge: true });
}
