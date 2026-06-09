import {
  createUniqueEditorId,
  type EditorEntityBase,
  type EditorEntityId,
} from "@moritzbrantner/editor-core/entities";
import { createEditorGraphIndexes } from "@moritzbrantner/editor-core/indexes";
import {
  EditorJsonParseError,
  type EditorDocumentAdapter,
} from "@moritzbrantner/editor-core/serialization";
import {
  createEditorEntitySelection,
  getEditorSelectedEntityIds,
  getEditorSelectionPrimaryEntityId,
  normalizeEditorSelection,
  type EditorSelection,
} from "@moritzbrantner/editor-core/selection";
import {
  createEditorViewportState,
  type EditorViewportState,
} from "@moritzbrantner/editor-core/viewport";
import type { EditorGraphConnection } from "@moritzbrantner/editor-core/constraints";
import type {
  EditorGraphAdapter,
  EditorGraphEdge,
  EditorGraphPort,
} from "@moritzbrantner/editor-core/entities";

export type GraphEditorPort<TPortType = unknown, TPortData = Record<string, unknown>> = Omit<
  EditorGraphPort,
  "label"
> & {
  id: string;
  label: string;
  kind?: string;
  type?: TPortType;
  required?: boolean;
  description?: string;
  badge?: string;
  color?: string;
  data?: TPortData;
  metadata?: Record<string, unknown>;
};

export type GraphEditorNode<TNodeData = Record<string, unknown>, TPortType = unknown> = {
  id: EditorEntityId;
  label: string;
  type?: EditorEntityBase["type"];
  parentId?: EditorEntityBase["parentId"];
  order?: EditorEntityBase["order"];
  description?: string;
  kind?: string;
  category?: string;
  categoryPath?: readonly string[];
  eyebrow?: string;
  packageLabel?: string;
  status?: "idle" | "running" | "success" | "error" | "warning" | string;
  tone?: "neutral" | "info" | "success" | "warning" | "error" | string;
  variant?: "default" | "compact";
  minimized?: boolean;
  tags?: string[];
  x: number;
  y: number;
  inputs?: Array<GraphEditorPort<TPortType>>;
  outputs?: Array<GraphEditorPort<TPortType>>;
  data?: TNodeData;
  metadata?: Record<string, unknown>;
};

export type GraphEditorEdge<TEdgeData = Record<string, unknown>> = {
  id: EditorEntityId;
  sourceNodeId: EditorEntityId;
  sourcePortId: NonNullable<EditorGraphConnection["sourcePortId"]>;
  targetNodeId: EditorEntityId;
  targetPortId: NonNullable<EditorGraphConnection["targetPortId"]>;
  type?: EditorGraphEdge["type"];
  color?: string;
  status?: "idle" | "running" | "success" | "error" | "warning" | string;
  data?: TEdgeData;
  metadata?: Record<string, unknown>;
};

export type GraphEditorGroup<TGroupData = Record<string, unknown>> = {
  id: EditorEntityId;
  label: string;
  nodeIds: EditorEntityId[];
  type?: EditorEntityBase["type"];
  parentId?: EditorEntityBase["parentId"];
  order?: EditorEntityBase["order"];
  minimized?: boolean;
  data?: TGroupData;
};

export type GraphEditorViewport = EditorViewportState;

export type GraphEditorDocument<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  nodes: Array<GraphEditorNode<TNodeData, TPortType>>;
  edges: Array<GraphEditorEdge<TEdgeData>>;
  groups?: Array<GraphEditorGroup>;
  viewport?: GraphEditorViewport;
};

export type GraphEditorNodeTemplate<
  TNodeData = Record<string, unknown>,
  TPortType = unknown,
> = Omit<GraphEditorNode<TNodeData, TPortType>, "x" | "y">;

export type GraphEditorSelectionItem =
  | { type: "node"; id: string }
  | { type: "edge"; id: string }
  | { type: "group"; id: string };

export type GraphEditorSelectionState = {
  nodeIds: string[];
  edgeIds: string[];
  groupIds?: string[];
  primary?: GraphEditorSelectionItem;
};

export type GraphEditorSelectionMode = "replace" | "toggle" | "extend";

export type GraphEditorBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type GraphEditorSelectableBounds = GraphEditorSelectionItem & {
  bounds: GraphEditorBounds;
};

export type GraphEditorGroupBounds = {
  groupId: string;
  bounds: GraphEditorBounds;
  nodeIds: string[];
};

export type GraphEditorConnectionInput = {
  sourceNodeId: EditorGraphConnection["sourceId"];
  sourcePortId: NonNullable<EditorGraphConnection["sourcePortId"]>;
  targetNodeId: EditorGraphConnection["targetId"];
  targetPortId: NonNullable<EditorGraphConnection["targetPortId"]>;
};

export type GraphEditorConnectionInvalidReason =
  | "cycle"
  | "duplicate"
  | "input-occupied"
  | "kind-mismatch"
  | "missing-node"
  | "missing-port"
  | "self-connection"
  | "type-mismatch";

export type GraphEditorConnectionValidity = {
  valid: boolean;
  reason?: GraphEditorConnectionInvalidReason;
};

export type GraphEditorDocumentDiagnosticCode =
  | "invalid-document"
  | "invalid-node"
  | "invalid-edge"
  | "duplicate-node-id"
  | "duplicate-edge-id"
  | "duplicate-group-id"
  | "duplicate-group-node"
  | "missing-edge-node"
  | "missing-edge-port"
  | "missing-group-node"
  | "self-edge"
  | "cycle"
  | "invalid-group";

