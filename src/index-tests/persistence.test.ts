// oxlint-disable no-unused-vars
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
import { workbenchExamples } from "../../examples/workbench/src/workbench-examples";
import {
  appendMetricTemplate,
  appendPayloadTemplate,
  appendSourceDocument,
  renderClipboardWorkbench,
  renderWorkbenchHarness,
} from "./support";

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
});
