import * as React from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import {
  GraphCanvas,
  createGraphEditorSpatialIndex,
  getGraphCanvasEdgeCurveBounds,
  graphCanvasEdgeCurveMargin,
  graphEditorBoundsIntersect,
  planGraphCanvasEdgeRender,
  type GraphCanvasEdge,
  type GraphCanvasNodeData,
  type GraphEditorBounds,
  type GraphEditorDocument,
} from "@moritzbrantner/graph-editor";

const surfaceSize = { width: 1200, height: 800 };
const nodeSize = { width: 248, height: 124 };
// Default overscan (400px) around the 1200x800 surface at zoom 1.
const cullingBoundsAt = (x: number, y: number) => ({
  x: x - 400,
  y: y - 400,
  width: surfaceSize.width + 800,
  height: surfaceSize.height + 800,
});

type Point = { x: number; y: number };

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function gridNodes(count: number, columns = 100): GraphCanvasNodeData[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `n${index}`,
    label: `Node ${index}`,
    x: (index % columns) * 300,
    y: Math.floor(index / columns) * 200,
  }));
}

function chainEdges(count: number): GraphCanvasEdge[] {
  return Array.from({ length: Math.max(count - 1, 0) }, (_, index) => ({
    id: `e${index}`,
    sourceNodeId: `n${index}`,
    sourcePortId: "out",
    targetNodeId: `n${index + 1}`,
    targetPortId: "in",
  }));
}

// Port-less grid nodes connect at their vertical centers on the left/right edges.
function endpoints(nodeById: ReadonlyMap<string, GraphCanvasNodeData>, edge: GraphCanvasEdge) {
  const source = nodeById.get(edge.sourceNodeId)!;
  const target = nodeById.get(edge.targetNodeId)!;
  return {
    source: { x: source.x + nodeSize.width, y: source.y + nodeSize.height / 2 },
    target: { x: target.x, y: target.y + nodeSize.height / 2 },
  };
}

/** Points on the cubic GraphCanvas draws, i.e. the full (unculled) visible-edge semantics. */
function sampleEdgeCurve(source: Point, target: Point, steps = 64): Point[] {
  const handle = Math.max(48, Math.abs(target.x - source.x) / 2);
  const c1 = { x: source.x + handle, y: source.y };
  const c2 = { x: target.x - handle, y: target.y };
  return Array.from({ length: steps + 1 }, (_, step) => {
    const t = step / steps;
    const u = 1 - t;
    return {
      x: u ** 3 * source.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t ** 3 * target.x,
      y: u ** 3 * source.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t ** 3 * target.y,
    };
  });
}

function curveTouches(points: readonly Point[], bounds: GraphEditorBounds) {
  return points.some(
    (point) =>
      point.x >= bounds.x - graphCanvasEdgeCurveMargin &&
      point.x <= bounds.x + bounds.width + graphCanvasEdgeCurveMargin &&
      point.y >= bounds.y - graphCanvasEdgeCurveMargin &&
      point.y <= bounds.y + bounds.height + graphCanvasEdgeCurveMargin,
  );
}

function createEdgeIndex(
  edges: readonly GraphCanvasEdge[],
  nodeById: ReadonlyMap<string, GraphCanvasNodeData>,
) {
  return createGraphEditorSpatialIndex(
    { nodes: edges, edges: [] } as unknown as GraphEditorDocument,
    {
      getNodeBounds: (edge) => {
        const { source, target } = endpoints(nodeById, edge as unknown as GraphCanvasEdge);
        return getGraphCanvasEdgeCurveBounds(source, target);
      },
    },
  );
}