export type GraphEditorDocumentDiagnostic = {
  code: GraphEditorDocumentDiagnosticCode;
  message: string;
  path: string;
  nodeId?: string;
  groupId?: string;
  edgeId?: string;
  sourcePortId?: string;
  targetPortId?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
};

export type GraphEditorDocumentValidationOptions = {
  allowCycles?: boolean;
  allowMissingDeclaredPorts?: boolean;
  allowSelfEdges?: boolean;
};

export type GraphEditorDocumentNormalizationMode = "strict" | "repair";

export type GraphEditorDocumentNormalizationOptions = GraphEditorDocumentValidationOptions & {
  mode?: GraphEditorDocumentNormalizationMode;
};

export type GraphEditorConnectionValidationOptions<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  allowCycles?: boolean;
  allowDuplicateEdges?: boolean;
  allowOccupiedInputs?: boolean;
  allowSelfConnections?: boolean;
  ignoreEdgeId?: string;
  arePortsCompatible?: (
    sourcePort: GraphEditorPort<TPortType>,
    targetPort: GraphEditorPort<TPortType>,
    context: GraphEditorDocumentContext<TNodeData, TEdgeData, TPortType>,
  ) => GraphEditorConnectionValidity | boolean;
};

export type GraphEditorDocumentContext<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  nodeById: ReadonlyMap<EditorEntityId, GraphEditorNode<TNodeData, TPortType>>;
  edgeById: ReadonlyMap<EditorEntityId, GraphEditorEdge<TEdgeData>>;
  adjacencyByNodeId: ReadonlyMap<EditorEntityId, readonly EditorEntityId[]>;
  incomingEdgesByNodeId: ReadonlyMap<EditorEntityId, readonly GraphEditorEdge<TEdgeData>[]>;
  outgoingEdgesByNodeId: ReadonlyMap<EditorEntityId, readonly GraphEditorEdge<TEdgeData>[]>;
  getInputPort(nodeId: string, portId: string): GraphEditorPort<TPortType> | null;
  getOutputPort(nodeId: string, portId: string): GraphEditorPort<TPortType> | null;
  getIncomingEdgeToPort(nodeId: string, portId: string): GraphEditorEdge<TEdgeData> | null;
  canReach(sourceNodeId: string, targetNodeId: string): boolean;
};

export type GraphEditorDuplicateNodeOptions = {
  offsetX?: number;
  offsetY?: number;
  createId?: (baseId: string, existingIds: ReadonlySet<string>) => string;
};

export type GraphEditorCreateGroupOptions = {
  id?: string;
  label?: string;
  nodeIds: readonly string[];
};

export type GraphEditorClipboardPayload<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  format: typeof graphEditorClipboardFormat;
  version: typeof graphEditorClipboardVersion;
  copiedAt: string;
  sourceDocumentId?: string;
  nodes: Array<GraphEditorNode<TNodeData, TPortType>>;
  edges: Array<GraphEditorEdge<TEdgeData>>;
  groups?: Array<GraphEditorGroup>;
};

export type GraphEditorPasteOptions = {
  offsetX?: number;
  offsetY?: number;
  createNodeId?: (baseId: string, existingIds: ReadonlySet<string>) => string;
  createEdgeId?: (baseId: string, existingIds: ReadonlySet<string>) => string;
};

export type GraphEditorPasteResult<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  nodeIds: string[];
  edgeIds: string[];
  groupIds?: string[];
};

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

export const graphEditorClipboardFormat = "@moritzbrantner/graph-editor/clipboard";
export const graphEditorClipboardVersion = 1;
export const graphEditorDocumentFormat = "@moritzbrantner/graph-editor/document";
export const graphEditorSchemaVersion = 1;

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

export class GraphEditorDocumentValidationError extends Error {
  override name = "GraphEditorDocumentValidationError" as const;
  diagnostics: GraphEditorDocumentDiagnostic[];

  constructor(diagnostics: GraphEditorDocumentDiagnostic[]) {
    super(formatGraphEditorDocumentValidationMessage(diagnostics));
    this.diagnostics = diagnostics;
  }
}

export function assertGraphEditorDocument<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  value: unknown,
  options: GraphEditorDocumentValidationOptions = {},
): asserts value is GraphEditorDocument<TNodeData, TEdgeData, TPortType> {
  const diagnostics = validateGraphEditorDocument(value, options);
  if (diagnostics.length > 0) {
    throw new GraphEditorDocumentValidationError(diagnostics);
  }
}

export const graphEditorDocumentAdapter: EditorDocumentAdapter<GraphEditorDocument> = {
  format: graphEditorDocumentFormat,
  schemaVersion: graphEditorSchemaVersion,
  normalize: (document) => normalizeGraphEditorDocument(document),
  read: readGraphEditorDocument,
  validate: (document) => validateGraphEditorDocument(document),
};

export function readGraphEditorDocument(input: unknown, path = "$"): GraphEditorDocument {
  const diagnostics = validateGraphEditorDocument(input);
  if (diagnostics.length > 0) {
    throw new EditorJsonParseError(
      diagnostics.map((diagnostic) => ({
        path: diagnostic.path === "$" ? path : diagnostic.path,
        message: diagnostic.message,
      })),
    );
  }

  return input as GraphEditorDocument;
}

