import * as React from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import {
  GraphCanvas,
  createGraphEditorSpatialIndex,
  getGraphCanvasVisibleGraphBounds,
  planGraphCanvasNodeRender,
  resolveGraphCanvasVirtualization,
  type GraphCanvasNodeData,
  type GraphCanvasViewport,
} from "@moritzbrantner/graph-editor";

const surfaceSize = { width: 1200, height: 800 };
const nodeSize = { width: 248, height: 124 };

function gridNodes(count: number, columns = 100): GraphCanvasNodeData[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `n${index}`,
    label: `Node ${index}`,
    x: (index % columns) * 300,
    y: Math.floor(index / columns) * 200,
  }));
}

function renderedNodeIds(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('[data-slot="workflow-builder-node"]')].map(
    (element) => element.dataset.nodeId,
  );
}

function renderCanvas(props: Partial<React.ComponentProps<typeof GraphCanvas>> = {}) {
  return render(
    React.createElement(GraphCanvas, {
      nodes: gridNodes(600),
      edges: [],
      showToolbar: false,
      showMiniMap: false,
      viewport: { x: 0, y: 0, zoom: 1 },
      measurePorts: "deterministic",
      ...props,
    }),
  );
}

let clientWidth: PropertyDescriptor | undefined;
let clientHeight: PropertyDescriptor | undefined;

beforeAll(() => {
  clientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
  clientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      return surfaceSize.width;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get() {
      return surfaceSize.height;
    },
  });
});

afterAll(() => {
  if (clientWidth) Object.defineProperty(HTMLElement.prototype, "clientWidth", clientWidth);
  if (clientHeight) Object.defineProperty(HTMLElement.prototype, "clientHeight", clientHeight);
});

afterEach(() => cleanup());

describe("GraphCanvas render planning", () => {
  test("resolves automatic, disabled, and object virtualization options", () => {
    expect(resolveGraphCanvasVirtualization(undefined)).toEqual({
      enabled: true,
      threshold: 500,
      overscan: 400,
    });
    expect(resolveGraphCanvasVirtualization(false).enabled).toBe(false);
    expect(resolveGraphCanvasVirtualization({ threshold: 10, overscan: -1 })).toEqual({
      enabled: true,
      threshold: 10,
      overscan: 400,
    });
  });

  test("converts the scrolled surface into graph-space bounds", () => {
    expect(
      getGraphCanvasVisibleGraphBounds({
        viewport: { x: -200, y: 100, zoom: 2 },
        scrollLeft: 0,
        scrollTop: 50,
        width: 800,
        height: 600,
      }),
    ).toEqual({ x: 100, y: -25, width: 400, height: 300 });
    expect(
      getGraphCanvasVisibleGraphBounds({
        viewport: { x: 0, y: 0, zoom: 1 },
        scrollLeft: 0,
        scrollTop: 0,
        width: 0,
        height: 0,
      }),
    ).toBeNull();
  });

  test("ratchets considered and rendered work on a 5,000-node grid", () => {
    const nodes = gridNodes(5000);
    const index = createGraphEditorSpatialIndex(
      { nodes, edges: [] },
      { getNodeBounds: (node) => ({ x: node.x, y: node.y, ...nodeSize }) },
    );
    const plan = planGraphCanvasNodeRender({
      nodes,
      hiddenNodeIds: new Set(),
      index,
      visibleBounds: { x: 0, y: 0, ...surfaceSize },
      zoom: 1,
      virtualization: resolveGraphCanvasVirtualization(undefined),
      pinnedNodeIds: ["n4999", "missing"],
    });

    expect(plan.culling).toBe(true);
    expect(plan.renderedNodeIds?.has("n4999")).toBe(true);
    expect(plan.stats).toEqual({
      totalNodes: 5000,
      nodesConsidered: 56,
      nodesRendered: 43,
      pinnedOutsideViewport: 1,
    });
  });

  test("renders every node at or below the threshold", () => {
    const plan = planGraphCanvasNodeRender({
      nodes: gridNodes(500),
      hiddenNodeIds: new Set(),
      index: null,
      visibleBounds: { x: 0, y: 0, ...surfaceSize },
      zoom: 1,
      virtualization: resolveGraphCanvasVirtualization(undefined),
      pinnedNodeIds: [],
    });
    expect(plan.culling).toBe(false);
    expect(plan.renderedNodeIds).toBeNull();
  });
});

describe("GraphCanvas node culling", () => {
  test("small documents render every node without a status", () => {
    const fixture = renderCanvas({ nodes: gridNodes(20) });
    expect(renderedNodeIds(fixture.container)).toHaveLength(20);
    expect(fixture.container.querySelector('[role="status"]')).toBeNull();
    expect(
      fixture.container
        .querySelector('[data-slot="workflow-builder-surface"]')
        ?.getAttribute("data-virtualized"),
    ).toBeNull();
  });

  test("large documents keep the DOM bounded and announce the visible count", () => {
    const fixture = renderCanvas({ nodes: gridNodes(5000) });
    const ids = renderedNodeIds(fixture.container);
    expect(ids).toHaveLength(42);
    expect(fixture.container.querySelector('[role="status"]')?.textContent).toBe(
      "Showing 42 of 5,000 nodes",
    );
    const surface = fixture.container.querySelector<HTMLElement>(
      '[data-slot="workflow-builder-surface"]',
    )!;
    expect(surface.dataset.virtualized).toBe("true");
    expect(surface.dataset.nodesRendered).toBe("42");
  });

  test("virtualization={false} forces every node to render", () => {
    const fixture = renderCanvas({ virtualization: false });
    expect(renderedNodeIds(fixture.container)).toHaveLength(600);
  });

  test("the object form sets threshold and overscan", () => {
    const fixture = renderCanvas({
      nodes: gridNodes(40, 10),
      virtualization: { threshold: 10, overscan: 0 },
    });
    // Columns 0..4 (x <= 1200, touching counts) of all 4 rows intersect the 1200x800 surface.
    expect(renderedNodeIds(fixture.container)).toHaveLength(20);
  });

  test("panning swaps rendered nodes and keeps the focused node", () => {
    function Harness({ viewport }: { viewport: GraphCanvasViewport }) {
      return React.createElement(GraphCanvas, {
        nodes: gridNodes(600),
        edges: [],
        showToolbar: false,
        showMiniMap: false,
        measurePorts: "deterministic",
        viewport,
      });
    }
    const fixture = render(React.createElement(Harness, { viewport: { x: 0, y: 0, zoom: 1 } }));
    const focusedNode = fixture.container.querySelector<HTMLElement>('[data-node-id="n0"]')!;
    act(() => {
      fireEvent.focus(focusedNode);
    });

    fixture.rerender(React.createElement(Harness, { viewport: { x: -6000, y: 0, zoom: 1 } }));
    const ids = renderedNodeIds(fixture.container);
    expect(ids).toContain("n0");
    expect(ids).toContain("n20");
    expect(ids).not.toContain("n1");
  });

  test("the keyboard navigation target stays rendered", () => {
    const fixture = renderCanvas({
      nodes: gridNodes(600),
      viewport: { x: -6000, y: 0, zoom: 1 },
    });
    const canvas = fixture.container.querySelector<HTMLElement>('[data-slot="workflow-builder"]')!;
    expect(renderedNodeIds(fixture.container)).not.toContain("n0");
    act(() => {
      fireEvent.keyDown(canvas, { key: "ArrowRight" });
    });
    // With nothing selected, keyboard navigation starts at the first node in reading order.
    expect(renderedNodeIds(fixture.container)).toContain("n0");
  });
});
