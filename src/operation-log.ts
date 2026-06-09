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
      const operation = input as GraphEditorSerializedOperation;
      if (typeof operation.id !== "string" || !operation.id.trim()) {
        throw new EditorJsonParseError([
          { path: joinPath(path, "id"), message: "Operation id is required." },
        ]);
      }
      if (typeof operation.type !== "string" || !operation.type.startsWith("graph.")) {
        throw new EditorJsonParseError([
          { path: joinPath(path, "type"), message: "Graph operation type is required." },
        ]);
      }
      if (!isRecord(operation.payload) || operation.payload.type !== operation.type) {
        throw new EditorJsonParseError([
          {
            path: joinPath(path, "payload.type"),
            message: "Operation payload type must match operation type.",
          },
        ]);
      }
      return operation;
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
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function joinPath(root: string, segment: string) {
  return root ? `${root}.${segment}` : segment;
}
