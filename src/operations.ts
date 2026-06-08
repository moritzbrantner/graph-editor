import { createUniqueEditorId, type EditorOperation } from "@moritzbrantner/editor-core";

import {
  addGraphEditorEdge,
  addGraphEditorNode,
  createGraphEditorGroup,
  duplicateGraphEditorSelection,
  normalizeGraphEditorDocument,
  normalizeGraphEditorSelection,
  pasteGraphEditorClipboardPayload,
  removeGraphEditorEdge,
  removeGraphEditorSelection,
  ungroupGraphEditorGroup,
  updateGraphEditorEdge,
  updateGraphEditorNode,
  validateGraphEditorConnection,
  validateGraphEditorDocument,
  type GraphEditorClipboardPayload,
  type GraphEditorConnectionInput,
  type GraphEditorConnectionValidationOptions,
  type GraphEditorConnectionValidity,
  type GraphEditorDocument,
  type GraphEditorEdge,
  type GraphEditorNode,
  type GraphEditorNodeTemplate,
  type GraphEditorPasteOptions,
  type GraphEditorSelectionState,
  type GraphEditorViewport,
} from "./core";
import {
  layoutGraphEditorDocument,
  type GraphEditorLayoutOptions,
  type GraphEditorLayoutResult,
} from "./layout";

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
  | "graph.replace-document";

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

export function createGraphEditorDuplicateSelectionOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  selection: GraphEditorSelectionState,
  options: {
    offsetX?: number;
    offsetY?: number;
    selectionBefore?: GraphEditorSelectionState;
  } = {},
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  let result: ReturnType<
    typeof duplicateGraphEditorSelection<TNodeData, TEdgeData, TPortType>
  > | null = null;
  return {
    id: "graph.duplicate-selection",
    label: "Duplicate selection",
    apply: (document) => {
      result = duplicateGraphEditorSelection(document, selection, options);
      return result.document;
    },
    selectionBefore: options.selectionBefore ?? selection,
    getSelectionAfter: () => selectionFromPasteResult(result),
  };
}

export function createGraphEditorPasteOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  payload: GraphEditorClipboardPayload<TNodeData, TEdgeData, TPortType>,
  options: GraphEditorPasteOptions & {
    selectionBefore?: GraphEditorSelectionState;
  } = {},
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  let result: ReturnType<
    typeof pasteGraphEditorClipboardPayload<TNodeData, TEdgeData, TPortType>
  > | null = null;
  return {
    id: "graph.paste",
    label: "Paste",
    apply: (document) => {
      result = pasteGraphEditorClipboardPayload(document, payload, options);
      return result.document;
    },
    selectionBefore: options.selectionBefore,
    getSelectionAfter: () => selectionFromPasteResult(result),
  };
}

export function createGraphEditorCreateGroupOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  nodeIds: readonly string[],
  options: {
    id?: string;
    label?: string;
    selectionBefore?: GraphEditorSelectionState;
    selectionAfter?: GraphEditorSelectionState;
  } = {},
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  return {
    id: "graph.create-group",
    label: "Group selection",
    apply: (document) => createGraphEditorGroup(document, { ...options, nodeIds }),
    selectionBefore: options.selectionBefore,
    getSelectionAfter: (before, after) => {
      if (options.selectionAfter) {
        return options.selectionAfter;
      }
      const previousGroupIds = new Set((before.groups ?? []).map((group) => group.id));
      const group = (after.groups ?? []).find((candidate) => !previousGroupIds.has(candidate.id));
      return group
        ? {
            nodeIds: group.nodeIds,
            edgeIds: [],
            groupIds: [group.id],
            primary: { type: "group", id: group.id },
          }
        : undefined;
    },
  };
}

export function createGraphEditorUngroupOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  groupIds: readonly string[],
  options: {
    selectionBefore?: GraphEditorSelectionState;
    selectionAfter?: GraphEditorSelectionState;
  } = {},
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  return {
    id: "graph.ungroup",
    label: "Ungroup selection",
    apply: (document) =>
      groupIds.reduce(
        (currentDocument, groupId) => ungroupGraphEditorGroup(currentDocument, groupId),
        document,
      ),
    selectionBefore: options.selectionBefore,
    selectionAfter: options.selectionAfter,
  };
}

export function createGraphEditorLayoutOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  options: GraphEditorLayoutOptions<TNodeData> & {
    selectionBefore?: GraphEditorSelectionState;
    selectionAfter?: GraphEditorSelectionState;
  } = {},
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  let layoutResult: GraphEditorLayoutResult<TNodeData, TEdgeData, TPortType> | null = null;
  return {
    id: "graph.layout",
    label: "Auto layout",
    apply: (document) => {
      layoutResult = layoutGraphEditorDocument(document, options);
      return layoutResult.document;
    },
    metadata: {
      graphEditor: {
        get layoutResult() {
          return layoutResult ?? undefined;
        },
      },
    },
    selectionBefore: options.selectionBefore,
    selectionAfter: options.selectionAfter,
  };
}

export function createGraphEditorUpdateViewportOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  viewport: GraphEditorViewport,
  options: {
    history?: boolean;
    selectionBefore?: GraphEditorSelectionState;
    selectionAfter?: GraphEditorSelectionState;
  } = {},
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  return {
    id: "graph.update-viewport",
    label: "Update viewport",
    apply: (document) => ({ ...document, viewport }),
    mergeKey: "graph.viewport",
    metadata: { graphEditor: { history: options.history ?? true } },
    selectionBefore: options.selectionBefore,
    selectionAfter: options.selectionAfter,
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

function selectionFromPasteResult(
  result: {
    nodeIds: string[];
    edgeIds: string[];
    groupIds?: string[];
  } | null,
): GraphEditorSelectionState | undefined {
  if (!result) {
    return undefined;
  }
  return {
    nodeIds: result.nodeIds,
    edgeIds: result.edgeIds,
    ...(result.groupIds?.length ? { groupIds: result.groupIds } : {}),
    primary:
      result.nodeIds.length > 0
        ? { type: "node", id: result.nodeIds.at(-1)! }
        : result.edgeIds.length > 0
          ? { type: "edge", id: result.edgeIds.at(-1)! }
          : result.groupIds?.length
            ? { type: "group", id: result.groupIds.at(-1)! }
            : undefined,
  };
}
