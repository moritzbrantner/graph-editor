import { createUniqueEditorId } from "@moritzbrantner/editor-core/entities";

import type {
  GraphEditorDocumentDiagnostic,
  GraphEditorEdge,
  GraphEditorGroup,
  GraphEditorNode,
} from "./types";

export function cloneGraphEditorNode<TNodeData, TPortType>(
  node: GraphEditorNode<TNodeData, TPortType>,
): GraphEditorNode<TNodeData, TPortType> {
  return structuredCloneIfAvailable(node);
}

export function cloneGraphEditorEdge<TEdgeData>(
  edge: GraphEditorEdge<TEdgeData>,
): GraphEditorEdge<TEdgeData> {
  return structuredCloneIfAvailable(edge);
}

export function cloneGraphEditorGroup(group: GraphEditorGroup): GraphEditorGroup {
  return structuredCloneIfAvailable(group);
}

function structuredCloneIfAvailable<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export const createUniqueId = createUniqueEditorId;

export function orderedUnique(allowedIds: readonly string[], ids: readonly string[]) {
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

export function formatGraphEditorDocumentValidationMessage(
  diagnostics: GraphEditorDocumentDiagnostic[],
) {
  return diagnostics.length === 0
    ? "Graph document is invalid"
    : `Graph document is invalid: ${diagnostics.map((diagnostic) => diagnostic.message).join("; ")}`;
}

export function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function clamp(value: number, min: number, max: number, fallback: number) {
  return Number.isFinite(value) ? Math.min(Math.max(value, min), max) : fallback;
}
