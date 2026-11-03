import { bench, describe } from "vitest";

import {
  copyGraphEditorSelection,
  createGraphEditorDocumentContext,
  createGraphEditorGraphIndex,
  createGraphEditorSpatialIndex,
  findGraphEditorNodeInDirection,
  getGraphCanvasConnectionValidity,
  getGraphCanvasEdgeCurveBounds,
  planGraphCanvasEdgeRender,
  getGraphEditorSelectionFromBounds,
  getGraphEditorSelectionFromSpatialIndex,
  graphEditorBoundsIntersect,
  queryGraphEditorNodesNearBounds,
  getGraphEditorNodeSize,
  layoutGraphEditorDocument,
  normalizeGraphEditorDocument,
  pasteGraphEditorClipboardPayload,
  validateGraphEditorConnection,
  validateGraphEditorDocument,
  type GraphCanvasEdge,
  type GraphCanvasNodeData,
  type GraphEditorDocument,
} from "@moritzbrantner/graph-editor";

const small = createBenchmarkDocument(100);
const medium = createBenchmarkDocument(1_000);
const large = createBenchmarkDocument(10_000);

describe("graph editor document operations", () => {
  const selection = {
    nodeIds: small.nodes.slice(0, 50).map((node) => node.id),
    edgeIds: [],
  };
  const payload = copyGraphEditorSelection(small, selection, {
    copiedAt: "2026-06-07T00:00:00.000Z",
  });

  bench("validate 100 nodes", () => {
    validateGraphEditorDocument(small);
  });

  bench("validate 1k nodes", () => {
    validateGraphEditorDocument(medium);
  });

  bench("validate 10k nodes", () => {
    validateGraphEditorDocument(large);
  });

  bench("index 10k-node graph", () => {
    createGraphEditorGraphIndex(large);
  });

  bench("build 10k-node graph context", () => {
    createGraphEditorDocumentContext(large);
  });

  bench("validate connection in 10k-node graph", () => {
    validateGraphEditorConnection(large, {
      sourceNodeId: "node-0",
      sourcePortId: "out",
      targetNodeId: "node-5000",
      targetPortId: "in",
    });
  });

  bench("validate canvas connection in 10k-node graph", () => {
    getGraphCanvasConnectionValidity({
      nodes: large.nodes as unknown as GraphCanvasNodeData[],
      edges: large.edges as GraphCanvasEdge[],
      sourceNodeId: "node-0",
      sourcePortId: "out",
      targetNodeId: "node-5000",
      targetPortId: "in",
    });
  });

  bench("normalize 1k nodes", () => {
    normalizeGraphEditorDocument(medium);
  });

  bench("copy selected subgraph", () => {
    copyGraphEditorSelection(small, selection, {
      copiedAt: "2026-06-07T00:00:00.000Z",
    });
  });

  bench("paste selected subgraph", () => {
    pasteGraphEditorClipboardPayload(small, payload);
  });

  bench("layout 100 nodes", () => {
    layoutGraphEditorDocument(small);
  });
});

describe("graph spatial index", () => {
  const getNodeBounds = (node: GraphEditorDocument["nodes"][number]) => ({
    x: node.x,
    y: node.y,
    ...getGraphEditorNodeSize(node),
  });
  const viewport = { x: 1_400, y: 2_000, width: 1_600, height: 900 };
  const fixtures = [
    ["100", small],
    ["1k", medium],
    ["10k", large],
  ] as const;

  for (const [name, document] of fixtures) {
    const index = createGraphEditorSpatialIndex(document, { getNodeBounds });

    bench(`rebuild spatial index for ${name} nodes`, () => {
      index.rebuild(document);
    });

    bench(`query viewport in ${name}-node spatial index`, () => {
      index.query(viewport, { overscan: 200 });
    });
  }

  const moving = createGraphEditorSpatialIndex(large, { getNodeBounds });
  bench("update one moved node in 10k-node spatial index", () => {
    moving.updateNodes(large, ["node-5000"]);
  });
});

