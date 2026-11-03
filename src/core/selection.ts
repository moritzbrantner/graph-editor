import {
  createEditorEntitySelection,
  getEditorSelectedEntityIds,
  getEditorSelectionPrimaryEntityId,
  normalizeEditorSelection,
  type EditorSelection,
} from "@moenarch/editor-core/selection";

import { graphEditorBoundsIntersect, normalizeGraphEditorBounds } from "./bounds";
import type { GraphEditorSpatialIndex } from "./spatial-index";
import type { GraphEditorNodeIdFilter } from "./spatial-queries";
import type {
  GraphEditorBounds,
  GraphEditorDocument,
  GraphEditorSelectableBounds,
  GraphEditorSelectionItem,
  GraphEditorSelectionMode,
  GraphEditorSelectionState,
} from "./types";
import { toIdSet } from "./utils";

export function normalizeGraphEditorSelection<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  selection: GraphEditorSelectionState,
): GraphEditorSelectionState {
  const requested = graphEditorSelectionToEditorSelection(selection);
  // Resolve which requested ids exist in one pass over the document, so normalization stays
  // linear in document size for selections of any size.
  const requestedIds = new Set(getEditorSelectedEntityIds(requested));
  const existingIds = new Set<string>();
  if (requestedIds.size > 0) {
    for (const entities of [document.nodes, document.edges, document.groups ?? []]) {
      for (const { id } of entities) {
        if (requestedIds.has(id)) {
          existingIds.add(id);
        }
      }
    }
  }
  const editorSelection = normalizeEditorSelection(requested, (id) => existingIds.has(id));
  const selectedIds = new Set(getEditorSelectedEntityIds(editorSelection));
  const nodeIds = selectedInDocumentOrder(document.nodes, selectedIds);
  const edgeIds = selectedInDocumentOrder(document.edges, selectedIds);
  const groupIds = selectedInDocumentOrder(document.groups ?? [], selectedIds);
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

function selectedInDocumentOrder(
  entities: readonly { id: string }[],
  selectedIds: ReadonlySet<string>,
): string[] {
  const ids: string[] = [];
  if (selectedIds.size === 0) {
    return ids;
  }
  const seen = new Set<string>();
  for (const { id } of entities) {
    if (selectedIds.has(id) && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
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
  return selectGraphEditorItemsFromBoundsHits(
    document,
    items.filter((item) => graphEditorBoundsIntersect(bounds, item.bounds)),
    options,
  );
}

/**
 * Applies bounds hits to a selection in one pass. Equivalent to extending the selection with each
 * hit in turn, without renormalizing the whole selection once per hit.
 */
function selectGraphEditorItemsFromBoundsHits<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  hits: readonly GraphEditorSelectionItem[],
  options: { mode?: GraphEditorSelectionMode; selection?: GraphEditorSelectionState } = {},
): GraphEditorSelectionState {
  const base =
    options.mode === "toggle" || options.mode === "extend"
      ? normalizeGraphEditorSelection(document, options.selection ?? clearGraphEditorSelection())
      : clearGraphEditorSelection();
  if (hits.length === 0) {
    return normalizeGraphEditorSelection(document, base);
  }
  const extended = normalizeGraphEditorSelection(document, {
    nodeIds: [...base.nodeIds, ...hits.flatMap((hit) => (hit.type === "node" ? [hit.id] : []))],
    edgeIds: [...base.edgeIds, ...hits.flatMap((hit) => (hit.type === "edge" ? [hit.id] : []))],
    groupIds: [
      ...(base.groupIds ?? []),
      ...hits.flatMap((hit) => (hit.type === "group" ? [hit.id] : [])),
    ],
    primary: hits.at(-1),
  });
  // A second pass derives the primary item from document order, as incremental extension does.
  return normalizeGraphEditorSelection(document, extended);
}

export type GraphEditorSpatialSelectionOptions = {
  mode?: GraphEditorSelectionMode;
  selection?: GraphEditorSelectionState;
  /** Indexed nodes that are not selectable, e.g. hidden nodes. */
  excludeNodeIds?: GraphEditorNodeIdFilter;
  /** Additional non-node selectables (edges, group frames) tested against `bounds` directly. */
  items?: readonly GraphEditorSelectableBounds[];
};

/**
 * Marquee selection backed by the spatial index: nodes are queried from `index`, while
 * `items` (edges, groups) are tested directly. The result equals
 * `getGraphEditorSelectionFromBounds` over every node's bounds followed by `items`.
 */
export function getGraphEditorSelectionFromSpatialIndex<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  bounds: GraphEditorBounds,
  index: Pick<GraphEditorSpatialIndex, "query">,
  options: GraphEditorSpatialSelectionOptions = {},
): GraphEditorSelectionState {
  const normalized = normalizeGraphEditorBounds(bounds);
  const excluded = toIdSet(options.excludeNodeIds);
  const hits: { type: "node" | "edge" | "group"; id: string }[] = [];
  for (const nodeId of index.query(normalized)) {
    if (!excluded.has(nodeId)) {
      hits.push({ type: "node", id: nodeId });
    }
  }
  for (const item of options.items ?? []) {
    if (graphEditorBoundsIntersect(normalized, item.bounds)) {
      hits.push({ type: item.type, id: item.id });
    }
  }
  return selectGraphEditorItemsFromBoundsHits(document, hits, options);
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
