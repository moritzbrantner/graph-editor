import {
  createEditorEntitySelection,
  getEditorSelectedEntityIds,
  getEditorSelectionPrimaryEntityId,
  normalizeEditorSelection,
  type EditorSelection,
} from "@moritzbrantner/editor-core/selection";

import { graphEditorBoundsIntersect } from "./bounds";
import type {
  GraphEditorBounds,
  GraphEditorDocument,
  GraphEditorSelectableBounds,
  GraphEditorSelectionItem,
  GraphEditorSelectionMode,
  GraphEditorSelectionState,
} from "./types";
import { orderedUnique } from "./utils";

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
