import { describe, expect, test } from "vitest";

import {
  readGraphEditorDocument,
  readSerializedGraphEditorDocument,
} from "@moritzbrantner/graph-editor";
import { EditorJsonParseError } from "@moritzbrantner/editor-core/serialization";

function issuePaths(run: () => unknown) {
  try {
    run();
  } catch (error) {
    if (error instanceof EditorJsonParseError) {
      return error.issues.map((issue) => issue.path);
    }
    throw error;
  }
  throw new Error("Expected graph document parsing to fail.");
}

describe("graph document parse diagnostic paths", () => {
  test("rebases nested diagnostics under the caller-supplied root", () => {
    const paths = issuePaths(() =>
      readGraphEditorDocument(
        {
          nodes: [{ id: "", label: 42, x: Number.NaN, y: 0 }],
          edges: [],
        },
        "request.payload.document",
      ),
    );

    expect(paths).toEqual([
      "request.payload.document.nodes[0].id",
      "request.payload.document.nodes[0].label",
      "request.payload.document.nodes[0].x",
    ]);
  });

  test("preserves root-style diagnostic paths when no caller root is supplied", () => {
    const paths = issuePaths(() =>
      readGraphEditorDocument({
        nodes: [{ id: "", label: "Node", x: 0, y: 0 }],
        edges: [],
      }),
    );

    expect(paths).toEqual(["$.nodes[0].id"]);
  });

  test("rebases root diagnostics without adding an extra separator", () => {
    expect(issuePaths(() => readGraphEditorDocument(null, "request.payload.document"))).toEqual([
      "request.payload.document",
    ]);
  });

  test("propagates read options paths through the serialized document wrapper", () => {
    const paths = issuePaths(() =>
      readSerializedGraphEditorDocument(
        {
          format: "@moritzbrantner/graph-editor/document",
          schemaVersion: 1,
          document: {
            nodes: [{ id: "node", label: "Node", x: 0, y: 0 }],
            edges: [
              {
                id: "edge",
                sourceNodeId: "node",
                sourcePortId: "out",
                targetNodeId: "missing",
                targetPortId: "in",
              },
            ],
          },
        },
        { path: "import.document" },
      ),
    );

    expect(paths).toEqual(["import.document.edges[0].targetNodeId"]);
  });

  test("supports JSONPath-style caller roots", () => {
    expect(
      issuePaths(() =>
        readGraphEditorDocument(
          {
            nodes: [{ id: "node", label: 42, x: 0, y: 0 }],
            edges: [],
          },
          "$.payload.document",
        ),
      ),
    ).toEqual(["$.payload.document.nodes[0].label"]);
  });
});