export function validateGraphEditorDocument(
  value: unknown,
  options: GraphEditorDocumentValidationOptions = {},
): GraphEditorDocumentDiagnostic[] {
  const diagnostics: GraphEditorDocumentDiagnostic[] = [];
  if (!isRecord(value)) {
    return [
      {
        code: "invalid-document",
        message: "Graph document must be an object",
        path: "$",
      },
    ];
  }

  if (!Array.isArray(value.nodes)) {
    diagnostics.push({
      code: "invalid-document",
      message: "Graph document nodes must be an array",
      path: "$.nodes",
    });
  }
  if (!Array.isArray(value.edges)) {
    diagnostics.push({
      code: "invalid-document",
      message: "Graph document edges must be an array",
      path: "$.edges",
    });
  }
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    return diagnostics;
  }

  const nodeIds = new Set<string>();
  const validInputPortIdsByNodeId = new Map<string, Set<string>>();
  const validOutputPortIdsByNodeId = new Map<string, Set<string>>();
  value.nodes.forEach((node, index) => {
    const path = `$.nodes[${index}]`;
    if (!isRecord(node)) {
      diagnostics.push({ code: "invalid-node", message: "Graph node must be an object", path });
      return;
    }
    const nodeId = typeof node.id === "string" ? node.id : undefined;
    if (!nodeId?.trim()) {
      diagnostics.push({
        code: "invalid-node",
        message: "Graph node id must be a non-empty string",
        path: `${path}.id`,
      });
    } else if (nodeIds.has(nodeId)) {
      diagnostics.push({
        code: "duplicate-node-id",
        message: `Duplicate graph node id: ${nodeId}`,
        path: `${path}.id`,
        nodeId,
      });
    } else {
      nodeIds.add(nodeId);
    }
    if (nodeId) {
      if (Array.isArray(node.inputs)) {
        validInputPortIdsByNodeId.set(
          nodeId,
          new Set(
            node.inputs.flatMap((port) =>
              isRecord(port) && typeof port.id === "string" ? [port.id] : [],
            ),
          ),
        );
      }
      if (Array.isArray(node.outputs)) {
        validOutputPortIdsByNodeId.set(
          nodeId,
          new Set(
            node.outputs.flatMap((port) =>
              isRecord(port) && typeof port.id === "string" ? [port.id] : [],
            ),
          ),
        );
      }
    }
    if (typeof node.label !== "string") {
      diagnostics.push({
        code: "invalid-node",
        message: "Graph node label must be a string",
        path: `${path}.label`,
        nodeId,
      });
    }
    if (!Number.isFinite(node.x)) {
      diagnostics.push({
        code: "invalid-node",
        message: "Graph node x must be a finite number",
        path: `${path}.x`,
        nodeId,
      });
    }
    if (!Number.isFinite(node.y)) {
      diagnostics.push({
        code: "invalid-node",
        message: "Graph node y must be a finite number",
        path: `${path}.y`,
        nodeId,
      });
    }
  });

  const edgeIds = new Set<string>();
  value.edges.forEach((edge, index) => {
    const path = `$.edges[${index}]`;
    if (!isRecord(edge)) {
      diagnostics.push({ code: "invalid-edge", message: "Graph edge must be an object", path });
      return;
    }
    const edgeId = typeof edge.id === "string" ? edge.id : undefined;
    const sourceNodeId = typeof edge.sourceNodeId === "string" ? edge.sourceNodeId : undefined;
    const targetNodeId = typeof edge.targetNodeId === "string" ? edge.targetNodeId : undefined;
    const sourcePortId = typeof edge.sourcePortId === "string" ? edge.sourcePortId : undefined;
    const targetPortId = typeof edge.targetPortId === "string" ? edge.targetPortId : undefined;
    if (!edgeId?.trim()) {
      diagnostics.push({
        code: "invalid-edge",
        message: "Graph edge id must be a non-empty string",
        path: `${path}.id`,
      });
    } else if (edgeIds.has(edgeId)) {
      diagnostics.push({
        code: "duplicate-edge-id",
        message: `Duplicate graph edge id: ${edgeId}`,
        path: `${path}.id`,
        edgeId,
      });
    } else {
      edgeIds.add(edgeId);
    }
    if (!sourceNodeId || !nodeIds.has(sourceNodeId)) {
      diagnostics.push({
        code: "missing-edge-node",
        message: `Graph edge source node is missing: ${sourceNodeId ?? ""}`,
        path: `${path}.sourceNodeId`,
        edgeId,
        sourceNodeId,
      });
    }
    if (!targetNodeId || !nodeIds.has(targetNodeId)) {
      diagnostics.push({
        code: "missing-edge-node",
        message: `Graph edge target node is missing: ${targetNodeId ?? ""}`,
        path: `${path}.targetNodeId`,
        edgeId,
        targetNodeId,
      });
    }
    if (!options.allowMissingDeclaredPorts && sourceNodeId && nodeIds.has(sourceNodeId)) {
      const validOutputPortIds = validOutputPortIdsByNodeId.get(sourceNodeId);
      if (validOutputPortIds && (!sourcePortId || !validOutputPortIds.has(sourcePortId))) {
        diagnostics.push({
          code: "missing-edge-port",
          message: `Graph edge source port is missing: ${sourcePortId ?? ""}`,
          path: `${path}.sourcePortId`,
          edgeId,
          sourceNodeId,
          sourcePortId,
        });
      }
    }
    if (!options.allowMissingDeclaredPorts && targetNodeId && nodeIds.has(targetNodeId)) {
      const validInputPortIds = validInputPortIdsByNodeId.get(targetNodeId);
      if (validInputPortIds && (!targetPortId || !validInputPortIds.has(targetPortId))) {
        diagnostics.push({
          code: "missing-edge-port",
          message: `Graph edge target port is missing: ${targetPortId ?? ""}`,
          path: `${path}.targetPortId`,
          edgeId,
          targetNodeId,
          targetPortId,
        });
      }
    }
    if (!options.allowSelfEdges && sourceNodeId && targetNodeId && sourceNodeId === targetNodeId) {
      diagnostics.push({
        code: "self-edge",
        message: `Graph edge cannot connect node to itself: ${sourceNodeId}`,
        path,
        edgeId,
        sourceNodeId,
        targetNodeId,
      });
    }
  });

  const groupIds = new Set<string>();
  (Array.isArray(value.groups) ? value.groups : []).forEach((group, index) => {
    const path = `$.groups[${index}]`;
    if (!isRecord(group)) {
      diagnostics.push({ code: "invalid-group", message: "Graph group must be an object", path });
      return;
    }
    const groupId = typeof group.id === "string" ? group.id : undefined;
    if (!groupId?.trim()) {
      diagnostics.push({
        code: "invalid-group",
        message: "Graph group id must be a non-empty string",
        path: `${path}.id`,
      });
    } else if (groupIds.has(groupId)) {
      diagnostics.push({
        code: "duplicate-group-id",
        message: `Duplicate graph group id: ${groupId}`,
        path: `${path}.id`,
        groupId,
      });
    } else {
      groupIds.add(groupId);
    }
    if (typeof group.label !== "string") {
      diagnostics.push({
        code: "invalid-group",
        message: "Graph group label must be a string",
        path: `${path}.label`,
      });
    }
    if (!Array.isArray(group.nodeIds)) {
      diagnostics.push({
        code: "invalid-group",
        message: "Graph group nodeIds must be an array",
        path: `${path}.nodeIds`,
      });
      return;
    }
    const groupNodeIds = new Set<string>();
    group.nodeIds.forEach((nodeId, nodeIndex) => {
      if (typeof nodeId !== "string" || !nodeIds.has(nodeId)) {
        diagnostics.push({
          code: "missing-group-node",
          message: `Graph group node is missing: ${String(nodeId)}`,
          path: `${path}.nodeIds[${nodeIndex}]`,
          groupId,
          nodeId: typeof nodeId === "string" ? nodeId : undefined,
        });
        return;
      }
      if (groupNodeIds.has(nodeId)) {
        diagnostics.push({
          code: "duplicate-group-node",
          message: `Graph group contains duplicate node: ${nodeId}`,
          path: `${path}.nodeIds[${nodeIndex}]`,
          groupId,
          nodeId,
        });
        return;
      }
      groupNodeIds.add(nodeId);
    });
  });

  if (!options.allowCycles && Array.isArray(value.nodes) && Array.isArray(value.edges)) {
    for (const cycle of detectGraphEditorCycles(value as GraphEditorDocument)) {
      diagnostics.push({
        code: "cycle",
        message: `Graph contains a cycle: ${cycle.join(" -> ")}`,
        path: "$.edges",
        nodeId: cycle[0],
      });
    }
  }

  return diagnostics;
}

