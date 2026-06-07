import * as React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import {
  GraphCanvas,
  GraphWorkbench,
  GraphNode,
  applyGraphEditorOperation,
  copyGraphEditorSelection,
  connectGraphEditorNodes,
  createGraphEditorAddEdgeOperation,
  createGraphEditorAddNodeOperation,
  createGraphEditorCommands,
  createGraphEditorDuplicateSelectionOperation,
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
  graphEditorSelectionToEditorSelection,
  graphEditorDocumentAdapter,
  normalizeGraphEditorDocument,
  pasteGraphEditorClipboardPayload,
  redoGraphEditorRuntime,
  undoGraphEditorRuntime,
  updateGraphEditorEdge,
  validateGraphEditorConnection,
  validateGraphEditorDocument,
  type GraphEditorConnectionInput,
  type GraphEditorConnectionValidity,
  type GraphEditorDocument,
  type GraphEditorEdge,
  type GraphEditorNodeTemplate,
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
});

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
