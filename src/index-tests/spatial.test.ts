import { describe, expect, test } from "vitest";

import {
  alignGraphEditorNodes,
  distributeGraphEditorNodes,
  getGraphEditorNodeSize,
  normalizeGraphEditorDocument,
  nudgeGraphEditorNodes,
  snapGraphEditorNodesToGrid,
  type GraphEditorDocument,
} from "@moritzbrantner/graph-editor";

function createDocument(): GraphEditorDocument {
  return normalizeGraphEditorDocument({
    nodes: [
      { id: "a", label: "Node", x: 3, y: 7 },
      { id: "b", label: "Node", x: 103, y: 57 },
      { id: "c", label: "Node", x: 503, y: 107 },
    ],
    edges: [],
  });
}

describe("graph spatial editing", () => {
  test("nudges only selected nodes and reports deterministic changed ids", () => {
    const result = nudgeGraphEditorNodes(createDocument(), ["c", "a"], { x: 8, y: -2 });

    expect(result.changedNodeIds).toEqual(["a", "c"]);
    expect(result.document.nodes.map(({ id, x, y }) => ({ id, x, y }))).toEqual([
      { id: "a", x: 11, y: 5 },
      { id: "b", x: 103, y: 57 },
      { id: "c", x: 511, y: 105 },
    ]);
  });

  test("snaps selected nodes to a configurable grid", () => {
    const result = snapGraphEditorNodesToGrid(createDocument(), ["a", "b"], {
      sizeX: 20,
      sizeY: 10,
      originX: 5,
      originY: 2,
    });

    expect(result.document.nodes[0]).toMatchObject({ x: 5, y: 12 });
    expect(result.document.nodes[1]).toMatchObject({ x: 105, y: 62 });
    expect(result.document.nodes[2]).toMatchObject({ x: 503, y: 107 });
  });

  test("aligns node bounds rather than only their origins", () => {
    const result = alignGraphEditorNodes(createDocument(), ["a", "b", "c"], "center-x");
    const centers = result.document.nodes.map((node) => {
      const size = getGraphEditorNodeSize(node);
      return node.x + size.width / 2;
    });

    expect(centers[1]).toBeCloseTo(centers[0]!);
    expect(centers[2]).toBeCloseTo(centers[0]!);
  });

  test("distributes nodes evenly while preserving the outer span", () => {
    const document = createDocument();
    const before = document.nodes.map((node) => ({ ...node, size: getGraphEditorNodeSize(node) }));
    const result = distributeGraphEditorNodes(document, ["a", "b", "c"], "horizontal");
    const after = result.document.nodes.map((node) => ({
      ...node,
      size: getGraphEditorNodeSize(node),
    }));
    const firstGap = after[1]!.x - (after[0]!.x + after[0]!.size.width);
    const secondGap = after[2]!.x - (after[1]!.x + after[1]!.size.width);

    expect(after[0]!.x).toBe(before[0]!.x);
    expect(after[2]!.x + after[2]!.size.width).toBeCloseTo(before[2]!.x + before[2]!.size.width);
    expect(firstGap).toBeCloseTo(secondGap);
    expect(after.map((node) => node.y)).toEqual(before.map((node) => node.y));
  });
});
