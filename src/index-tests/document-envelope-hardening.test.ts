import { describe, expect, test } from "vitest";

import {
  normalizeGraphEditorDocument,
  validateGraphEditorDocument,
  type GraphEditorDocument,
} from "@moritzbrantner/graph-editor";

describe("graph document envelope hardening", () => {
  test("rejects malformed optional envelope fields in strict mode", () => {
    const malformed = {
      nodes: [],
      edges: [],
      groups: { id: "not-an-array" },
      viewport: { x: "bad", y: Number.NaN, zoom: Number.POSITIVE_INFINITY },
    };

    const diagnostics = validateGraphEditorDocument(malformed);

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "invalid-group",
      "invalid-viewport",
      "invalid-viewport",
      "invalid-viewport",
    ]);
    expect(diagnostics.map((diagnostic) => diagnostic.path)).toEqual([
      "$.groups",
      "$.viewport.x",
      "$.viewport.y",
      "$.viewport.zoom",
    ]);
    expect(() =>
      normalizeGraphEditorDocument(malformed as unknown as GraphEditorDocument),
    ).toThrow("Graph document is invalid");
  });

  test("repairs malformed optional envelope fields to a valid document", () => {
    const repaired = normalizeGraphEditorDocument(
      {
        nodes: [],
        edges: [],
        groups: { id: "not-an-array" },
        viewport: { x: "bad", y: Number.NaN, zoom: Number.POSITIVE_INFINITY },
      } as unknown as GraphEditorDocument,
      { mode: "repair" },
    );

    expect(repaired.groups).toBeUndefined();
    expect(repaired.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(validateGraphEditorDocument(repaired)).toEqual([]);
  });

  test("rejects array-shaped viewport values", () => {
    const diagnostics = validateGraphEditorDocument({
      nodes: [],
      edges: [],
      viewport: [],
    });

    expect(diagnostics).toEqual([
      {
        code: "invalid-viewport",
        message: "Graph viewport must be an object",
        path: "$.viewport",
      },
    ]);
  });
});
