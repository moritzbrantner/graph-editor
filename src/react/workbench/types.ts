import type * as React from "react";

import {
  type GraphEditorClipboardPayload,
  type GraphEditorConnectionInput,
  type GraphEditorConnectionValidationOptions,
  type GraphEditorConnectionValidity,
  type GraphEditorDocument,
  type GraphEditorDocumentDiagnostic,
  type GraphEditorEdge,
  type GraphEditorGroup,
  type GraphEditorNode,
  type GraphEditorNodeTemplate,
  type GraphEditorSelectionState,
  type GraphEditorViewport,
} from "../../core";
import { type GraphEditorRuntimeState } from "../../runtime";
import { type GraphEditorOperation } from "../../operations";
import { type InspectorFieldValue, type InspectorPanelSectionData } from "../inspector-panel";
import { type GraphWorkbenchAction, type GraphWorkbenchCommandId } from "../workbench-commands";
import {
  type GraphWorkbenchPaletteCategoryGroup,
  type GraphWorkbenchPaletteItem,
} from "../palette-model";

export type GraphWorkbenchInspectorSchema<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  getNodeSections?: (node: GraphEditorNode<TNodeData, TPortType>) => InspectorPanelSectionData[];
  getEdgeSections?: (edge: GraphEditorEdge<TEdgeData>) => InspectorPanelSectionData[];
  getGroupSections?: (group: GraphEditorGroup) => InspectorPanelSectionData[];
  applyNodeValues?: (
    node: GraphEditorNode<TNodeData, TPortType>,
    values: Record<string, InspectorFieldValue>,
  ) => Partial<GraphEditorNode<TNodeData, TPortType>>;
  applyEdgeValues?: (
    edge: GraphEditorEdge<TEdgeData>,
    values: Record<string, InspectorFieldValue>,
  ) => Partial<GraphEditorEdge<TEdgeData>>;
  applyGroupValues?: (
    group: GraphEditorGroup,
    values: Record<string, InspectorFieldValue>,
  ) => Partial<GraphEditorGroup>;
};

export type GraphWorkbenchActionErrorCode =
  | "import-json"
  | "copy-selection"
  | "paste-selection"
  | "command";

export type GraphWorkbenchActionError = {
  id: string;
  code: GraphWorkbenchActionErrorCode;
  message: string;
  detail?: string;
};

export type GraphWorkbenchController<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  runtime: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType>;
  dispatch: (
    operation: GraphEditorOperation<TNodeData, TEdgeData, TPortType>,
    options?: { merge?: boolean },
  ) => void;
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  readOnly: boolean;
  selection: GraphEditorSelectionState;
  selectedNode?: GraphEditorNode<TNodeData, TPortType>;
  selectedEdge?: GraphEditorEdge<TEdgeData>;
  selectedGroup?: GraphEditorGroup;
  diagnostics: GraphEditorDocumentDiagnostic[];
  selectedDiagnostics: GraphEditorDocumentDiagnostic[];
  history: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType>["operationHistory"] & {
    canUndo: boolean;
    canRedo: boolean;
  };
  status: {
    actionError: GraphWorkbenchActionError | null;
    clearActionError: () => void;
  };
  palette: {
    groups: Array<GraphWorkbenchPaletteCategoryGroup<TNodeData>>;
    items: ReadonlyArray<GraphWorkbenchPaletteItem<TNodeData>>;
    filteredItems: ReadonlyArray<GraphWorkbenchPaletteItem<TNodeData>>;
    searchValue: string;
    setSearchValue: (value: string) => void;
  };
  view: {
    showPalette: boolean;
    showInspector: boolean;
    showMiniMap: boolean;
    setShowPalette: (show: boolean) => void;
    setShowInspector: (show: boolean) => void;
    setShowMiniMap: (show: boolean) => void;
    setZoom: (zoom: number) => void;
  };
  actions: {
    addTemplateNode: (
      template: GraphWorkbenchPaletteItem<TNodeData>,
      position?: { x: number; y: number },
    ) => void;
    appendTemplateNode: (
      template?: GraphWorkbenchPaletteItem<TNodeData>,
      sourceNodeId?: string,
    ) => void;
    deleteSelection: () => void;
    setSelection: (selection: GraphEditorSelectionState) => void;
    updateDocument: (
      document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
      options?: GraphWorkbenchCommitOptions,
    ) => void;
    undo: () => void;
    redo: () => void;
    copySelection: () => Promise<void>;
    pasteSelection: () => Promise<void>;
    duplicateSelection: () => void;
    selectAll: () => void;
    fitView: () => void;
    autoLayout: () => void;
    groupSelection: () => void;
    ungroupSelection: () => void;
    importJson: (file?: File) => Promise<void>;
    exportJson: () => void;
    runCommand: (commandId: GraphWorkbenchCommandId | string) => void | Promise<void>;
  };
  commands: GraphWorkbenchAction[];
};

