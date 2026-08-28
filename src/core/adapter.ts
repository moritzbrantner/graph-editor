import type {
  GraphEditorDocument,
  GraphEditorEdge,
  GraphEditorNode,
  GraphEditorPort,
} from "./types";

export type GraphEditorFoundationNode<
  TNodeData = Record<string, unknown>,
  TPortType = unknown,
> = GraphEditorNode<TNodeData, TPortType> & {
  type: string;
};

export type GraphEditorFoundationEdge<TEdgeData = Record<string, unknown>> = GraphEditorEdge<TEdgeData> & {
  sourceId: string;
  targetId: string;
  properties: GraphEditorEdge<TEdgeData>;
};

export type GraphEditorFoundationPort<
  TPortType = unknown,
  TPortData = Record<string, unknown>,
> = GraphEditorPort<TPortType, TPortData> & {
  direction: "input" | "output";
};

export type GraphEditorGraphAdapter<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  getNodes: (
    document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  ) => readonly GraphEditorFoundationNode<TNodeData, TPortType>[];
  getEdges: (
    document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  ) => readonly GraphEditorFoundationEdge<TEdgeData>[];
  getPorts: (
    node: GraphEditorFoundationNode<TNodeData, TPortType>,
  ) => readonly GraphEditorFoundationPort<TPortType>[];
};

export function createGraphEditorGraphAdapter<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(): GraphEditorGraphAdapter<TNodeData, TEdgeData, TPortType> {
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
    sourceId: edge.sourceNodeId,
    targetId: edge.targetNodeId,
    properties: edge,
  };
}

export function toEditorGraphPort<TPortType, TPortData>(
  port: GraphEditorPort<TPortType, TPortData>,
  direction: GraphEditorFoundationPort<TPortType, TPortData>["direction"],
): GraphEditorFoundationPort<TPortType, TPortData> {
  return {
    ...port,
    direction,
  };
}
