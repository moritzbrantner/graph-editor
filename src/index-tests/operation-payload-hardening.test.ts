import { describe, expect, test } from "vitest";

import { readGraphEditorOperationLog } from "@moritzbrantner/graph-editor";

const operationLogEnvelope = (type: string, payload: Record<string, unknown>) => ({
  format: "@moritzbrantner/graph-editor/operations",
  operations: [
    {
      id: "operation",
      type,
      schemaVersion: 1,
      payload: { type, ...payload },
    },
  ],
  schemaVersion: 1,
});

describe("graph operation payload hardening", () => {
  test.each([
    ["graph.add-node", { node: null }, "Node must be an object."],
    ["graph.update-node", { nodeId: "", patch: {} }, "Node id must be a non-empty string."],
    [
      "graph.move-nodes",
      { positionsByNodeId: { node: { x: Number.NaN, y: 0 } } },
      "Node position x must be a finite number.",
    ],
    [
      "graph.remove-selection",
      { selection: { nodeIds: [], edgeIds: "bad" } },
      "Selection edge ids must be an array of non-empty strings.",
    ],
    [
      "graph.add-edge",
      {
        edge: {
          id: "edge",
          sourceNodeId: "source",
          sourcePortId: "out",
          targetNodeId: "target",
          targetPortId: "",
        },
      },
      "Edge targetPortId must be a non-empty string.",
    ],
    ["graph.update-edge", { edgeId: "edge", patch: [] }, "Edge patch must be an object."],
    ["graph.remove-edge", { edgeId: "" }, "Edge id must be a non-empty string."],
    [
      "graph.create-group",
      { nodeIds: ["node", 42] },
      "Group node ids must be an array of non-empty strings.",
    ],
    ["graph.ungroup", { groupIds: "group" }, "Group ids must be an array of non-empty strings."],
    [
      "graph.layout",
      { options: { nodeWidth: () => 10 } },
      "Layout nodeWidth must be a positive finite number.",
    ],
    [
      "graph.update-viewport",
      { viewport: { x: 0, y: 0, zoom: Number.POSITIVE_INFINITY } },
      "Viewport zoom must be a finite number.",
    ],
    [
      "graph.replace-document",
      { document: { nodes: [], edges: "bad" } },
      "Graph document edges must be an array",
    ],
    ["graph.patch", { patch: {} }, "Graph patch must be an array."],
    [
      "graph.duplicate-selection",
      { unsupported: false },
      "Unsupported operation marker must be true.",
    ],
    [
      "graph.paste",
      { unsupported: true, reason: 42 },
      "Unsupported operation reason must be a string.",
    ],
  ])("rejects malformed %s payloads before replay", (type, payload, message) => {
    expect(() => readGraphEditorOperationLog(operationLogEnvelope(type, payload))).toThrow(message);
  });

  test("keeps semantic cycle policy outside serialized payload shape validation", () => {
    const document = {
      nodes: [
        {
          id: "a",
          label: "A",
          x: 0,
          y: 0,
          inputs: [{ id: "in", label: "In" }],
          outputs: [{ id: "out", label: "Out" }],
        },
        {
          id: "b",
          label: "B",
          x: 240,
          y: 0,
          inputs: [{ id: "in", label: "In" }],
          outputs: [{ id: "out", label: "Out" }],
        },
      ],
      edges: [
        {
          id: "a-b",
          sourceNodeId: "a",
          sourcePortId: "out",
          targetNodeId: "b",
          targetPortId: "in",
        },
        {
          id: "b-a",
          sourceNodeId: "b",
          sourcePortId: "out",
          targetNodeId: "a",
          targetPortId: "in",
        },
      ],
    };

    expect(
      readGraphEditorOperationLog(
        operationLogEnvelope("graph.replace-document", { document }),
      ),
    ).toHaveLength(1);
  });
});
