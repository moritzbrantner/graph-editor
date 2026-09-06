import {
  readEditorOperationLog,
  serializeEditorOperationLog,
  type EditorOperationLogAdapter,
  type EditorOperationLogMigrations,
  type ReadEditorOperationLogOptions,
  type SerializedEditorOperation,
  type SerializedEditorOperationLog,
} from "@moritzbrantner/editor-core/operations";
import {
  EditorJsonParseError,
  type EditorParseIssue,
} from "@moritzbrantner/editor-core/serialization";

import {
  validateGraphEditorDocument,
  type GraphEditorDocument,
  type GraphEditorEdge,
  type GraphEditorNode,
  type GraphEditorSelectionState,
  type GraphEditorViewport,
} from "./core";
import type { GraphEditorLayoutOptions } from "./layout";
import {
  createGraphEditorAddEdgeOperation,
  createGraphEditorAddNodeOperation,
  createGraphEditorCreateGroupOperation,
  createGraphEditorLayoutOperation,
  createGraphEditorMoveNodesOperation,
  createGraphEditorPatchOperation,
  createGraphEditorReplaceDocumentOperation,
  createGraphEditorRemoveEdgeOperation,
  createGraphEditorRemoveSelectionOperation,
  createGraphEditorUngroupOperation,
  createGraphEditorUpdateEdgeOperation,
  createGraphEditorUpdateNodeOperation,
  createGraphEditorUpdateViewportOperation,
  type GraphEditorOperation,
} from "./operations";
import type { GraphEditorDocumentPatch } from "./patches";

export const graphEditorOperationLogFormat = "@moritzbrantner/graph-editor/operations";
export const graphEditorOperationLogSchemaVersion = 1;

export type GraphEditorSerializedOperationPayload<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> =
  | { type: "graph.add-node"; node: GraphEditorNode<TNodeData, TPortType> }
  | {
      type: "graph.update-node";
      nodeId: string;
      patch: Partial<GraphEditorNode<TNodeData, TPortType>>;
    }
  | { type: "graph.move-nodes"; positionsByNodeId: Record<string, { x: number; y: number }> }
  | { type: "graph.remove-selection"; selection: GraphEditorSelectionState }
  | { type: "graph.add-edge"; edge: GraphEditorEdge<TEdgeData> }
  | { type: "graph.update-edge"; edgeId: string; patch: Partial<GraphEditorEdge<TEdgeData>> }
  | { type: "graph.remove-edge"; edgeId: string }
  | { type: "graph.create-group"; nodeIds: string[]; id?: string; label?: string }
  | { type: "graph.ungroup"; groupIds: string[] }
  | { type: "graph.layout"; options?: GraphEditorLayoutOptions<TNodeData> }
  | { type: "graph.update-viewport"; viewport: GraphEditorViewport }
  | {
      type: "graph.replace-document";
      document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
    }
  | { type: "graph.patch"; patch: GraphEditorDocumentPatch }
  | { type: "graph.duplicate-selection"; unsupported: true; reason?: string }
  | { type: "graph.paste"; unsupported: true; reason?: string };

const graphEditorOperationTypes = {
  "graph.add-node": true,
  "graph.update-node": true,
  "graph.move-nodes": true,
  "graph.remove-selection": true,
  "graph.add-edge": true,
  "graph.update-edge": true,
  "graph.remove-edge": true,
  "graph.create-group": true,
  "graph.ungroup": true,
  "graph.layout": true,
  "graph.update-viewport": true,
  "graph.replace-document": true,
  "graph.patch": true,
  "graph.duplicate-selection": true,
  "graph.paste": true,
} satisfies Record<GraphEditorSerializedOperationPayload["type"], true>;

type GraphEditorOperationPayloadValidator = (
  payload: Record<string, unknown>,
  path: string,
) => void;