export function normalizeGraphEditorDocument<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  options: GraphEditorDocumentNormalizationOptions = {},
): GraphEditorDocument<TNodeData, TEdgeData, TPortType> {
  const mode = options.mode ?? "strict";
  const diagnostics = validateGraphEditorDocument(document, options);
  if (mode === "strict" && diagnostics.length > 0) {
    throw new GraphEditorDocumentValidationError(diagnostics);
  }

  const nodes = Array.isArray(document.nodes)
    ? document.nodes.flatMap((node) =>
        isRecord(node)
          ? [
              {
                ...node,
                id: String(node.id ?? "").trim(),
                label: typeof node.label === "string" ? node.label : "",
                x: Number.isFinite(node.x) ? Number(node.x) : 0,
                y: Number.isFinite(node.y) ? Number(node.y) : 0,
              } as GraphEditorNode<TNodeData, TPortType>,
            ]
          : [],
      )
    : [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const seenEdgeIds = new Set<string>();
  const edges = (Array.isArray(document.edges) ? document.edges : []).flatMap((edge) => {
    if (!isRecord(edge) || typeof edge.id !== "string" || seenEdgeIds.has(edge.id)) {
      return [];
    }
    if (
      typeof edge.sourceNodeId !== "string" ||
      typeof edge.targetNodeId !== "string" ||
      !nodeIds.has(edge.sourceNodeId) ||
      !nodeIds.has(edge.targetNodeId) ||
      (!options.allowSelfEdges && edge.sourceNodeId === edge.targetNodeId)
    ) {
      return [];
    }
    if (
      !options.allowMissingDeclaredPorts &&
      !graphEditorEdgeReferencesDeclaredPorts(edge as GraphEditorEdge<TEdgeData>, nodeById)
    ) {
      return [];
    }
    seenEdgeIds.add(edge.id);
    return [edge as GraphEditorEdge<TEdgeData>];
  });
  const groups = normalizeGraphEditorGroups(document.groups, nodeIds);

  return {
    ...document,
    nodes,
    edges,
    ...(groups.length > 0 ? { groups } : {}),
    viewport: document.viewport
      ? {
          ...createEditorViewportState({
            x: Number.isFinite(document.viewport.x) ? document.viewport.x : 0,
            y: Number.isFinite(document.viewport.y) ? document.viewport.y : 0,
            zoom: document.viewport.zoom,
          }),
          zoom: clamp(document.viewport.zoom, 0.1, 4, 1),
        }
      : undefined,
  };
}

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

export function addGraphEditorNode<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  node: GraphEditorNode<TNodeData, TPortType>,
) {
  if (document.nodes.some((candidate) => candidate.id === node.id)) {
    throw new Error(`Duplicate graph node id: ${node.id}`);
  }
  return normalizeGraphEditorDocument({ ...document, nodes: [...document.nodes, node] });
}

