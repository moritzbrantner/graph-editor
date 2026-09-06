import { describe, expect, test } from "vitest";

import { readGraphEditorOperationLog } from "@moritzbrantner/graph-editor";

function operationLog(type: "graph.add-node" | "graph.update-node", payload: unknown) {
  return {
    format: "@moritzbrantner/graph-editor/operations",
    operations: [
      {
        id: "operation",
        type,
        schemaVersion: 1,
        payload,
      },
    ],
    schemaVersion: 1,
  };
}

describe("serialized graph port identity", () => {
  test("rejects canonical duplicate output ports on add-node payloads", () => {
    expect(() =>
      readGraphEditorOperationLog(
        operationLog("graph.add-node", {
          type: "graph.add-node",
          node: {
            id: "node",
            label: "Node",
            x: 0,
            y: 0,
            outputs: [
              { id: " out ", label: "First" },
              { id: "out", label: "Duplicate" },
            ],
          },
        }),
      ),
    ).toThrow("Duplicate port id: out.");
  });

  test("rejects canonical duplicate input ports on update-node payloads", () => {
    expect(() =>
      readGraphEditorOperationLog(
        operationLog("graph.update-node", {
          type: "graph.update-node",
          nodeId: "node",
          patch: {
            inputs: [
              { id: " in ", label: "First" },
              { id: "in", label: "Duplicate" },
            ],
          },
        }),
      ),
    ).toThrow("Duplicate port id: in.");
  });

  test("keeps matching input and output ids valid because direction disambiguates them", () => {
    expect(
      readGraphEditorOperationLog(
        operationLog("graph.add-node", {
          type: "graph.add-node",
          node: {
            id: "node",
            label: "Node",
            x: 0,
            y: 0,
            inputs: [{ id: "shared", label: "Input" }],
            outputs: [{ id: "shared", label: "Output" }],
          },
        }),
      ),
    ).toHaveLength(1);
  });
});
