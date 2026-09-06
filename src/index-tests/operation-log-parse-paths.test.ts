import { describe, expect, test } from "vitest";

import { readGraphEditorOperationLog } from "@moritzbrantner/graph-editor";
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
  throw new Error("Expected graph operation log parsing to fail.");
}

const validAddNode = {
  id: "add-node",
  type: "graph.add-node",
  schemaVersion: 1,
  payload: {
    type: "graph.add-node",
    node: { id: "node", label: "Node", x: 0, y: 0 },
  },
};

describe("graph operation log parse diagnostic paths", () => {
  test("scopes per-operation schema version errors to the operation index", () => {
    const paths = issuePaths(() =>
      readGraphEditorOperationLog(
        {
          format: "@moritzbrantner/graph-editor/operations",
          schemaVersion: 1,
          operations: [
            validAddNode,
            {
              ...validAddNode,
              id: "wrong-version",
              schemaVersion: 2,
            },
          ],
        },
        { path: "request.log" },
      ),
    );

    expect(paths).toEqual(["request.log.operations.1.schemaVersion"]);
  });

  test("scopes non-replayable operation errors to the operation payload", () => {
    const paths = issuePaths(() =>
      readGraphEditorOperationLog(
        {
          format: "@moritzbrantner/graph-editor/operations",
          schemaVersion: 1,
          operations: [
            {
              id: "paste",
              type: "graph.paste",
              schemaVersion: 1,
              payload: { type: "graph.paste", unsupported: true },
            },
          ],
        },
        { path: "request.log" },
      ),
    );

    expect(paths).toEqual(["request.log.operations.0.payload"]);
  });

  test("keeps existing payload-shape errors under the same operation root", () => {
    const paths = issuePaths(() =>
      readGraphEditorOperationLog(
        {
          format: "@moritzbrantner/graph-editor/operations",
          schemaVersion: 1,
          operations: [
            {
              id: "bad-node",
              type: "graph.add-node",
              schemaVersion: 1,
              payload: {
                type: "graph.add-node",
                node: { id: "", label: "Node", x: 0, y: 0 },
              },
            },
          ],
        },
        { path: "$.request.log" },
      ),
    );

    expect(paths).toEqual(["$.request.log.operations.0.payload.node.id"]);
  });
});