export function updateGraphEditorNode<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  nodeId: string,
  patch: Partial<GraphEditorNode<TNodeData, TPortType>>,
) {
  return normalizeGraphEditorDocument({
    ...document,
    nodes: document.nodes.map((node) =>
      node.id === nodeId ? { ...node, ...patch, id: node.id } : node,
    ),
  });
}

export function removeGraphEditorNode<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>, nodeId: string) {
  return normalizeGraphEditorDocument({
    ...document,
    nodes: document.nodes.filter((node) => node.id !== nodeId),
    edges: document.edges.filter(
      (edge) => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId,
    ),
    groups: (document.groups ?? []).flatMap((group) => {
      const nodeIds = group.nodeIds.filter((id) => id !== nodeId);
      return nodeIds.length > 0 ? [{ ...group, nodeIds }] : [];
    }),
  });
}

export function moveGraphEditorNode<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  nodeId: string,
  position: { x: number; y: number },
) {
  return updateGraphEditorNode(document, nodeId, position);
}

export function addGraphEditorEdge<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  edge: GraphEditorEdge<TEdgeData>,
) {
  if (document.edges.some((candidate) => candidate.id === edge.id)) {
    throw new Error(`Duplicate graph edge id: ${edge.id}`);
  }
  return normalizeGraphEditorDocument({ ...document, edges: [...document.edges, edge] });
}

export function updateGraphEditorEdge<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  edgeId: string,
  patch: Partial<GraphEditorEdge<TEdgeData>>,
) {
  return normalizeGraphEditorDocument({
    ...document,
    edges: document.edges.map((edge) =>
      edge.id === edgeId ? { ...edge, ...patch, id: edge.id } : edge,
    ),
  });
}

export function removeGraphEditorEdge<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>, edgeId: string) {
  return normalizeGraphEditorDocument({
    ...document,
    edges: document.edges.filter((edge) => edge.id !== edgeId),
  });
}

export function duplicateGraphEditorNode<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  nodeId: string,
  options: GraphEditorDuplicateNodeOptions = {},
) {
  const node = document.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    return document;
  }
  const existingIds = new Set(document.nodes.map((candidate) => candidate.id));
  const id =
    options.createId?.(nodeId, existingIds) ?? createUniqueId(`${nodeId}-copy`, existingIds);
  return addGraphEditorNode(document, {
    ...cloneGraphEditorNode(node),
    id,
    label: `${node.label} Copy`,
    x: node.x + (options.offsetX ?? 48),
    y: node.y + (options.offsetY ?? 48),
  });
}

export function createGraphEditorGroup<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  options: GraphEditorCreateGroupOptions,
) {
  const existingIds = new Set((document.groups ?? []).map((group) => group.id));
  const nodeIds = orderedUnique(
    document.nodes.map((node) => node.id),
    options.nodeIds,
  );
  if (nodeIds.length < 1) {
    return document;
  }
  const group: GraphEditorGroup = {
    id:
      options.id && !existingIds.has(options.id)
        ? options.id
        : createUniqueId("group", existingIds),
    label: options.label ?? "Group",
    nodeIds,
  };
  return normalizeGraphEditorDocument({
    ...document,
    groups: [...(document.groups ?? []), group],
  });
}

export function updateGraphEditorGroup<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  groupId: string,
  patch: Partial<GraphEditorGroup>,
) {
  const groups: GraphEditorGroup[] = [];
  for (const group of document.groups ?? []) {
    groups.push(group.id === groupId ? { ...group, ...patch, id: group.id } : group);
  }

  return normalizeGraphEditorDocument({
    ...document,
    groups,
  });
}

export function moveGraphEditorGroup<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  groupId: string,
  delta: { x: number; y: number },
) {
  const group = document.groups?.find((candidate) => candidate.id === groupId);
  if (!group) {
    return document;
  }
  const nodeIds = new Set(group.nodeIds);
  return normalizeGraphEditorDocument({
    ...document,
    nodes: document.nodes.map((node) =>
      nodeIds.has(node.id) ? { ...node, x: node.x + delta.x, y: node.y + delta.y } : node,
    ),
  });
}

export function ungroupGraphEditorGroup<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>, groupId: string) {
  return normalizeGraphEditorDocument({
    ...document,
    groups: (document.groups ?? []).filter((group) => group.id !== groupId),
  });
}

export function removeGraphEditorSelection<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  selection: GraphEditorSelectionState,
) {
  const normalized = normalizeGraphEditorSelection(document, selection);
  const nodeIds = new Set(normalized.nodeIds);
  const edgeIds = new Set(normalized.edgeIds);
  const groupIds = new Set(normalized.groupIds ?? []);
  return normalizeGraphEditorDocument({
    ...document,
    nodes: document.nodes.filter((node) => !nodeIds.has(node.id)),
    edges: document.edges.filter(
      (edge) =>
        !edgeIds.has(edge.id) && !nodeIds.has(edge.sourceNodeId) && !nodeIds.has(edge.targetNodeId),
    ),
    groups: (document.groups ?? [])
      .filter((group) => !groupIds.has(group.id))
      .flatMap((group) => {
        const selectedNodeIds = group.nodeIds.filter((id) => !nodeIds.has(id));
        return selectedNodeIds.length > 0 ? [{ ...group, nodeIds: selectedNodeIds }] : [];
      }),
  });
}

