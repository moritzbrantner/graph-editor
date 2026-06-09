import {
  applyEditorPatch,
  diffEditorJson,
  invertEditorPatch,
  isEditorPatchEmpty,
  type ApplyEditorPatchOptions,
  type DiffEditorJsonOptions,
  type EditorPatch,
} from "@moritzbrantner/editor-core/patches";

import { normalizeGraphEditorDocument, type GraphEditorDocument } from "./core";

export type GraphEditorDocumentPatch = EditorPatch;
export type DiffGraphEditorDocumentsOptions = DiffEditorJsonOptions;
export type ApplyGraphEditorDocumentPatchOptions = ApplyEditorPatchOptions & {
  normalize?: boolean;
};

export function diffGraphEditorDocuments<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  before: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  after: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  options: DiffGraphEditorDocumentsOptions = {},
): GraphEditorDocumentPatch {
  return diffEditorJson(before, after, options);
}

export function applyGraphEditorDocumentPatch<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  patch: GraphEditorDocumentPatch,
  options: ApplyGraphEditorDocumentPatchOptions = {},
): GraphEditorDocument<TNodeData, TEdgeData, TPortType> {
  const nextDocument = applyEditorPatch(document, patch, {
    strict: options.strict ?? true,
  }) as GraphEditorDocument<TNodeData, TEdgeData, TPortType>;

  return options.normalize === false
    ? nextDocument
    : normalizeGraphEditorDocument(nextDocument, { mode: "repair" });
}

export {
  invertEditorPatch as invertGraphEditorDocumentPatch,
  isEditorPatchEmpty as isGraphEditorDocumentPatchEmpty,
};
