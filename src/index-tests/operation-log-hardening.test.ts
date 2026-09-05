import { describe, expect, test } from "vitest";

import {
  graphEditorOperationFromSerializedOperation,
  readGraphEditorOperationLog,
  type GraphEditorSerializedOperation,
} from "@moritzbrantner/graph-editor";

const operationLogEnvelope = (operation: unknown) => ({
  format: "@moritzbrantner/graph-editor/operations",
  operations: [operation],
  schemaVersion: 1,
});

describe("graph operation log hardening", () => {
  test("rejects unknown graph operation discriminators before replay", () => {
    const unknownOperation = {
      id: "unknown",
      type: "graph.unknown",
      schemaVersion: 1,
      payload: { type: "graph.unknown" },
    };

    expect(() => readGraphEditorOperationLog(operationLogEnvelope(unknownOperation))).toThrow(
      "Graph operation type is unsupported.",
    );
    expect(() =>
      graphEditorOperationFromSerializedOperation(
        unknownOperation as unknown as GraphEditorSerializedOperation,
      ),
    ).toThrow("Unsupported graph operation type.");
  });

  test("rejects array-shaped operation containers as non-objects", () => {
    expect(() => readGraphEditorOperationLog(operationLogEnvelope([]))).toThrow(
      "Graph operation must be an object.",
    );
  });
});
