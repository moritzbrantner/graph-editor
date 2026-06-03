import { describe, expect, test } from "vitest";

import {
  GraphCanvas,
  GraphNode,
  copyGraphEditorSelection,
  connectGraphEditorNodes,
  createGraphWorkbenchHistory,
  duplicateGraphEditorSelection,
  getGraphWorkbenchCommandFromKeyboardEvent,
  normalizeGraphEditorDocument,
  pasteGraphEditorClipboardPayload,
  pushGraphWorkbenchHistory,
  redoGraphWorkbenchHistory,
  undoGraphWorkbenchHistory,
  updateGraphEditorEdge,
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

  test("tracks bounded workbench history", () => {
    const first = { nodes: [], edges: [] };
    const second = {
      nodes: [{ id: "node-1", label: "Node 1", x: 0, y: 0 }],
      edges: [],
    };
    const third = {
      nodes: [
        { id: "node-1", label: "Node 1", x: 0, y: 0 },
        { id: "node-2", label: "Node 2", x: 240, y: 0 },
      ],
      edges: [],
    };

    const history = pushGraphWorkbenchHistory(
      pushGraphWorkbenchHistory(createGraphWorkbenchHistory(first), second, { maxHistory: 1 }),
      third,
      { maxHistory: 1 },
    );

    expect(history.past).toEqual([second]);
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);

    const undone = undoGraphWorkbenchHistory(history);
    expect(undone.present).toBe(second);
    expect(undone.canRedo).toBe(true);
    expect(redoGraphWorkbenchHistory(undone).present).toBe(third);
  });

  test("updates graph edges without replacing their identity", () => {
    const document = normalizeGraphEditorDocument({
      nodes: [
        {
          id: "source",
          label: "Source",
          x: 0,
          y: 0,
          outputs: [{ id: "out", label: "Out" }],
        },
        {
          id: "target",
          label: "Target",
          x: 240,
          y: 0,
          inputs: [{ id: "in", label: "In" }],
        },
      ],
      edges: [
        {
          id: "edge-1",
          sourceNodeId: "source",
          sourcePortId: "out",
          targetNodeId: "target",
          targetPortId: "in",
        },
      ],
    });

    const updated = updateGraphEditorEdge(document, "edge-1", {
      id: "ignored",
      status: "success",
      color: "#10b981",
      data: { inspected: true },
    });

    expect(updated.edges[0]).toMatchObject({
      id: "edge-1",
      sourceNodeId: "source",
      sourcePortId: "out",
      targetNodeId: "target",
      targetPortId: "in",
      status: "success",
      color: "#10b981",
      data: { inspected: true },
    });
  });

  test("copies, pastes, and duplicates selected subgraphs", () => {
    const document = normalizeGraphEditorDocument({
      nodes: [
        {
          id: "source",
          label: "Source",
          x: 0,
          y: 0,
          outputs: [{ id: "out", label: "Out" }],
        },
        {
          id: "target",
          label: "Target",
          x: 240,
          y: 0,
          inputs: [{ id: "in", label: "In" }],
        },
      ],
      edges: [
        {
          id: "edge-1",
          sourceNodeId: "source",
          sourcePortId: "out",
          targetNodeId: "target",
          targetPortId: "in",
        },
      ],
      groups: [{ id: "group-1", label: "Group", nodeIds: ["source", "target"] }],
    });
    const selection = {
      nodeIds: ["source", "target"],
      edgeIds: [],
      groupIds: ["group-1"],
    };

    const payload = copyGraphEditorSelection(document, selection);
    const pasted = pasteGraphEditorClipboardPayload(document, payload);

    expect(pasted.nodeIds).toHaveLength(2);
    expect(pasted.edgeIds).toHaveLength(1);
    expect(pasted.groupIds).toHaveLength(1);
    expect(new Set(pasted.nodeIds)).not.toContain("source");

    const duplicated = duplicateGraphEditorSelection(document, selection);
    expect(duplicated.document.nodes).toHaveLength(4);
    expect(duplicated.document.edges).toHaveLength(2);
  });

  test("repairs recoverable imported document shape", () => {
    const repaired = normalizeGraphEditorDocument(
      {
        nodes: [{ id: "only-node", label: "Only node", x: 0, y: 0 }],
        edges: [
          {
            id: "missing-target",
            sourceNodeId: "only-node",
            sourcePortId: "out",
            targetNodeId: "missing",
            targetPortId: "in",
          },
        ],
      },
      { mode: "repair" },
    );

    expect(repaired.nodes).toHaveLength(1);
    expect(repaired.edges).toHaveLength(0);
  });

  test("maps graph workbench keyboard shortcuts and ignores editable targets", () => {
    expect(
      getGraphWorkbenchCommandFromKeyboardEvent({
        key: "z",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        target: document.body,
      }),
    ).toBe("undo");
    expect(
      getGraphWorkbenchCommandFromKeyboardEvent({
        key: "z",
        ctrlKey: true,
        metaKey: false,
        shiftKey: true,
        altKey: false,
        target: document.body,
      }),
    ).toBe("redo");

    const input = document.createElement("input");
    expect(
      getGraphWorkbenchCommandFromKeyboardEvent({
        key: "c",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        target: input,
      }),
    ).toBeNull();
  });
});
