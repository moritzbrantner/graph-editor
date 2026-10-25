import * as React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { GraphCanvas, type GraphCanvasNodeData } from "@moritzbrantner/graph-editor";

afterEach(() => cleanup());

const nodes: GraphCanvasNodeData[] = ["a", "b", "c"].map((id, index) => ({
  id,
  label: id.toUpperCase(),
  x: index * 40,
  y: 0,
  inputs: [{ id: "in", label: "In" }],
  outputs: [{ id: "out", label: "Out" }],
}));

function nodeLayer(container: HTMLElement, id: string) {
  return container.querySelector<HTMLElement>(
    `[data-slot="workflow-builder-node"][data-node-id="${id}"]`,
  )!.style.zIndex;
}

describe("GraphCanvas native styling (#85)", () => {
  test("nodes stack in document order with the primary selection on top", () => {
    const { container, rerender } = render(React.createElement(GraphCanvas, { nodes, edges: [] }));
    expect(["a", "b", "c"].map((id) => nodeLayer(container, id))).toEqual(["1", "2", "3"]);

    rerender(React.createElement(GraphCanvas, { nodes, edges: [], selectedNodeId: "a" }));
    expect(["a", "b", "c"].map((id) => nodeLayer(container, id))).toEqual(["4", "2", "3"]);
  });

  test("an edge color wins over the default stroke class; status colors still win", () => {
    const edge = {
      id: "e",
      sourceNodeId: "a",
      sourcePortId: "out",
      targetNodeId: "b",
      targetPortId: "in",
      color: "#16a34a",
    };
    const { container, rerender } = render(
      React.createElement(GraphCanvas, { nodes, edges: [edge] }),
    );
    const path = () =>
      container.querySelector<SVGPathElement>('[data-slot="workflow-builder-edge"]')!;
    expect(path().style.stroke).toBe("rgb(22, 163, 74)");

    rerender(React.createElement(GraphCanvas, { nodes, edges: [{ ...edge, color: undefined }] }));
    expect(path().style.stroke).toBe("");

    rerender(React.createElement(GraphCanvas, { nodes, edges: [{ ...edge, status: "error" }] }));
    expect(path().style.stroke).not.toBe("rgb(22, 163, 74)");
  });
});
