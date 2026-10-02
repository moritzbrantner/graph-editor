import { graphEditorBoundsIntersect, normalizeGraphEditorBounds } from "./bounds";
import type { GraphEditorBounds, GraphEditorDocument, GraphEditorNode } from "./types";

export type GraphEditorSpatialIndexOptions<
  TNodeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  /** Authoritative graph-space bounds for a node. Nodes with non-finite bounds are not indexed. */
  getNodeBounds: (node: GraphEditorNode<TNodeData, TPortType>) => GraphEditorBounds;
  /** Grid cell edge length in graph units. Defaults to 512. */
  cellSize?: number;
  /** Node ids excluded from the index, e.g. hidden nodes. */
  hiddenNodeIds?: readonly string[];
};

export type GraphEditorSpatialQueryOptions = {
  /** Graph-space margin added on every side of the query bounds. Defaults to 0. */
  overscan?: number;
};

/** Deterministic work counters; they never depend on timing. */
export type GraphEditorSpatialIndexStats = {
  indexedNodes: number;
  rebuilds: number;
  updates: number;
  queries: number;
  /** Indexed nodes whose bounds were tested against a query. */
  candidateVisits: number;
};

/**
 * A retained graph-space index over node bounds.
 *
 * The index owns a snapshot of node bounds taken from `source`. It never observes documents:
 * callers invalidate it explicitly with `updateNodes` when only node geometry changed, or
 * `rebuild` when nodes were added, removed, reordered, or hidden. Query results are node ids in
 * source document order, so equivalent documents and queries yield identical results.
 */
export type GraphEditorSpatialIndex<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  readonly source: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  query(bounds: GraphEditorBounds, options?: GraphEditorSpatialQueryOptions): string[];
  getNodeBounds(nodeId: string): GraphEditorBounds | undefined;
  rebuild(document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>): void;
  /**
   * Re-reads bounds for `nodeIds` from `document`. Falls back to a full rebuild when the node
   * set or order differs from the indexed source.
   */
  updateNodes(
    document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    nodeIds: readonly string[],
  ): void;
  getStats(): GraphEditorSpatialIndexStats;
  resetStats(): void;
};

type IndexedNode = {
  order: number;
  bounds: GraphEditorBounds;
  cells: string[];
};

const defaultCellSize = 512;
// Nodes spanning more cells than this are kept in a list that every query visits.
const maxCellsPerNode = 256;