const graphEditorOperationPayloadValidators = {
  "graph.add-node": (payload, path) => {
    assertGraphEditorNodeShape(payload.node, joinPath(path, "node"));
  },
  "graph.update-node": (payload, path) => {
    requireNonEmptyString(payload.nodeId, joinPath(path, "nodeId"), "Node id");
    const patch = requireRecord(payload.patch, joinPath(path, "patch"), "Node patch");
    assertGraphEditorNodePatchShape(patch, joinPath(path, "patch"));
  },
  "graph.move-nodes": (payload, path) => {
    const positions = requireRecord(
      payload.positionsByNodeId,
      joinPath(path, "positionsByNodeId"),
      "Node positions",
    );
    for (const [nodeId, position] of Object.entries(positions)) {
      if (!nodeId.trim()) {
        throwParseIssue(joinPath(path, "positionsByNodeId"), "Node position id is required.");
      }
      assertFinitePoint(position, joinPath(joinPath(path, "positionsByNodeId"), nodeId));
    }
  },
  "graph.remove-selection": (payload, path) => {
    assertGraphEditorSelectionShape(payload.selection, joinPath(path, "selection"));
  },
  "graph.add-edge": (payload, path) => {
    assertGraphEditorEdgeShape(payload.edge, joinPath(path, "edge"));
  },
  "graph.update-edge": (payload, path) => {
    requireNonEmptyString(payload.edgeId, joinPath(path, "edgeId"), "Edge id");
    const patch = requireRecord(payload.patch, joinPath(path, "patch"), "Edge patch");
    assertGraphEditorEdgePatchShape(patch, joinPath(path, "patch"));
  },
  "graph.remove-edge": (payload, path) => {
    requireNonEmptyString(payload.edgeId, joinPath(path, "edgeId"), "Edge id");
  },
  "graph.create-group": (payload, path) => {
    requireStringArray(payload.nodeIds, joinPath(path, "nodeIds"), "Group node ids");
    if (payload.id !== undefined) {
      requireNonEmptyString(payload.id, joinPath(path, "id"), "Group id");
    }
    if (payload.label !== undefined && typeof payload.label !== "string") {
      throwParseIssue(joinPath(path, "label"), "Group label must be a string.");
    }
  },
  "graph.ungroup": (payload, path) => {
    requireStringArray(payload.groupIds, joinPath(path, "groupIds"), "Group ids");
  },
  "graph.layout": (payload, path) => {
    assertGraphEditorLayoutOptionsShape(payload.options, joinPath(path, "options"));
  },
  "graph.update-viewport": (payload, path) => {
    assertGraphEditorViewportShape(payload.viewport, joinPath(path, "viewport"));
  },
  "graph.replace-document": (payload, path) => {
    assertGraphEditorDocumentShape(payload.document, joinPath(path, "document"));
  },
  "graph.patch": (payload, path) => {
    assertGraphEditorPatchShape(payload.patch, joinPath(path, "patch"));
  },
  "graph.duplicate-selection": (payload, path) => {
    assertUnsupportedPayloadShape(payload, path);
  },
  "graph.paste": (payload, path) => {
    assertUnsupportedPayloadShape(payload, path);
  },
} satisfies Record<
  GraphEditorSerializedOperationPayload["type"],
  GraphEditorOperationPayloadValidator
>;

export type GraphEditorSerializedOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = SerializedEditorOperation<
  GraphEditorSerializedOperationPayload<TNodeData, TEdgeData, TPortType>,
  GraphEditorSerializedOperationPayload<TNodeData, TEdgeData, TPortType>["type"],
  typeof graphEditorOperationLogSchemaVersion
>;

export type SerializedGraphEditorOperationLog<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = SerializedEditorOperationLog<
  GraphEditorSerializedOperationPayload<TNodeData, TEdgeData, TPortType>,
  typeof graphEditorOperationLogFormat,
  typeof graphEditorOperationLogSchemaVersion
>;

export type GraphEditorOperationLogMigrations<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = EditorOperationLogMigrations<GraphEditorSerializedOperation<TNodeData, TEdgeData, TPortType>>;

export type SerializeGraphEditorOperationOptions = {
  id?: string;
  label?: string;
  origin?: GraphEditorSerializedOperation["origin"];
  mergeKey?: string;
  createdAt?: string | Date;
  metadata?: Record<string, unknown>;
};

