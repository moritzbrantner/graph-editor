import {
  parseEditorDocumentJson,
  readEditorDocument,
  serializeEditorDocument,
  type EditorDocumentAdapter,
  type EditorDocumentMigrations,
  type ReadEditorDocumentOptions,
  type SerializeEditorDocumentOptions,
  type SerializedEditorDocument,
} from "@moritzbrantner/editor-core/serialization";

import {
  graphEditorDocumentAdapter,
  graphEditorDocumentFormat,
  graphEditorSchemaVersion,
  type GraphEditorDocument,
} from "./core";

function getTypedGraphEditorDocumentAdapter<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>() {
  return graphEditorDocumentAdapter as unknown as EditorDocumentAdapter<
    GraphEditorDocument<TNodeData, TEdgeData, TPortType>
  > & {
    format: typeof graphEditorDocumentFormat;
    schemaVersion: typeof graphEditorSchemaVersion;
  };
}

export type SerializedGraphEditorDocument<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = SerializedEditorDocument<
  GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  typeof graphEditorDocumentFormat,
  typeof graphEditorSchemaVersion
>;

export type GraphEditorDocumentMigrations<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = EditorDocumentMigrations<GraphEditorDocument<TNodeData, TEdgeData, TPortType>>;

export type GraphEditorSerializeDocumentOptions = SerializeEditorDocumentOptions;
export type SerializeGraphEditorDocumentOptions = SerializeEditorDocumentOptions;

export type GraphEditorReadDocumentOptions<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = ReadEditorDocumentOptions<GraphEditorDocument<TNodeData, TEdgeData, TPortType>>;
export type ReadGraphEditorDocumentOptions<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = GraphEditorReadDocumentOptions<TNodeData, TEdgeData, TPortType>;

export { graphEditorDocumentAdapter };

export function serializeGraphEditorDocument<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  options: SerializeGraphEditorDocumentOptions = {},
): SerializedGraphEditorDocument<TNodeData, TEdgeData, TPortType> {
  return serializeEditorDocument(
    document,
    getTypedGraphEditorDocumentAdapter<TNodeData, TEdgeData, TPortType>(),
    options,
  ) as SerializedGraphEditorDocument<TNodeData, TEdgeData, TPortType>;
}

export function readSerializedGraphEditorDocument<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  input: unknown,
  options: ReadGraphEditorDocumentOptions<TNodeData, TEdgeData, TPortType> = {},
): GraphEditorDocument<TNodeData, TEdgeData, TPortType> {
  return readEditorDocument(
    input,
    getTypedGraphEditorDocumentAdapter<TNodeData, TEdgeData, TPortType>(),
    options,
  ) as GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
}

export function parseGraphEditorDocumentJson<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  text: string,
  options: ReadGraphEditorDocumentOptions<TNodeData, TEdgeData, TPortType> = {},
): GraphEditorDocument<TNodeData, TEdgeData, TPortType> {
  return parseEditorDocumentJson(
    text,
    getTypedGraphEditorDocumentAdapter<TNodeData, TEdgeData, TPortType>(),
    options,
  ) as GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
}
