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
  type AppendEdgeData,
  type AppendNodeData,
  type AppendPortType,
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
