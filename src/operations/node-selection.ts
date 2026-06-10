import {
  addGraphEditorNode,
  normalizeGraphEditorDocument,
  normalizeGraphEditorSelection,
  removeGraphEditorSelection,
  updateGraphEditorNode,
  type GraphEditorNode,
  type GraphEditorSelectionState,
} from "../core";

import type { CreateGraphEditorAddNodeOperationOptions, GraphEditorOperation } from "./types";

export function createGraphEditorSelectOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  selection: GraphEditorSelectionState,
  selectionBefore?: GraphEditorSelectionState,
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  return {
    id: "graph.select",
    label: "Select",
    apply: (document) => document,
    selectionBefore,
    getSelectionAfter: (_before, after) => normalizeGraphEditorSelection(after, selection),
  };
}

export function createGraphEditorAddNodeOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  options: CreateGraphEditorAddNodeOperationOptions<TNodeData, TPortType>,
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  const node =
    "node" in options
      ? options.node
      : ({
          ...options.template,
          id: options.id,
          x: options.position.x,
          y: options.position.y,
        } as GraphEditorNode<TNodeData, TPortType>);
  const selectionAfter = options.selectionAfter ?? {
    edgeIds: [],
    nodeIds: [node.id],
    primary: { type: "node", id: node.id },
  };

  return {
    id: "graph.add-node",
    label: "Add node",
    apply: (document) =>
      document.nodes.some((candidate) => candidate.id === node.id)
        ? document
        : addGraphEditorNode(document, node),
    selectionBefore: options.selectionBefore,
    selectionAfter,
  };
}

export function createGraphEditorUpdateNodeOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  nodeId: string,
  patch: Partial<GraphEditorNode<TNodeData, TPortType>>,
  options: {
    selectionBefore?: GraphEditorSelectionState;
    selectionAfter?: GraphEditorSelectionState;
  } = {},
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  return {
    id: "graph.update-node",
    label: "Update node",
    apply: (document) => updateGraphEditorNode(document, nodeId, patch),
    selectionBefore: options.selectionBefore,
    selectionAfter: options.selectionAfter,
  };
}

export function createGraphEditorMoveNodesOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  positionsByNodeId: Readonly<Record<string, { x: number; y: number }>>,
  options: {
    selectionBefore?: GraphEditorSelectionState;
    selectionAfter?: GraphEditorSelectionState;
    merge?: boolean;
  } = {},
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  const nodeIds = Object.keys(positionsByNodeId).sort();
  return {
    id: "graph.move-nodes",
    label: "Move nodes",
    apply: (document) =>
      normalizeGraphEditorDocument({
        ...document,
        nodes: document.nodes.map((node) => {
          const position = positionsByNodeId[node.id];
          return position ? { ...node, x: position.x, y: position.y } : node;
        }),
      }),
    mergeKey: options.merge === false ? undefined : `graph.move-nodes:${nodeIds.join(",")}`,
    selectionBefore: options.selectionBefore,
    selectionAfter: options.selectionAfter,
  };
}

export function createGraphEditorRemoveSelectionOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  selection: GraphEditorSelectionState,
  options: { selectionBefore?: GraphEditorSelectionState } = {},
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  return {
    id: "graph.remove-selection",
    label: "Delete selection",
    apply: (document) => removeGraphEditorSelection(document, selection),
    selectionBefore: options.selectionBefore ?? selection,
    selectionAfter: { nodeIds: [], edgeIds: [] },
  };
}