export function normalizeGraphEditorSelection<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  selection: GraphEditorSelectionState,
): GraphEditorSelectionState {
  const editorSelection = normalizeEditorSelection(
    graphEditorSelectionToEditorSelection(selection),
    (id) =>
      document.nodes.some((node) => node.id === id) ||
      document.edges.some((edge) => edge.id === id) ||
      (document.groups ?? []).some((group) => group.id === id),
  );
  const selectedIds = new Set(getEditorSelectedEntityIds(editorSelection));
  const nodeIds = orderedUnique(
    document.nodes.map((node) => node.id),
    document.nodes.map((node) => node.id).filter((id) => selectedIds.has(id)),
  );
  const edgeIds = orderedUnique(
    document.edges.map((edge) => edge.id),
    document.edges.map((edge) => edge.id).filter((id) => selectedIds.has(id)),
  );
  const groupIds = orderedUnique(
    (document.groups ?? []).map((group) => group.id),
    (document.groups ?? []).map((group) => group.id).filter((id) => selectedIds.has(id)),
  );
  const primaryId = getEditorSelectionPrimaryEntityId(editorSelection);
  const primary =
    primaryId && nodeIds.includes(primaryId)
      ? ({ type: "node", id: primaryId } as const)
      : primaryId && edgeIds.includes(primaryId)
        ? ({ type: "edge", id: primaryId } as const)
        : primaryId && groupIds.includes(primaryId)
          ? ({ type: "group", id: primaryId } as const)
          : groupIds.length > 0
            ? ({ type: "group", id: groupIds.at(-1)! } as const)
            : nodeIds.length > 0
              ? ({ type: "node", id: nodeIds.at(-1)! } as const)
              : edgeIds.length > 0
                ? ({ type: "edge", id: edgeIds.at(-1)! } as const)
                : undefined;
  return {
    nodeIds,
    edgeIds,
    ...(groupIds.length > 0 ? { groupIds } : {}),
    ...(primary ? { primary } : {}),
  };
}

export function clearGraphEditorSelection(): GraphEditorSelectionState {
  return { nodeIds: [], edgeIds: [] };
}

export function replaceGraphEditorSelection<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  item: GraphEditorSelectionItem | null,
): GraphEditorSelectionState {
  if (!item) {
    return clearGraphEditorSelection();
  }
  return normalizeGraphEditorSelection(document, {
    nodeIds: item.type === "node" ? [item.id] : [],
    edgeIds: item.type === "edge" ? [item.id] : [],
    groupIds: item.type === "group" ? [item.id] : [],
    primary: item,
  });
}

export function updateGraphEditorSelection<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  selection: GraphEditorSelectionState,
  item: GraphEditorSelectionItem,
  mode: GraphEditorSelectionMode = "replace",
): GraphEditorSelectionState {
  if (mode === "replace") {
    return replaceGraphEditorSelection(document, item);
  }

  const normalized = normalizeGraphEditorSelection(document, selection);
  const nodeIds = new Set(normalized.nodeIds);
  const edgeIds = new Set(normalized.edgeIds);
  const groupIds = new Set(normalized.groupIds ?? []);
  const selectedSet = item.type === "node" ? nodeIds : item.type === "edge" ? edgeIds : groupIds;
  const selected = selectedSet.has(item.id);

  if (mode === "toggle" && selected) {
    selectedSet.delete(item.id);
  } else {
    selectedSet.add(item.id);
  }

  return normalizeGraphEditorSelection(document, {
    nodeIds: [...nodeIds],
    edgeIds: [...edgeIds],
    groupIds: [...groupIds],
    primary: selected && mode === "toggle" ? normalized.primary : item,
  });
}

export function getGraphEditorSelectionFromBounds<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  bounds: GraphEditorBounds,
  items: readonly GraphEditorSelectableBounds[],
  options: { mode?: GraphEditorSelectionMode; selection?: GraphEditorSelectionState } = {},
): GraphEditorSelectionState {
  const selectedItems = items.filter((item) => graphEditorBoundsIntersect(bounds, item.bounds));
  const nextSelection = selectedItems.reduce(
    (currentSelection, item) =>
      updateGraphEditorSelection(
        document,
        currentSelection,
        { type: item.type, id: item.id },
        "extend",
      ),
    options.mode === "toggle" || options.mode === "extend"
      ? normalizeGraphEditorSelection(document, options.selection ?? clearGraphEditorSelection())
      : clearGraphEditorSelection(),
  );
  return normalizeGraphEditorSelection(document, nextSelection);
}

export function getGraphEditorGroupBounds<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  getNodeBounds: (node: GraphEditorNode<TNodeData, TPortType>) => GraphEditorBounds,
  options: { padding?: number; hiddenNodeIds?: readonly string[] } = {},
): GraphEditorGroupBounds[] {
  const padding = options.padding ?? 24;
  const hiddenNodeIds = new Set(options.hiddenNodeIds ?? []);
  const nodeById = new Map(document.nodes.map((node) => [node.id, node] as const));
  return (document.groups ?? []).flatMap((group) => {
    const boxes = group.nodeIds.flatMap((nodeId) => {
      const node = nodeById.get(nodeId);
      return node && !hiddenNodeIds.has(node.id) ? [getNodeBounds(node)] : [];
    });

    if (boxes.length === 0) {
      return [];
    }

    return [
      {
        groupId: group.id,
        nodeIds: group.nodeIds.filter(
          (nodeId) => nodeById.has(nodeId) && !hiddenNodeIds.has(nodeId),
        ),
        bounds: expandGraphEditorBounds(mergeGraphEditorBounds(boxes), padding),
      },
    ];
  });
}

