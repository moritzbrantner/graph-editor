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
});
