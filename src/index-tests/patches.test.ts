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
});
