import { describe, expect, test } from "vitest";

import {
  normalizeGraphEditorDocument,
  validateGraphEditorDocument,
  type GraphEditorDocument,
} from "@moritzbrantner/graph-editor";

function node(id: string, x: number): GraphEditorDocument["nodes"][number] {
  return { id, label: id.trim() || "Node", x, y: 0 };
}

describe("graph document normalization hardening", () => {
  test("repairs canonical entity identities deterministically and idempotently", () => {
    const repaired = normalizeGraphEditorDocument(
      {
        nodes: [node(" node-a ", 0), node("node-a", 100), node("   ", 200), node("node-b", 300)],
        edges: [
          {
            id: " edge-1 ",
            sourceNodeId: " node-a ",
            sourcePortId: "out",
            targetNodeId: "node-b",
            targetPortId: "in",
          },
          {
            id: "edge-1",
            sourceNodeId: "node-a",
            sourcePortId: "out",
            targetNodeId: "node-b",
            targetPortId: "in",
          },
          {
            id: "   ",
            sourceNodeId: "node-a",
            sourcePortId: "out",
            targetNodeId: "node-b",
            targetPortId: "in",
          },
        ],
        groups: [
          { id: " group-1 ", label: "Primary", nodeIds: [" node-a "] },
          { id: "group-1", label: "Duplicate", nodeIds: ["node-b"] },
          { id: "   ", label: "Empty", nodeIds: ["node-b"] },
        ],
      },
      { mode: "repair" },
    );

    expect(repaired.nodes.map((item) => item.id)).toEqual(["node-a", "node-b"]);
    expect(repaired.edges).toEqual([
      expect.objectContaining({
        id: "edge-1",
        sourceNodeId: "node-a",
        targetNodeId: "node-b",
      }),
    ]);
    expect(repaired.groups).toEqual([
      expect.objectContaining({ id: "group-1", nodeIds: ["node-a"] }),
    ]);
    expect(validateGraphEditorDocument(repaired)).toEqual([]);
    expect(normalizeGraphEditorDocument(repaired, { mode: "repair" })).toEqual(repaired);
  });

  test("drops a group collection when every group is rejected", () => {
    const repaired = normalizeGraphEditorDocument(
      {
        nodes: [node("node-a", 0)],
        edges: [],
        groups: [{ id: "   ", label: "Invalid", nodeIds: ["node-a"] }],
      },
      { mode: "repair" },
    );

    expect(repaired.groups).toBeUndefined();
    expect(validateGraphEditorDocument(repaired)).toEqual([]);
  });

  test("reports canonical id collisions without broadening group membership validation", () => {
    const diagnostics = validateGraphEditorDocument({
      nodes: [node(" node-a ", 0), node("node-a", 100), node("node-b", 200)],
      edges: [
        {
          id: " edge-1 ",
          sourceNodeId: " node-a ",
          sourcePortId: "out",
          targetNodeId: "node-b",
          targetPortId: "in",
        },
        {
          id: "edge-1",
          sourceNodeId: "node-a",
          sourcePortId: "out",
          targetNodeId: "node-b",
          targetPortId: "in",
        },
      ],
      groups: [
        { id: " group-1 ", label: "Primary", nodeIds: [" node-a "] },
        { id: "group-1", label: "Duplicate id", nodeIds: ["node-b"] },
        { id: "group-2", label: "Existing membership semantics", nodeIds: [" node-a "] },
      ],
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "duplicate-node-id",
      "duplicate-edge-id",
      "duplicate-group-id",
    ]);
  });
});
