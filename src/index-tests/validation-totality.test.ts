import { describe, expect, test } from "vitest";

import { validateGraphEditorDocument } from "@moritzbrantner/graph-editor";

describe("graph document validation totality", () => {
  test.each([null, 42, "node", true, [], {}])(
    "returns diagnostics instead of throwing for malformed node value %j",
    (node) => {
      expect(() => validateGraphEditorDocument({ nodes: [node], edges: [] })).not.toThrow();
      expect(validateGraphEditorDocument({ nodes: [node], edges: [] }).length).toBeGreaterThan(0);
    },
  );

  test.each([null, 42, "edge", true, [], {}])(
    "returns diagnostics instead of throwing for malformed edge value %j",
    (edge) => {
      expect(() => validateGraphEditorDocument({ nodes: [], edges: [edge] })).not.toThrow();
      expect(validateGraphEditorDocument({ nodes: [], edges: [edge] }).length).toBeGreaterThan(0);
    },
  );

  test("still detects cycles in the valid projection of a malformed document", () => {
    const diagnostics = validateGraphEditorDocument({
      nodes: [
        null,
        { id: "a", label: "A", x: 0, y: 0 },
        { id: "b", label: 42, x: Number.NaN, y: 0 },
      ],
      edges: [
        null,
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
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("invalid-node");
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("invalid-edge");
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("cycle");
  });

  test("keeps cycle policy independent from malformed-record diagnostics", () => {
    const document = {
      nodes: [null, { id: "a", label: "A", x: 0, y: 0 }, { id: "b", label: "B", x: 240, y: 0 }],
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

    const diagnostics = validateGraphEditorDocument(document, { allowCycles: true });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("invalid-node");
    expect(diagnostics.map((diagnostic) => diagnostic.code)).not.toContain("cycle");
  });
});