export const graphEditorOperationLogAdapter: EditorOperationLogAdapter<GraphEditorSerializedOperation> =
  {
    format: graphEditorOperationLogFormat,
    schemaVersion: graphEditorOperationLogSchemaVersion,
    read(input, path = "") {
      if (!isRecord(input)) {
        throw new EditorJsonParseError([{ path, message: "Graph operation must be an object." }]);
      }
      if (typeof input.id !== "string" || !input.id.trim()) {
        throw new EditorJsonParseError([
          { path: joinPath(path, "id"), message: "Operation id is required." },
        ]);
      }
      if (!isGraphEditorOperationType(input.type)) {
        throw new EditorJsonParseError([
          { path: joinPath(path, "type"), message: "Graph operation type is unsupported." },
        ]);
      }
      const payload = input.payload;
      if (!isRecord(payload) || payload.type !== input.type) {
        throw new EditorJsonParseError([
          {
            path: joinPath(path, "payload.type"),
            message: "Operation payload type must match operation type.",
          },
        ]);
      }
      graphEditorOperationPayloadValidators[input.type](payload, joinPath(path, "payload"));
      return input as unknown as GraphEditorSerializedOperation;
    },
    validate(operation) {
      const issues: EditorParseIssue[] = [];
      if (operation.schemaVersion !== graphEditorOperationLogSchemaVersion) {
        issues.push({
          path: "schemaVersion",
          message: `Expected graph operation schema version ${graphEditorOperationLogSchemaVersion}.`,
        });
      }
      if (
        operation.payload.type === "graph.duplicate-selection" ||
        operation.payload.type === "graph.paste"
      ) {
        // These operations generate fresh ids at apply time; logs must store materialized patches.
        issues.push({
          path: "payload",
          message: `${operation.payload.type} cannot be replayed without materialized generated ids.`,
        });
      }
      return issues;
    },
  };

export function serializeGraphEditorOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  type: GraphEditorSerializedOperationPayload<TNodeData, TEdgeData, TPortType>["type"],
  payload: GraphEditorSerializedOperationPayload<TNodeData, TEdgeData, TPortType>,
  options: SerializeGraphEditorOperationOptions = {},
): GraphEditorSerializedOperation<TNodeData, TEdgeData, TPortType> {
  if (payload.type !== type) {
    throw new Error("Graph operation payload type must match operation type.");
  }
  if (type === "graph.duplicate-selection" || type === "graph.paste") {
    throw new Error(`${type} cannot be serialized without materialized generated ids.`);
  }

  const operation: GraphEditorSerializedOperation<TNodeData, TEdgeData, TPortType> = {
    id: options.id ?? type,
    payload,
    schemaVersion: graphEditorOperationLogSchemaVersion,
    type,
  };
  if (options.label) {
    operation.label = options.label;
  }
  if (options.origin) {
    operation.origin = options.origin;
  }
  if (options.mergeKey) {
    operation.mergeKey = options.mergeKey;
  }
  if (options.createdAt) {
    operation.createdAt =
      options.createdAt instanceof Date ? options.createdAt.toISOString() : options.createdAt;
  }
  if (options.metadata) {
    operation.metadata = options.metadata;
  }
  return operation;
}

export function serializeGraphEditorOperationLog<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  operations: readonly GraphEditorSerializedOperation<TNodeData, TEdgeData, TPortType>[],
  options: {
    exportedAt?: string | Date | false;
    metadata?: Record<string, unknown>;
  } = {},
): SerializedGraphEditorOperationLog<TNodeData, TEdgeData, TPortType> {
  return serializeEditorOperationLog(operations, {
    format: graphEditorOperationLogFormat,
    schemaVersion: graphEditorOperationLogSchemaVersion,
    ...options,
  }) as SerializedGraphEditorOperationLog<TNodeData, TEdgeData, TPortType>;
}

