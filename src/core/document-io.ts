import {
  EditorJsonParseError,
  type EditorDocumentAdapter,
} from "@moritzbrantner/editor-core/serialization";

import { graphEditorDocumentFormat, graphEditorSchemaVersion } from "./constants";
import { normalizeGraphEditorDocument } from "./document";
import type {
  GraphEditorDocument,
  GraphEditorDocumentDiagnostic,
  GraphEditorDocumentValidationOptions,
} from "./types";
import { formatGraphEditorDocumentValidationMessage } from "./utils";
import { validateGraphEditorDocument } from "./validation";

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
