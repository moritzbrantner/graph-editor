import { describe, expect, test } from "vitest";

import {
  createGraphEditorSpatialIndex,
  findGraphEditorNodeInDirection,
  getGraphEditorSelectionFromBounds,
  getGraphEditorSelectionFromSpatialIndex,
  graphEditorBoundsIntersect,
  normalizeGraphEditorSelection,
  queryGraphEditorNodesNearBounds,
  updateGraphEditorSelection,
  type GraphEditorBounds,
  type GraphEditorDocument,
  type GraphEditorNode,
  type GraphEditorSelectableBounds,
  type GraphEditorSelectionMode,
  type GraphEditorSelectionState,
  type GraphEditorSpatialDirection,
} from "@moritzbrantner/graph-editor/core";
import {
  getGraphEditorNodePortCenterOffset,
  getGraphEditorNodeSize,
} from "@moritzbrantner/graph-editor/layout";

type SizedData = { width: number; height: number };
type Document = GraphEditorDocument<SizedData>;

const directions: GraphEditorSpatialDirection[] = ["up", "right", "down", "left"];

const sizedBounds = (node: GraphEditorNode<SizedData>): GraphEditorBounds => ({
  x: node.x,
  y: node.y,
  width: node.data?.width ?? 100,
  height: node.data?.height ?? 60,
});

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** Scattered nodes with varied sizes, snapped coordinates (many ties), and some huge nodes. */
function createRandomDocument(seed: number, nodeCount: number): Document {
  const random = createRandom(seed);
  return {
    nodes: Array.from({ length: nodeCount }, (_, index) => ({
      id: `node-${(index * 7919) % nodeCount}`,
      label: `Node ${index}`,
      x: Math.round((random() - 0.4) * 60) * 50,
      y: Math.round((random() - 0.4) * 40) * 50,
      data: {
        width: 20 + Math.round(random() * (index % 23 === 0 ? 2_500 : 300)),
        height: 20 + Math.round(random() * 200),
      },
    })),
    edges: [],
  };
}

function createGridDocument(nodeCount: number): GraphEditorDocument {
  return {
    nodes: Array.from({ length: nodeCount }, (_, index) => ({
      id: `node-${index}`,
      label: `Node ${index}`,
      x: (index % 25) * 280,
      y: Math.floor(index / 25) * 180,
      inputs: index === 0 ? [] : [{ id: "in", label: "In" }],
      outputs: index === nodeCount - 1 ? [] : [{ id: "out", label: "Out" }],
    })),
    edges: [],
  };
}

const gridBounds = (node: GraphEditorDocument["nodes"][number]) => ({
  x: node.x,
  y: node.y,
  ...getGraphEditorNodeSize(node),
});

// Reference: the whole-document scan GraphCanvas used for directional keyboard navigation.
function referenceNodeInDirection<T extends GraphEditorNode<any>>(
  nodes: readonly T[],
  getBounds: (node: T) => GraphEditorBounds,
  fromNodeId: string,
  direction: GraphEditorSpatialDirection,
  hidden: ReadonlySet<string> = new Set(),
) {
  const center = (node: T) => {
    const bounds = getBounds(node);
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  };
  const current = nodes.find((node) => node.id === fromNodeId && !hidden.has(node.id));
  if (!current) {
    return null;
  }
  const origin = center(current);
  const candidates = nodes.flatMap((node) => {
    if (node.id === current.id || hidden.has(node.id)) {
      return [];
    }
    const point = center(node);
    const primaryDistance =
      direction === "right"
        ? point.x - origin.x
        : direction === "left"
          ? origin.x - point.x
          : direction === "down"
            ? point.y - origin.y
            : origin.y - point.y;
    if (primaryDistance <= 0) {
      return [];
    }
    const perpendicularDistance =
      direction === "right" || direction === "left"
        ? Math.abs(point.y - origin.y)
        : Math.abs(point.x - origin.x);
    return [{ node, perpendicularDistance, primaryDistance }];
  });
  return (
    candidates.sort(
      (first, second) =>
        first.perpendicularDistance - second.perpendicularDistance ||
        first.primaryDistance - second.primaryDistance ||
        first.node.id.localeCompare(second.node.id),
    )[0]?.node.id ?? null
  );
}

// Reference: the incremental marquee selection reduce `getGraphEditorSelectionFromBounds` used.
function referenceSelectionFromBounds(
  document: GraphEditorDocument<any>,
  bounds: GraphEditorBounds,
  items: readonly GraphEditorSelectableBounds[],
  options: { mode?: GraphEditorSelectionMode; selection?: GraphEditorSelectionState },
) {
  const selected = items.filter((item) => graphEditorBoundsIntersect(bounds, item.bounds));
  const next = selected.reduce(
    (current, item) =>
      updateGraphEditorSelection(document, current, { type: item.type, id: item.id }, "extend"),
    options.mode === "toggle" || options.mode === "extend"
      ? normalizeGraphEditorSelection(document, options.selection ?? { nodeIds: [], edgeIds: [] })
      : { nodeIds: [], edgeIds: [] },
  );
  return normalizeGraphEditorSelection(document, next);
}

