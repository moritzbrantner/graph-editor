import { describe, expect, test } from "vitest";

import {
  createGraphEditorSpatialIndex,
  graphEditorBoundsIntersect,
  type GraphEditorBounds,
  type GraphEditorDocument,
  type GraphEditorNode,
} from "@moritzbrantner/graph-editor/core";

type SizedData = { width: number; height: number };

const getNodeBounds = (node: GraphEditorNode<SizedData>): GraphEditorBounds => ({
  x: node.x,
  y: node.y,
  width: node.data?.width ?? 100,
  height: node.data?.height ?? 60,
});

function referenceQuery(
  document: GraphEditorDocument<SizedData>,
  bounds: GraphEditorBounds,
  overscan = 0,
  hiddenNodeIds: readonly string[] = [],
) {
  const area = {
    x: bounds.x - overscan,
    y: bounds.y - overscan,
    width: bounds.width + overscan * 2,
    height: bounds.height + overscan * 2,
  };
  return document.nodes
    .filter(
      (node) =>
        !hiddenNodeIds.includes(node.id) && graphEditorBoundsIntersect(area, getNodeBounds(node)),
    )
    .map((node) => node.id);
}

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function createRandomDocument(seed: number, nodeCount: number): GraphEditorDocument<SizedData> {
  const random = createRandom(seed);
  return {
    nodes: Array.from({ length: nodeCount }, (_, index) => ({
      id: `node-${index}`,
      label: `Node ${index}`,
      x: Math.round((random() - 0.3) * 8_000),
      y: Math.round((random() - 0.3) * 6_000),
      data: {
        width: 20 + Math.round(random() * (index % 17 === 0 ? 3_000 : 400)),
        height: 20 + Math.round(random() * 300),
      },
    })),
    edges: [],
  };
}

function createGridDocument(columns: number, rows: number): GraphEditorDocument<SizedData> {
  return {
    nodes: Array.from({ length: columns * rows }, (_, index) => ({
      id: `node-${index}`,
      label: `Node ${index}`,
      x: (index % columns) * 300,
      y: Math.floor(index / columns) * 200,
      data: { width: 240, height: 120 },
    })),
    edges: [],
  };
}

