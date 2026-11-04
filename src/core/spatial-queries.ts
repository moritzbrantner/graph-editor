import type { GraphEditorSpatialIndex } from "./spatial-index";
import type { GraphEditorBounds } from "./types";
import { toIdSet } from "./utils";

/**
 * Bounded interaction queries over a retained `GraphEditorSpatialIndex`.
 *
 * Each helper only visits index candidates near the query instead of scanning the document, and
 * returns the same result as the equivalent whole-document scan. Work is observable through the
 * index's deterministic `getStats().candidateVisits` counter.
 */

export type GraphEditorSpatialDirection = "up" | "right" | "down" | "left";

export type GraphEditorNodeIdFilter = ReadonlySet<string> | readonly string[];

/** Node ids within `distance` graph units of `bounds` on both axes, in document order. */
export function queryGraphEditorNodesNearBounds(
  index: Pick<GraphEditorSpatialIndex, "query">,
  bounds: GraphEditorBounds,
  options: { distance?: number; excludeNodeIds?: GraphEditorNodeIdFilter } = {},
): string[] {
  const excluded = toIdSet(options.excludeNodeIds);
  const nodeIds = index.query(bounds, { overscan: options.distance ?? 0 });
  return excluded.size === 0 ? nodeIds : nodeIds.filter((nodeId) => !excluded.has(nodeId));
}

export type GraphEditorDirectionalQueryOptions = {
  /** Indexed nodes that are never returned, e.g. hidden nodes. */
  excludeNodeIds?: GraphEditorNodeIdFilter;
};

// Initial half-width of the perpendicular search band after the exact-alignment pass.
const directionalBandBase = 64;
// Initial length of a search chunk along the travel direction; each chunk doubles.
const directionalChunkBase = 512;

type DirectionalCandidate = { nodeId: string; perpendicular: number; primary: number };

/**
 * Finds the node a directional keyboard move lands on, using node centers from `index`.
 *
 * Candidates lie strictly ahead of the origin center in `direction`. The winner has the smallest
 * perpendicular center offset, then the smallest distance along `direction`, then the
 * lexicographically first id (`localeCompare`). Instead of scanning every node, the search sweeps
 * a band around the origin's axis in doubling chunks, widening the band only while nothing is
 * found and narrowing it to the best perpendicular offset once something is. Returns `null` when
 * the origin is not indexed or no node lies ahead.
 */
export function findGraphEditorNodeInDirection(
  index: Pick<GraphEditorSpatialIndex, "query" | "getNodeBounds" | "getIndexedBounds">,
  fromNodeId: string,
  direction: GraphEditorSpatialDirection,
  options: GraphEditorDirectionalQueryOptions = {},
): string | null {
  const from = index.getNodeBounds(fromNodeId);
  const extent = index.getIndexedBounds();
  if (!from || !extent) {
    return null;
  }
  const excluded = toIdSet(options.excludeNodeIds);
  const horizontal = direction === "left" || direction === "right";
  const sign = direction === "right" || direction === "down" ? 1 : -1;
  const originPrimary = horizontal ? from.x + from.width / 2 : from.y + from.height / 2;
  const originPerpendicular = horizontal ? from.y + from.height / 2 : from.x + from.width / 2;
  const extentPrimaryMin = horizontal ? extent.x : extent.y;
  const extentPrimaryMax = horizontal ? extent.x + extent.width : extent.y + extent.height;
  const extentPerpendicularMin = horizontal ? extent.y : extent.x;
  const extentPerpendicularMax = horizontal ? extent.y + extent.height : extent.x + extent.width;
  const primaryReach =
    sign > 0 ? extentPrimaryMax - originPrimary : originPrimary - extentPrimaryMin;
  if (!(primaryReach > 0)) {
    return null;
  }
  const perpendicularReach = Math.max(
    originPerpendicular - extentPerpendicularMin,
    extentPerpendicularMax - originPerpendicular,
    0,
  );

  let best: DirectionalCandidate | null = null;
  const evaluated = new Set<string>();

  // Only candidates within the active band may become `best`, so `best.perpendicular` never
  // exceeds the band any already-swept chunk was searched with.
  const consider = (nodeId: string, bandHalfWidth: number) => {
    if (nodeId === fromNodeId || excluded.has(nodeId) || evaluated.has(nodeId)) {
      return;
    }
    const bounds = index.getNodeBounds(nodeId);
    if (!bounds) {
      return;
    }
    const centerPrimary = horizontal ? bounds.x + bounds.width / 2 : bounds.y + bounds.height / 2;
    const centerPerpendicular = horizontal
      ? bounds.y + bounds.height / 2
      : bounds.x + bounds.width / 2;
    const primary = sign > 0 ? centerPrimary - originPrimary : originPrimary - centerPrimary;
    if (primary <= 0) {
      evaluated.add(nodeId);
      return;
    }
    const perpendicular = Math.abs(centerPerpendicular - originPerpendicular);
    if (perpendicular > bandHalfWidth) {
      // Reached through its bounds only; a wider band reconsiders it.
      return;
    }
    const candidate = { nodeId, perpendicular, primary };
    evaluated.add(nodeId);
    if (!best || compareDirectionalCandidates(candidate, best) < 0) {
      best = candidate;
    }
  };

  const sweep = (bandHalfWidth: number) => {
    let offset = 0;
    let length = directionalChunkBase;
    while (offset < primaryReach) {
      const current = best as DirectionalCandidate | null;
      // Exactly aligned and nearer than everything not yet swept: nothing can beat it.
      if (current && current.perpendicular === 0 && current.primary <= offset) {
        return;
      }
      const halfWidth = current ? current.perpendicular : bandHalfWidth;
      const end = Math.min(offset + length, primaryReach);
      const primaryStart = sign > 0 ? originPrimary + offset : originPrimary - end;
      const primaryLength = end - offset;
      const queryBounds = horizontal
        ? {
            x: primaryStart,
            y: originPerpendicular - halfWidth,
            width: primaryLength,
            height: halfWidth * 2,
          }
        : {
            x: originPerpendicular - halfWidth,
            y: primaryStart,
            width: halfWidth * 2,
            height: primaryLength,
          };
      for (const nodeId of index.query(queryBounds)) {
        consider(nodeId, bandHalfWidth);
      }
      offset = end;
      length *= 2;
    }
  };

  let bandHalfWidth = 0;
  for (;;) {
    sweep(bandHalfWidth);
    if (best || bandHalfWidth >= perpendicularReach) {
      break;
    }
    // A wider band re-queries the narrower one; nodes already behind the origin are skipped.
    bandHalfWidth = Math.min(
      bandHalfWidth === 0 ? directionalBandBase : bandHalfWidth * 2,
      perpendicularReach,
    );
  }
  return (best as DirectionalCandidate | null)?.nodeId ?? null;
}

function compareDirectionalCandidates(left: DirectionalCandidate, right: DirectionalCandidate) {
  return (
    left.perpendicular - right.perpendicular ||
    left.primary - right.primary ||
    left.nodeId.localeCompare(right.nodeId)
  );
}
