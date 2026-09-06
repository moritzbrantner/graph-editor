import { describe, expect, test } from "vitest";

import {
  createGraphEditorAddEdgeOperation,
  normalizeGraphEditorDocument,
  validateGraphEditorDocument,
  type GraphEditorDocument,
} from "@moritzbrantner/graph-editor";

function createDocument(): GraphEditorDocument {
  return normalizeGraphEditorDocument({
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
    edges: [],
  });
}

describe("graph add-edge operation hardening", () => {
  test("rejects a directly supplied invalid edge instead of committing invalid state", () => {
    const document = createDocument();
    const operation = createGraphEditorAddEdgeOperation({
      edge: {
        id: "invalid",
        sourceNodeId: "a",
        sourcePortId: "out",
        targetNodeId: "missing",
        targetPortId: "in",
      },
    });

    expect(operation.apply(document)).toBe(document);
  });

  test("rejects an invalid custom edge returned for an otherwise valid connection", () => {
    const document = createDocument();
    const operation = createGraphEditorAddEdgeOperation({
      connection: {
        sourceNodeId: "a",
        sourcePortId: "out",
        targetNodeId: "b",
        targetPortId: "in",
      },
      createEdge: () => ({
        id: "invalid-custom",
        sourceNodeId: "missing",
        sourcePortId: "out",
        targetNodeId: "b",
        targetPortId: "in",
      }),
    });

    expect(operation.apply(document)).toBe(document);
  });

  test("preserves explicitly allowed cycle semantics while still normalizing the result", () => {
    const document = normalizeGraphEditorDocument({
      ...createDocument(),
      edges: [
        {
          id: "a-b",
          sourceNodeId: "a",
          sourcePortId: "out",
          targetNodeId: "b",
          targetPortId: "in",
        },
      ],
    });
    const operation = createGraphEditorAddEdgeOperation({
      connection: {
        sourceNodeId: "b",
        sourcePortId: "out",
        targetNodeId: "a",
        targetPortId: "in",
      },
      validationOptions: { allowCycles: true },
    });
    const next = operation.apply(document);

    expect(next.edges).toHaveLength(2);
    expect(validateGraphEditorDocument(next, { allowCycles: true })).toEqual([]);
    expect(validateGraphEditorDocument(next).map((diagnostic) => diagnostic.code)).toContain(
      "cycle",
    );
  });
});