export function readGraphEditorOperationLog<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  input: unknown,
  options: ReadEditorOperationLogOptions<
    GraphEditorSerializedOperation<TNodeData, TEdgeData, TPortType>
  > = {},
): readonly GraphEditorSerializedOperation<TNodeData, TEdgeData, TPortType>[] {
  return readEditorOperationLog(
    input,
    graphEditorOperationLogAdapter as EditorOperationLogAdapter<
      GraphEditorSerializedOperation<TNodeData, TEdgeData, TPortType>
    >,
    options,
  );
}

export function graphEditorOperationFromSerializedOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  operation: GraphEditorSerializedOperation<TNodeData, TEdgeData, TPortType>,
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  const payload = operation.payload;
  const common = {
    label: operation.label,
    mergeKey: operation.mergeKey,
    metadata: operation.metadata,
    origin: operation.origin,
  };

  switch (payload.type) {
    case "graph.add-node":
      return { ...createGraphEditorAddNodeOperation({ node: payload.node }), ...common };
    case "graph.update-node":
      return { ...createGraphEditorUpdateNodeOperation(payload.nodeId, payload.patch), ...common };
    case "graph.move-nodes":
      return { ...createGraphEditorMoveNodesOperation(payload.positionsByNodeId), ...common };
    case "graph.remove-selection":
      return { ...createGraphEditorRemoveSelectionOperation(payload.selection), ...common };
    case "graph.add-edge":
      return { ...createGraphEditorAddEdgeOperation({ edge: payload.edge }), ...common };
    case "graph.update-edge":
      return { ...createGraphEditorUpdateEdgeOperation(payload.edgeId, payload.patch), ...common };
    case "graph.remove-edge":
      return { ...createGraphEditorRemoveEdgeOperation(payload.edgeId), ...common };
    case "graph.create-group":
      return {
        ...createGraphEditorCreateGroupOperation(payload.nodeIds, {
          id: payload.id,
          label: payload.label,
        }),
        ...common,
      };
    case "graph.ungroup":
      return { ...createGraphEditorUngroupOperation(payload.groupIds), ...common };
    case "graph.layout":
      return { ...createGraphEditorLayoutOperation(payload.options), ...common };
    case "graph.update-viewport":
      return { ...createGraphEditorUpdateViewportOperation(payload.viewport), ...common };
    case "graph.replace-document":
      return { ...createGraphEditorReplaceDocumentOperation(payload.document), ...common };
    case "graph.patch":
      return { ...createGraphEditorPatchOperation(payload.patch), ...common };
    case "graph.duplicate-selection":
    case "graph.paste":
      throw new Error(`${payload.type} cannot be replayed without materialized generated ids.`);
    default:
      throw new Error("Unsupported graph operation type.");
  }
}

function isGraphEditorOperationType(
  value: unknown,
): value is GraphEditorSerializedOperationPayload["type"] {
  return typeof value === "string" && Object.hasOwn(graphEditorOperationTypes, value);
}

function assertGraphEditorNodeShape(value: unknown, path: string) {
  const node = requireRecord(value, path, "Node");
  requireNonEmptyString(node.id, joinPath(path, "id"), "Node id");
  if (typeof node.label !== "string") {
    throwParseIssue(joinPath(path, "label"), "Node label must be a string.");
  }
  requireFiniteNumber(node.x, joinPath(path, "x"), "Node x");
  requireFiniteNumber(node.y, joinPath(path, "y"), "Node y");
  if (node.inputs !== undefined) {
    assertGraphEditorPortArrayShape(node.inputs, joinPath(path, "inputs"));
  }
  if (node.outputs !== undefined) {
    assertGraphEditorPortArrayShape(node.outputs, joinPath(path, "outputs"));
  }
}

