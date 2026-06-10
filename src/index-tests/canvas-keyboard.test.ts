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
});