export type GraphWorkbenchProps<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  document?: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  runtime?: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType>;
  nodeTemplates?: ReadonlyArray<GraphEditorNodeTemplate<TNodeData, TPortType>>;
  selectedNodeIds?: readonly string[] | null;
  selectedEdgeIds?: readonly string[] | null;
  selectedGroupIds?: readonly string[] | null;
  readOnly?: boolean;
  className?: string;
  showMiniMap?: boolean;
  disableHistory?: boolean;
  initialSelection?: GraphEditorSelectionState | null;
  historyLimit?: number;
  operationHistoryLimit?: number;
  maxHistory?: number;
  inspectorSchema?: GraphWorkbenchInspectorSchema<TNodeData, TEdgeData, TPortType>;
  onDocumentChange?: (document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>) => void;
  onSelectionStateChange?: (selection: GraphEditorSelectionState) => void;
  onViewportChange?: (viewport: GraphEditorViewport) => void;
  onImportDocument?: (file: File) => Promise<GraphEditorDocument<TNodeData, TEdgeData, TPortType>>;
  onExportDocument?: (document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>) => void;
  onRuntimeChange?: (runtime: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType>) => void;
  onActionError?: (error: GraphWorkbenchActionError) => void;
  onCommand?: (commandId: string) => void;
  connectionValidationOptions?: GraphEditorConnectionValidationOptions<
    TNodeData,
    TEdgeData,
    TPortType
  >;
  createEdge?: (
    connection: GraphEditorConnectionInput,
    context: {
      document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
      validity: GraphEditorConnectionValidity;
    },
  ) => GraphEditorEdge<TEdgeData>;
  connectDocument?: (
    document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    connection: GraphEditorConnectionInput,
    validity: GraphEditorConnectionValidity,
  ) => {
    document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
    edge?: GraphEditorEdge<TEdgeData>;
    connected: boolean;
  };
  normalizeDocument?: (
    document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  ) => GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  layoutDocument?: (
    document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    options?: { nodeIds?: readonly string[] },
  ) => GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  copySelection?: (
    document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    selection: GraphEditorSelectionState,
  ) => GraphEditorClipboardPayload<TNodeData, TEdgeData, TPortType> | unknown;
  pasteClipboardPayload?: (
    document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    payload: unknown,
  ) => {
    document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
    nodeIds: string[];
    edgeIds: string[];
    groupIds?: string[];
  };
  duplicateSelection?: (
    document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    selection: GraphEditorSelectionState,
  ) => {
    document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
    nodeIds: string[];
    edgeIds: string[];
    groupIds?: string[];
  };
  removeSelection?: (
    document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    selection: GraphEditorSelectionState,
  ) => GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  createGroup?: (
    document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    nodeIds: readonly string[],
  ) => GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  renderToolbar?: (
    controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>,
  ) => React.ReactNode;
  renderPalette?: (
    controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>,
  ) => React.ReactNode;
  renderInspector?: (
    controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>,
  ) => React.ReactNode;
  renderContextPad?: (
    controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>,
  ) => React.ReactNode;
  renderCanvasOverlay?: (
    controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>,
    context: { containerRef: React.RefObject<HTMLDivElement | null> },
  ) => React.ReactNode;
  onCanvasContextMenuCapture?: (
    event: React.MouseEvent<HTMLDivElement>,
    controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>,
  ) => void;
  onCanvasDoubleClickCapture?: (
    event: React.MouseEvent<HTMLDivElement>,
    controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>,
  ) => void;
  commands?:
    | GraphWorkbenchAction[]
    | ((
        controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>,
      ) => GraphWorkbenchAction[]);
};

export type GraphWorkbenchCommitOptions = {
  history?: boolean;
  drag?: "move" | "end";
  selectionAfter?: GraphEditorSelectionState;
};
