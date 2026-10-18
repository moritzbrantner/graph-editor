import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import {
  getGraphEditorNodeBodyHeight,
  getGraphEditorNodePortCenterOffset,
  getGraphEditorNodeSize,
} from "@moritzbrantner/graph-editor/layout";
import {
  GraphCanvas,
  GraphNode,
  type GraphCanvasNodeData,
  type GraphEditorSelectionState,
} from "@moritzbrantner/graph-editor";

afterEach(() => cleanup());

const ports = {
  inputs: [{ id: "in", label: "In" }],
  outputs: [{ id: "out", label: "Out" }],
};

describe("node composition seam", () => {
  test("composed body height enters the single geometry model", () => {
    const node = { id: "a", ...ports };
    const bodyHeight = () => 40;
    expect(getGraphEditorNodeBodyHeight(node, { nodeBodyHeight: bodyHeight })).toBe(40);
    expect(getGraphEditorNodeSize(node, { nodeBodyHeight: bodyHeight }).height).toBe(
      getGraphEditorNodeSize(node).height + 40,
    );
    expect(getGraphEditorNodePortCenterOffset(node, 0, { nodeBodyHeight: bodyHeight })).toBe(
      getGraphEditorNodePortCenterOffset(node, 0) + 40,
    );
    // Minimized and compact nodes have no body; invalid heights count as none.
    expect(
      getGraphEditorNodeBodyHeight({ ...node, minimized: true }, { nodeBodyHeight: bodyHeight }),
    ).toBe(0);
    expect(
      getGraphEditorNodeBodyHeight({ ...node, variant: "compact" }, { nodeBodyHeight: bodyHeight }),
    ).toBe(0);
    expect(getGraphEditorNodeBodyHeight(node, { nodeBodyHeight: () => Number.NaN })).toBe(0);
  });

  test("GraphNode renders a body between header and ports without changing the default", () => {
    const { container, rerender } = render(
      React.createElement(GraphNode, { node: { id: "a", label: "A", ...ports } }),
    );
    expect(container.querySelector('[data-slot="graph-node-body"]')).toBeNull();

    rerender(
      React.createElement(GraphNode, {
        node: { id: "a", label: "A", ...ports },
        body: React.createElement("span", null, "Composed content"),
        nodeBodyHeight: () => 36,
      }),
    );
    const body = container.querySelector<HTMLElement>('[data-slot="graph-node-body"]')!;
    expect(body.textContent).toBe("Composed content");
    expect(body.style.height).toBe("36px");
    const order = [...container.querySelectorAll("[data-slot]")].map((element) =>
      element.getAttribute("data-slot"),
    );
    expect(order.indexOf("workflow-node-header")).toBeLessThan(order.indexOf("graph-node-body"));
    expect(order.indexOf("graph-node-body")).toBeLessThan(order.indexOf("workflow-node-ports"));
  });

  test("an interactive composed body edits without dragging the node or triggering shortcuts", async () => {
    let latestNodes: GraphCanvasNodeData[] = [];
    let latestSelection: GraphEditorSelectionState = { nodeIds: [], edgeIds: [] };
    const typed: string[] = [];

    function Harness() {
      const [nodes, setNodes] = React.useState<GraphCanvasNodeData[]>([
        { id: "a", label: "A", x: 0, y: 0, ...ports },
      ]);
      const [selection, setSelection] = React.useState<GraphEditorSelectionState>({
        nodeIds: ["a"],
        edgeIds: [],
      });
      latestNodes = nodes;
      latestSelection = selection;
      return React.createElement(GraphCanvas, {
        nodes,
        edges: [],
        selectedNodeIds: selection.nodeIds,
        selectedEdgeIds: selection.edgeIds,
        showToolbar: false,
        showMiniMap: false,
        getNodeBodyHeight: () => 40,
        renderNodeBody: ({ node, height }) =>
          React.createElement("input", {
            "aria-label": `${node.label} value`,
            "data-height": height,
            defaultValue: "x",
            onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
              typed.push(event.currentTarget.value),
          }),
        onNodesChange(nextNodes) {
          latestNodes = nextNodes;
          setNodes(nextNodes);
        },
        onSelectionStateChange(next) {
          latestSelection = next;
          setSelection(next);
        },
      });
    }

    const fixture = render(React.createElement(Harness));
    const input = screen.getByLabelText("A value") as HTMLInputElement;
    expect(input.getAttribute("data-height")).toBe("40");

    await act(async () => {
      fireEvent.pointerDown(input, { clientX: 10, clientY: 10, button: 0, pointerId: 1 });
      fireEvent.pointerMove(fixture.container, { clientX: 120, clientY: 90, pointerId: 1 });
      fireEvent.pointerUp(fixture.container, { clientX: 120, clientY: 90, pointerId: 1 });
    });
    expect(latestNodes[0]).toMatchObject({ x: 0, y: 0 });

    await act(async () => {
      fireEvent.change(input, { target: { value: "edited" } });
      fireEvent.keyDown(input, { key: "Delete" });
      fireEvent.keyDown(input, { key: "ArrowRight", shiftKey: true });
    });
    expect(typed).toEqual(["edited"]);
    expect(latestNodes).toHaveLength(1);
    expect(latestNodes[0]).toMatchObject({ x: 0, y: 0 });
    expect(latestSelection.nodeIds).toEqual(["a"]);
  });
});
