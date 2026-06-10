import type { EditorEntityId } from "@moritzbrantner/editor-core/entities";
import { createEditorGraphIndexes } from "@moritzbrantner/editor-core/indexes";

import { toEditorGraphEdge } from "./adapter";
import { addGraphEditorEdge } from "./mutations";
import { wouldCreateGraphEditorCycle } from "./graph";
import type {
  GraphEditorConnectionInput,
  GraphEditorConnectionValidationOptions,
  GraphEditorConnectionValidity,
  GraphEditorDocument,
  GraphEditorDocumentContext,
  GraphEditorEdge,
} from "./types";
import { createUniqueId } from "./utils";

export function createGraphEditorDocumentContext<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
): GraphEditorDocumentContext<TNodeData, TEdgeData, TPortType> {
  const nodeById = new Map(document.nodes.map((node) => [node.id, node]));
  const editorGraphIndexes = createEditorGraphIndexes(document.edges.map(toEditorGraphEdge));
  const edgeById = new Map<EditorEntityId, GraphEditorEdge<TEdgeData>>();
  const adjacencyByNodeId = new Map<EditorEntityId, EditorEntityId[]>();
  const incomingEdgesByNodeId = new Map<EditorEntityId, GraphEditorEdge<TEdgeData>[]>();
  const outgoingEdgesByNodeId = new Map<EditorEntityId, GraphEditorEdge<TEdgeData>[]>();
  for (const node of document.nodes) {
    adjacencyByNodeId.set(node.id, []);
    incomingEdgesByNodeId.set(node.id, []);
    outgoingEdgesByNodeId.set(node.id, []);
  }
  for (const edge of editorGraphIndexes.edgesById.values()) {
    edgeById.set(edge.id, edge.properties);
  }
  for (const [nodeId, edges] of editorGraphIndexes.outgoingEdgesByNodeId) {
    adjacencyByNodeId.set(
      nodeId,
      edges.map((edge) => edge.targetId),
    );
    outgoingEdgesByNodeId.set(
      nodeId,
      edges.map((edge) => edge.properties),
    );
  }
  for (const [nodeId, edges] of editorGraphIndexes.incomingEdgesByNodeId) {
    incomingEdgesByNodeId.set(
      nodeId,
      edges.map((edge) => edge.properties),
    );
  }

  const context: GraphEditorDocumentContext<TNodeData, TEdgeData, TPortType> = {
    nodeById,
    edgeById,
    adjacencyByNodeId,
    incomingEdgesByNodeId,
    outgoingEdgesByNodeId,
    getInputPort(nodeId, portId) {
      return nodeById.get(nodeId)?.inputs?.find((port) => port.id === portId) ?? null;
    },
    getOutputPort(nodeId, portId) {
      return nodeById.get(nodeId)?.outputs?.find((port) => port.id === portId) ?? null;
    },
    getIncomingEdgeToPort(nodeId, portId) {
      return (
        incomingEdgesByNodeId
          .get(nodeId)
          ?.find((edge) => edge.targetNodeId === nodeId && edge.targetPortId === portId) ?? null
      );
    },
    canReach(sourceNodeId, targetNodeId) {
      const visited = new Set<string>();
      const stack = [sourceNodeId];
      while (stack.length > 0) {
        const nodeId = stack.pop()!;
        if (nodeId === targetNodeId) {
          return true;
        }
        if (visited.has(nodeId)) {
          continue;
        }
        visited.add(nodeId);
        stack.push(...(adjacencyByNodeId.get(nodeId) ?? []));
      }
      return false;
    },
  };
  return context;
}

export function validateGraphEditorConnection<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  connection: GraphEditorConnectionInput,
  options: GraphEditorConnectionValidationOptions<TNodeData, TEdgeData, TPortType> = {},
): GraphEditorConnectionValidity {
  const context = createGraphEditorDocumentContext(document);
  const sourceNode = context.nodeById.get(connection.sourceNodeId);
  const targetNode = context.nodeById.get(connection.targetNodeId);
  if (!sourceNode || !targetNode) {
    return { valid: false, reason: "missing-node" };
  }
  if (!options.allowSelfConnections && connection.sourceNodeId === connection.targetNodeId) {
    return { valid: false, reason: "self-connection" };
  }
  const sourcePort = context.getOutputPort(connection.sourceNodeId, connection.sourcePortId);
  const targetPort = context.getInputPort(connection.targetNodeId, connection.targetPortId);
  if (!sourcePort || !targetPort) {
    return { valid: false, reason: "missing-port" };
  }
  if (
    !options.allowDuplicateEdges &&
    document.edges.some(
      (edge) =>
        edge.id !== options.ignoreEdgeId &&
        edge.sourceNodeId === connection.sourceNodeId &&
        edge.sourcePortId === connection.sourcePortId &&
        edge.targetNodeId === connection.targetNodeId &&
        edge.targetPortId === connection.targetPortId,
    )
  ) {
    return { valid: false, reason: "duplicate" };
  }
  if (
    !options.allowOccupiedInputs &&
    document.edges.some(
      (edge) =>
        edge.id !== options.ignoreEdgeId &&
        edge.targetNodeId === connection.targetNodeId &&
        edge.targetPortId === connection.targetPortId,
    )
  ) {
    return { valid: false, reason: "input-occupied" };
  }
  if (sourcePort.kind && targetPort.kind && sourcePort.kind !== targetPort.kind) {
    return { valid: false, reason: "kind-mismatch" };
  }
  if (options.arePortsCompatible) {
    const compatible = options.arePortsCompatible(sourcePort, targetPort, context);
    if (typeof compatible === "object") {
      return compatible;
    }
    if (!compatible) {
      return { valid: false, reason: "type-mismatch" };
    }
  }
  if (!options.allowCycles && wouldCreateGraphEditorCycle(document, connection, context)) {
    return { valid: false, reason: "cycle" };
  }
  return { valid: true };
}

export function connectGraphEditorNodes<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  connection: GraphEditorConnectionInput,
  options: GraphEditorConnectionValidationOptions<TNodeData, TEdgeData, TPortType> = {},
): GraphEditorDocument<TNodeData, TEdgeData, TPortType> {
  const validity = validateGraphEditorConnection(document, connection, options);
  if (!validity.valid) {
    return document;
  }
  return addGraphEditorEdge(document, {
    id: createGraphEditorEdgeId(document, connection),
    ...connection,
  } as GraphEditorEdge<TEdgeData>);
}

function createGraphEditorEdgeId<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  connection: GraphEditorConnectionInput,
) {
  const existingIds = new Set(document.edges.map((edge) => edge.id));
  return createUniqueId(
    `${connection.sourceNodeId}:${connection.sourcePortId}->${connection.targetNodeId}:${connection.targetPortId}`,
    existingIds,
  );
}