export function graphEditorBoundsContainPoint(
  bounds: GraphEditorBounds,
  point: { x: number; y: number },
) {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

export function graphEditorBoundsIntersect(left: GraphEditorBounds, right: GraphEditorBounds) {
  return (
    left.x <= right.x + right.width &&
    left.x + left.width >= right.x &&
    left.y <= right.y + right.height &&
    left.y + left.height >= right.y
  );
}

export function normalizeGraphEditorBounds(bounds: GraphEditorBounds): GraphEditorBounds {
  const x = bounds.width < 0 ? bounds.x + bounds.width : bounds.x;
  const y = bounds.height < 0 ? bounds.y + bounds.height : bounds.y;
  return {
    x,
    y,
    width: Math.abs(bounds.width),
    height: Math.abs(bounds.height),
  };
}

function mergeGraphEditorBounds(bounds: readonly GraphEditorBounds[]): GraphEditorBounds {
  const minX = Math.min(...bounds.map((box) => box.x));
  const minY = Math.min(...bounds.map((box) => box.y));
  const maxX = Math.max(...bounds.map((box) => box.x + box.width));
  const maxY = Math.max(...bounds.map((box) => box.y + box.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function expandGraphEditorBounds(bounds: GraphEditorBounds, padding: number): GraphEditorBounds {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

export function graphEditorSelectionToEditorSelection(
  selection: GraphEditorSelectionState | null | undefined,
): EditorSelection {
  if (!selection) {
    return { kind: "empty" };
  }
  const anchorId =
    selection.primary?.id ??
    selection.groupIds?.at(-1) ??
    selection.nodeIds.at(-1) ??
    selection.edgeIds.at(-1);
  return createEditorEntitySelection(
    [...selection.nodeIds, ...selection.edgeIds, ...(selection.groupIds ?? [])],
    anchorId,
  );
}

export function editorSelectionToGraphEditorSelection<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  selection: EditorSelection | null | undefined,
): GraphEditorSelectionState {
  const selectedIds = new Set(getEditorSelectedEntityIds(selection ?? null));
  return normalizeGraphEditorSelection(document, {
    nodeIds: document.nodes.map((node) => node.id).filter((id) => selectedIds.has(id)),
    edgeIds: document.edges.map((edge) => edge.id).filter((id) => selectedIds.has(id)),
    groupIds: (document.groups ?? []).map((group) => group.id).filter((id) => selectedIds.has(id)),
    primary: getGraphEditorPrimarySelectionItem(document, selection ?? null) ?? undefined,
  });
}

export function copyGraphEditorSelection<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  selection: GraphEditorSelectionState,
  options: { sourceDocumentId?: string; copiedAt?: string } = {},
): GraphEditorClipboardPayload<TNodeData, TEdgeData, TPortType> {
  const normalized = normalizeGraphEditorSelection(document, selection);
  const nodeIds = new Set(normalized.nodeIds);
  for (const group of document.groups ?? []) {
    if (normalized.groupIds?.includes(group.id)) {
      for (const nodeId of group.nodeIds) {
        nodeIds.add(nodeId);
      }
    }
  }
  const nodes = document.nodes.filter((node) => nodeIds.has(node.id)).map(cloneGraphEditorNode);
  const edges = document.edges
    .filter((edge) => nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId))
    .map(cloneGraphEditorEdge);
  const groups = (document.groups ?? [])
    .filter((group) => group.nodeIds.every((nodeId) => nodeIds.has(nodeId)))
    .map(cloneGraphEditorGroup);
  return {
    format: graphEditorClipboardFormat,
    version: graphEditorClipboardVersion,
    copiedAt: options.copiedAt ?? new Date().toISOString(),
    ...(options.sourceDocumentId ? { sourceDocumentId: options.sourceDocumentId } : {}),
    nodes,
    edges,
    ...(groups.length > 0 ? { groups } : {}),
  };
}

export function pasteGraphEditorClipboardPayload<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  payload: GraphEditorClipboardPayload<TNodeData, TEdgeData, TPortType>,
  options: GraphEditorPasteOptions = {},
): GraphEditorPasteResult<TNodeData, TEdgeData, TPortType> {
  if (
    payload.format !== graphEditorClipboardFormat ||
    payload.version !== graphEditorClipboardVersion
  ) {
    throw new Error("Unsupported graph editor clipboard payload");
  }
  const offsetX = options.offsetX ?? 48;
  const offsetY = options.offsetY ?? 48;
  const existingNodeIds = new Set(document.nodes.map((node) => node.id));
  const existingEdgeIds = new Set(document.edges.map((edge) => edge.id));
  const existingGroupIds = new Set((document.groups ?? []).map((group) => group.id));
  const nodeIdMap = new Map<string, string>();
  const nodes = payload.nodes.map((node) => {
    const id =
      options.createNodeId?.(node.id, existingNodeIds) ?? createUniqueId(node.id, existingNodeIds);
    existingNodeIds.add(id);
    nodeIdMap.set(node.id, id);
    return { ...cloneGraphEditorNode(node), id, x: node.x + offsetX, y: node.y + offsetY };
  });
  const edges = payload.edges.flatMap((edge) => {
    const sourceNodeId = nodeIdMap.get(edge.sourceNodeId);
    const targetNodeId = nodeIdMap.get(edge.targetNodeId);
    if (!sourceNodeId || !targetNodeId) {
      return [];
    }
    const id =
      options.createEdgeId?.(edge.id, existingEdgeIds) ?? createUniqueId(edge.id, existingEdgeIds);
    existingEdgeIds.add(id);
    return [{ ...cloneGraphEditorEdge(edge), id, sourceNodeId, targetNodeId }];
  });
  const groups = (payload.groups ?? []).flatMap((group) => {
    const nodeIds = group.nodeIds.flatMap((nodeId) => {
      const mapped = nodeIdMap.get(nodeId);
      return mapped ? [mapped] : [];
    });
    if (nodeIds.length === 0) {
      return [];
    }
    const id = createUniqueId(group.id, existingGroupIds);
    existingGroupIds.add(id);
    return [{ ...cloneGraphEditorGroup(group), id, nodeIds }];
  });
  return {
    document: normalizeGraphEditorDocument({
      ...document,
      nodes: [...document.nodes, ...nodes],
      edges: [...document.edges, ...edges],
      groups: [...(document.groups ?? []), ...groups],
    }),
    nodeIds: nodes.map((node) => node.id),
    edgeIds: edges.map((edge) => edge.id),
    ...(groups.length > 0 ? { groupIds: groups.map((group) => group.id) } : {}),
  };
}

export function duplicateGraphEditorSelection<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  selection: GraphEditorSelectionState,
  options: { offsetX?: number; offsetY?: number } = {},
) {
  return pasteGraphEditorClipboardPayload(
    document,
    copyGraphEditorSelection(document, selection),
    options,
  );
}

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

