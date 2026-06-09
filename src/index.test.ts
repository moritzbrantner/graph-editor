import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  GraphCanvas,
  GraphCanvasToolbar,
  GraphWorkbench,
  GraphWorkbenchContextPad,
  GraphNode,
  InspectorPanel,
  applyGraphEditorOperation,
  applyGraphEditorDocumentPatch,
  beginGraphEditorMoveInteraction,
  cancelGraphEditorInteraction,
  clearGraphEditorSelection,
  commitGraphEditorInteraction,
  commitGraphEditorInteractionOperation,
  createGraphEditorInteractionSession,
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
  createGraphEditorPatchOperation,
  createGraphEditorPluginRegistry,
  createGraphEditorMemoryStorage,
  createGraphEditorReplaceDocumentOperation,
  createGraphEditorRuntime,
  createGraphEditorUpdateNodeOperation,
  createGraphEditorUpdateViewportOperation,
  diffGraphEditorDocuments,
  duplicateGraphEditorSelection,
  editorSelectionToGraphEditorSelection,
  graphEditorOperationFromSerializedOperation,
  graphEditorOperationLogAdapter,
  createGraphEditorLocalStorage,
  getGraphEditorPluginDiagnostics,
  getGraphWorkbenchCommandFromKeyboardEvent,
  getGraphEditorCommandFromKeyboardEvent,
  getGraphEditorGroupBounds,
  getGraphEditorSelectionFromBounds,
  getGraphEditorNodeSize,
  graphEditorSelectionToEditorSelection,
  graphEditorDocumentAdapter,
  invertGraphEditorDocumentPatch,
  isGraphEditorDocumentPatchEmpty,
  layoutGraphEditorDocument,
  loadGraphEditorRuntimePersistence,
  markGraphEditorRuntimeSaved,
  normalizeGraphEditorDocument,
  normalizeGraphEditorBounds,
  pasteGraphEditorClipboardPayload,
  parseGraphEditorDocumentJson,
  previewGraphEditorMoveInteraction,
  redoGraphEditorRuntime,
  readGraphEditorOperationLog,
  readSerializedGraphEditorDocument,
  resolveGraphEditorPluginCommands,
  saveGraphEditorRuntimePersistence,
  serializeGraphEditorDocument,
  serializeGraphEditorOperation,
  serializeGraphEditorOperationLog,
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
  type GraphCanvasMiniMapProps,
  type GraphCanvasNodeData,
  type GraphCanvasNodeProps,
  type GraphCanvasToolbarProps,
  type GraphWorkbenchActionError,
  type InspectorActionsProps,
  type InspectorFieldGroupProps,
  type InspectorFieldOption,
  type InspectorFieldProps,
  type InspectorPanelHeaderProps,
  type InspectorPanelSectionData,
  type InspectorPanelSectionProps,
  type GraphWorkbenchController,
  type GraphEditorPlugin,
  type GraphEditorSerializedOperation,
} from "@moritzbrantner/graph-editor";
import {
  commitEditorSnapshotHistory,
  createEditorSnapshotHistory,
  redoEditorSnapshotHistory,
  undoEditorSnapshotHistory,
} from "@moritzbrantner/editor-core/history";
import { createEditorGraphIndexes } from "@moritzbrantner/editor-core/indexes";
import {
  EditorJsonParseError,
  serializeEditorDocument,
} from "@moritzbrantner/editor-core/serialization";
import {
  createEditorEntitySelection,
  getEditorSelectedEntityIds,
} from "@moritzbrantner/editor-core/selection";
import {
  assertEditorDocumentAdapter,
  assertEditorOperationLogAdapter,
} from "@moritzbrantner/editor-core/testing";
import { workbenchExamples } from "../examples/workbench/src/workbench-examples";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

type PublicReactTypeSurface = {
  actionError: GraphWorkbenchActionError;
  canvasMiniMapProps: GraphCanvasMiniMapProps;
  canvasNodeProps: GraphCanvasNodeProps;
  canvasToolbarProps: GraphCanvasToolbarProps;
  inspectorActionsProps: InspectorActionsProps;
  inspectorFieldGroupProps: InspectorFieldGroupProps;
  inspectorFieldOption: InspectorFieldOption;
  inspectorFieldProps: InspectorFieldProps;
  inspectorPanelHeaderProps: InspectorPanelHeaderProps;
  inspectorPanelSectionData: InspectorPanelSectionData;
  inspectorPanelSectionProps: InspectorPanelSectionProps;
};

