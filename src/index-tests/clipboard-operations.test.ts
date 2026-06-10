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
});
