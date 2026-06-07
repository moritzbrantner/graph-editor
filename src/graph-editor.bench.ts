import { bench, describe } from "vitest";

import {
  copyGraphEditorSelection,
  layoutGraphEditorDocument,
  normalizeGraphEditorDocument,
  pasteGraphEditorClipboardPayload,
  validateGraphEditorDocument,
  type GraphEditorDocument,
} from "@moritzbrantner/graph-editor";

describe("graph editor document operations", () => {
  const small = createBenchmarkDocument(100);
  const medium = createBenchmarkDocument(1_000);
  const large = createBenchmarkDocument(10_000);
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
