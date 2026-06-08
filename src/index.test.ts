import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  GraphCanvas,
  GraphWorkbench,
  GraphNode,
  applyGraphEditorOperation,
  clearGraphEditorSelection,
  copyGraphEditorSelection,
  connectGraphEditorNodes,
  createGraphEditorAddEdgeOperation,
  createGraphEditorAddNodeOperation,
  createGraphEditorCommands,
  createGraphEditorDuplicateSelectionOperation,
  createGraphEditorGroup,
  createGraphEditorGraphAdapter,
  createGraphEditorMoveNodesOperation,
  createGraphEditorPasteOperation,
  createGraphEditorRuntime,
  createGraphEditorUpdateNodeOperation,
  createGraphEditorUpdateViewportOperation,
  duplicateGraphEditorSelection,
  editorSelectionToGraphEditorSelection,
  getGraphWorkbenchCommandFromKeyboardEvent,
  getGraphEditorCommandFromKeyboardEvent,
  getGraphEditorGroupBounds,
  getGraphEditorSelectionFromBounds,
  getGraphEditorNodeSize,
  graphEditorSelectionToEditorSelection,
  graphEditorDocumentAdapter,
  layoutGraphEditorDocument,
  markGraphEditorRuntimeSaved,
  normalizeGraphEditorDocument,
  normalizeGraphEditorBounds,
  pasteGraphEditorClipboardPayload,
  redoGraphEditorRuntime,
  setGraphEditorRuntimeSelection,
  undoGraphEditorRuntime,
  updateGraphEditorSelection,
  updateGraphEditorEdge,
  validateGraphEditorConnection,
  validateGraphEditorDocument,
  type GraphEditorConnectionInput,
  type GraphEditorConnectionValidity,
  type GraphEditorDocument,
  type GraphEditorEdge,
  type GraphEditorNodeTemplate,
  type GraphEditorSelectionState,
  type GraphWorkbenchController,
} from "@moritzbrantner/graph-editor";
import {
  createEditorEntitySelection,
  createEditorGraphIndexes,
  commitEditorSnapshotHistory,
  createEditorSnapshotHistory,
  getEditorSelectedEntityIds,
  redoEditorSnapshotHistory,
  serializeEditorDocument,
  undoEditorSnapshotHistory,
} from "@moritzbrantner/editor-core";
import { workbenchExamples } from "../examples/workbench/src/workbench-examples";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("@moritzbrantner/graph-editor", () => {
  test("exposes React graph primitives", () => {
    expect(typeof GraphCanvas).toBe("function");
    expect(typeof GraphNode).toBe("function");
  });

  test("selects multiple canvas nodes with modifier clicks", async () => {
    const selections: Array<{ nodeIds: string[]; edgeIds: string[] }> = [];

    function Harness() {
      const [selection, setSelection] = React.useState({
        nodeIds: [] as string[],
        edgeIds: [] as string[],
      });

      return React.createElement(GraphCanvas, {
        nodes: [
          { id: "source", label: "Source", x: 0, y: 0 },
          { id: "target", label: "Target", x: 260, y: 0 },
        ],
        edges: [],
        selectedNodeIds: selection.nodeIds,
        selectedEdgeIds: selection.edgeIds,
        showToolbar: false,
        showMiniMap: false,
        onSelectionStateChange(nextSelection) {
          selections.push({
            nodeIds: nextSelection.nodeIds,
            edgeIds: nextSelection.edgeIds,
          });
          setSelection({
            nodeIds: nextSelection.nodeIds,
            edgeIds: nextSelection.edgeIds,
          });
        },
      });
    }

    render(React.createElement(Harness));

    await act(async () => {
      fireEvent.mouseDown(screen.getByRole("button", { name: "Source" }), { button: 0 });
    });
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole("button", { name: "Target" }), {
        button: 0,
        shiftKey: true,
      });
    });

    expect(selections.at(-1)?.nodeIds).toEqual(["source", "target"]);
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

    const history = commitEditorSnapshotHistory(
      commitEditorSnapshotHistory(createEditorSnapshotHistory(first), second, { limit: 1 }),
      third,
      { limit: 1 },
    );

    expect(history.past).toEqual([second]);
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);

    const undone = undoEditorSnapshotHistory(history);
    expect(undone.present).toBe(second);
    expect(undone.canRedo).toBe(true);
    expect(redoEditorSnapshotHistory(undone).present).toBe(third);
  });

  test("applies graph operations through the headless runtime with undo and redo selection", () => {
    const runtime = createGraphEditorRuntime({
      initialDocument: { nodes: [], edges: [] },
      initialSelection: { nodeIds: ["missing"], edgeIds: [] },
    });

    const withNode = applyGraphEditorOperation(
      runtime,
      createGraphEditorAddNodeOperation({
        node: { id: "node-1", label: "Node 1", x: 0, y: 0 },
      }),
    );
    const updated = applyGraphEditorOperation(
      withNode,
      createGraphEditorUpdateNodeOperation("node-1", { id: "ignored", label: "Renamed" }),
    );
    const moved = applyGraphEditorOperation(
      updated,
      createGraphEditorMoveNodesOperation({ "node-1": { x: 32, y: 48 } }),
    );

    expect(runtime.selection).toEqual({ nodeIds: [], edgeIds: [] });
    expect(moved.document.nodes[0]).toMatchObject({ id: "node-1", label: "Renamed", x: 32, y: 48 });
    expect(moved.selection).toEqual({
      nodeIds: ["node-1"],
      edgeIds: [],
      primary: { type: "node", id: "node-1" },
    });
    expect(moved.canUndo).toBe(true);

    const undone = undoGraphEditorRuntime(moved);
    expect(undone.document.nodes[0]).toMatchObject({ id: "node-1", label: "Renamed", x: 0, y: 0 });
    expect(undone.selection).toEqual({
      nodeIds: ["node-1"],
      edgeIds: [],
      primary: { type: "node", id: "node-1" },
    });

    const redone = redoGraphEditorRuntime(undone);
    expect(redone.document.nodes[0]).toMatchObject({ x: 32, y: 48 });
  });

  test("blocks invalid graph operations without corrupting runtime document state", () => {
    const runtime = createGraphEditorRuntime({
      initialDocument: {
        nodes: [{ id: "source", label: "Source", x: 0, y: 0 }],
        edges: [],
      },
    });

    const next = applyGraphEditorOperation(
      runtime,
      createGraphEditorAddEdgeOperation({
        edge: {
          id: "invalid",
          sourceNodeId: "source",
          sourcePortId: "out",
          targetNodeId: "missing",
          targetPortId: "in",
        },
      }),
    );

    expect(next.document).toBe(runtime.document);
    expect(next.issues[0]?.message).toContain("target node is missing");
    expect(next.diagnostics).toEqual([]);
  });

  test("pastes and duplicates selections through operations with dynamic selection results", () => {
    const document = normalizeGraphEditorDocument({
      nodes: [
        { id: "source", label: "Source", x: 0, y: 0 },
        { id: "target", label: "Target", x: 240, y: 0 },
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
    const runtime = createGraphEditorRuntime({
      initialDocument: document,
      initialSelection: { nodeIds: ["source", "target"], edgeIds: [] },
    });
    const payload = copyGraphEditorSelection(document, runtime.selection, {
      copiedAt: "2026-06-06T00:00:00.000Z",
    });

    const pasted = applyGraphEditorOperation(runtime, createGraphEditorPasteOperation(payload));
    expect(pasted.document.nodes).toHaveLength(4);
    expect(pasted.selection.nodeIds).toEqual(["source-2", "target-2"]);

    const duplicated = applyGraphEditorOperation(
      runtime,
      createGraphEditorDuplicateSelectionOperation(runtime.selection),
    );
    expect(duplicated.document.edges).toHaveLength(2);
    expect(duplicated.selection.nodeIds).toEqual(["source-2", "target-2"]);
  });

  test("updates viewport without history when operation metadata disables history", () => {
    const runtime = createGraphEditorRuntime({
      initialDocument: { nodes: [], edges: [] },
    });

    const next = applyGraphEditorOperation(
      runtime,
      createGraphEditorUpdateViewportOperation({ x: 10, y: 20, zoom: 1.25 }, { history: false }),
    );

    expect(next.document.viewport).toEqual({ x: 10, y: 20, zoom: 1.25 });
    expect(next.canUndo).toBe(false);
  });

  test("tracks dirty state and keeps selection-only runtime changes out of history", () => {
    const runtime = createGraphEditorRuntime({
      initialDocument: {
        nodes: [{ id: "node-1", label: "Node 1", x: 0, y: 0 }],
        edges: [],
      },
      disableHistory: true,
    });
    const selected = setGraphEditorRuntimeSelection(runtime, {
      nodeIds: ["node-1"],
      edgeIds: [],
    });
    const updated = applyGraphEditorOperation(
      selected,
      createGraphEditorUpdateNodeOperation("node-1", { label: "Renamed" }),
    );
    const saved = markGraphEditorRuntimeSaved(updated);

    expect(selected.runtime.status).toBe("clean");
    expect(selected.canUndo).toBe(false);
    expect(updated.runtime.status).toBe("dirty");
    expect(updated.canUndo).toBe(false);
    expect(saved.runtime.status).toBe("clean");
    expect(saved.runtime.savedRevision).toBe(saved.runtime.revision);
  });

  test("treats stable-equivalent nested document data as unchanged in runtime history", () => {
    const runtime = createGraphEditorRuntime({
      initialDocument: {
        nodes: [
          {
            id: "node-1",
            label: "Node 1",
            x: 0,
            y: 0,
            data: { nested: { a: 1, b: 2 } },
          },
        ],
        edges: [],
      },
    });

    const updated = applyGraphEditorOperation(
      runtime,
      createGraphEditorUpdateNodeOperation("node-1", {
        data: { nested: { b: 2, a: 1 } },
      }),
    );

    expect(updated.runtime.revision).toBe(runtime.runtime.revision);
    expect(updated.runtime.history.past).toEqual([]);
    expect(updated.runtime.document).toBe(runtime.runtime.document);
  });

  test("resolves generic graph editor commands and shortcut events", async () => {
    const calls: string[] = [];
    const actions: Parameters<typeof createGraphEditorCommands>[0]["actions"] = {
      undo: () => {
        calls.push("undo");
      },
      redo: () => {
        calls.push("redo");
      },
      copy: () => {
        calls.push("copy");
      },
      paste: () => {
        calls.push("paste");
      },
      duplicate: () => {
        calls.push("duplicate");
      },
      delete: () => {
        calls.push("delete");
      },
      "select-all": () => {
        calls.push("select-all");
      },
      "fit-view": () => {
        calls.push("fit-view");
      },
      "auto-layout": () => {
        calls.push("auto-layout");
      },
      "export-json": () => {
        calls.push("export-json");
      },
      "import-json": () => {
        calls.push("import-json");
      },
      "group-selection": () => {
        calls.push("group-selection");
      },
      "ungroup-selection": () => {
        calls.push("ungroup-selection");
      },
    };
    const commands = createGraphEditorCommands({
      actions,
      context: {
        document: { nodes: [], edges: [] },
        selection: { nodeIds: ["node-1"], edgeIds: [] },
        readOnly: false,
        canUndo: true,
        canRedo: false,
        canPaste: true,
      },
    });

    expect(
      getGraphEditorCommandFromKeyboardEvent({
        key: "d",
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        target: document.body,
      }),
    ).toBe("duplicate");
    expect(commands.find((command) => command.id === "redo")?.disabled).toBe(true);
    await commands
      .find((command) => command.id === "duplicate")
      ?.run?.({
        altKey: false,
        ctrlKey: false,
        key: "",
        metaKey: false,
        shiftKey: false,
        target: document.body,
      });
    expect(calls).toEqual(["duplicate"]);
  });

  test("serializes graph documents through the editor-core adapter", () => {
    const document = normalizeGraphEditorDocument({
      nodes: [{ id: "node", label: "Node", x: 0, y: 0 }],
      edges: [],
    });

    const serialized = serializeEditorDocument(document, graphEditorDocumentAdapter, {
      exportedAt: false,
    });

    expect(serialized.format).toBe("@moritzbrantner/graph-editor/document");
    expect(serialized.schemaVersion).toBe(1);
    expect(serialized.document.nodes[0]?.id).toBe("node");
  });

  test("projects graph documents through the editor-core graph adapter", () => {
    const document = normalizeGraphEditorDocument({
      nodes: [
        {
          id: "source",
          label: "Source",
          kind: "workflow",
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

    const adapter = createGraphEditorGraphAdapter();
    const indexes = createEditorGraphIndexes(adapter.getEdges(document));

    expect(adapter.getNodes(document)[0]?.type).toBe("workflow");
    expect(adapter.getPorts?.(adapter.getNodes(document)[0]!)?.[0]).toMatchObject({
      id: "out",
      direction: "output",
    });
    expect(indexes.outgoingEdgesByNodeId.get("source")?.[0]).toMatchObject({
      id: "edge-1",
      sourceId: "source",
      targetId: "target",
      properties: document.edges[0],
    });
  });

  test("converts graph selections to editor-core entity selections", () => {
    const document = normalizeGraphEditorDocument({
      nodes: [
        { id: "source", label: "Source", x: 0, y: 0 },
        { id: "target", label: "Target", x: 240, y: 0 },
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

    const editorSelection = graphEditorSelectionToEditorSelection({
      nodeIds: ["source"],
      edgeIds: ["edge-1"],
      groupIds: ["group-1"],
    });
    const graphSelection = editorSelectionToGraphEditorSelection(
      document,
      createEditorEntitySelection(["missing", "edge-1", "target"], "edge-1"),
    );

    expect(getEditorSelectedEntityIds(editorSelection)).toEqual(["source", "edge-1", "group-1"]);
    expect(graphSelection).toEqual({
      nodeIds: ["target"],
      edgeIds: ["edge-1"],
      primary: { type: "edge", id: "edge-1" },
    });
  });

  test("updates graph selections by replacing, extending, toggling, and marquee bounds", () => {
    const document = normalizeGraphEditorDocument({
      nodes: [
        { id: "source", label: "Source", x: 0, y: 0 },
        { id: "target", label: "Target", x: 240, y: 0 },
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

    const selectedSource = updateGraphEditorSelection(
      document,
      clearGraphEditorSelection(),
      { type: "node", id: "source" },
      "replace",
    );
    const extended = updateGraphEditorSelection(
      document,
      selectedSource,
      { type: "node", id: "target" },
      "extend",
    );
    const toggled = updateGraphEditorSelection(
      document,
      extended,
      { type: "node", id: "source" },
      "toggle",
    );
    const marquee = getGraphEditorSelectionFromBounds(
      document,
      normalizeGraphEditorBounds({ x: -8, y: -8, width: 130, height: 80 }),
      [
        { type: "node", id: "source", bounds: { x: 0, y: 0, width: 120, height: 64 } },
        { type: "node", id: "target", bounds: { x: 240, y: 0, width: 120, height: 64 } },
      ],
    );

    expect(selectedSource.nodeIds).toEqual(["source"]);
    expect(extended.nodeIds).toEqual(["source", "target"]);
    expect(toggled.nodeIds).toEqual(["target"]);
    expect(marquee.nodeIds).toEqual(["source"]);
  });

  test("calculates graph group bounds from visible node boxes", () => {
    const document = normalizeGraphEditorDocument({
      nodes: [
        { id: "source", label: "Source", x: 0, y: 0 },
        { id: "target", label: "Target", x: 240, y: 96 },
        { id: "hidden", label: "Hidden", x: 800, y: 800 },
      ],
      edges: [],
      groups: [{ id: "group-1", label: "Group", nodeIds: ["source", "target", "hidden"] }],
    });

    const [group] = getGraphEditorGroupBounds(
      document,
      (node) => ({ x: node.x, y: node.y, width: 100, height: 50 }),
      { padding: 10, hiddenNodeIds: ["hidden"] },
    );

    expect(group).toEqual({
      groupId: "group-1",
      nodeIds: ["source", "target"],
      bounds: { x: -10, y: -10, width: 360, height: 166 },
    });
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

  test("preserves unique group and edge id suffix behavior", () => {
    const grouped = createGraphEditorGroup(
      {
        nodes: [
          { id: "source", label: "Source", x: 0, y: 0 },
          { id: "target", label: "Target", x: 240, y: 0 },
        ],
        edges: [],
        groups: [{ id: "group", label: "Group", nodeIds: ["source"] }],
      },
      { nodeIds: ["target"] },
    );
    expect(grouped.groups?.map((group) => group.id)).toEqual(["group", "group-2"]);

    const edgeBase = "source:out->target:in";
    const runtime = createGraphEditorRuntime({
      initialDocument: {
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
            id: edgeBase,
            sourceNodeId: "source",
            sourcePortId: "out",
            targetNodeId: "target",
            targetPortId: "in",
          },
        ],
      },
    });
    const next = applyGraphEditorOperation(
      runtime,
      createGraphEditorAddEdgeOperation({
        connection: {
          sourceNodeId: "source",
          sourcePortId: "out",
          targetNodeId: "target",
          targetPortId: "in",
        },
        validationOptions: {
          allowDuplicateEdges: true,
          allowOccupiedInputs: true,
        },
      }),
    );

    expect(next.document.edges.map((edge) => edge.id)).toEqual([edgeBase, `${edgeBase}-2`]);
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

  test("validates declared edge ports while preserving loose portless documents", () => {
    const looseDocument = {
      nodes: [
        { id: "source", label: "Source", x: 0, y: 0 },
        { id: "target", label: "Target", x: 240, y: 0 },
      ],
      edges: [
        {
          id: "loose-edge",
          sourceNodeId: "source",
          sourcePortId: "anything",
          targetNodeId: "target",
          targetPortId: "anything",
        },
      ],
    };
    const declaredDocument = {
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
          id: "missing-port",
          sourceNodeId: "source",
          sourcePortId: "missing",
          targetNodeId: "target",
          targetPortId: "missing",
        },
      ],
    };

    expect(validateGraphEditorDocument(looseDocument)).toEqual([]);
    expect(
      validateGraphEditorDocument(declaredDocument).map((diagnostic) => diagnostic.code),
    ).toEqual(["missing-edge-port", "missing-edge-port"]);
    expect(
      validateGraphEditorDocument(declaredDocument, { allowMissingDeclaredPorts: true }),
    ).toEqual([]);
    expect(
      normalizeGraphEditorDocument(declaredDocument as GraphEditorDocument, { mode: "repair" })
        .edges,
    ).toEqual([]);
  });

  test("reports duplicate group ids and duplicate group nodes", () => {
    const diagnostics = validateGraphEditorDocument({
      nodes: [{ id: "node-1", label: "Node 1", x: 0, y: 0 }],
      edges: [],
      groups: [
        { id: "group-1", label: "Group", nodeIds: ["node-1", "node-1"] },
        { id: "group-1", label: "Duplicate", nodeIds: ["node-1"] },
      ],
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "duplicate-group-node",
      "duplicate-group-id",
    ]);
  });

  test("validates self edges and cycles with document validation options", () => {
    const selfEdgeDocument = {
      nodes: [
        {
          id: "node-1",
          label: "Node 1",
          x: 0,
          y: 0,
          inputs: [{ id: "in", label: "In" }],
          outputs: [{ id: "out", label: "Out" }],
        },
      ],
      edges: [
        {
          id: "self",
          sourceNodeId: "node-1",
          sourcePortId: "out",
          targetNodeId: "node-1",
          targetPortId: "in",
        },
      ],
    };
    const cycleDocument = {
      nodes: [
        {
          id: "a",
          label: "A",
          x: 0,
          y: 0,
          inputs: [{ id: "in", label: "In" }],
          outputs: [{ id: "out", label: "Out" }],
        },
        {
          id: "b",
          label: "B",
          x: 240,
          y: 0,
          inputs: [{ id: "in", label: "In" }],
          outputs: [{ id: "out", label: "Out" }],
        },
      ],
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

    expect(
      validateGraphEditorDocument(selfEdgeDocument).map((diagnostic) => diagnostic.code),
    ).toContain("self-edge");
    expect(
      validateGraphEditorDocument(selfEdgeDocument, { allowCycles: true, allowSelfEdges: true }),
    ).toEqual([]);
    expect(
      validateGraphEditorDocument(cycleDocument).map((diagnostic) => diagnostic.code),
    ).toContain("cycle");
    expect(validateGraphEditorDocument(cycleDocument, { allowCycles: true })).toEqual([]);
  });

  test("lays out documents with headless node metrics", () => {
    const document = normalizeGraphEditorDocument({
      nodes: [
        {
          id: "source",
          label: "Source",
          x: 100,
          y: 100,
          outputs: [{ id: "out", label: "Out" }],
        },
        {
          id: "target",
          label: "Target",
          x: 120,
          y: 140,
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

    const size = getGraphEditorNodeSize(document.nodes[0]!);
    const layout = layoutGraphEditorDocument(document);

    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
    expect(layout.changedNodeIds.length).toBeGreaterThan(0);
    expect(layout.cycles).toEqual([]);
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

  test("validates cycle connections according to connection options", () => {
    const document = normalizeGraphEditorDocument({
      nodes: [
        {
          id: "source",
          label: "Source",
          x: 0,
          y: 0,
          inputs: [{ id: "in", label: "In" }],
          outputs: [{ id: "out", label: "Out" }],
        },
        {
          id: "target",
          label: "Target",
          x: 240,
          y: 0,
          inputs: [{ id: "in", label: "In" }],
          outputs: [{ id: "out", label: "Out" }],
        },
      ],
      edges: [
        {
          id: "source-target",
          sourceNodeId: "source",
          sourcePortId: "out",
          targetNodeId: "target",
          targetPortId: "in",
        },
      ],
    });
    const cycleConnection = {
      sourceNodeId: "target",
      sourcePortId: "out",
      targetNodeId: "source",
      targetPortId: "in",
    };

    expect(validateGraphEditorConnection(document, cycleConnection)).toEqual({
      valid: false,
      reason: "cycle",
    });
    expect(validateGraphEditorConnection(document, cycleConnection, { allowCycles: true })).toEqual(
      {
        valid: true,
      },
    );
  });

  test("supports custom port compatibility checks", () => {
    const document = normalizeGraphEditorDocument({
      nodes: [
        {
          id: "source",
          label: "Source",
          x: 0,
          y: 0,
          outputs: [{ id: "out", label: "Out", type: "payload" }],
        },
        {
          id: "target",
          label: "Target",
          x: 240,
          y: 0,
          inputs: [{ id: "in", label: "In", type: "payload" }],
        },
      ],
      edges: [],
    });

    expect(
      validateGraphEditorConnection(
        document,
        {
          sourceNodeId: "source",
          sourcePortId: "out",
          targetNodeId: "target",
          targetPortId: "in",
        },
        { arePortsCompatible: () => false },
      ),
    ).toEqual({ valid: false, reason: "type-mismatch" });
  });

  test("appends and connects a compatible template node", async () => {
    const { controller, getDocument } = renderWorkbenchHarness({
      initialDocument: appendSourceDocument,
      templates: [appendPayloadTemplate],
    });

    await act(async () => {
      controller.current?.actions.appendTemplateNode(undefined, "source");
    });

    expect(getDocument().nodes).toHaveLength(2);
    expect(getDocument().edges).toHaveLength(1);
    expect(getDocument().edges[0]).toMatchObject({
      sourceNodeId: "source",
      sourcePortId: "out",
      targetNodeId: "transform-template",
      targetPortId: "in",
    });
  });

  test("uses custom workbench edge creation during append", async () => {
    const { controller, getDocument } = renderWorkbenchHarness({
      initialDocument: appendSourceDocument,
      templates: [appendPayloadTemplate],
      createEdge(connection) {
        return {
          id: "custom-edge",
          ...connection,
          data: { label: "custom" },
        };
      },
    });

    await act(async () => {
      controller.current?.actions.appendTemplateNode(undefined, "source");
    });

    expect(getDocument().edges[0]).toMatchObject({
      id: "custom-edge",
      sourceNodeId: "source",
      sourcePortId: "out",
      targetNodeId: "transform-template",
      targetPortId: "in",
      data: { label: "custom" },
    });
  });

  test("does not append a template node when no compatible input exists", async () => {
    const { controller, getDocument } = renderWorkbenchHarness({
      initialDocument: appendSourceDocument,
      templates: [appendMetricTemplate],
    });

    await act(async () => {
      controller.current?.actions.appendTemplateNode(undefined, "source");
    });

    expect(getDocument().nodes).toHaveLength(1);
    expect(getDocument().edges).toHaveLength(0);
  });

  test("copies and pastes through clipboard fallback when clipboard permissions fail", async () => {
    const clipboard = {
      readText: vi.fn(async () => {
        throw new Error("clipboard denied");
      }),
      writeText: vi.fn(async () => {
        throw new Error("clipboard denied");
      }),
    };
    vi.stubGlobal("navigator", { clipboard });
    const { controller, getDocument } = renderClipboardWorkbench();

    await act(async () => {
      await controller.current?.actions.copySelection();
      await controller.current?.actions.pasteSelection();
    });

    expect(clipboard.writeText).toHaveBeenCalledOnce();
    expect(clipboard.readText).toHaveBeenCalledOnce();
    expect(getDocument().nodes.map((node) => node.id)).toEqual(["source", "source-2"]);
  });

  test("pastes from in-memory payload when clipboard JSON is invalid", async () => {
    const clipboard = {
      readText: vi.fn(async () => "{"),
      writeText: vi.fn(async () => undefined),
    };
    vi.stubGlobal("navigator", { clipboard });
    const { controller, getDocument } = renderClipboardWorkbench();

    await act(async () => {
      await controller.current?.actions.copySelection();
      await controller.current?.actions.pasteSelection();
    });

    expect(getDocument().nodes.map((node) => node.id)).toEqual(["source", "source-2"]);
  });

  test("runs workbench hotkeys from the scoped body and ignores editable targets", async () => {
    const { getDocument } = renderClipboardWorkbench({
      renderToolbarContent: React.createElement("input", { "aria-label": "Hotkey input" }),
    });

    await act(async () => {
      fireEvent.keyDown(document, { ctrlKey: true, key: "d" });
    });
    expect(getDocument().nodes.map((node) => node.id)).toEqual(["source", "source-2"]);

    const input = screen.getByLabelText("Hotkey input");
    input.focus();
    await act(async () => {
      fireEvent.keyDown(input, { key: "Delete" });
    });

    expect(getDocument().nodes.map((node) => node.id)).toEqual(["source", "source-2"]);
  });

  test("clears workbench selection with Escape", async () => {
    const selections: GraphEditorSelectionState[] = [];
    const { getWorkbench } = renderClipboardWorkbench({
      onSelectionStateChange(selection) {
        selections.push(selection);
      },
    });

    await act(async () => {
      fireEvent.keyDown(getWorkbench(), { key: "Escape" });
    });

    expect(selections.at(-1)).toEqual({ nodeIds: [], edgeIds: [] });
  });

  test("passes custom clipboard payloads to custom paste handlers", async () => {
    vi.stubGlobal("navigator", {});
    const customPayload = { kind: "custom" };
    const pasteClipboardPayload = vi.fn((document: ClipboardWorkbenchDocument) => ({
      document: {
        ...document,
        nodes: [...document.nodes, { id: "custom-node", label: "Custom", x: 48, y: 48 }],
      },
      edgeIds: [],
      nodeIds: ["custom-node"],
    }));
    const { controller, getDocument } = renderClipboardWorkbench({
      copySelection: () => customPayload,
      pasteClipboardPayload,
    });

    await act(async () => {
      await controller.current?.actions.copySelection();
      await controller.current?.actions.pasteSelection();
    });

    expect(pasteClipboardPayload).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining(customPayload),
    );
    expect(getDocument().nodes.map((node) => node.id)).toEqual(["source", "custom-node"]);
  });

  test("supports controlled GraphWorkbench runtime updates", async () => {
    const controller: {
      current: GraphWorkbenchController<AppendNodeData, AppendEdgeData, AppendPortType> | null;
    } = { current: null };
    let latestRuntime = createGraphEditorRuntime<AppendNodeData, AppendEdgeData, AppendPortType>({
      initialDocument: { nodes: [], edges: [] },
    });

    function Harness() {
      const [runtime, setRuntime] = React.useState(latestRuntime);

      return React.createElement(GraphWorkbench<AppendNodeData, AppendEdgeData, AppendPortType>, {
        runtime,
        nodeTemplates: [appendPayloadTemplate],
        onRuntimeChange(nextRuntime) {
          latestRuntime = nextRuntime;
          setRuntime(nextRuntime);
        },
        renderToolbar(nextController) {
          controller.current = nextController;
          return null;
        },
        renderPalette: () => null,
        renderInspector: () => null,
        renderContextPad: () => null,
      });
    }

    render(React.createElement(Harness));

    await act(async () => {
      controller.current?.actions.addTemplateNode(appendPayloadTemplate, { x: 40, y: 50 });
    });

    expect(latestRuntime.document.nodes[0]).toMatchObject({
      id: "transform-template",
      x: 40,
      y: 50,
    });
    expect(latestRuntime.canUndo).toBe(true);
    expect(latestRuntime.selection.primary).toEqual({
      type: "node",
      id: "transform-template",
    });
  });

  test("ships valid workbench example graph fixtures", () => {
    for (const example of workbenchExamples) {
      const nodeIds = example.document.nodes.map((node) => node.id);
      const edgeIds = example.document.edges.map((edge) => edge.id);

      expect(example.nodeTemplates.length, example.id).toBeGreaterThan(0);
      expect(new Set(nodeIds).size, example.id).toBe(nodeIds.length);
      expect(new Set(edgeIds).size, example.id).toBe(edgeIds.length);
      expect(validateGraphEditorDocument(example.document), example.id).toEqual([]);
    }
  });
});

type AppendPortType = "payload" | "metric";
type AppendNodeData = Record<string, never>;
type AppendEdgeData = { label?: string };

const appendSourceDocument: GraphEditorDocument<AppendNodeData, AppendEdgeData, AppendPortType> = {
  nodes: [
    {
      id: "source",
      label: "Source",
      x: 0,
      y: 0,
      outputs: [{ id: "out", label: "Out", type: "payload" }],
    },
  ],
  edges: [],
};

const appendPayloadTemplate: GraphEditorNodeTemplate<AppendNodeData, AppendPortType> = {
  id: "transform-template",
  label: "Transform",
  inputs: [{ id: "in", label: "In", type: "payload" }],
  outputs: [{ id: "out", label: "Out", type: "payload" }],
};

const appendMetricTemplate: GraphEditorNodeTemplate<AppendNodeData, AppendPortType> = {
  id: "metric-template",
  label: "Metric",
  inputs: [{ id: "in", label: "In", type: "metric" }],
};

function renderWorkbenchHarness({
  initialDocument,
  templates,
  createEdge,
}: {
  initialDocument: GraphEditorDocument<AppendNodeData, AppendEdgeData, AppendPortType>;
  templates: Array<GraphEditorNodeTemplate<AppendNodeData, AppendPortType>>;
  createEdge?: (
    connection: GraphEditorConnectionInput,
    context: {
      document: GraphEditorDocument<AppendNodeData, AppendEdgeData, AppendPortType>;
      validity: GraphEditorConnectionValidity;
    },
  ) => GraphEditorEdge<AppendEdgeData>;
}) {
  const controller: {
    current: GraphWorkbenchController<AppendNodeData, AppendEdgeData, AppendPortType> | null;
  } = { current: null };
  let latestDocument = initialDocument;

  function Harness() {
    const [document, setDocument] = React.useState(initialDocument);

    return React.createElement(GraphWorkbench<AppendNodeData, AppendEdgeData, AppendPortType>, {
      document,
      nodeTemplates: templates,
      createEdge,
      onDocumentChange(nextDocument) {
        latestDocument = nextDocument;
        setDocument(nextDocument);
      },
      renderToolbar: () => null,
      renderPalette: () => null,
      renderInspector: () => null,
      renderContextPad(nextController) {
        controller.current = nextController;
        return null;
      },
    });
  }

  render(React.createElement(Harness));

  return {
    controller,
    getDocument: () => latestDocument,
  };
}

function renderClipboardWorkbench({
  copySelection,
  onSelectionStateChange,
  pasteClipboardPayload,
  renderToolbarContent,
}: {
  copySelection?: (
    document: ClipboardWorkbenchDocument,
    selection: GraphEditorSelectionState,
  ) => unknown;
  onSelectionStateChange?: (selection: GraphEditorSelectionState) => void;
  pasteClipboardPayload?: (
    document: ClipboardWorkbenchDocument,
    payload: unknown,
  ) => {
    document: ClipboardWorkbenchDocument;
    nodeIds: string[];
    edgeIds: string[];
    groupIds?: string[];
  };
  renderToolbarContent?: React.ReactNode;
} = {}) {
  const controller: { current: GraphWorkbenchController<ClipboardNodeData> | null } = {
    current: null,
  };
  const initialDocument: ClipboardWorkbenchDocument = {
    nodes: [{ id: "source", label: "Source", x: 0, y: 0 }],
    edges: [],
  };
  let latestDocument = initialDocument;

  function Harness() {
    const [document, setDocument] = React.useState(initialDocument);

    return React.createElement(GraphWorkbench<ClipboardNodeData>, {
      copySelection,
      document,
      initialSelection: { nodeIds: ["source"], edgeIds: [] },
      nodeTemplates: [],
      onDocumentChange(nextDocument) {
        latestDocument = nextDocument;
        setDocument(nextDocument);
      },
      onSelectionStateChange,
      pasteClipboardPayload,
      className: "clipboard-workbench",
      renderContextPad: () => null,
      renderInspector: () => null,
      renderPalette: () => null,
      renderToolbar(nextController) {
        controller.current = nextController;
        return renderToolbarContent;
      },
    });
  }

  const fixture = render(
    React.createElement(
      "div",
      { "data-testid": "clipboard-workbench" },
      React.createElement(Harness),
    ),
  );

  return {
    controller,
    getDocument: () => latestDocument,
    getWorkbench: () =>
      fixture.container.querySelector<HTMLElement>('[data-slot="graph-workbench"]')!,
  };
}

type ClipboardNodeData = Record<string, unknown>;
type ClipboardWorkbenchDocument = GraphEditorDocument<ClipboardNodeData>;