// Candidate visits for these queries are ratcheted in src/index-tests/spatial-interactions.test.ts;
// the reference scans visit every node.
describe("graph interaction candidate queries", () => {
  const getNodeBounds = (node: GraphEditorDocument["nodes"][number]) => ({
    x: node.x,
    y: node.y,
    ...getGraphEditorNodeSize(node),
  });
  const fixtures = [
    ["500", createBenchmarkDocument(500)],
    ["2k", createBenchmarkDocument(2_000)],
    ["10k", large],
  ] as const;

  for (const [name, document] of fixtures) {
    const index = createGraphEditorSpatialIndex(document, { getNodeBounds });
    const middle = document.nodes[Math.floor(document.nodes.length / 2) + 12]!;
    const middleBounds = getNodeBounds(middle);
    const snapBounds = { ...middleBounds, x: middle.x + 20, y: middle.y - 10 };
    const marquee = { x: middle.x - 600, y: middle.y - 400, width: 1_200, height: 800 };
    const items = document.nodes.map((node) => ({
      type: "node" as const,
      id: node.id,
      bounds: getNodeBounds(node),
    }));

    bench(`snap candidates via index in ${name} nodes`, () => {
      queryGraphEditorNodesNearBounds(index, snapBounds, {
        distance: 28,
        excludeNodeIds: [middle.id],
      });
    });

    bench(`snap candidates via reference scan in ${name} nodes`, () => {
      const area = {
        x: snapBounds.x - 28,
        y: snapBounds.y - 28,
        width: snapBounds.width + 56,
        height: snapBounds.height + 56,
      };
      document.nodes.filter(
        (node) => node.id !== middle.id && graphEditorBoundsIntersect(area, getNodeBounds(node)),
      );
    });

    bench(`marquee via index in ${name} nodes`, () => {
      getGraphEditorSelectionFromSpatialIndex(document, marquee, index);
    });

    bench(`marquee via reference scan in ${name} nodes`, () => {
      getGraphEditorSelectionFromBounds(document, marquee, items);
    });

    bench(`directional navigation via index in ${name} nodes`, () => {
      findGraphEditorNodeInDirection(index, middle.id, "right");
      findGraphEditorNodeInDirection(index, middle.id, "down");
    });

    bench(`directional navigation via reference scan in ${name} nodes`, () => {
      for (const direction of ["right", "down"] as const) {
        referenceNodeInDirection(document, getNodeBounds, middle.id, direction);
      }
    });
  }
});

describe("graph canvas edge culling", () => {
  const fixtures = [
    ["5k", createBenchmarkDocument(5_000)],
    ["15k", createBenchmarkDocument(15_000)],
  ] as const;
  const queryBounds = { x: 1_000, y: 2_000, width: 2_000, height: 1_600 };

  for (const [name, document] of fixtures) {
    const nodeById = new Map(document.nodes.map((node) => [node.id, node] as const));
    const getEdgeBounds = (edge: GraphEditorDocument["edges"][number]) => {
      const source = nodeById.get(edge.sourceNodeId)!;
      const target = nodeById.get(edge.targetNodeId)!;
      const sourceSize = getGraphEditorNodeSize(source);
      return getGraphCanvasEdgeCurveBounds(
        { x: source.x + sourceSize.width, y: source.y + sourceSize.height / 2 },
        { x: target.x, y: target.y + getGraphEditorNodeSize(target).height / 2 },
      );
    };
    const index = createGraphEditorSpatialIndex(
      { nodes: document.edges, edges: [] } as unknown as GraphEditorDocument,
      {
        getNodeBounds: (edge) =>
          getEdgeBounds(edge as unknown as GraphEditorDocument["edges"][number]),
      },
    );

    bench(`plan culled edges in ${name}-node chain`, () => {
      planGraphCanvasEdgeRender({ edges: document.edges, index, queryBounds, pinnedEdgeIds: [] });
    });

    bench(`test every edge's curve bounds in ${name}-node chain`, () => {
      document.edges.filter((edge) => graphEditorBoundsIntersect(queryBounds, getEdgeBounds(edge)));
    });
  }
});

function referenceNodeInDirection(
  document: GraphEditorDocument,
  getNodeBounds: (node: GraphEditorDocument["nodes"][number]) => {
    x: number;
    y: number;
    width: number;
    height: number;
  },
  fromNodeId: string,
  direction: "right" | "down",
) {
  const center = (node: GraphEditorDocument["nodes"][number]) => {
    const bounds = getNodeBounds(node);
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  };
  const from = document.nodes.find((node) => node.id === fromNodeId)!;
  const origin = center(from);
  let best: { id: string; perpendicular: number; primary: number } | null = null;
  for (const node of document.nodes) {
    if (node.id === fromNodeId) continue;
    const point = center(node);
    const primary = direction === "right" ? point.x - origin.x : point.y - origin.y;
    if (primary <= 0) continue;
    const perpendicular =
      direction === "right" ? Math.abs(point.y - origin.y) : Math.abs(point.x - origin.x);
    const order = best
      ? perpendicular - best.perpendicular ||
        primary - best.primary ||
        node.id.localeCompare(best.id)
      : -1;
    if (order < 0) best = { id: node.id, perpendicular, primary };
  }
  return best?.id ?? null;
}

function createBenchmarkDocument(nodeCount: number): GraphEditorDocument {
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({
    id: `node-${index}`,
    label: `Node ${index}`,
    x: (index % 25) * 280,
    y: Math.floor(index / 25) * 180,
    inputs: index === 0 ? [] : [{ id: "in", label: "In" }],
    outputs: index === nodeCount - 1 ? [] : [{ id: "out", label: "Out" }],
  }));
  const edges = Array.from({ length: Math.max(0, nodeCount - 1) }, (_, index) => ({
    id: `edge-${index}`,
    sourceNodeId: `node-${index}`,
    sourcePortId: "out",
    targetNodeId: `node-${index + 1}`,
    targetPortId: "in",
  }));

  return { nodes, edges };
}