function assertGraphEditorNodePatchShape(patch: Record<string, unknown>, path: string) {
  if (patch.label !== undefined && typeof patch.label !== "string") {
    throwParseIssue(joinPath(path, "label"), "Node label must be a string.");
  }
  if (patch.x !== undefined) {
    requireFiniteNumber(patch.x, joinPath(path, "x"), "Node x");
  }
  if (patch.y !== undefined) {
    requireFiniteNumber(patch.y, joinPath(path, "y"), "Node y");
  }
  if (patch.inputs !== undefined) {
    assertGraphEditorPortArrayShape(patch.inputs, joinPath(path, "inputs"));
  }
  if (patch.outputs !== undefined) {
    assertGraphEditorPortArrayShape(patch.outputs, joinPath(path, "outputs"));
  }
}

function assertGraphEditorPortArrayShape(value: unknown, path: string) {
  if (!Array.isArray(value)) {
    throwParseIssue(path, "Node ports must be an array.");
  }
  value.forEach((portValue, index) => {
    const portPath = `${path}.${index}`;
    const port = requireRecord(portValue, portPath, "Port");
    requireNonEmptyString(port.id, joinPath(portPath, "id"), "Port id");
    if (typeof port.label !== "string") {
      throwParseIssue(joinPath(portPath, "label"), "Port label must be a string.");
    }
  });
}

function assertGraphEditorEdgeShape(value: unknown, path: string) {
  const edge = requireRecord(value, path, "Edge");
  requireNonEmptyString(edge.id, joinPath(path, "id"), "Edge id");
  for (const field of ["sourceNodeId", "sourcePortId", "targetNodeId", "targetPortId"] as const) {
    requireNonEmptyString(edge[field], joinPath(path, field), `Edge ${field}`);
  }
}

function assertGraphEditorEdgePatchShape(patch: Record<string, unknown>, path: string) {
  for (const field of ["sourceNodeId", "sourcePortId", "targetNodeId", "targetPortId"] as const) {
    if (patch[field] !== undefined) {
      requireNonEmptyString(patch[field], joinPath(path, field), `Edge ${field}`);
    }
  }
}

function assertGraphEditorSelectionShape(value: unknown, path: string) {
  const selection = requireRecord(value, path, "Selection");
  requireStringArray(selection.nodeIds, joinPath(path, "nodeIds"), "Selection node ids");
  requireStringArray(selection.edgeIds, joinPath(path, "edgeIds"), "Selection edge ids");
  if (selection.groupIds !== undefined) {
    requireStringArray(selection.groupIds, joinPath(path, "groupIds"), "Selection group ids");
  }
  if (selection.primary !== undefined) {
    const primary = requireRecord(
      selection.primary,
      joinPath(path, "primary"),
      "Primary selection",
    );
    if (primary.type !== "node" && primary.type !== "edge" && primary.type !== "group") {
      throwParseIssue(
        joinPath(joinPath(path, "primary"), "type"),
        "Primary selection type is unsupported.",
      );
    }
    requireNonEmptyString(
      primary.id,
      joinPath(joinPath(path, "primary"), "id"),
      "Primary selection id",
    );
  }
}

function assertGraphEditorLayoutOptionsShape(value: unknown, path: string) {
  if (value === undefined) {
    return;
  }
  const options = requireRecord(value, path, "Layout options");
  if (options.nodeIds !== undefined) {
    requireStringArray(options.nodeIds, joinPath(path, "nodeIds"), "Layout node ids");
  }
  if (
    options.direction !== undefined &&
    options.direction !== "right" &&
    options.direction !== "down"
  ) {
    throwParseIssue(joinPath(path, "direction"), "Layout direction is unsupported.");
  }
  for (const field of [
    "rankSeparation",
    "nodeSeparation",
    "edgeSeparation",
    "marginX",
    "marginY",
  ] as const) {
    if (options[field] !== undefined) {
      requireFiniteNumber(options[field], joinPath(path, field), `Layout ${field}`);
    }
  }
  for (const field of ["nodeWidth", "nodeHeight"] as const) {
    if (options[field] !== undefined) {
      requirePositiveFiniteNumber(options[field], joinPath(path, field), `Layout ${field}`);
    }
  }
}

function assertGraphEditorViewportShape(value: unknown, path: string) {
  const viewport = requireRecord(value, path, "Viewport");
  for (const field of ["x", "y", "zoom"] as const) {
    requireFiniteNumber(viewport[field], joinPath(path, field), `Viewport ${field}`);
  }
}

