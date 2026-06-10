import { createUniqueEditorId } from "@moritzbrantner/editor-core/entities";

import {
  addGraphEditorEdge,
  removeGraphEditorEdge,
  updateGraphEditorEdge,
  validateGraphEditorConnection,
  validateGraphEditorDocument,
  type GraphEditorConnectionInput,
  type GraphEditorDocument,
  type GraphEditorEdge,
  type GraphEditorSelectionState,
} from "../core";

import type { CreateGraphEditorAddEdgeOperationOptions, GraphEditorOperation } from "./types";

export function createGraphEditorAddEdgeOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  options: CreateGraphEditorAddEdgeOperationOptions<TNodeData, TEdgeData, TPortType>,
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  return {
    id: "graph.add-edge",
    label: "Add edge",
    apply: (document) => {
      const edge =
        "edge" in options
          ? options.edge
          : createGraphEditorEdgeFromConnection(document, options.connection, options);
      if (!edge || document.edges.some((candidate) => candidate.id === edge.id)) {
        return document;
      }
      const nextDocument = { ...document, edges: [...document.edges, edge] };
      if (validateGraphEditorDocument(nextDocument).length > 0) {
        return nextDocument;
      }
      return addGraphEditorEdge(document, edge);
    },
    selectionBefore: options.selectionBefore,
    selectionAfter: options.selectionAfter,
  };
}

export function createGraphEditorUpdateEdgeOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  edgeId: string,
  patch: Partial<GraphEditorEdge<TEdgeData>>,
  options: {
    selectionBefore?: GraphEditorSelectionState;
    selectionAfter?: GraphEditorSelectionState;
  } = {},
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  return {
    id: "graph.update-edge",
    label: "Update edge",
    apply: (document) => updateGraphEditorEdge(document, edgeId, patch),
    selectionBefore: options.selectionBefore,
    selectionAfter: options.selectionAfter,
  };
}

export function createGraphEditorRemoveEdgeOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  edgeId: string,
  options: { selectionBefore?: GraphEditorSelectionState } = {},
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  return {
    id: "graph.remove-edge",
    label: "Remove edge",
    apply: (document) => removeGraphEditorEdge(document, edgeId),
    selectionBefore: options.selectionBefore,
    selectionAfter: { nodeIds: [], edgeIds: [] },
  };
}

function createGraphEditorEdgeFromConnection<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  connection: GraphEditorConnectionInput,
  options: Extract<
    CreateGraphEditorAddEdgeOperationOptions<TNodeData, TEdgeData, TPortType>,
    { connection: GraphEditorConnectionInput }
  >,
) {
  const validity = validateGraphEditorConnection(document, connection, options.validationOptions);
  if (!validity.valid) {
    return null;
  }
  return (
    options.createEdge?.(connection, { document, validity }) ??
    ({
      id: createGraphEditorEdgeId(document, connection),
      ...connection,
    } as GraphEditorEdge<TEdgeData>)
  );
}

function createGraphEditorEdgeId<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  connection: GraphEditorConnectionInput,
) {
  return createUniqueId(
    `${connection.sourceNodeId}:${connection.sourcePortId}->${connection.targetNodeId}:${connection.targetPortId}`,
    new Set(document.edges.map((edge) => edge.id)),
  );
}

const createUniqueId = createUniqueEditorId;
