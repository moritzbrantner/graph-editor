import { createEditorGraphIndexes } from "@moritzbrantner/editor-core/indexes";

import { toEditorGraphEdge } from "./adapter";
import { createGraphEditorDocumentContext } from "./context";
import type {
  GraphEditorConnectionInput,
  GraphEditorDocument,
  GraphEditorEdge,
  GraphEditorNode,
} from "./types";

export type GraphEditorIndexedNode<TData = Record<string, unknown>, TPortType = unknown> = {
  id: string;
  index: number;
  label: string;
  properties: GraphEditorNode<TData, TPortType>;
};

export type GraphEditorIndexedEdge<TData = Record<string, unknown>> = {
  directed: true;
  id: string;
  index: number;
  source: string;
  target: string;
  properties: GraphEditorEdge<TData>;
};

export type GraphEditorSubgraph<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  nodes: Array<GraphEditorIndexedNode<TNodeData, TPortType>>;
  edges: Array<GraphEditorIndexedEdge<TEdgeData>>;
  summary: {
    edgeCount: number;
    offset: number;
    selectedNodeCount: number;
    totalCount: number;
  };
};

export type GraphEditorGraphIndex<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  getEdgeById(edgeId: string): GraphEditorIndexedEdge<TEdgeData> | null;
  getNodeById(nodeId: string): GraphEditorIndexedNode<TNodeData, TPortType> | null;
  getSubgraph(query: {
    offset?: number;
    limit?: number;
  }): GraphEditorSubgraph<TNodeData, TEdgeData, TPortType>;
};

export function createGraphEditorGraphIndex<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>) {
  const editorGraphIndexes = createEditorGraphIndexes(document.edges.map(toEditorGraphEdge));
  const nodes = document.nodes.map(
    (node, index): GraphEditorIndexedNode<TNodeData, TPortType> => ({
      id: node.id,
      index,
      label: node.label,
      properties: node,
    }),
  );
  const nodeLookup = new Map(nodes.map((node) => [node.id, node]));
  const edges = document.edges
    .map(
      (edge, index): GraphEditorIndexedEdge<TEdgeData> => ({
        directed: true,
        id: edge.id,
        index,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        properties: edge,
      }),
    )
    .filter(
      (edge) =>
        editorGraphIndexes.edgesById.has(edge.id) &&
        nodeLookup.has(edge.source) &&
        nodeLookup.has(edge.target),
    );
  const edgeLookup = new Map(edges.map((edge) => [edge.id, edge]));
  return {
    getEdgeById(edgeId: string) {
      return edgeLookup.get(edgeId) ?? null;
    },
    getNodeById(nodeId: string) {
      return nodeLookup.get(nodeId) ?? null;
    },
    getSubgraph(query: { offset?: number; limit?: number }) {
      const offset = Math.max(0, Math.trunc(query.offset ?? 0));
      const limit = Math.max(0, Math.trunc(query.limit ?? nodes.length));
      const selectedNodes = nodes.slice(offset, offset + limit);
      const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));
      const selectedEdges = edges.filter(
        (edge) => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target),
      );
      return {
        edges: selectedEdges,
        nodes: selectedNodes,
        summary: {
          edgeCount: selectedEdges.length,
          offset,
          selectedNodeCount: selectedNodes.length,
          totalCount: nodes.length,
        },
      };
    },
  } satisfies GraphEditorGraphIndex<TNodeData, TEdgeData, TPortType>;
}

export function detectGraphEditorCycles<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>) {
  const context = createGraphEditorDocumentContext(document);
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const path: string[] = [];
  const visit = (nodeId: string) => {
    if (visiting.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      cycles.push([...path.slice(cycleStart), nodeId]);
      return;
    }
    if (visited.has(nodeId)) {
      return;
    }
    visiting.add(nodeId);
    path.push(nodeId);
    for (const nextNodeId of context.adjacencyByNodeId.get(nodeId) ?? []) {
      visit(nextNodeId);
    }
    path.pop();
    visiting.delete(nodeId);
    visited.add(nodeId);
  };
  for (const node of document.nodes) {
    visit(node.id);
  }
  return cycles;
}

export function wouldCreateGraphEditorCycle<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  connection: GraphEditorConnectionInput,
  context = createGraphEditorDocumentContext(document),
) {
  if (connection.sourceNodeId === connection.targetNodeId) {
    return true;
  }
  return context.canReach(connection.targetNodeId, connection.sourceNodeId);
}

export function isGraphEditorDirectedAcyclicGraph<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>) {
  return detectGraphEditorCycles(document).length === 0;
}

export function topologicallySortGraphEditorNodes<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>) {
  const context = createGraphEditorDocumentContext(document);
  const visited = new Set<string>();
  const sorted: Array<GraphEditorNode<TNodeData, TPortType>> = [];
  const visit = (node: GraphEditorNode<TNodeData, TPortType>) => {
    if (visited.has(node.id)) {
      return;
    }
    visited.add(node.id);
    for (const sourceEdge of context.incomingEdgesByNodeId.get(node.id) ?? []) {
      const sourceNode = context.nodeById.get(sourceEdge.sourceNodeId);
      if (sourceNode) {
        visit(sourceNode);
      }
    }
    sorted.push(node);
  };
  for (const node of document.nodes) {
    visit(node);
  }
  return sorted;
}
