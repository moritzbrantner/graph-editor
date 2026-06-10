import type {
  EditorEntityBase,
  EditorEntityId,
  EditorGraphAdapter,
  EditorGraphEdge,
  EditorGraphPort,
} from "@moritzbrantner/editor-core/entities";

import type {
  GraphEditorDocument,
  GraphEditorEdge,
  GraphEditorNode,
  GraphEditorPort,
} from "./types";

export type GraphEditorFoundationNode<
  TNodeData = Record<string, unknown>,
  TPortType = unknown,
> = GraphEditorNode<TNodeData, TPortType> & EditorEntityBase;

export type GraphEditorFoundationEdge<TEdgeData = Record<string, unknown>> = EditorGraphEdge & {
  sourceNodeId: EditorEntityId;
  sourcePortId: string;
  targetNodeId: EditorEntityId;
  targetPortId: string;
  properties: GraphEditorEdge<TEdgeData>;
};

export function createGraphEditorGraphAdapter<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(): EditorGraphAdapter<
  GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  GraphEditorFoundationNode<TNodeData, TPortType>,
  GraphEditorFoundationEdge<TEdgeData>
> {
  return {
    getNodes: (document) => document.nodes.map(toEditorGraphNode),
    getEdges: (document) => document.edges.map(toEditorGraphEdge),
    getPorts: (node) => [
      ...(node.inputs ?? []).map((port) => toEditorGraphPort(port, "input" as const)),
      ...(node.outputs ?? []).map((port) => toEditorGraphPort(port, "output" as const)),
    ],
  };
}

export function toEditorGraphNode<TNodeData, TPortType>(
  node: GraphEditorNode<TNodeData, TPortType>,
): GraphEditorFoundationNode<TNodeData, TPortType> {
  return {
    ...node,
    type: node.type ?? node.kind ?? "graph-node",
  };
}

export function toEditorGraphEdge<TEdgeData>(
  edge: GraphEditorEdge<TEdgeData>,
): GraphEditorFoundationEdge<TEdgeData> {
  return {
    ...edge,
    id: edge.id,
    sourceId: edge.sourceNodeId,
    sourceNodeId: edge.sourceNodeId,
    sourcePortId: edge.sourcePortId,
    targetId: edge.targetNodeId,
    targetNodeId: edge.targetNodeId,
    targetPortId: edge.targetPortId,
    properties: edge,
  };
}

export function toEditorGraphPort<TPortType>(
  port: GraphEditorPort<TPortType>,
  direction: NonNullable<EditorGraphPort["direction"]>,
): EditorGraphPort {
  return {
    ...port,
    direction,
  };
}
