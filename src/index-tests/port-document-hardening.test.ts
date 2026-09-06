import { describe, expect, test } from "vitest";

import {
  normalizeGraphEditorDocument,
  validateGraphEditorDocument,
  type GraphEditorDocument,
} from "@moritzbrantner/graph-editor";

function node(id: string, x: number): GraphEditorDocument["nodes"][number] {
  return { id, label: id, x, y: 0 };
}

describe("graph port document hardening", () => {
  test("rejects malformed port collections and canonical duplicate port ids", () => {
    const diagnostics = validateGraphEditorDocument({
      nodes: [
        {
          ...node("source", 0),
          outputs: { id: "not-an-array" },
        },
        {
          ...node("target", 240),
          inputs: [
            { id: " in ", label: "In" },
            { id: "in", label: "Duplicate" },
            { id: "", label: "Empty" },
            { id: "other", label: 42 },
            null,
          ],
        },
      ],
      edges: [],
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "invalid-port",
      "duplicate-port-id",
      "invalid-port",
      "invalid-port",
      "invalid-port",
    ]);
    expect(diagnostics.map((diagnostic) => diagnostic.path)).toEqual([
      "$.nodes[0].outputs",
      "$.nodes[1].inputs[1].id",
      "$.nodes[1].inputs[2].id",
      "$.nodes[1].inputs[3].label",
      "$.nodes[1].inputs[4]",
    ]);
  });

  test("keeps input and output port identity direction-local", () => {
    expect(
      validateGraphEditorDocument({
        nodes: [
          {
            ...node("node", 0),
            inputs: [{ id: "shared", label: "Input" }],
            outputs: [{ id: "shared", label: "Output" }],
          },
        ],
        edges: [],
      }),
    ).toEqual([]);
  });

  test("repairs ports and edge port references deterministically and idempotently", () => {
    const repaired = normalizeGraphEditorDocument(
      {
        nodes: [
          {
            ...node("source", 0),
            outputs: [
              { id: " out ", label: "Out" },
              { id: "out", label: "Duplicate" },
              { id: "", label: "Empty" },
              null,
            ],
          },
          {
            ...node("target", 240),
            inputs: [{ id: " in ", label: 42 }],
          },
        ],
        edges: [
          {
            id: " edge ",
            sourceNodeId: "source",
            sourcePortId: " out ",
            targetNodeId: "target",
            targetPortId: " in ",
          },
        ],
      } as unknown as GraphEditorDocument,
      { mode: "repair" },
    );

    expect(repaired.nodes[0]?.outputs).toEqual([
      expect.objectContaining({ id: "out", label: "Out" }),
    ]);
    expect(repaired.nodes[1]?.inputs).toEqual([
      expect.objectContaining({ id: "in", label: "" }),
    ]);
    expect(repaired.edges).toEqual([
      expect.objectContaining({
        id: "edge",
        sourcePortId: "out",
        targetPortId: "in",
      }),
    ]);
    expect(validateGraphEditorDocument(repaired)).toEqual([]);
    expect(normalizeGraphEditorDocument(repaired, { mode: "repair" })).toEqual(repaired);
  });

  test("treats malformed declared port collections as empty during repair", () => {
    const repaired = normalizeGraphEditorDocument(
      {
        nodes: [
          {
            ...node("source", 0),
            outputs: { id: "out", label: "Out" },
          },
          {
            ...node("target", 240),
            inputs: [{ id: "in", label: "In" }],
          },
        ],
        edges: [
          {
            id: "edge",
            sourceNodeId: "source",
            sourcePortId: "out",
            targetNodeId: "target",
            targetPortId: "in",
          },
        ],
      } as unknown as GraphEditorDocument,
      { mode: "repair" },
    );

    expect(repaired.nodes[0]?.outputs).toEqual([]);
    expect(repaired.edges).toEqual([]);
    expect(validateGraphEditorDocument(repaired)).toEqual([]);
  });

  test("requires non-empty edge port references even for loose portless nodes", () => {
    const document = {
      nodes: [node("source", 0), node("target", 240)],
      edges: [
        {
          id: "edge",
          sourceNodeId: "source",
          sourcePortId: "   ",
          targetNodeId: "target",
          targetPortId: "in",
        },
      ],
    };

    expect(validateGraphEditorDocument(document).map((diagnostic) => diagnostic.code)).toEqual([
      "invalid-edge",
    ]);
    expect(
      normalizeGraphEditorDocument(document as GraphEditorDocument, { mode: "repair" }).edges,
    ).toEqual([]);
  });
});
