import { describe, expect, test } from "vitest";

import {
  GraphCanvas,
  GraphNode,
  connectGraphEditorNodes,
  normalizeGraphEditorDocument,
  validateGraphEditorConnection,
} from "@moritzbrantner/graph-editor";

describe("@moritzbrantner/graph-editor", () => {
  test("exposes React graph primitives", () => {
    expect(typeof GraphCanvas).toBe("function");
    expect(typeof GraphNode).toBe("function");
  });

  test("normalizes graph documents and validates structural connections", () => {
    const document = normalizeGraphEditorDocument({
      nodes: [
        {
          id: "source",
          label: "Source",
          x: 0,
          y: 0,
          outputs: [{ id: "out", label: "Out", kind: "value" }],
        },
        {
          id: "target",
          label: "Target",
          x: 240,
          y: 0,
          inputs: [{ id: "in", label: "In", kind: "value" }],
        },
      ],
      edges: [],
    });

    const connection = {
      sourceNodeId: "source",
      sourcePortId: "out",
      targetNodeId: "target",
      targetPortId: "in",
    };

    expect(validateGraphEditorConnection(document, connection)).toEqual({ valid: true });
    expect(connectGraphEditorNodes(document, connection).edges).toHaveLength(1);
  });
});