void (null as PublicReactTypeSurface | null);

describe("@moritzbrantner/graph-editor", () => {
  test("exposes React graph primitives", () => {
    expect(typeof GraphCanvas).toBe("function");
    expect(typeof GraphCanvasToolbar).toBe("function");
    expect(typeof GraphNode).toBe("function");
    expect(typeof GraphWorkbenchContextPad).toBe("function");
    expect(typeof InspectorPanel).toBe("function");
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

  test("navigates canvas nodes with arrows and nudges selected nodes", async () => {
    const selections: GraphEditorSelectionState[] = [];
    let latestNodes: GraphCanvasNodeData[] = [];
    let changeEndCount = 0;

    function Harness() {
      const [nodes, setNodes] = React.useState([
        { id: "source", label: "Source", x: 0, y: 0 },
        { id: "target", label: "Target", x: 260, y: 0 },
        { id: "lower", label: "Lower", x: 260, y: 240 },
      ]);
      const [selection, setSelection] = React.useState<GraphEditorSelectionState>({
        nodeIds: [],
        edgeIds: [],
      });
      latestNodes = nodes;

      return React.createElement(GraphCanvas, {
        nodes,
        edges: [],
        selectedNodeIds: selection.nodeIds,
        selectedEdgeIds: selection.edgeIds,
        showToolbar: false,
        showMiniMap: false,
        onNodesChange(nextNodes) {
          latestNodes = nextNodes;
          setNodes(nextNodes);
        },
        onNodesChangeEnd(nextNodes) {
          latestNodes = nextNodes;
          changeEndCount += 1;
        },
        onSelectionStateChange(nextSelection) {
          selections.push(nextSelection);
          setSelection(nextSelection);
        },
      });
    }

    const fixture = render(React.createElement(Harness));
    const canvas = fixture.container.querySelector<HTMLElement>('[data-slot="workflow-builder"]')!;

    await act(async () => {
      fireEvent.keyDown(canvas, { key: "ArrowRight" });
    });
    expect(selections.at(-1)?.nodeIds).toEqual(["source"]);

    await act(async () => {
      fireEvent.keyDown(canvas, { key: "ArrowRight" });
    });
    expect(selections.at(-1)?.nodeIds).toEqual(["target"]);

    await act(async () => {
      fireEvent.keyDown(canvas, { key: "ArrowDown" });
    });
    expect(selections.at(-1)?.nodeIds).toEqual(["lower"]);

    await act(async () => {
      fireEvent.keyDown(canvas, { key: "ArrowRight", shiftKey: true });
    });
    expect(latestNodes.find((node) => node.id === "lower")).toMatchObject({ x: 270, y: 240 });
    expect(changeEndCount).toBe(1);

    await act(async () => {
      fireEvent.keyDown(canvas, { altKey: true, key: "ArrowLeft", shiftKey: true });
    });
    expect(latestNodes.find((node) => node.id === "lower")).toMatchObject({ x: 269, y: 240 });
    expect(changeEndCount).toBe(2);
  });

  test("does not nudge canvas nodes in read-only mode", async () => {
    let latestNodes: GraphCanvasNodeData[] = [{ id: "source", label: "Source", x: 0, y: 0 }];

    function Harness() {
      const [nodes, setNodes] = React.useState(latestNodes);
      latestNodes = nodes;

      return React.createElement(GraphCanvas, {
        nodes,
        edges: [],
        selectedNodeIds: ["source"],
        selectedEdgeIds: [],
        readOnly: true,
        showToolbar: false,
        showMiniMap: false,
        onNodesChange(nextNodes) {
          latestNodes = nextNodes;
          setNodes(nextNodes);
        },
      });
    }

    const fixture = render(React.createElement(Harness));
    const canvas = fixture.container.querySelector<HTMLElement>('[data-slot="workflow-builder"]')!;

    await act(async () => {
      fireEvent.keyDown(canvas, { key: "ArrowRight", shiftKey: true });
    });

    expect(latestNodes[0]).toMatchObject({ x: 0, y: 0 });
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

  test("passes editor-core document adapter contract checks", () => {
    assertEditorDocumentAdapter(graphEditorDocumentAdapter, [
      {
        id: "current-envelope",
        input: {
          format: "@moritzbrantner/graph-editor/document",
          schemaVersion: 1,
          document: {
            nodes: [{ id: "node", label: "Node", x: 0, y: 0 }],
            edges: [],
          },
        },
        expected: {
          nodes: [{ id: "node", label: "Node", x: 0, y: 0 }],
          edges: [],
        },
        roundtrip: true,
      },
    ]);
  });

  test("wraps editor-core graph document serialization helpers", () => {
    const document = normalizeGraphEditorDocument({
      nodes: [{ id: "node", label: "Node", x: 0, y: 0 }],
      edges: [],
    });
    const serialized = serializeGraphEditorDocument(document, { exportedAt: false });

    expect(serialized).toMatchObject({
      format: "@moritzbrantner/graph-editor/document",
      schemaVersion: 1,
    });
    expect(readSerializedGraphEditorDocument(serialized)).toEqual(document);
    expect(() =>
      readSerializedGraphEditorDocument({
        ...serialized,
        format: "wrong",
      }),
    ).toThrow();

    const migrated = readSerializedGraphEditorDocument(
      {
        ...serialized,
        schemaVersion: 0,
      },
      {
        migrations: {
          0: (input) => ({ ...input, schemaVersion: 1 }),
        },
      },
    );
    expect(migrated).toEqual(document);
  });

  test("parses graph document JSON and preserves serialized envelope options", () => {
    const document = normalizeGraphEditorDocument({
      nodes: [{ id: "node", label: "Node", x: 0, y: 0 }],
      edges: [],
    });
    const serialized = serializeGraphEditorDocument(document, {
      exportedAt: new Date("2026-06-09T00:00:00.000Z"),
      metadata: { source: "test" },
    });

    expect(parseGraphEditorDocumentJson(JSON.stringify(serialized))).toEqual(document);
    expect(serialized.exportedAt).toBe("2026-06-09T00:00:00.000Z");
    expect(serialized.metadata).toEqual({ source: "test" });
    expect("exportedAt" in serializeGraphEditorDocument(document, { exportedAt: false })).toBe(
      false,
    );
    expect(() => parseGraphEditorDocumentJson("{")).toThrow(EditorJsonParseError);
    expect(() =>
      readSerializedGraphEditorDocument(
        { ...serialized, schemaVersion: 0 },
        {
          migrations: {
            0: (input) => ({ ...input, schemaVersion: 99 }),
          },
        },
      ),
    ).toThrow("Unsupported @moritzbrantner/graph-editor/document schema version 99.");
  });

  test("diffs, applies, inverts, and applies graph document patches through operations", () => {
    const before = normalizeGraphEditorDocument({
      nodes: [{ id: "node", label: "Node", x: 0, y: 0 }],
      edges: [],
    });
    const after = normalizeGraphEditorDocument({
      nodes: [{ id: "node", label: "Renamed", x: 20, y: 0 }],
      edges: [],
    });
    const patch = diffGraphEditorDocuments(before, after, { includeOldValues: true });

    expect(isGraphEditorDocumentPatchEmpty(patch)).toBe(false);
    expect(applyGraphEditorDocumentPatch(before, patch)).toEqual(after);
    expect(applyGraphEditorDocumentPatch(after, invertGraphEditorDocumentPatch(patch))).toEqual(
      before,
    );

    const runtime = createGraphEditorRuntime({ initialDocument: before });
    const patched = applyGraphEditorOperation(runtime, createGraphEditorPatchOperation(patch));
    expect(patched.document.nodes[0]?.label).toBe("Renamed");
    expect(() =>
      applyGraphEditorDocumentPatch(before, [{ op: "replace", path: ["nodes", 3], value: null }]),
    ).toThrow();
  });

  test("applies graph patches with explicit strictness and normalization behavior", () => {
    const document = normalizeGraphEditorDocument({
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
    const removeSourcePatch = [{ op: "remove" as const, path: ["nodes", 0] }];

    expect(applyGraphEditorDocumentPatch(document, removeSourcePatch).edges).toEqual([]);
    expect(
      applyGraphEditorDocumentPatch(document, removeSourcePatch, { normalize: false }).edges,
    ).toHaveLength(1);
    expect(() =>
      applyGraphEditorDocumentPatch(document, [
        { op: "replace", path: ["nodes", 4, "label"], value: "Missing" },
      ]),
    ).toThrow('Cannot apply editor patch at path "nodes.4.label".');
    expect(
      applyGraphEditorDocumentPatch(
        document,
        [{ op: "replace", path: ["nodes", 4, "label"], value: "Missing" }],
        { strict: false },
      ),
    ).toEqual(document);

    const selectionBefore = { nodeIds: ["source"], edgeIds: [] };
    const selectionAfter = { nodeIds: ["target"], edgeIds: [] };
    const operation = createGraphEditorPatchOperation(removeSourcePatch, {
      selectionAfter,
      selectionBefore,
    });
    expect(operation.selectionBefore).toBe(selectionBefore);
    expect(operation.selectionAfter).toBe(selectionAfter);
  });

  test("loads and saves graph runtimes through editor-core persistence wrappers", async () => {
    let stored: GraphEditorDocument | null = {
      nodes: [{ id: "stored", label: "Stored", x: 0, y: 0 }],
      edges: [],
    };
    const storage = {
      load: vi.fn(async () => stored),
      save: vi.fn(async (value: GraphEditorDocument) => {
        stored = value;
      }),
    };
    const runtime = createGraphEditorRuntime({
      initialDocument: { nodes: [], edges: [] },
    });
    const edited = applyGraphEditorOperation(
      runtime,
      createGraphEditorAddNodeOperation({
        node: { id: "local", label: "Local", x: 0, y: 0 },
      }),
    );
    expect(edited.canUndo).toBe(true);

    const loaded = await loadGraphEditorRuntimePersistence(edited, storage);
    expect(loaded.runtime.document.nodes[0]?.id).toBe("stored");
    expect(loaded.runtime.canUndo).toBe(false);
    expect(loaded.runtime.operationHistory.undoStack).toEqual([]);

    const skipped = await saveGraphEditorRuntimePersistence(loaded.runtime, storage);
    expect(skipped.saved).toBe(false);
    const dirty = applyGraphEditorOperation(
      loaded.runtime,
      createGraphEditorUpdateNodeOperation("stored", { label: "Saved" }),
    );
    const saved = await saveGraphEditorRuntimePersistence(dirty, storage);
    expect(saved.saved).toBe(true);
    expect(saved.runtime.runtime.status).toBe("clean");
    expect(stored?.nodes[0]?.label).toBe("Saved");
  });

  test("handles graph runtime persistence fallbacks, force saves, errors, and memory storage", async () => {
    const fallback = normalizeGraphEditorDocument({
      nodes: [{ id: "fallback", label: "Fallback", x: 0, y: 0 }],
      edges: [],
    });
    const runtime = createGraphEditorRuntime({
      initialDocument: {
        nodes: [{ id: "local", label: "Local", x: 0, y: 0 }],
        edges: [],
      },
      initialSelection: { nodeIds: ["local"], edgeIds: [] },
    });
    const storage = {
      load: vi.fn(async () => null),
      save: vi.fn(async () => {}),
    };
    const loaded = await loadGraphEditorRuntimePersistence(runtime, storage, {
      fallback,
      selection: { nodeIds: ["missing"], edgeIds: ["missing"] },
    });

    expect(loaded.runtime.document).toEqual(fallback);
    expect(loaded.runtime.selection).toEqual({ nodeIds: [], edgeIds: [] });
    expect(loaded.runtime.runtime.status).toBe("clean");

    const cleanSaved = await saveGraphEditorRuntimePersistence(loaded.runtime, storage, {
      force: true,
    });
    expect(cleanSaved.saved).toBe(true);
    expect(storage.save).toHaveBeenCalledWith(fallback);

    const saveError = new Error("save failed");
    const onError = vi.fn();
    const failingStorage = {
      load: vi.fn(async () => fallback),
      save: vi.fn(async () => {
        throw saveError;
      }),
    };
    const dirty = applyGraphEditorOperation(
      loaded.runtime,
      createGraphEditorUpdateNodeOperation("fallback", { label: "Dirty" }),
    );
    const failed = await saveGraphEditorRuntimePersistence(dirty, failingStorage, { onError });
    expect(failed.saved).toBe(false);
    expect(failed.runtime.runtime.status).toBe("dirty");
    expect(failed.runtime.document.nodes[0]?.label).toBe("Dirty");
    expect(onError).toHaveBeenCalledWith(saveError, { operation: "save", revision: 2 });

    const memoryStorage = createGraphEditorMemoryStorage({
      nodes: [{ id: "node", label: "Node", x: 0, y: 0 }],
      edges: [
        {
          id: "invalid",
          sourceNodeId: "node",
          sourcePortId: "out",
          targetNodeId: "missing",
          targetPortId: "in",
        },
      ],
    });
    expect((await memoryStorage.load())?.edges).toEqual([]);
  });

  test("creates typed local storage adapters for graph documents", async () => {
    const backing = new Map<string, string>();
    const storageLike = {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => {
        backing.set(key, value);
      },
      removeItem: (key: string) => {
        backing.delete(key);
      },
      clear: () => backing.clear(),
      key: (index: number) => [...backing.keys()][index] ?? null,
      get length() {
        return backing.size;
      },
    } as Storage;
    const storage = createGraphEditorLocalStorage({
      key: "graph",
      storage: storageLike,
    });

    await storage.save({ nodes: [{ id: "node", label: "Node", x: 0, y: 0 }], edges: [] });
    expect((await storage.load())?.nodes[0]?.id).toBe("node");
  });

  test("composes graph editor plugins into runtime validation, preflight, and commands", () => {
    const plugin: GraphEditorPlugin<GraphEditorDocument, GraphEditorSelectionState> = {
      id: "quality",
      commands: [
        {
          id: "quality.inspect",
          label: "Inspect",
          canRun: ({ selection }) => selection.nodeIds.length > 0,
        },
      ],
      validators: [
        (document) =>
          document.nodes.some((node) => node.label === "Blocked")
            ? [{ path: "$.nodes", message: "Blocked label" }]
            : [],
      ],
      operationPreflight: [
        ({ operation }) =>
          operation.id === "graph.add-node"
            ? [{ path: "$.nodes", message: "Adding nodes is blocked" }]
            : [],
      ],
    };
    const registry = createGraphEditorPluginRegistry([plugin]);
    const runtime = createGraphEditorRuntime({
      initialDocument: { nodes: [{ id: "a", label: "Blocked", x: 0, y: 0 }], edges: [] },
      plugins: [plugin],
    });

    expect(runtime.runtime.issues.map((issue) => issue.message)).toContain("Blocked label");
    const blocked = applyGraphEditorOperation(
      runtime,
      createGraphEditorAddNodeOperation({
        node: { id: "b", label: "B", x: 0, y: 0 },
      }),
    );
    expect(blocked.document.nodes.some((node) => node.id === "b")).toBe(false);
    expect(blocked.issues.map((issue) => issue.message)).toContain("Adding nodes is blocked");
    expect(
      resolveGraphEditorPluginCommands(registry, {
        document: runtime.document,
        selection: { nodeIds: ["a"], edgeIds: [] },
      }).map((command) => command.id),
    ).toEqual(["quality.inspect"]);
  });

  test("reports plugin diagnostics and keeps warning-only preflight non-blocking", () => {
    const duplicateCommandPlugin: GraphEditorPlugin<
      GraphEditorDocument,
      GraphEditorSelectionState
    > = {
      id: "duplicate-command",
      commands: [
        { id: "plugin.rename", label: "Rename", hotkeys: ["Mod+K"] },
        { id: "plugin.inspect", label: "Inspect", hotkeys: ["Mod+K"] },
      ],
    };
    const registry = createGraphEditorPluginRegistry([
      { id: "same" },
      { id: "same" },
      duplicateCommandPlugin,
    ]);

    expect(
      getGraphEditorPluginDiagnostics(registry).map((diagnostic) => diagnostic.message),
    ).toEqual(
      expect.arrayContaining([
        'Duplicate plugin id "same".',
        'Hotkey "Mod+K" conflicts with command "plugin.inspect".',
      ]),
    );

    const warningPlugin: GraphEditorPlugin<GraphEditorDocument, GraphEditorSelectionState> = {
      id: "warning",
      operationPreflight: [() => [{ path: "$", message: "Soft warning", severity: "warning" }]],
      validators: [
        () => [{ path: "$.plugins", message: "Plugin validator after base validation" }],
      ],
    };
    const runtime = createGraphEditorRuntime({
      initialDocument: {
        nodes: [{ id: "node", label: "Node", x: 0, y: 0 }],
        edges: [],
      },
      plugins: [warningPlugin],
    });
    const next = applyGraphEditorOperation(
      runtime,
      createGraphEditorUpdateNodeOperation("node", { label: "Renamed" }),
    );

    expect(next.document.nodes[0]?.label).toBe("Renamed");
    expect(next.issues).toEqual([{ path: "$", message: "Soft warning", severity: "warning" }]);
    expect(runtime.runtime.issues.map((issue) => issue.message)).toEqual([
      "Plugin validator after base validation",
    ]);

    const invalid = applyGraphEditorOperation(runtime, {
      id: "graph.add-edge",
      apply: (document) => ({
        ...document,
        edges: [
          {
            id: "invalid",
            sourceNodeId: "node",
            sourcePortId: "out",
            targetNodeId: "missing",
            targetPortId: "in",
          },
        ],
      }),
    });
    expect(invalid.issues.map((issue) => issue.message)).toEqual([
      "Graph edge target node is missing: missing",
      "Soft warning",
    ]);
  });

  test("previews, cancels, and commits graph interaction operations", () => {
    const document = normalizeGraphEditorDocument({
      nodes: [{ id: "node", label: "Node", x: 0, y: 0 }],
      edges: [],
    });
    const session = beginGraphEditorMoveInteraction(createGraphEditorInteractionSession(document), {
      nodeIds: ["node"],
      origin: { x: 0, y: 0 },
    });
    const preview = previewGraphEditorMoveInteraction(session, { node: { x: 40, y: 20 } });

    expect(preview.previewDocument.nodes[0]).toMatchObject({ x: 40, y: 20 });
    expect(createGraphEditorInteractionSession(document).previewDocument.nodes[0]?.x).toBe(0);

    const runtime = createGraphEditorRuntime({ initialDocument: document });
    const committed = applyGraphEditorOperation(
      runtime,
      createGraphEditorMoveNodesOperation({ node: { x: 40, y: 20 } }, { merge: true }),
      { merge: true },
    );
    expect(committed.canUndo).toBe(true);
  });

  test("commits, cancels, and merges graph interaction sessions", () => {
    const document = normalizeGraphEditorDocument({
      nodes: [{ id: "node", label: "Node", x: 0, y: 0 }],
      edges: [],
    });
    const session = beginGraphEditorMoveInteraction(createGraphEditorInteractionSession(document), {
      nodeIds: ["node"],
      origin: { x: 0, y: 0 },
    });
    const preview = previewGraphEditorMoveInteraction(session, { node: { x: 40, y: 20 } });

    expect(cancelGraphEditorInteraction(preview).previewDocument.nodes[0]?.x).toBe(0);
    expect(commitGraphEditorInteraction(preview).committedDocument.nodes[0]).toMatchObject({
      x: 40,
      y: 20,
    });

    const runtime = createGraphEditorRuntime({ initialDocument: document });
    const first = commitGraphEditorInteractionOperation(
      runtime,
      createGraphEditorMoveNodesOperation({ node: { x: 10, y: 0 } }),
    );
    const second = commitGraphEditorInteractionOperation(
      first,
      createGraphEditorMoveNodesOperation({ node: { x: 20, y: 0 } }),
    );
    expect(second.operationHistory.undoStack).toHaveLength(1);
    expect(second.document.nodes[0]?.x).toBe(20);
  });

  test("serializes, validates, and replays deterministic graph operation logs", () => {
    const operation: GraphEditorSerializedOperation = {
      id: "rename",
      type: "graph.update-node",
      schemaVersion: 1,
      payload: {
        type: "graph.update-node",
        nodeId: "node",
        patch: { label: "Renamed" },
      },
    };
    assertEditorOperationLogAdapter(graphEditorOperationLogAdapter, [
      {
        id: "valid-log",
        input: serializeGraphEditorOperationLog([operation], { exportedAt: false }),
        expected: [operation],
      },
    ]);

    const operations = readGraphEditorOperationLog(serializeGraphEditorOperationLog([operation]));
    const runtime = createGraphEditorRuntime({
      initialDocument: { nodes: [{ id: "node", label: "Node", x: 0, y: 0 }], edges: [] },
    });
    const replayed = applyGraphEditorOperation(
      runtime,
      graphEditorOperationFromSerializedOperation(operations[0]!),
    );
    expect(replayed.document.nodes[0]?.label).toBe("Renamed");

    expect(() =>
      readGraphEditorOperationLog(
        serializeGraphEditorOperationLog([
          {
            id: "paste",
            type: "graph.paste",
            schemaVersion: 1,
            payload: {
              type: "graph.paste",
              unsupported: true,
            },
          },
        ]),
      ),
    ).toThrow();
  });

  test("serializes and replays deterministic graph operation variants", () => {
    const operations = [
      serializeGraphEditorOperation(
        "graph.add-node",
        {
          type: "graph.add-node",
          node: {
            id: "source",
            label: "Source",
            x: 0,
            y: 0,
            outputs: [{ id: "out", label: "Out" }],
          },
        },
        { id: "add-source" },
      ),
      serializeGraphEditorOperation(
        "graph.add-node",
        {
          type: "graph.add-node",
          node: {
            id: "target",
            label: "Target",
            x: 240,
            y: 0,
            inputs: [{ id: "in", label: "In" }],
          },
        },
        { id: "add-target" },
      ),
      serializeGraphEditorOperation(
        "graph.add-edge",
        {
          type: "graph.add-edge",
          edge: {
            id: "edge",
            sourceNodeId: "source",
            sourcePortId: "out",
            targetNodeId: "target",
            targetPortId: "in",
          },
        },
        { id: "add-edge" },
      ),
      serializeGraphEditorOperation(
        "graph.patch",
        {
          type: "graph.patch",
          patch: [{ op: "replace", path: ["nodes", 0, "label"], value: "Renamed" }],
        },
        { id: "patch" },
      ),
      serializeGraphEditorOperation(
        "graph.replace-document",
        {
          type: "graph.replace-document",
          document: {
            nodes: [{ id: "replacement", label: "Replacement", x: 0, y: 0 }],
            edges: [],
          },
        },
        { id: "replace" },
      ),
    ];
    const replayed = readGraphEditorOperationLog(
      serializeGraphEditorOperationLog(operations, { exportedAt: false }),
    ).reduce(
      (runtime, serializedOperation) =>
        applyGraphEditorOperation(
          runtime,
          graphEditorOperationFromSerializedOperation(serializedOperation),
        ),
      createGraphEditorRuntime({ initialDocument: { nodes: [], edges: [] } }),
    );

    expect(replayed.document.nodes).toEqual([
      { id: "replacement", label: "Replacement", x: 0, y: 0 },
    ]);
    expect(
      createGraphEditorReplaceDocumentOperation({
        nodes: [{ id: "node", label: "Node", x: 0, y: 0 }],
        edges: [
          {
            id: "invalid",
            sourceNodeId: "node",
            sourcePortId: "out",
            targetNodeId: "missing",
            targetPortId: "in",
          },
        ],
      }).apply({ nodes: [], edges: [] }).edges,
    ).toEqual([]);
    expect(() =>
      serializeGraphEditorOperation("graph.paste", {
        type: "graph.paste",
        unsupported: true,
      }),
    ).toThrow("graph.paste cannot be serialized without materialized generated ids.");
  });

  test("rejects unsupported and invalid graph operation log payloads with stable errors", () => {
    const paste: GraphEditorSerializedOperation = {
      id: "paste",
      type: "graph.paste",
      schemaVersion: 1,
      payload: { type: "graph.paste", unsupported: true },
    };
    const duplicateSelection: GraphEditorSerializedOperation = {
      id: "duplicate",
      type: "graph.duplicate-selection",
      schemaVersion: 1,
      payload: { type: "graph.duplicate-selection", unsupported: true },
    };
    const mismatch: GraphEditorSerializedOperation = {
      id: "mismatch",
      type: "graph.add-node",
      schemaVersion: 1,
      payload: { type: "graph.add-edge", edge: {} as never },
    };
    const schemaMismatch: GraphEditorSerializedOperation = {
      id: "schema",
      type: "graph.add-node",
      schemaVersion: 2 as 1,
      payload: {
        type: "graph.add-node",
        node: { id: "node", label: "Node", x: 0, y: 0 },
      },
    };

    expect(() => readGraphEditorOperationLog(serializeGraphEditorOperationLog([paste]))).toThrow(
      "graph.paste cannot be replayed without materialized generated ids.",
    );
    expect(() => graphEditorOperationFromSerializedOperation(paste)).toThrow(
      "graph.paste cannot be replayed without materialized generated ids.",
    );
    expect(() => graphEditorOperationFromSerializedOperation(duplicateSelection)).toThrow(
      "graph.duplicate-selection cannot be replayed without materialized generated ids.",
    );
    expect(() => readGraphEditorOperationLog(serializeGraphEditorOperationLog([mismatch]))).toThrow(
      EditorJsonParseError,
    );
    expect(() =>
      readGraphEditorOperationLog(serializeGraphEditorOperationLog([schemaMismatch])),
    ).toThrow(EditorJsonParseError);
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

  test("records and clears GraphWorkbench import action errors", async () => {
    const errors: GraphWorkbenchActionError[] = [];
    const { controller, getDocument } = renderClipboardWorkbench({
      onActionError(error) {
        errors.push(error);
      },
      async onImportDocument() {
        throw new Error("invalid fixture");
      },
    });
    const file = new File(["{}"], "broken.json", { type: "application/json" });

    await act(async () => {
      await controller.current?.actions.importJson(file);
    });

    expect(getDocument().nodes.map((node) => node.id)).toEqual(["source"]);
    expect(errors.at(-1)).toMatchObject({
      code: "import-json",
      detail: "invalid fixture",
      message: "Import failed",
    });
    expect(controller.current?.status.actionError).toBe(errors.at(-1));

    await act(async () => {
      controller.current?.status.clearActionError();
    });

    expect(controller.current?.status.actionError).toBeNull();
  });

  test("records copy fallback errors while preserving the in-memory clipboard payload", async () => {
    const errors: GraphWorkbenchActionError[] = [];
    const clipboard = {
      writeText: vi.fn(async () => {
        throw new Error("clipboard denied");
      }),
    };
    vi.stubGlobal("navigator", { clipboard });
    const { controller, getDocument } = renderClipboardWorkbench({
      onActionError(error) {
        errors.push(error);
      },
    });

    await act(async () => {
      await controller.current?.actions.copySelection();
    });

    expect(errors.at(-1)).toMatchObject({
      code: "copy-selection",
      message: "Copy failed",
    });
    expect(controller.current?.status.actionError).toBe(errors.at(-1));

    await act(async () => {
      await controller.current?.actions.pasteSelection();
    });

    expect(getDocument().nodes.map((node) => node.id)).toEqual(["source", "source-2"]);
    expect(controller.current?.status.actionError).toBeNull();
  });

  test("records paste action errors when no clipboard payload is usable", async () => {
    const errors: GraphWorkbenchActionError[] = [];
    const clipboard = {
      readText: vi.fn(async () => ""),
    };
    vi.stubGlobal("navigator", { clipboard });
    const { controller, getDocument } = renderClipboardWorkbench({
      onActionError(error) {
        errors.push(error);
      },
    });

    await act(async () => {
      await controller.current?.actions.pasteSelection();
    });

    expect(getDocument().nodes.map((node) => node.id)).toEqual(["source"]);
    expect(errors.at(-1)).toMatchObject({
      code: "paste-selection",
      message: "Paste failed",
    });
    expect(controller.current?.status.actionError).toBe(errors.at(-1));
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
  onActionError,
  onImportDocument,
  onSelectionStateChange,
  pasteClipboardPayload,
  renderToolbarContent,
}: {
  copySelection?: (
    document: ClipboardWorkbenchDocument,
    selection: GraphEditorSelectionState,
  ) => unknown;
  onActionError?: (error: GraphWorkbenchActionError) => void;
  onImportDocument?: (file: File) => Promise<ClipboardWorkbenchDocument>;
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
      onActionError,
      onDocumentChange(nextDocument) {
        latestDocument = nextDocument;
        setDocument(nextDocument);
      },
      onImportDocument,
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
