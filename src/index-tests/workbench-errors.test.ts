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
  type ClipboardWorkbenchDocument,
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
});