describe("directional navigation through the spatial index", () => {
  test.each([
    [1, 60],
    [2, 200],
    [3, 400],
  ])(
    "matches the reference scan for every node and direction (seed %i, %i nodes)",
    (seed, count) => {
      const document = createRandomDocument(seed, count);
      const hidden = new Set(document.nodes.filter((_, i) => i % 11 === 5).map((node) => node.id));
      const index = createGraphEditorSpatialIndex(document, { getNodeBounds: sizedBounds });
      for (const node of document.nodes) {
        if (hidden.has(node.id)) {
          continue;
        }
        for (const direction of directions) {
          expect(
            findGraphEditorNodeInDirection(index, node.id, direction, { excludeNodeIds: hidden }),
            `${node.id} ${direction}`,
          ).toBe(referenceNodeInDirection(document.nodes, sizedBounds, node.id, direction, hidden));
        }
      }
    },
  );

  test("matches the reference scan on an aligned grid with exact ties", () => {
    const document = createGridDocument(300);
    const index = createGraphEditorSpatialIndex(document, { getNodeBounds: gridBounds });
    for (const node of document.nodes) {
      for (const direction of directions) {
        expect(findGraphEditorNodeInDirection(index, node.id, direction)).toBe(
          referenceNodeInDirection(document.nodes, gridBounds, node.id, direction),
        );
      }
    }
  });

  test("returns null for unindexed origins and when nothing lies ahead", () => {
    const document = createGridDocument(4);
    const index = createGraphEditorSpatialIndex(document, { getNodeBounds: gridBounds });
    expect(findGraphEditorNodeInDirection(index, "missing", "right")).toBeNull();
    expect(findGraphEditorNodeInDirection(index, "node-3", "right")).toBeNull();
    expect(findGraphEditorNodeInDirection(index, "node-0", "up")).toBeNull();
    expect(findGraphEditorNodeInDirection(index, "node-0", "right")).toBe("node-1");
  });

  test("tracks the indexed extent through moves and rebuilds", () => {
    const document = createGridDocument(3);
    const index = createGraphEditorSpatialIndex(document, { getNodeBounds: gridBounds });
    const size = getGraphEditorNodeSize(document.nodes[0]!);
    expect(index.getIndexedBounds()).toEqual({
      x: 0,
      y: 0,
      width: 560 + size.width,
      height: size.height,
    });
    const moved = {
      ...document,
      nodes: [document.nodes[0]!, document.nodes[1]!, { ...document.nodes[2]!, x: 100 }],
    };
    index.updateNodes(moved, ["node-2"]);
    expect(index.getIndexedBounds()).toEqual({
      x: 0,
      y: 0,
      width: 280 + size.width,
      height: size.height,
    });
    index.rebuild({ nodes: [], edges: [] });
    expect(index.getIndexedBounds()).toBeUndefined();
  });
});

describe("drag snapping candidates through the spatial index", () => {
  test("include every node whose port snap point can lie within the snap distance", () => {
    const distance = 28;
    const document = createGridDocument(600);
    const index = createGraphEditorSpatialIndex(document, { getNodeBounds: gridBounds });
    const random = createRandom(7);
    const dragged = document.nodes[0]!;
    const draggedSize = getGraphEditorNodeSize(dragged);
    const draggedOffset = getGraphEditorNodePortCenterOffset(dragged, 0);
    for (let sample = 0; sample < 300; sample += 1) {
      const position = {
        x: Math.round(random() * 7_200 - 200),
        y: Math.round(random() * 4_400 - 200),
      };
      const candidates = new Set(
        queryGraphEditorNodesNearBounds(
          index,
          { ...position, ...draggedSize },
          { distance, excludeNodeIds: [dragged.id] },
        ),
      );
      for (const other of document.nodes) {
        if (other.id === dragged.id) {
          continue;
        }
        const otherSize = getGraphEditorNodeSize(other);
        const otherOffset = getGraphEditorNodePortCenterOffset(other, 0);
        const snapPoints = [
          { x: other.x + otherSize.width, y: other.y + otherOffset - draggedOffset },
          { x: other.x - draggedSize.width, y: other.y + otherOffset - draggedOffset },
        ];
        const reachable = snapPoints.some(
          (point) => Math.hypot(point.x - position.x, point.y - position.y) <= distance,
        );
        if (reachable) {
          expect(candidates.has(other.id), `${other.id} near ${position.x},${position.y}`).toBe(
            true,
          );
        }
      }
    }
  });
});