function renderedEdgeIds(container: HTMLElement) {
  return [...container.querySelectorAll<SVGPathElement>('[data-slot="workflow-builder-edge-hit"]')]
    .map((element) => element.getAttribute("aria-label")!.replace("Connection ", ""))
    .sort();
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

describe("edge render planning", () => {
  test("curve bounds contain the whole drawn curve", () => {
    const random = createRandom(5);
    for (let sample = 0; sample < 200; sample += 1) {
      const source = { x: random() * 4_000 - 2_000, y: random() * 4_000 - 2_000 };
      const target = { x: random() * 4_000 - 2_000, y: random() * 4_000 - 2_000 };
      const bounds = getGraphCanvasEdgeCurveBounds(source, target);
      for (const point of sampleEdgeCurve(source, target)) {
        expect(graphEditorBoundsIntersect(bounds, { ...point, width: 0, height: 0 })).toBe(true);
      }
    }
  });

  test.each([1, 2, 3])(
    "culled plans keep every edge the full plan shows in the viewport (seed %i)",
    (seed) => {
      const random = createRandom(seed);
      const nodes: GraphCanvasNodeData[] = Array.from({ length: 800 }, (_, index) => ({
        id: `n${index}`,
        label: `Node ${index}`,
        x: Math.round(random() * 30_000),
        y: Math.round(random() * 12_000),
      }));
      const nodeById = new Map(nodes.map((node) => [node.id, node] as const));
      const edges: GraphCanvasEdge[] = Array.from({ length: 1_500 }, (_, index) => ({
        id: `e${index}`,
        sourceNodeId: `n${Math.floor(random() * 800)}`,
        sourcePortId: "out",
        targetNodeId: `n${index % 9 === 0 ? Math.floor(random() * 800) : (index * 7) % 800}`,
        targetPortId: "in",
      }));
      const index = createEdgeIndex(edges, nodeById);
      for (let view = 0; view < 12; view += 1) {
        const queryBounds = cullingBoundsAt(random() * 28_000, random() * 11_000);
        const full = planGraphCanvasEdgeRender({
          edges,
          index,
          queryBounds: null,
          pinnedEdgeIds: [],
        });
        const culled = planGraphCanvasEdgeRender({
          edges,
          index,
          queryBounds,
          pinnedEdgeIds: ["e7"],
        });
        expect(full.renderedEdgeIds).toBeNull();
        expect(culled.culling).toBe(true);
        for (const edge of edges) {
          const { source, target } = endpoints(nodeById, edge);
          const visible = curveTouches(sampleEdgeCurve(source, target), queryBounds);
          const relevant = graphEditorBoundsIntersect(
            queryBounds,
            getGraphCanvasEdgeCurveBounds(source, target),
          );
          if (visible) {
            expect(culled.renderedEdgeIds!.has(edge.id), edge.id).toBe(true);
          }
          if (culled.renderedEdgeIds!.has(edge.id) && edge.id !== "e7") {
            expect(relevant, edge.id).toBe(true);
          }
        }
        expect(culled.renderedEdgeIds!.has("e7")).toBe(true);
      }
    },
  );

  test("ratchets considered and generated edge work on a 5,000-node chain", () => {
    const nodes = gridNodes(5_000);
    const nodeById = new Map(nodes.map((node) => [node.id, node] as const));
    const edges = chainEdges(5_000);
    const plan = planGraphCanvasEdgeRender({
      edges,
      index: createEdgeIndex(edges, nodeById),
      queryBounds: cullingBoundsAt(0, 0),
      pinnedEdgeIds: ["e4000", "missing"],
    });
    expect(plan.stats).toEqual({
      totalEdges: 4_999,
      edgesConsidered: 64,
      edgesRendered: 37,
      pinnedOutsideViewport: 1,
    });
  });
});

describe("GraphCanvas edge culling", () => {
  function renderCanvas(props: Partial<React.ComponentProps<typeof GraphCanvas>> = {}) {
    return render(
      React.createElement(GraphCanvas, {
        nodes: gridNodes(600),
        edges: chainEdges(600),
        showToolbar: false,
        showMiniMap: false,
        viewport: { x: 0, y: 0, zoom: 1 },
        measurePorts: "deterministic",
        ...props,
      }),
    );
  }

  test("renders exactly the edges relevant to the culling bounds, including crossing ones", () => {
    const nodes = gridNodes(600);
    const nodeById = new Map(nodes.map((node) => [node.id, node] as const));
    const queryBounds = cullingBoundsAt(0, 0);
    const expected = chainEdges(600)
      .filter((edge) => {
        const { source, target } = endpoints(nodeById, edge);
        return graphEditorBoundsIntersect(
          queryBounds,
          getGraphCanvasEdgeCurveBounds(source, target),
        );
      })
      .map((edge) => edge.id)
      .sort();
    const fixture = renderCanvas();
    const surface = fixture.container.querySelector<HTMLElement>(
      '[data-slot="workflow-builder-surface"]',
    )!;

    expect(renderedEdgeIds(fixture.container)).toEqual(expected);
    // Row-wrapping edges such as n99 -> n100 have both endpoints culled or far away but cross
    // the viewport, so they stay rendered.
    expect(expected).toContain("e99");
    expect(expected).toContain("e199");
    expect(surface.dataset.edgesRendered).toBe(String(expected.length));
    expect(Number(surface.dataset.edgesConsidered)).toBeLessThan(150);
  });

  test("selected edges stay rendered and selectable outside the viewport", () => {
    const fixture = renderCanvas({ selectedEdgeIds: ["e450"] });
    const ids = renderedEdgeIds(fixture.container);
    expect(ids).toContain("e450");
    expect(ids).not.toContain("e451");
    const edge = fixture.container.querySelector<SVGPathElement>(
      '[data-slot="workflow-builder-edge"][data-selected="true"]',
    );
    expect(edge).not.toBeNull();
    expect(fixture.getByLabelText("Rewire target for connection e450")).toBeTruthy();
  });

  test("a hovered edge stays rendered while the viewport moves away", () => {
    function Harness({ viewport }: { viewport: { x: number; y: number; zoom: number } }) {
      return React.createElement(GraphCanvas, {
        nodes: gridNodes(600),
        edges: chainEdges(600),
        showToolbar: false,
        showMiniMap: false,
        measurePorts: "deterministic",
        viewport,
      });
    }
    const fixture = render(React.createElement(Harness, { viewport: { x: 0, y: 0, zoom: 1 } }));
    const hit = fixture.getByLabelText("Connection e0");
    act(() => {
      fireEvent.pointerEnter(hit.parentElement!);
    });
    fixture.rerender(React.createElement(Harness, { viewport: { x: -9000, y: 0, zoom: 1 } }));
    const ids = renderedEdgeIds(fixture.container);
    expect(ids).toContain("e0");
    expect(ids).not.toContain("e1");
    expect(ids).toContain("e31");
  });

  test("moving a node updates the edges incident to it", () => {
    const nodes = gridNodes(600);
    const fixture = renderCanvas({ nodes });
    expect(renderedEdgeIds(fixture.container)).not.toContain("e450");
    const moved = [...nodes];
    moved[450] = { ...nodes[450]!, x: 600, y: 300 };
    fixture.rerender(
      React.createElement(GraphCanvas, {
        nodes: moved,
        edges: chainEdges(600),
        showToolbar: false,
        showMiniMap: false,
        viewport: { x: 0, y: 0, zoom: 1 },
        measurePorts: "deterministic",
      }),
    );
    const ids = renderedEdgeIds(fixture.container);
    expect(ids).toContain("e449");
    expect(ids).toContain("e450");
    expect(ids).not.toContain("e451");
  });

  test("small documents and virtualization={false} render every edge", () => {
    expect(renderedEdgeIds(renderCanvas({ virtualization: false }).container)).toHaveLength(599);
    cleanup();
    const small = renderCanvas({ nodes: gridNodes(40), edges: chainEdges(40) });
    expect(renderedEdgeIds(small.container)).toHaveLength(39);
    expect(
      small.container
        .querySelector('[data-slot="workflow-builder-surface"]')
        ?.getAttribute("data-edges-rendered"),
    ).toBeNull();
  });
});