function assertGraphEditorDocumentShape(value: unknown, path: string) {
  const document = requireRecord(value, path, "Document");
  const diagnostics = validateGraphEditorDocument(document, {
    allowCycles: true,
    allowMissingDeclaredPorts: true,
    allowSelfEdges: true,
  });
  if (diagnostics.length > 0) {
    throw new EditorJsonParseError(
      diagnostics.map((diagnostic) => ({
        path: joinGraphDiagnosticPath(path, diagnostic.path),
        message: diagnostic.message,
      })),
    );
  }
  const graphDocument = document as unknown as GraphEditorDocument;
  for (const [index, node] of graphDocument.nodes.entries()) {
    assertGraphEditorNodeShape(node, `${joinPath(path, "nodes")}.${index}`);
  }
  for (const [index, edge] of graphDocument.edges.entries()) {
    assertGraphEditorEdgeShape(edge, `${joinPath(path, "edges")}.${index}`);
  }
}

function assertGraphEditorPatchShape(value: unknown, path: string) {
  if (!Array.isArray(value)) {
    throwParseIssue(path, "Graph patch must be an array.");
  }
  value.forEach((operationValue, index) => {
    const operationPath = `${path}.${index}`;
    const operation = requireRecord(operationValue, operationPath, "Patch operation");
    if (operation.op !== "add" && operation.op !== "remove" && operation.op !== "replace") {
      throwParseIssue(joinPath(operationPath, "op"), "Patch operation type is unsupported.");
    }
    if (
      !Array.isArray(operation.path) ||
      operation.path.some(
        (segment) =>
          (typeof segment !== "string" && typeof segment !== "number") ||
          (typeof segment === "number" && !Number.isFinite(segment)),
      )
    ) {
      throwParseIssue(
        joinPath(operationPath, "path"),
        "Patch path must contain strings or numbers.",
      );
    }
    if ((operation.op === "add" || operation.op === "replace") && !("value" in operation)) {
      throwParseIssue(joinPath(operationPath, "value"), "Patch operation value is required.");
    }
  });
}

function assertUnsupportedPayloadShape(payload: Record<string, unknown>, path: string) {
  if (payload.unsupported !== true) {
    throwParseIssue(joinPath(path, "unsupported"), "Unsupported operation marker must be true.");
  }
  if (payload.reason !== undefined && typeof payload.reason !== "string") {
    throwParseIssue(joinPath(path, "reason"), "Unsupported operation reason must be a string.");
  }
}

function assertFinitePoint(value: unknown, path: string) {
  const point = requireRecord(value, path, "Node position");
  requireFiniteNumber(point.x, joinPath(path, "x"), "Node position x");
  requireFiniteNumber(point.y, joinPath(path, "y"), "Node position y");
}

function requireRecord(value: unknown, path: string, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throwParseIssue(path, `${label} must be an object.`);
  }
  return value;
}

function requireNonEmptyString(value: unknown, path: string, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throwParseIssue(path, `${label} must be a non-empty string.`);
  }
}

function requireStringArray(value: unknown, path: string, label: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throwParseIssue(path, `${label} must be an array of non-empty strings.`);
  }
}

function requireFiniteNumber(value: unknown, path: string, label: string) {
  if (!Number.isFinite(value)) {
    throwParseIssue(path, `${label} must be a finite number.`);
  }
}

function requirePositiveFiniteNumber(value: unknown, path: string, label: string) {
  if (!Number.isFinite(value) || Number(value) <= 0) {
    throwParseIssue(path, `${label} must be a positive finite number.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function joinGraphDiagnosticPath(root: string, diagnosticPath: string) {
  return diagnosticPath === "$" ? root : `${root}${diagnosticPath.slice(1)}`;
}

function joinPath(root: string, segment: string) {
  return root ? `${root}.${segment}` : segment;
}

function throwParseIssue(path: string, message: string): never {
  throw new EditorJsonParseError([{ path, message }]);
}