describe("graph spatial index", () => {
  test("matches a reference scan across randomized deterministic fixtures", () => {
    for (const seed of [1, 7, 42, 1_234]) {
      const document = createRandomDocument(seed, 600);
      const random = createRandom(seed * 31);
      for (const cellSize of [64, 512, 4_096]) {
        const index = createGraphEditorSpatialIndex(document, { getNodeBounds, cellSize });
        for (let queryIndex = 0; queryIndex < 40; queryIndex += 1) {
          const bounds = {
            x: Math.round((random() - 0.4) * 9_000),
            y: Math.round((random() - 0.4) * 7_000),
            width: Math.round(random() * (queryIndex % 10 === 0 ? 20_000 : 1_500)),
            height: Math.round(random() * 1_200),
          };
          const overscan = queryIndex % 3 === 0 ? 0 : Math.round(random() * 200);
          expect(index.query(bounds, { overscan })).toEqual(
            referenceQuery(document, bounds, overscan),
          );
        }
      }
    }
  });

  test("returns ids in document order regardless of query history", () => {
    const document = createGridDocument(10, 10);
    const index = createGraphEditorSpatialIndex(document, { getNodeBounds, cellSize: 128 });
    const bounds = { x: 250, y: 150, width: 700, height: 300 };

    const first = index.query(bounds);
    index.query({ x: -1_000, y: -1_000, width: 50_000, height: 50_000 });
    expect(index.query(bounds)).toEqual(first);
    expect(first).toEqual(referenceQuery(document, bounds));
    expect(createGraphEditorSpatialIndex(document, { getNodeBounds }).query(bounds)).toEqual(first);
  });

  test("treats touching edges as intersecting and normalizes negative query bounds", () => {
    const document = createGridDocument(2, 1);
    const index = createGraphEditorSpatialIndex(document, { getNodeBounds, cellSize: 240 });

    expect(index.query({ x: 240, y: 0, width: 0, height: 0 })).toEqual(["node-0"]);
    expect(index.query({ x: 290, y: 130, width: -50, height: -10 })).toEqual(["node-0"]);
    expect(index.query({ x: 270, y: 0, width: 0, height: 0 })).toEqual([]);
    expect(index.query({ x: 270, y: 0, width: 0, height: 0 }, { overscan: 30 })).toEqual([
      "node-0",
      "node-1",
    ]);
    expect(index.query({ x: 270, y: 0, width: 0, height: 0 }, { overscan: -30 })).toEqual([]);
  });

  test("excludes hidden nodes and nodes with non-finite bounds", () => {
    const document = createGridDocument(3, 1);
    document.nodes[2] = { ...document.nodes[2]!, x: Number.NaN };
    const index = createGraphEditorSpatialIndex(document, {
      getNodeBounds,
      hiddenNodeIds: ["node-1"],
    });

    expect(index.query({ x: -10_000, y: -10_000, width: 20_000, height: 20_000 })).toEqual([
      "node-0",
    ]);
    expect(index.getNodeBounds("node-1")).toBeUndefined();
    expect(index.getStats().indexedNodes).toBe(1);
  });

  test("indexes oversized nodes without per-cell explosion", () => {
    const document: GraphEditorDocument<SizedData> = {
      nodes: [
        { id: "huge", label: "Huge", x: -1e7, y: -1e7, data: { width: 2e7, height: 2e7 } },
        ...createGridDocument(4, 4).nodes,
      ],
      edges: [],
    };
    const index = createGraphEditorSpatialIndex(document, { getNodeBounds, cellSize: 16 });
    const bounds = { x: 0, y: 0, width: 10, height: 10 };

    expect(index.query(bounds)).toEqual(["huge", "node-0"]);
    expect(index.query(bounds)).toEqual(referenceQuery(document, bounds));
  });

  test("updates moved nodes explicitly and only rebuilds on structural changes", () => {
    const document = createGridDocument(5, 5);
    const index = createGraphEditorSpatialIndex(document, { getNodeBounds, cellSize: 256 });
    const far = { x: 10_000, y: 10_000, width: 10, height: 10 };
    expect(index.query(far)).toEqual([]);

    const moved = {
      ...document,
      nodes: document.nodes.map((node) =>
        node.id === "node-3" ? { ...node, x: 10_000, y: 10_000 } : node,
      ),
    };
    // The index keeps its snapshot until it is told about the change.
    expect(index.query(far)).toEqual([]);
    expect(index.source).toBe(document);

    index.updateNodes(moved, ["node-3"]);
    expect(index.source).toBe(moved);
    expect(index.query(far)).toEqual(["node-3"]);
    expect(index.query({ x: 900, y: 0, width: 10, height: 10 })).toEqual([]);
    expect(index.getNodeBounds("node-3")).toEqual({
      x: 10_000,
      y: 10_000,
      width: 240,
      height: 120,
    });
    expect(index.getStats()).toMatchObject({ rebuilds: 1, updates: 1, indexedNodes: 25 });

    const removed = { ...moved, nodes: moved.nodes.filter((node) => node.id !== "node-0") };
    index.updateNodes(removed, ["node-1"]);
    expect(index.getStats()).toMatchObject({ rebuilds: 2, updates: 1, indexedNodes: 24 });
    expect(index.query({ x: 0, y: 0, width: 10, height: 10 })).toEqual([]);

    const reordered = { ...removed, nodes: [...removed.nodes].reverse() };
    index.updateNodes(reordered, []);
    expect(index.getStats().rebuilds).toBe(3);
    expect(index.query({ x: 0, y: 0, width: 700, height: 10 })).toEqual(["node-2", "node-1"]);
  });

  test("bounds candidate visits for viewport-sized queries", () => {
    const document = createGridDocument(100, 100);
    const index = createGraphEditorSpatialIndex(document, { getNodeBounds });
    index.resetStats();

    const viewport = { x: 12_000, y: 8_000, width: 1_600, height: 900 };
    const result = index.query(viewport, { overscan: 100 });

    expect(result).toEqual(referenceQuery(document, viewport, 100));
    const stats = index.getStats();
    expect(stats.queries).toBe(1);
    expect(stats.rebuilds).toBe(0);
    // A viewport over 10k nodes must stay local: ratchet well below a whole-document scan.
    expect(stats.candidateVisits).toBeLessThanOrEqual(80);
    expect(stats.candidateVisits).toBeGreaterThanOrEqual(result.length);
  });
});