function toEditorGraphNode<TNodeData, TPortType>(
  node: GraphEditorNode<TNodeData, TPortType>,
): GraphEditorFoundationNode<TNodeData, TPortType> {
  return {
    ...node,
    type: node.type ?? node.kind ?? "graph-node",
  };
}

function toEditorGraphEdge<TEdgeData>(
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

function toEditorGraphPort<TPortType>(
  port: GraphEditorPort<TPortType>,
  direction: NonNullable<EditorGraphPort["direction"]>,
): EditorGraphPort {
  return {
    ...port,
    direction,
  };
}

function getGraphEditorPrimarySelectionItem<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  selection: EditorSelection | null,
): GraphEditorSelectionItem | null {
  const primaryId = getEditorSelectionPrimaryEntityId(selection);
  if (!primaryId) {
    return null;
  }
  if (document.nodes.some((node) => node.id === primaryId)) {
    return { type: "node", id: primaryId };
  }
  if (document.edges.some((edge) => edge.id === primaryId)) {
    return { type: "edge", id: primaryId };
  }
  if ((document.groups ?? []).some((group) => group.id === primaryId)) {
    return { type: "group", id: primaryId };
  }
  return null;
}

function normalizeGraphEditorGroups(
  groups: GraphEditorDocument["groups"],
  nodeIds: ReadonlySet<string>,
) {
  const seenGroupIds = new Set<string>();
  const seenNodeIds = new Set<string>();
  return (Array.isArray(groups) ? groups : []).flatMap((group) => {
    if (!isRecord(group) || typeof group.id !== "string" || seenGroupIds.has(group.id)) {
      return [];
    }
    const groupNodeIds = orderedUnique(
      [...nodeIds],
      Array.isArray(group.nodeIds) ? group.nodeIds : [],
    ).filter((nodeId) => !seenNodeIds.has(nodeId));
    for (const nodeId of groupNodeIds) {
      seenNodeIds.add(nodeId);
    }
    if (groupNodeIds.length === 0) {
      return [];
    }
    seenGroupIds.add(group.id);
    return [
      {
        ...group,
        label: typeof group.label === "string" ? group.label : "Group",
        nodeIds: groupNodeIds,
      } as GraphEditorGroup,
    ];
  });
}

function graphEditorEdgeReferencesDeclaredPorts<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  edge: GraphEditorEdge<TEdgeData>,
  nodeById: ReadonlyMap<string, GraphEditorNode<TNodeData, TPortType>>,
) {
  const sourceNode = nodeById.get(edge.sourceNodeId);
  const targetNode = nodeById.get(edge.targetNodeId);
  if (!sourceNode || !targetNode) {
    return false;
  }
  const sourcePortIds = Array.isArray(sourceNode.outputs)
    ? new Set(sourceNode.outputs.map((port) => port.id))
    : null;
  const targetPortIds = Array.isArray(targetNode.inputs)
    ? new Set(targetNode.inputs.map((port) => port.id))
    : null;

  return (
    (!sourcePortIds || sourcePortIds.has(edge.sourcePortId)) &&
    (!targetPortIds || targetPortIds.has(edge.targetPortId))
  );
}

function cloneGraphEditorNode<TNodeData, TPortType>(
  node: GraphEditorNode<TNodeData, TPortType>,
): GraphEditorNode<TNodeData, TPortType> {
  return structuredCloneIfAvailable(node);
}

function cloneGraphEditorEdge<TEdgeData>(
  edge: GraphEditorEdge<TEdgeData>,
): GraphEditorEdge<TEdgeData> {
  return structuredCloneIfAvailable(edge);
}

function cloneGraphEditorGroup(group: GraphEditorGroup): GraphEditorGroup {
  return structuredCloneIfAvailable(group);
}

function structuredCloneIfAvailable<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
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

const createUniqueId = createUniqueEditorId;

function orderedUnique(allowedIds: readonly string[], ids: readonly string[]) {
  const requested = new Set(ids);
  const seen = new Set<string>();
  return allowedIds.filter((id) => {
    if (!requested.has(id) || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

function formatGraphEditorDocumentValidationMessage(diagnostics: GraphEditorDocumentDiagnostic[]) {
  return diagnostics.length === 0
    ? "Graph document is invalid"
    : `Graph document is invalid: ${diagnostics.map((diagnostic) => diagnostic.message).join("; ")}`;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number, fallback: number) {
  return Number.isFinite(value) ? Math.min(Math.max(value, min), max) : fallback;
}
