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
});