describe("marquee selection through the spatial index", () => {
  test.each([1, 2, 3, 4])("matches the reference reduce (seed %i)", (seed) => {
    const random = createRandom(seed * 31);
    const base = createRandomDocument(seed, 250);
    const document: Document = {
      ...base,
      edges: base.nodes.slice(1, 80).map((node, index) => ({
        id: `edge-${index}`,
        sourceNodeId: base.nodes[index]!.id,
        sourcePortId: "out",
        targetNodeId: node.id,
        targetPortId: "in",
      })),
      groups: [
        { id: "group-a", label: "A", nodeIds: base.nodes.slice(0, 5).map((node) => node.id) },
        { id: "group-b", label: "B", nodeIds: base.nodes.slice(40, 44).map((node) => node.id) },
      ],
    };
    const hidden = new Set(base.nodes.filter((_, i) => i % 13 === 0).map((node) => node.id));
    const index = createGraphEditorSpatialIndex(document, { getNodeBounds: sizedBounds });
    const nodeById = new Map(document.nodes.map((node) => [node.id, node] as const));
    const extraItems: GraphEditorSelectableBounds[] = [
      ...document.edges.map((edge) => {
        const source = sizedBounds(nodeById.get(edge.sourceNodeId)!);
        const target = sizedBounds(nodeById.get(edge.targetNodeId)!);
        const x = Math.min(source.x + source.width, target.x);
        const y = Math.min(source.y, target.y);
        return {
          type: "edge" as const,
          id: edge.id,
          bounds: {
            x,
            y,
            width: Math.max(source.x + source.width, target.x) - x,
            height: Math.max(source.y, target.y) - y,
          },
        };
      }),
      { type: "group", id: "group-a", bounds: { x: -400, y: -400, width: 500, height: 300 } },
      { type: "group", id: "group-b", bounds: { x: 900, y: 300, width: 200, height: 900 } },
    ];
    const allItems: GraphEditorSelectableBounds[] = [
      ...document.nodes
        .filter((node) => !hidden.has(node.id))
        .map((node) => ({ type: "node" as const, id: node.id, bounds: sizedBounds(node) })),
      ...extraItems,
    ];
    const modes: GraphEditorSelectionMode[] = ["replace", "extend", "toggle"];
    for (let sample = 0; sample < 40; sample += 1) {
      const bounds = {
        x: Math.round(random() * 3_000 - 1_500),
        y: Math.round(random() * 2_000 - 1_000),
        width: Math.round(random() * 1_500),
        height: Math.round(random() * 1_000),
      };
      const mode = modes[sample % modes.length]!;
      const selection: GraphEditorSelectionState = {
        nodeIds: [document.nodes[sample]!.id, document.nodes[(sample * 17) % 250]!.id],
        edgeIds: sample % 2 === 0 ? ["edge-3"] : [],
        ...(sample % 5 === 0 ? { groupIds: ["group-b"] } : {}),
      };
      const expected = referenceSelectionFromBounds(document, bounds, allItems, {
        mode,
        selection,
      });
      expect(
        getGraphEditorSelectionFromSpatialIndex(document, bounds, index, {
          mode,
          selection,
          excludeNodeIds: hidden,
          items: extraItems,
        }),
      ).toEqual(expected);
      expect(
        getGraphEditorSelectionFromBounds(document, bounds, allItems, { mode, selection }),
      ).toEqual(expected);
    }
  });
});

describe("interaction candidate-visit ratchets", () => {
  // Reference scans visit every node; the indexed queries below must stay bounded.
  test.each([
    [500, { snap: 20, marquee: 60, navigate: 78 }],
    [2_000, { snap: 35, marquee: 42, navigate: 78 }],
    [10_000, { snap: 15, marquee: 54, navigate: 63 }],
  ])("bounded work on a %i-node grid", (count, expected) => {
    const document = createGridDocument(count);
    const index = createGraphEditorSpatialIndex(document, { getNodeBounds: gridBounds });
    const visits = (run: () => void) => {
      index.resetStats();
      run();
      return index.getStats().candidateVisits;
    };
    const middle = document.nodes[Math.floor(count / 2) + 12]!;
    const middleSize = getGraphEditorNodeSize(middle);

    const actual = {
      snap: visits(() =>
        queryGraphEditorNodesNearBounds(
          index,
          { x: middle.x + 20, y: middle.y - 10, ...middleSize },
          { distance: 28, excludeNodeIds: [middle.id] },
        ),
      ),
      marquee: visits(() =>
        getGraphEditorSelectionFromSpatialIndex(
          document,
          { x: middle.x - 600, y: middle.y - 400, width: 1_200, height: 800 },
          index,
        ),
      ),
      navigate: visits(() => {
        for (const direction of directions) {
          findGraphEditorNodeInDirection(index, middle.id, direction);
        }
      }),
    };
    expect(actual).toEqual(expected);
  });
});
