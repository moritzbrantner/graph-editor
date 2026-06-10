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
});