export function createGraphEditorSpatialIndex<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  options: GraphEditorSpatialIndexOptions<TNodeData, TPortType>,
): GraphEditorSpatialIndex<TNodeData, TEdgeData, TPortType> {
  const cellSize =
    options.cellSize !== undefined && Number.isFinite(options.cellSize) && options.cellSize > 0
      ? options.cellSize
      : defaultCellSize;
  const hiddenNodeIds = new Set(options.hiddenNodeIds ?? []);
  const entries = new Map<string, IndexedNode>();
  const cells = new Map<string, Set<string>>();
  const oversizedNodeIds = new Set<string>();
  const stats: GraphEditorSpatialIndexStats = {
    indexedNodes: 0,
    rebuilds: 0,
    updates: 0,
    queries: 0,
    candidateVisits: 0,
  };
  let source = document;
  let orderedIds: string[] = [];

  function readBounds(node: GraphEditorNode<TNodeData, TPortType>) {
    const bounds = options.getNodeBounds(node);
    if (
      !Number.isFinite(bounds.x) ||
      !Number.isFinite(bounds.y) ||
      !Number.isFinite(bounds.width) ||
      !Number.isFinite(bounds.height)
    ) {
      return undefined;
    }
    return normalizeGraphEditorBounds(bounds);
  }

  function insert(nodeId: string, order: number, bounds: GraphEditorBounds) {
    const range = cellRange(bounds, cellSize);
    if (rangeCellCount(range) > maxCellsPerNode) {
      oversizedNodeIds.add(nodeId);
      entries.set(nodeId, { order, bounds, cells: [] });
      return;
    }
    const keys = cellKeys(range);
    for (const key of keys) {
      let bucket = cells.get(key);
      if (!bucket) {
        bucket = new Set();
        cells.set(key, bucket);
      }
      bucket.add(nodeId);
    }
    entries.set(nodeId, { order, bounds, cells: keys });
  }

  function remove(nodeId: string) {
    const entry = entries.get(nodeId);
    if (!entry) {
      return;
    }
    for (const key of entry.cells) {
      const bucket = cells.get(key);
      bucket?.delete(nodeId);
      if (bucket?.size === 0) {
        cells.delete(key);
      }
    }
    oversizedNodeIds.delete(nodeId);
    entries.delete(nodeId);
  }

  function rebuild(next: GraphEditorDocument<TNodeData, TEdgeData, TPortType>) {
    entries.clear();
    cells.clear();
    oversizedNodeIds.clear();
    source = next;
    orderedIds = [];
    next.nodes.forEach((node, order) => {
      orderedIds.push(node.id);
      if (hiddenNodeIds.has(node.id)) {
        return;
      }
      const bounds = readBounds(node);
      if (bounds) {
        insert(node.id, order, bounds);
      }
    });
    stats.rebuilds += 1;
    stats.indexedNodes = entries.size;
  }

  function updateNodes(
    next: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    nodeIds: readonly string[],
  ) {
    if (next.nodes.length !== orderedIds.length) {
      rebuild(next);
      return;
    }
    const requested = new Set(nodeIds);
    for (let order = 0; order < next.nodes.length; order += 1) {
      const node = next.nodes[order]!;
      if (node.id !== orderedIds[order]) {
        rebuild(next);
        return;
      }
      if (!requested.has(node.id) || hiddenNodeIds.has(node.id)) {
        continue;
      }
      remove(node.id);
      const bounds = readBounds(node);
      if (bounds) {
        insert(node.id, order, bounds);
      }
    }
    source = next;
    stats.updates += 1;
    stats.indexedNodes = entries.size;
  }

  function query(bounds: GraphEditorBounds, queryOptions: GraphEditorSpatialQueryOptions = {}) {
    stats.queries += 1;
    const overscan =
      queryOptions.overscan !== undefined && Number.isFinite(queryOptions.overscan)
        ? Math.max(0, queryOptions.overscan)
        : 0;
    const normalized = normalizeGraphEditorBounds(bounds);
    const area = {
      x: normalized.x - overscan,
      y: normalized.y - overscan,
      width: normalized.width + overscan * 2,
      height: normalized.height + overscan * 2,
    };
    if (
      !Number.isFinite(area.x) ||
      !Number.isFinite(area.y) ||
      !Number.isFinite(area.width) ||
      !Number.isFinite(area.height)
    ) {
      return scanAll(area);
    }

    const range = cellRange(area, cellSize);
    // Very large areas visit more empty cells than nodes; a linear scan is cheaper then.
    if (rangeCellCount(range) > entries.size) {
      return scanAll(area);
    }

    const visited = new Set<string>();
    const matches: IndexedNodeMatch[] = [];
    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) {
        return;
      }
      visited.add(nodeId);
      stats.candidateVisits += 1;
      const entry = entries.get(nodeId)!;
      if (graphEditorBoundsIntersect(area, entry.bounds)) {
        matches.push({ nodeId, order: entry.order });
      }
    };
    oversizedNodeIds.forEach(visit);
    for (let cellX = range.minX; cellX <= range.maxX; cellX += 1) {
      for (let cellY = range.minY; cellY <= range.maxY; cellY += 1) {
        cells.get(cellKey(cellX, cellY))?.forEach(visit);
      }
    }
    return matches.sort((left, right) => left.order - right.order).map((match) => match.nodeId);
  }

  function scanAll(area: GraphEditorBounds) {
    const matches: string[] = [];
    for (const nodeId of orderedIds) {
      const entry = entries.get(nodeId);
      if (!entry) {
        continue;
      }
      stats.candidateVisits += 1;
      if (graphEditorBoundsIntersect(area, entry.bounds)) {
        matches.push(nodeId);
      }
    }
    return matches;
  }

  rebuild(document);

  return {
    get source() {
      return source;
    },
    query,
    getNodeBounds: (nodeId) => {
      const bounds = entries.get(nodeId)?.bounds;
      return bounds ? { ...bounds } : undefined;
    },
    rebuild,
    updateNodes,
    getStats: () => ({ ...stats }),
    resetStats: () => {
      stats.rebuilds = 0;
      stats.updates = 0;
      stats.queries = 0;
      stats.candidateVisits = 0;
    },
  };
}

type IndexedNodeMatch = { nodeId: string; order: number };

function cellRange(bounds: GraphEditorBounds, cellSize: number) {
  return {
    minX: Math.floor(bounds.x / cellSize),
    minY: Math.floor(bounds.y / cellSize),
    maxX: Math.floor((bounds.x + bounds.width) / cellSize),
    maxY: Math.floor((bounds.y + bounds.height) / cellSize),
  };
}

type CellRange = ReturnType<typeof cellRange>;

function rangeCellCount(range: CellRange) {
  // Unsafe integers cannot be stepped through; callers treat this as "too many cells".
  if (
    !Number.isSafeInteger(range.minX) ||
    !Number.isSafeInteger(range.minY) ||
    !Number.isSafeInteger(range.maxX) ||
    !Number.isSafeInteger(range.maxY)
  ) {
    return Number.POSITIVE_INFINITY;
  }
  return (range.maxX - range.minX + 1) * (range.maxY - range.minY + 1);
}

function cellKeys(range: CellRange) {
  const keys: string[] = [];
  for (let cellX = range.minX; cellX <= range.maxX; cellX += 1) {
    for (let cellY = range.minY; cellY <= range.maxY; cellY += 1) {
      keys.push(cellKey(cellX, cellY));
    }
  }
  return keys;
}

function cellKey(cellX: number, cellY: number) {
  return `${cellX}:${cellY}`;
}
