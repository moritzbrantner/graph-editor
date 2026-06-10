import * as React from "react";
import { render } from "@testing-library/react";

import {
  GraphWorkbench,
  type GraphEditorConnectionInput,
  type GraphEditorConnectionValidity,
  type GraphEditorDocument,
  type GraphEditorEdge,
  type GraphEditorNodeTemplate,
  type GraphEditorSelectionState,
  type GraphWorkbenchActionError,
  type GraphWorkbenchController,
} from "@moritzbrantner/graph-editor";

export type AppendPortType = "payload" | "metric";
export type AppendNodeData = Record<string, never>;
export type AppendEdgeData = { label?: string };

export const appendSourceDocument: GraphEditorDocument<
  AppendNodeData,
  AppendEdgeData,
  AppendPortType
> = {
  nodes: [
    {
      id: "source",
      label: "Source",
      x: 0,
      y: 0,
      outputs: [{ id: "out", label: "Out", type: "payload" }],
    },
  ],
  edges: [],
};

export const appendPayloadTemplate: GraphEditorNodeTemplate<AppendNodeData, AppendPortType> = {
  id: "transform-template",
  label: "Transform",
  inputs: [{ id: "in", label: "In", type: "payload" }],
  outputs: [{ id: "out", label: "Out", type: "payload" }],
};

export const appendMetricTemplate: GraphEditorNodeTemplate<AppendNodeData, AppendPortType> = {
  id: "metric-template",
  label: "Metric",
  inputs: [{ id: "in", label: "In", type: "metric" }],
};

export function renderWorkbenchHarness({
  initialDocument,
  templates,
  createEdge,
}: {
  initialDocument: GraphEditorDocument<AppendNodeData, AppendEdgeData, AppendPortType>;
  templates: Array<GraphEditorNodeTemplate<AppendNodeData, AppendPortType>>;
  createEdge?: (
    connection: GraphEditorConnectionInput,
    context: {
      document: GraphEditorDocument<AppendNodeData, AppendEdgeData, AppendPortType>;
      validity: GraphEditorConnectionValidity;
    },
  ) => GraphEditorEdge<AppendEdgeData>;
}) {
  const controller: {
    current: GraphWorkbenchController<AppendNodeData, AppendEdgeData, AppendPortType> | null;
  } = { current: null };
  let latestDocument = initialDocument;

  function Harness() {
    const [document, setDocument] = React.useState(initialDocument);

    return React.createElement(GraphWorkbench<AppendNodeData, AppendEdgeData, AppendPortType>, {
      document,
      nodeTemplates: templates,
      createEdge,
      onDocumentChange(nextDocument) {
        latestDocument = nextDocument;
        setDocument(nextDocument);
      },
      renderToolbar: () => null,
      renderPalette: () => null,
      renderInspector: () => null,
      renderContextPad(nextController) {
        controller.current = nextController;
        return null;
      },
    });
  }

  render(React.createElement(Harness));

  return {
    controller,
    getDocument: () => latestDocument,
  };
}

export function renderClipboardWorkbench({
  copySelection,
  onActionError,
  onImportDocument,
  onSelectionStateChange,
  pasteClipboardPayload,
  readOnly,
  renderToolbarContent,
}: {
  copySelection?: (
    document: ClipboardWorkbenchDocument,
    selection: GraphEditorSelectionState,
  ) => unknown;
  onActionError?: (error: GraphWorkbenchActionError) => void;
  onImportDocument?: (file: File) => Promise<ClipboardWorkbenchDocument>;
  onSelectionStateChange?: (selection: GraphEditorSelectionState) => void;
  pasteClipboardPayload?: (
    document: ClipboardWorkbenchDocument,
    payload: unknown,
  ) => {
    document: ClipboardWorkbenchDocument;
    nodeIds: string[];
    edgeIds: string[];
    groupIds?: string[];
  };
  readOnly?: boolean;
  renderToolbarContent?: React.ReactNode;
} = {}) {
  const controller: { current: GraphWorkbenchController<ClipboardNodeData> | null } = {
    current: null,
  };
  const initialDocument: ClipboardWorkbenchDocument = {
    nodes: [{ id: "source", label: "Source", x: 0, y: 0 }],
    edges: [],
  };
  let latestDocument = initialDocument;

  function Harness() {
    const [document, setDocument] = React.useState(initialDocument);

    return React.createElement(GraphWorkbench<ClipboardNodeData>, {
      copySelection,
      document,
      initialSelection: { nodeIds: ["source"], edgeIds: [] },
      nodeTemplates: [],
      onActionError,
      onDocumentChange(nextDocument) {
        latestDocument = nextDocument;
        setDocument(nextDocument);
      },
      onImportDocument,
      onSelectionStateChange,
      pasteClipboardPayload,
      readOnly,
      className: "clipboard-workbench",
      renderContextPad: () => null,
      renderInspector: () => null,
      renderPalette: () => null,
      renderToolbar(nextController) {
        controller.current = nextController;
        return renderToolbarContent;
      },
    });
  }

  const fixture = render(
    React.createElement(
      "div",
      { "data-testid": "clipboard-workbench" },
      React.createElement(Harness),
    ),
  );

  return {
    controller,
    getDocument: () => latestDocument,
    getWorkbench: () =>
      fixture.container.querySelector<HTMLElement>('[data-slot="graph-workbench"]')!,
  };
}

export type ClipboardNodeData = Record<string, unknown>;
export type ClipboardWorkbenchDocument = GraphEditorDocument<ClipboardNodeData>;
