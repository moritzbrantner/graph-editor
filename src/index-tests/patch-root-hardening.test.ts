import { describe, expect, test } from "vitest";

import {
  GraphEditorDocumentValidationError,
  applyGraphEditorDocumentPatch,
  applyGraphEditorOperation,
  createGraphEditorPatchOperation,
  createGraphEditorRuntime,
  normalizeGraphEditorDocument,
  validateGraphEditorDocument,
  type GraphEditorDocument,
  type GraphEditorOperation,
} from "@moritzbrantner/graph-editor";

function createDocument(): GraphEditorDocument {
  return normalizeGraphEditorDocument({
    nodes: [
      { id: "source", label: "Source", x: 0, y: 0 },
      { id: "target", label: "Target", x: 240, y: 0 },
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
  });
}

describe("graph patch root hardening", () => {
  test("throws a stable graph validation error for irrecoverable repair roots", () => {
    expect(() =>
      normalizeGraphEditorDocument(null as unknown as GraphEditorDocument, { mode: "repair" }),
    ).toThrow(GraphEditorDocumentValidationError);
    expect(() =>
      normalizeGraphEditorDocument([] as unknown as GraphEditorDocument, { mode: "repair" }),
    ).toThrow("Graph document must be an object");
  });

  test("keeps recoverable object-shaped repair behavior", () => {
    const repaired = normalizeGraphEditorDocument({} as GraphEditorDocument, { mode: "repair" });

    expect(repaired.nodes).toEqual([]);
    expect(repaired.edges).toEqual([]);
    expect(validateGraphEditorDocument(repaired)).toEqual([]);
  });

  test("public patch application fails closed on a non-object root replacement", () => {
    expect(() =>
      applyGraphEditorDocumentPatch(createDocument(), [
        { op: "replace", path: [], value: null },
      ]),
    ).toThrow(GraphEditorDocumentValidationError);
  });

  test("runtime patch preflight preserves the committed document and diagnostic evidence", () => {
    const runtime = createGraphEditorRuntime({ initialDocument: createDocument() });
    const next = applyGraphEditorOperation(
      runtime,
      createGraphEditorPatchOperation([{ op: "replace", path: [], value: null }]),
    );

    expect(next.document).toBe(runtime.document);
    expect(next.issues).toEqual([
      expect.objectContaining({
        path: "$",
        message: expect.stringContaining("Graph document must be an object"),
      }),
    ]);
  });

  test("runtime preflight also handles malformed custom operation candidates", () => {
    const runtime = createGraphEditorRuntime({ initialDocument: createDocument() });
    const invalidOperation: GraphEditorOperation = {
      id: "graph.invalid-candidate",
      label: "Invalid candidate",
      apply: () => null as unknown as GraphEditorDocument,
    };
    const next = applyGraphEditorOperation(runtime, invalidOperation);

    expect(next.document).toBe(runtime.document);
    expect(next.issues).toEqual([
      expect.objectContaining({
        path: "$",
        message: "Graph document must be an object",
      }),
    ]);
  });

  test("ordinary object-shaped patch repair still removes dangling edges", () => {
    const document = createDocument();
    const sourceOnly = [document.nodes[0]!];
    const next = applyGraphEditorDocumentPatch(document, [
      { op: "replace", path: ["nodes"], value: sourceOnly },
    ]);

    expect(next.nodes).toEqual(sourceOnly);
    expect(next.edges).toEqual([]);
  });
});
