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
});
