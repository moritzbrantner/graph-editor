"use client";

import * as React from "react";

import {
  downloadEditorJson,
  readEditorClipboardJson,
  readEditorJsonFile,
  writeEditorClipboardJson,
  type EditorClipboardFallback,
} from "@moritzbrantner/editor-core/browser";
import { createUniqueEditorId } from "@moritzbrantner/editor-core/entities";
import { createStableEditorJsonEquals } from "@moritzbrantner/editor-core/json";
import {
  getEditorCommandIdFromKeyboardEvent,
  isEditorEditableTarget,
  matchesEditorHotkey,
  type EditorCommandDefinition,
} from "@moritzbrantner/editor-core/hotkeys";
import { createEditorDocumentIoCommands } from "@moritzbrantner/editor-core/runtime";
import {
  addGraphEditorEdge,
  copyGraphEditorSelection,
  graphEditorClipboardFormat,
  normalizeGraphEditorDocument,
  normalizeGraphEditorSelection,
  updateGraphEditorEdge,
  updateGraphEditorGroup,
  updateGraphEditorNode,
  validateGraphEditorConnection,
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
  type GraphEditorPort,
  type GraphEditorSelectionState,
  type GraphEditorViewport,
} from "../../core";
import {
  applyGraphEditorOperation,
  createGraphEditorRuntime,
  redoGraphEditorRuntime,
  resetGraphEditorRuntime,
  setGraphEditorRuntimeSelection,
  undoGraphEditorRuntime,
  type GraphEditorRuntimeState,
} from "../../runtime";
import {
  createGraphEditorAddEdgeOperation,
  createGraphEditorAddNodeOperation,
  createGraphEditorCreateGroupOperation,
  createGraphEditorDuplicateSelectionOperation,
  createGraphEditorLayoutOperation,
  createGraphEditorPasteOperation,
  createGraphEditorRemoveSelectionOperation,
  createGraphEditorUngroupOperation,
  createGraphEditorUpdateEdgeOperation,
  createGraphEditorUpdateViewportOperation,
  type GraphEditorOperation,
} from "../../operations";
import { getGraphEditorNodeSize } from "../../node-metrics";
import { type InspectorFieldValue, type InspectorPanelSectionData } from "../inspector-panel";
import {
  graphWorkbenchCommandShortcuts,
  getGraphWorkbenchShortcutLabel,
  type GraphWorkbenchAction,
  type GraphWorkbenchCommandId,
} from "../workbench-commands";
import {
  createGraphWorkbenchPaletteCategoryGroups,
  filterGraphWorkbenchPaletteTemplates,
  type GraphWorkbenchPaletteCategoryGroup,
  type GraphWorkbenchPaletteItem,
} from "../palette-model";
import { graphWorkbenchOverlayMargin } from "../overlay-position";

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

export const emptySelection: GraphEditorSelectionState = { nodeIds: [], edgeIds: [] };
const emptyDocument: GraphEditorDocument<any, any, any> = { nodes: [], edges: [] };
const graphWorkbenchDefaultZoom = 0.9;

export function useGraphWorkbenchController<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>({
  document: controlledDocument,
  runtime: controlledRuntime,
  nodeTemplates = [],
  selectedNodeIds,
  selectedEdgeIds,
  selectedGroupIds,
  readOnly = false,
  showMiniMap = true,
  disableHistory = false,
  initialSelection,
  historyLimit,
  operationHistoryLimit,
  maxHistory = 100,
  onDocumentChange,
  onSelectionStateChange,
  onViewportChange,
  onImportDocument,
  onExportDocument,
  onRuntimeChange,
  onActionError,
  onCommand,
  connectionValidationOptions,
  createEdge,
  connectDocument: customConnectDocument,
  normalizeDocument,
  layoutDocument,
  copySelection: customCopySelection,
  pasteClipboardPayload,
  duplicateSelection: customDuplicateSelection,
  removeSelection,
  createGroup,
  commands: customCommands,
}: GraphWorkbenchProps<TNodeData, TEdgeData, TPortType>) {
  const initialDocument =
    controlledRuntime?.document ??
    (controlledDocument &&
      normalizeGraphWorkbenchDocument(controlledDocument, normalizeDocument)) ??
    (emptyDocument as GraphEditorDocument<TNodeData, TEdgeData, TPortType>);
  const [internalRuntime, setInternalRuntime] = React.useState(() =>
    createGraphEditorRuntime<TNodeData, TEdgeData, TPortType>({
      initialDocument,
      initialSelection,
      historyLimit: historyLimit ?? maxHistory,
      operationHistoryLimit,
      disableHistory,
      connectionValidationOptions,
    }),
  );
  const [searchValue, setSearchValue] = React.useState("");
  const [showPalette, setShowPalette] = React.useState(true);
  const [showInspector, setShowInspector] = React.useState(true);
  const [internalShowMiniMap, setShowMiniMap] = React.useState(showMiniMap);
  const [clipboardPayload, setClipboardPayload] = React.useState<unknown>(null);
  const [actionError, setActionError] = React.useState<GraphWorkbenchActionError | null>(null);
  const clipboardPayloadRef = React.useRef<unknown>(null);
  const clipboardTextFallbackRef = React.useRef<EditorClipboardFallback>({});
  const actionErrorIdRef = React.useRef(0);
  const runtimeState: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType> =
    controlledRuntime ?? internalRuntime;
  const document: GraphEditorDocument<TNodeData, TEdgeData, TPortType> = runtimeState.document;
  const lastEmittedDocumentRef = React.useRef<GraphEditorDocument<
    TNodeData,
    TEdgeData,
    TPortType
  > | null>(null);
  const dragHistoryBaseRef = React.useRef<GraphEditorDocument<
    TNodeData,
    TEdgeData,
    TPortType
  > | null>(null);
  const externalSelectionProvided =
    selectedNodeIds !== undefined ||
    selectedEdgeIds !== undefined ||
    selectedGroupIds !== undefined;
  const rawSelection: GraphEditorSelectionState = externalSelectionProvided
    ? {
        nodeIds: [...(selectedNodeIds ?? [])],
        edgeIds: [...(selectedEdgeIds ?? [])],
        ...(selectedGroupIds?.length ? { groupIds: [...selectedGroupIds] } : {}),
      }
    : runtimeState.selection;
  const selection = React.useMemo(
    () => normalizeGraphEditorSelection(document, rawSelection),
    [document, rawSelection],
  );
  const selectedNode = document.nodes.find((node) => node.id === selection.nodeIds.at(-1));
  const selectedEdge = document.edges.find((edge) => edge.id === selection.edgeIds.at(-1));
  const selectedGroup = (document.groups ?? []).find(
    (group) => group.id === selection.groupIds?.at(-1),
  );
  const diagnostics: GraphEditorDocumentDiagnostic[] = runtimeState.diagnostics;
  const selectedDiagnostics = React.useMemo(
    () =>
      diagnostics.filter(
        (diagnostic) =>
          (selectedNode &&
            (diagnostic.nodeId === selectedNode.id ||
              diagnostic.sourceNodeId === selectedNode.id ||
              diagnostic.targetNodeId === selectedNode.id)) ||
          (selectedEdge && diagnostic.edgeId === selectedEdge.id) ||
          (selectedGroup && diagnostic.groupId === selectedGroup.id),
      ),
    [diagnostics, selectedEdge, selectedGroup, selectedNode],
  );
  const filteredItems = React.useMemo(
    () => filterGraphWorkbenchPaletteTemplates(nodeTemplates, searchValue),
    [nodeTemplates, searchValue],
  );
  const groups = React.useMemo(
    () => createGraphWorkbenchPaletteCategoryGroups(filteredItems),
    [filteredItems],
  );

  React.useEffect(() => {
    if (controlledRuntime || !controlledDocument) {
      return;
    }
    setInternalRuntime((current) => {
      const nextDocument = normalizeGraphWorkbenchDocument(controlledDocument, normalizeDocument);
      if (graphWorkbenchDocumentsEqual(current.document, nextDocument)) {
        return current;
      }
      if (
        lastEmittedDocumentRef.current !== null &&
        graphWorkbenchDocumentsEqual(lastEmittedDocumentRef.current, nextDocument)
      ) {
        return current;
      }
      return resetGraphEditorRuntime(current, nextDocument, {
        selection: externalSelectionProvided ? rawSelection : current.selection,
      });
    });
  }, [controlledDocument, controlledRuntime, externalSelectionProvided, rawSelection]);

  React.useEffect(() => {
    setShowMiniMap(showMiniMap);
  }, [showMiniMap]);

  const clearActionError = React.useCallback(() => {
    setActionError(null);
  }, []);

  const reportActionError = React.useCallback(
    (code: GraphWorkbenchActionErrorCode, error: unknown, fallbackMessage: string) => {
      const nextError: GraphWorkbenchActionError = {
        id: `${code}-${++actionErrorIdRef.current}`,
        code,
        message: fallbackMessage,
        ...formatGraphWorkbenchActionErrorDetail(error),
      };
      setActionError(nextError);
      onActionError?.(nextError);
    },
    [onActionError],
  );

  const commitSelection = React.useCallback(
    (nextSelection: GraphEditorSelectionState) => {
      const normalized = normalizeGraphEditorSelection(document, nextSelection);
      const nextRuntime = setGraphEditorRuntimeSelection(runtimeState, normalized);
      if (!externalSelectionProvided && !controlledRuntime) {
        setInternalRuntime(nextRuntime);
      }
      onRuntimeChange?.(nextRuntime);
      onSelectionStateChange?.(normalized);
    },
    [
      controlledRuntime,
      document,
      externalSelectionProvided,
      onRuntimeChange,
      onSelectionStateChange,
      runtimeState,
    ],
  );

  const commitRuntime = React.useCallback(
    (nextRuntime: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType>) => {
      if (!controlledRuntime) {
        setInternalRuntime(nextRuntime);
      }
      onRuntimeChange?.(nextRuntime);
      if (nextRuntime.document !== runtimeState.document) {
        lastEmittedDocumentRef.current = nextRuntime.document;
        onDocumentChange?.(nextRuntime.document);
      }
      if (nextRuntime.selection !== runtimeState.selection) {
        onSelectionStateChange?.(nextRuntime.selection);
      }
    },
    [
      controlledRuntime,
      onDocumentChange,
      onRuntimeChange,
      onSelectionStateChange,
      runtimeState.document,
      runtimeState.selection,
    ],
  );

  const dispatch = React.useCallback(
    (
      operation: GraphEditorOperation<TNodeData, TEdgeData, TPortType>,
      options: { merge?: boolean } = {},
    ) => {
      commitRuntime(applyGraphEditorOperation(runtimeState, operation, options));
    },
    [commitRuntime, runtimeState],
  );

  const commitDocument = React.useCallback(
    (
      nextDocument: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
      options: GraphWorkbenchCommitOptions = {},
    ) => {
      const normalizedDocument = normalizeGraphWorkbenchDocument(nextDocument, normalizeDocument);

      if (options.drag === "move") {
        dragHistoryBaseRef.current ??= document;
        const nextRuntime = applyGraphEditorOperation(
          runtimeState,
          createGraphWorkbenchDocumentOperation(
            normalizedDocument,
            options.selectionAfter ?? selection,
            false,
          ),
        );
        commitRuntime(nextRuntime);
        return;
      }

      if (options.drag === "end") {
        const baseDocument = dragHistoryBaseRef.current;
        dragHistoryBaseRef.current = null;

        if (baseDocument && !graphWorkbenchDocumentsEqual(baseDocument, normalizedDocument)) {
          const baseRuntime = resetGraphEditorRuntime(runtimeState, baseDocument, {
            selection,
          });
          const nextRuntime = applyGraphEditorOperation(
            baseRuntime,
            createGraphWorkbenchDocumentOperation(
              normalizedDocument,
              options.selectionAfter ?? selection,
              options.history !== false,
            ),
          );
          commitRuntime(nextRuntime);
          return;
        }
        commitRuntime(runtimeState);
        return;
      }

      dispatch(
        createGraphWorkbenchDocumentOperation(
          normalizedDocument,
          options.selectionAfter ?? selection,
          options.history !== false,
        ),
      );
    },
    [commitRuntime, dispatch, document, normalizeDocument, runtimeState, selection],
  );

  const getViewportCenterPosition = React.useCallback(() => {
    const viewport = document.viewport ?? { x: 0, y: 0, zoom: graphWorkbenchDefaultZoom };
    return {
      x: Math.round((240 - viewport.x) / Math.max(viewport.zoom, 0.1)),
      y: Math.round((180 - viewport.y) / Math.max(viewport.zoom, 0.1)),
    };
  }, [document.viewport]);

  const addTemplateNode = React.useCallback(
    (template: GraphWorkbenchPaletteItem<TNodeData>, position = getViewportCenterPosition()) => {
      if (readOnly) {
        return;
      }

      const id = createGraphWorkbenchNodeId(template.id, document);
      dispatch(
        createGraphEditorAddNodeOperation<TNodeData, TEdgeData, TPortType>({
          template: template as GraphEditorNodeTemplate<TNodeData, TPortType>,
          id,
          position,
          selectionAfter: { nodeIds: [id], edgeIds: [], primary: { type: "node", id } },
        }),
      );
    },
    [dispatch, document, getViewportCenterPosition, readOnly],
  );

  const updateViewport = React.useCallback(
    (viewport: GraphEditorViewport) => {
      dispatch(
        createGraphEditorUpdateViewportOperation<TNodeData, TEdgeData, TPortType>(viewport, {
          history: false,
          selectionAfter: selection,
        }),
      );
      onViewportChange?.(viewport);
    },
    [dispatch, onViewportChange, selection],
  );

  const getConnectionValidity = React.useCallback(
    (
      sourceDocument: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
      connection: GraphEditorConnectionInput,
      options: Partial<
        GraphEditorConnectionValidationOptions<TNodeData, TEdgeData, TPortType>
      > = {},
    ) =>
      validateGraphEditorConnection(
        sourceDocument,
        connection,
        createGraphWorkbenchConnectionValidationOptions(connectionValidationOptions, options),
      ),
    [connectionValidationOptions],
  );

  const connectDocument = React.useCallback(
    (
      sourceDocument: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
      connection: GraphEditorConnectionInput,
      options: Partial<
        GraphEditorConnectionValidationOptions<TNodeData, TEdgeData, TPortType>
      > = {},
    ) => {
      const validity = getConnectionValidity(sourceDocument, connection, options);

      if (!validity.valid) {
        return { document: sourceDocument, connected: false };
      }

      if (customConnectDocument) {
        return customConnectDocument(sourceDocument, connection, validity);
      }

      const edge =
        createEdge?.(connection, { document: sourceDocument, validity }) ??
        ({
          id: createGraphWorkbenchEdgeId(sourceDocument, connection),
          ...connection,
        } as GraphEditorEdge<TEdgeData>);

      return {
        document: addGraphEditorEdge(sourceDocument, edge),
        connected: true,
      };
    },
    [createEdge, customConnectDocument, getConnectionValidity],
  );

  const appendTemplateNode = React.useCallback(
    (template?: GraphWorkbenchPaletteItem<TNodeData>, sourceNodeId?: string) => {
      if (readOnly) {
        return;
      }

      const sourceNode =
        document.nodes.find((node) => node.id === sourceNodeId) ?? selectedNode ?? null;
      if (!sourceNode || !sourceNode.outputs?.length) {
        return;
      }

      const templates = template ? [template] : filteredItems;
      for (const candidateTemplate of templates) {
        if (!candidateTemplate.inputs?.length) {
          continue;
        }

        const id = createGraphWorkbenchNodeId(candidateTemplate.id, document);
        const sourceSize = getGraphEditorNodeSize(sourceNode);
        const nextNode = {
          ...candidateTemplate,
          id,
          x: sourceNode.x + sourceSize.width + 120,
          y: sourceNode.y,
        } as GraphEditorNode<TNodeData, TPortType>;
        const documentWithNode = normalizeGraphWorkbenchDocument(
          {
            ...document,
            nodes: [...document.nodes, nextNode],
          },
          normalizeDocument,
        );
        const connection = getFirstValidGraphWorkbenchConnection(
          documentWithNode,
          sourceNode.id,
          nextNode.id,
          getConnectionValidity,
        );

        if (!connection) {
          continue;
        }

        const result = connectDocument(documentWithNode, connection);
        if (!result.connected) {
          continue;
        }

        commitDocument(result.document, {
          selectionAfter: { nodeIds: [id], edgeIds: [], primary: { type: "node", id } },
        });
        return;
      }
    },
    [
      commitDocument,
      commitSelection,
      connectDocument,
      document,
      filteredItems,
      getConnectionValidity,
      readOnly,
      selectedNode,
    ],
  );

  const exportJson = React.useCallback(() => {
    onExportDocument?.(document);

    if (onExportDocument || typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    downloadEditorJson(document, { filename: "graph-editor-document.json" });
  }, [document, onExportDocument]);

  const importJson = React.useCallback(
    async (file?: File) => {
      if (readOnly || !file) {
        return;
      }

      try {
        const imported = onImportDocument
          ? await onImportDocument(file)
          : await readEditorJsonFile<GraphEditorDocument<TNodeData, TEdgeData, TPortType>>(file);
        const normalized = normalizeGraphWorkbenchDocument(imported, normalizeDocument);
        commitDocument(normalized, { selectionAfter: emptySelection });
        clearActionError();
      } catch (error) {
        reportActionError("import-json", error, "Import failed");
      }
    },
    [
      clearActionError,
      commitDocument,
      normalizeDocument,
      onImportDocument,
      readOnly,
      reportActionError,
    ],
  );

  const copySelection = React.useCallback(async () => {
    try {
      const payload =
        customCopySelection?.(document, selection) ??
        copyGraphEditorSelection<TNodeData, TEdgeData, TPortType>(document, selection);
      clipboardPayloadRef.current = payload;
      setClipboardPayload(payload);

      if (
        isGraphWorkbenchEmptyClipboardPayload(payload) ||
        (typeof payload !== "object" && payload !== null)
      ) {
        clearActionError();
        return;
      }

      try {
        const copied = await writeEditorClipboardJson(payload, {
          fallback: clipboardTextFallbackRef.current,
        });
        if (copied) {
          clearActionError();
        } else {
          reportActionError("copy-selection", "Clipboard write used fallback", "Copy failed");
        }
      } catch (error) {
        reportActionError("copy-selection", error, "Copy failed");
      }
    } catch (error) {
      reportActionError("copy-selection", error, "Copy failed");
    }
  }, [clearActionError, customCopySelection, document, reportActionError, selection]);

  const readClipboardPayload = React.useCallback(async () => {
    const payload = await readEditorClipboardJson({
      fallback: clipboardTextFallbackRef.current,
    });
    if (isGraphWorkbenchReadableClipboardPayload(payload, Boolean(pasteClipboardPayload))) {
      return payload;
    }

    return clipboardPayloadRef.current ?? clipboardPayload;
  }, [clipboardPayload, pasteClipboardPayload]);

  const pasteSelection = React.useCallback(async () => {
    if (readOnly) {
      return;
    }

    try {
      const payload = await readClipboardPayload();
      if (!payload) {
        reportActionError("paste-selection", null, "Paste failed");
        return;
      }

      if (pasteClipboardPayload) {
        const result = pasteClipboardPayload(document, payload);
        commitDocument(result.document, {
          selectionAfter: selectionFromPasteResult(result),
        });
        clearActionError();
        return;
      }

      dispatch(
        createGraphEditorPasteOperation(
          payload as GraphEditorClipboardPayload<TNodeData, TEdgeData, TPortType>,
          { selectionBefore: selection },
        ),
      );
      clearActionError();
    } catch (error) {
      reportActionError("paste-selection", error, "Paste failed");
    }
  }, [
    clearActionError,
    commitDocument,
    dispatch,
    document,
    pasteClipboardPayload,
    readClipboardPayload,
    readOnly,
    reportActionError,
    selection,
  ]);

  const duplicateSelection = React.useCallback(() => {
    if (readOnly || selection.nodeIds.length === 0) {
      return;
    }

    if (customDuplicateSelection) {
      const result = customDuplicateSelection(document, selection);
      commitDocument(result.document, {
        selectionAfter: selectionFromPasteResult(result),
      });
      return;
    }

    dispatch(createGraphEditorDuplicateSelectionOperation(selection));
  }, [commitDocument, customDuplicateSelection, dispatch, document, readOnly, selection]);

  const fitView = React.useCallback(() => {
    const bounds = getGraphWorkbenchDocumentBounds(document);
    const viewport = {
      x: Math.round(48 - bounds.x * graphWorkbenchDefaultZoom),
      y: Math.round(48 - bounds.y * graphWorkbenchDefaultZoom),
      zoom: graphWorkbenchDefaultZoom,
    };
    updateViewport(viewport);
  }, [document, updateViewport]);

  const setZoom = React.useCallback(
    (zoom: number) => {
      const safeZoom = Math.min(Math.max(zoom, 0.5), 1.75);
      const viewport = { ...(document.viewport ?? { x: 0, y: 0, zoom: 1 }), zoom: safeZoom };
      updateViewport(viewport);
    },
    [document, updateViewport],
  );

  const deleteSelection = React.useCallback(() => {
    if (readOnly) {
      return;
    }
    if (removeSelection) {
      commitDocument(removeSelection(document, selection), { selectionAfter: emptySelection });
      return;
    }

    dispatch(createGraphEditorRemoveSelectionOperation(selection));
  }, [commitDocument, dispatch, document, readOnly, removeSelection, selection]);

  const groupSelection = React.useCallback(() => {
    if (readOnly || selection.nodeIds.length < 1) {
      return;
    }

    if (createGroup) {
      const nextDocument = createGroup(document, selection.nodeIds);
      const previousGroupIds = new Set((document.groups ?? []).map((group) => group.id));
      const group = (nextDocument.groups ?? []).find(
        (candidate) => !previousGroupIds.has(candidate.id),
      );
      commitDocument(nextDocument, {
        selectionAfter: group
          ? {
              nodeIds: [],
              edgeIds: [],
              groupIds: [group.id],
              primary: { type: "group", id: group.id },
            }
          : selection,
      });
      return;
    }

    dispatch(
      createGraphEditorCreateGroupOperation(selection.nodeIds, { selectionBefore: selection }),
    );
  }, [commitDocument, createGroup, dispatch, document, readOnly, selection]);

  const ungroupSelection = React.useCallback(() => {
    if (readOnly || !selection.groupIds?.length) {
      return;
    }

    dispatch(
      createGraphEditorUngroupOperation(selection.groupIds, {
        selectionBefore: selection,
        selectionAfter: { nodeIds: selection.nodeIds, edgeIds: selection.edgeIds },
      }),
    );
  }, [dispatch, readOnly, selection]);

  const autoLayout = React.useCallback(() => {
    if (readOnly) {
      return;
    }

    if (layoutDocument) {
      commitDocument(layoutDocument(document));
      return;
    }

    dispatch(
      createGraphEditorLayoutOperation<TNodeData, TEdgeData, TPortType>({
        direction: "right",
        nodeSeparation: 80,
        rankSeparation: 120,
      }),
    );
  }, [commitDocument, dispatch, document, layoutDocument, readOnly]);

  const undo = React.useCallback(() => {
    if (!runtimeState.canUndo) {
      return;
    }
    commitRuntime(undoGraphEditorRuntime(runtimeState));
  }, [commitRuntime, runtimeState]);

  const redo = React.useCallback(() => {
    if (!runtimeState.canRedo) {
      return;
    }
    commitRuntime(redoGraphEditorRuntime(runtimeState));
  }, [commitRuntime, runtimeState]);

  const actionsRef = React.useRef<Record<string, () => void | Promise<void>>>({});
  const runCommand = React.useCallback(
    (commandId: GraphWorkbenchCommandId | string) => {
      onCommand?.(commandId);
      try {
        const result = actionsRef.current[commandId]?.();
        if (result instanceof Promise) {
          return result.catch((error: unknown) => {
            reportActionError("command", error, "Command failed");
          });
        }
        return result;
      } catch (error) {
        reportActionError("command", error, "Command failed");
      }
    },
    [onCommand, reportActionError],
  );

  const controller = React.useMemo<
    GraphWorkbenchController<TNodeData, TEdgeData, TPortType>
  >(() => {
    const controllerActions: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>["actions"] =
      {
        addTemplateNode,
        appendTemplateNode,
        deleteSelection,
        setSelection: commitSelection,
        updateDocument: commitDocument,
        undo,
        redo,
        copySelection,
        pasteSelection,
        duplicateSelection,
        selectAll() {
          commitSelection({
            nodeIds: document.nodes.map((node) => node.id),
            edgeIds: [],
            primary: document.nodes.at(-1)
              ? { type: "node", id: document.nodes.at(-1)!.id }
              : undefined,
          });
        },
        fitView,
        autoLayout,
        groupSelection,
        ungroupSelection,
        importJson,
        exportJson,
        runCommand,
      };
    const commands = createGraphWorkbenchActions({
      actions: controllerActions,
      canPaste:
        Boolean(clipboardPayload) ||
        (typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function"),
      canRedo: runtimeState.canRedo,
      canUndo: runtimeState.canUndo,
      hasSelection: selection.nodeIds.length > 0 || selection.edgeIds.length > 0,
      nodeSelectionCount: selection.nodeIds.length,
      readOnly,
      runtime: runtimeState.runtime,
      selectedGroupCount: selection.groupIds?.length ?? 0,
    });

    const baseController = {
      runtime: runtimeState,
      dispatch,
      document,
      readOnly,
      selection,
      selectedNode,
      selectedEdge,
      selectedGroup,
      diagnostics,
      selectedDiagnostics,
      history: {
        ...runtimeState.operationHistory,
        canUndo: runtimeState.canUndo,
        canRedo: runtimeState.canRedo,
      },
      status: {
        actionError,
        clearActionError,
      },
      palette: {
        groups,
        items: nodeTemplates,
        filteredItems,
        searchValue,
        setSearchValue,
      },
      view: {
        showPalette,
        showInspector,
        showMiniMap: internalShowMiniMap,
        setShowPalette,
        setShowInspector,
        setShowMiniMap,
        setZoom,
      },
      actions: controllerActions,
      commands,
    };
    const additionalCommands =
      typeof customCommands === "function"
        ? customCommands(baseController)
        : (customCommands ?? []);
    return {
      ...baseController,
      commands: [...commands, ...additionalCommands],
    };
  }, [
    addTemplateNode,
    appendTemplateNode,
    actionError,
    autoLayout,
    clipboardPayload,
    clearActionError,
    commitDocument,
    commitSelection,
    copySelection,
    deleteSelection,
    diagnostics,
    document,
    duplicateSelection,
    exportJson,
    filteredItems,
    fitView,
    groupSelection,
    groups,
    importJson,
    internalShowMiniMap,
    nodeTemplates,
    pasteSelection,
    readOnly,
    redo,
    runCommand,
    searchValue,
    selectedDiagnostics,
    selectedEdge,
    selectedNode,
    selection,
    dispatch,
    runtimeState,
    customCommands,
    setZoom,
    showInspector,
    showPalette,
    selectedGroup,
    undo,
    ungroupSelection,
  ]);

  React.useLayoutEffect(() => {
    actionsRef.current = Object.fromEntries(
      controller.commands.map((command) => [command.id, command.run]),
    );
  }, [controller.commands]);

  return controller;
}

type UseGraphWorkbenchHotkeysOptions<TId extends string> = {
  commands: readonly EditorCommandDefinition<TId>[];
  disabled?: boolean;
  readOnly?: boolean;
  allowEditableTargets?: boolean;
  scopeRef?: React.RefObject<HTMLElement | null>;
};

export function useGraphWorkbenchHotkeys<TId extends string>({
  commands,
  disabled = false,
  readOnly = false,
  allowEditableTargets = false,
  scopeRef,
}: UseGraphWorkbenchHotkeysOptions<TId>) {
  React.useEffect(() => {
    if (disabled || typeof document === "undefined") {
      return;
    }

    const scope = scopeRef?.current ?? null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (scope && !isGraphWorkbenchHotkeyInScope(scope, event)) {
        return;
      }

      if (!allowEditableTargets && isEditorEditableTarget(event.target)) {
        return;
      }

      const commandId = allowEditableTargets
        ? (commands.find(
            (command) =>
              !command.disabled &&
              command.hotkeys?.some((hotkey) => matchesEditorHotkey(event, hotkey)),
          )?.id ?? null)
        : getEditorCommandIdFromKeyboardEvent(event, commands);
      const command = commands.find((candidate) => candidate.id === commandId);
      if (!command?.run) {
        return;
      }

      event.preventDefault();
      void command.run(event);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [allowEditableTargets, commands, disabled, readOnly, scopeRef]);
}

function isGraphWorkbenchHotkeyInScope(scope: HTMLElement, event: KeyboardEvent) {
  const target = event.target;
  if (target instanceof Node && scope.contains(target)) {
    return true;
  }

  const activeElement = document.activeElement;
  return activeElement === document.body || Boolean(activeElement && scope.contains(activeElement));
}

export const graphWorkbenchContextPadFallbackSize = { width: 226, height: 50 };

export function getInitialGraphWorkbenchContextPadContainerSize() {
  if (typeof window === "undefined") {
    return { width: 0, height: 0 };
  }

  return {
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight,
  };
}

export function updateGraphWorkbenchMeasuredSize(
  current: { width: number; height: number },
  next: { width: number; height: number },
) {
  if (Math.abs(current.width - next.width) < 0.5 && Math.abs(current.height - next.height) < 0.5) {
    return current;
  }

  return next;
}

export function getGraphWorkbenchContextPadPosition({
  node,
  nodeSize,
  viewport,
  padSize,
  containerSize,
}: {
  node: { x: number; y: number };
  nodeSize: { width: number; height: number };
  viewport: GraphEditorViewport;
  padSize: { width: number; height: number };
  containerSize: { width: number; height: number };
}) {
  const gap = graphWorkbenchOverlayMargin;
  const nodeLeft = viewport.x + node.x * viewport.zoom;
  const nodeTop = viewport.y + node.y * viewport.zoom;
  const nodeRight = viewport.x + (node.x + nodeSize.width) * viewport.zoom;
  const nodeBottom = viewport.y + (node.y + nodeSize.height) * viewport.zoom;
  const right = { left: nodeRight + gap, top: nodeTop };

  if (fitsGraphWorkbenchContextPadHorizontally(right.left, padSize.width, containerSize.width)) {
    return clampGraphWorkbenchContextPadToContainer(right, padSize, containerSize);
  }

  const left = { left: nodeLeft - padSize.width - gap, top: nodeTop };
  if (fitsGraphWorkbenchContextPadHorizontally(left.left, padSize.width, containerSize.width)) {
    return clampGraphWorkbenchContextPadToContainer(left, padSize, containerSize);
  }

  const below = { left: nodeLeft, top: nodeBottom + gap };
  if (fitsGraphWorkbenchContextPadVertically(below.top, padSize.height, containerSize.height)) {
    return clampGraphWorkbenchContextPadToContainer(below, padSize, containerSize);
  }

  return clampGraphWorkbenchContextPadToContainer(
    { left: nodeLeft, top: nodeTop - padSize.height - gap },
    padSize,
    containerSize,
  );
}

function fitsGraphWorkbenchContextPadHorizontally(
  left: number,
  width: number,
  containerWidth: number,
) {
  if (containerWidth <= 0) {
    return true;
  }

  return (
    left >= graphWorkbenchOverlayMargin &&
    left + width <= containerWidth - graphWorkbenchOverlayMargin
  );
}

function fitsGraphWorkbenchContextPadVertically(
  top: number,
  height: number,
  containerHeight: number,
) {
  if (containerHeight <= 0) {
    return true;
  }

  return (
    top >= graphWorkbenchOverlayMargin &&
    top + height <= containerHeight - graphWorkbenchOverlayMargin
  );
}

function clampGraphWorkbenchContextPadToContainer(
  position: { left: number; top: number },
  padSize: { width: number; height: number },
  containerSize: { width: number; height: number },
) {
  if (containerSize.width <= 0 || containerSize.height <= 0) {
    return position;
  }

  const minLeft = graphWorkbenchOverlayMargin;
  const minTop = graphWorkbenchOverlayMargin;
  const maxLeft = Math.max(
    minLeft,
    containerSize.width - padSize.width - graphWorkbenchOverlayMargin,
  );
  const maxTop = Math.max(
    minTop,
    containerSize.height - padSize.height - graphWorkbenchOverlayMargin,
  );

  return {
    left: Math.min(Math.max(position.left, minLeft), maxLeft),
    top: Math.min(Math.max(position.top, minTop), maxTop),
  };
}

function createGraphWorkbenchActions<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>({
  actions,
  canPaste,
  canRedo,
  canUndo,
  hasSelection,
  nodeSelectionCount,
  readOnly,
  runtime,
  selectedGroupCount,
}: {
  actions: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>["actions"];
  canPaste: boolean;
  canRedo: boolean;
  canUndo: boolean;
  hasSelection: boolean;
  nodeSelectionCount: number;
  readOnly: boolean;
  runtime: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType>["runtime"];
  selectedGroupCount: number;
}): GraphWorkbenchAction[] {
  const documentIoActions = createEditorDocumentIoCommands<
    GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    GraphEditorSelectionState
  >({
    runtime,
    export: {
      disabled: false,
      run: actions.exportJson,
    },
    import: {
      disabled: readOnly,
      run: () => actions.importJson(),
    },
    include: ["export", "import"],
    labels: {
      export: "Export JSON",
      import: "Import JSON",
    },
  });
  const documentIoWorkbenchActions: GraphWorkbenchAction[] = documentIoActions.map((command) => ({
    id: command.id === "export" ? "export-json" : "import-json",
    label: command.label,
    disabled: command.disabled,
    run() {
      if (!command.run) {
        return;
      }
      return command.run({
        altKey: false,
        ctrlKey: false,
        key: "",
        metaKey: false,
        shiftKey: false,
        target: null,
      });
    },
  }));

  return [
    {
      id: "undo",
      label: "Undo",
      shortcut: getGraphWorkbenchShortcutLabel("undo"),
      disabled: !canUndo,
      run: actions.undo,
    },
    {
      id: "redo",
      label: "Redo",
      shortcut: getGraphWorkbenchShortcutLabel("redo"),
      disabled: !canRedo,
      run: actions.redo,
    },
    {
      id: "copy",
      label: "Copy",
      shortcut: getGraphWorkbenchShortcutLabel("copy"),
      disabled: !hasSelection,
      run: actions.copySelection,
    },
    {
      id: "paste",
      label: "Paste",
      shortcut: getGraphWorkbenchShortcutLabel("paste"),
      disabled: readOnly || !canPaste,
      run: actions.pasteSelection,
    },
    {
      id: "duplicate",
      label: "Duplicate",
      shortcut: getGraphWorkbenchShortcutLabel("duplicate"),
      disabled: readOnly || nodeSelectionCount === 0,
      run: actions.duplicateSelection,
    },
    {
      id: "delete",
      label: "Delete",
      shortcut: getGraphWorkbenchShortcutLabel("delete"),
      destructive: true,
      disabled: readOnly || !hasSelection,
      run: actions.deleteSelection,
    },
    {
      id: "select-all",
      label: "Select all",
      shortcut: getGraphWorkbenchShortcutLabel("select-all"),
      disabled: false,
      run: actions.selectAll,
    },
    {
      id: "fit-view",
      label: "Fit view",
      disabled: false,
      run: actions.fitView,
    },
    {
      id: "auto-layout",
      label: "Auto layout",
      disabled: readOnly,
      run: actions.autoLayout,
    },
    ...documentIoWorkbenchActions,
    {
      id: "group-selection",
      label: "Group selection",
      disabled: readOnly || nodeSelectionCount < 1,
      run: actions.groupSelection,
    },
    {
      id: "ungroup-selection",
      label: "Ungroup selection",
      disabled: readOnly || selectedGroupCount < 1,
      run: actions.ungroupSelection,
    },
  ];
}

export function createGraphWorkbenchHotkeyCommands(
  commands: readonly GraphWorkbenchAction[],
): Array<EditorCommandDefinition<GraphWorkbenchCommandId | string>> {
  return commands.map((command) => ({
    disabled: command.disabled,
    hotkeys: graphWorkbenchCommandShortcuts[command.id as GraphWorkbenchCommandId] ?? [],
    id: command.id,
    label: String(command.label ?? command.id),
    run: command.run,
  }));
}

function formatGraphWorkbenchActionErrorDetail(error: unknown) {
  if (error === null || error === undefined) {
    return {};
  }

  if (error instanceof Error) {
    return { detail: error.message };
  }

  return { detail: String(error) };
}

export function getDefaultNodeInspectorSections<
  TNodeData = Record<string, unknown>,
  TPortType = unknown,
>(node: GraphEditorNode<TNodeData, TPortType>): InspectorPanelSectionData[] {
  return [
    {
      id: "general",
      title: "General",
      defaultOpen: true,
      fields: [
        { id: "label", label: "Label", type: "text", value: node.label },
        {
          id: "description",
          label: "Description",
          type: "textarea",
          value: node.description ?? "",
        },
        { id: "kind", label: "Kind", type: "text", value: node.kind ?? "" },
        { id: "category", label: "Category", type: "text", value: node.category ?? "" },
      ],
    },
    {
      id: "presentation",
      title: "Presentation",
      fields: [
        { id: "tone", label: "Tone", type: "text", value: node.tone ?? "" },
        { id: "status", label: "Status", type: "text", value: node.status ?? "" },
        {
          id: "variant",
          label: "Variant",
          type: "select",
          value: node.variant ?? "default",
          options: [
            { label: "Default", value: "default" },
            { label: "Compact", value: "compact" },
          ],
        },
        { id: "minimized", label: "Minimized", type: "boolean", value: Boolean(node.minimized) },
      ],
    },
    {
      id: "data",
      title: "Data",
      defaultOpen: false,
      fields: [
        {
          id: "data",
          label: "Data",
          type: "code",
          readOnly: true,
          value: JSON.stringify(node.data ?? {}, null, 2),
        },
        {
          id: "metadata",
          label: "Metadata",
          type: "code",
          readOnly: true,
          value: JSON.stringify(node.metadata ?? {}, null, 2),
        },
      ],
    },
  ];
}

export function getDefaultEdgeInspectorSections<TEdgeData = Record<string, unknown>>(
  edge: GraphEditorEdge<TEdgeData>,
): InspectorPanelSectionData[] {
  return [
    {
      id: "connection",
      title: "Connection",
      defaultOpen: true,
      fields: [
        {
          id: "sourceNodeId",
          label: "Source node",
          type: "text",
          readOnly: true,
          value: edge.sourceNodeId,
        },
        {
          id: "sourcePortId",
          label: "Source port",
          type: "text",
          readOnly: true,
          value: edge.sourcePortId,
        },
        {
          id: "targetNodeId",
          label: "Target node",
          type: "text",
          readOnly: true,
          value: edge.targetNodeId,
        },
        {
          id: "targetPortId",
          label: "Target port",
          type: "text",
          readOnly: true,
          value: edge.targetPortId,
        },
      ],
    },
    {
      id: "presentation",
      title: "Presentation",
      fields: [
        { id: "status", label: "Status", type: "text", value: edge.status ?? "" },
        { id: "color", label: "Color", type: "color", value: edge.color ?? "#000000" },
      ],
    },
    {
      id: "data",
      title: "Data",
      defaultOpen: false,
      fields: [
        {
          id: "data",
          label: "Data",
          type: "code",
          readOnly: true,
          value: JSON.stringify(edge.data ?? {}, null, 2),
        },
        {
          id: "metadata",
          label: "Metadata",
          type: "code",
          readOnly: true,
          value: JSON.stringify(edge.metadata ?? {}, null, 2),
        },
      ],
    },
  ];
}

export function getDefaultGroupInspectorSections(
  group: GraphEditorGroup,
): InspectorPanelSectionData[] {
  return [
    {
      id: "general",
      title: "General",
      defaultOpen: true,
      fields: [
        { id: "label", label: "Label", type: "text", value: group.label },
        {
          id: "minimized",
          label: "Minimized",
          type: "boolean",
          value: Boolean(group.minimized),
        },
      ],
    },
    {
      id: "members",
      title: "Members",
      defaultOpen: false,
      fields: [
        {
          id: "nodeIds",
          label: "Node IDs",
          type: "code",
          readOnly: true,
          value: JSON.stringify(group.nodeIds, null, 2),
        },
      ],
    },
  ];
}

export function getDefaultNodeInspectorPatch<
  TNodeData = Record<string, unknown>,
  TPortType = unknown,
>(values: Record<string, InspectorFieldValue>): Partial<GraphEditorNode<TNodeData, TPortType>> {
  const variant: GraphEditorNode<TNodeData, TPortType>["variant"] =
    values.variant === "compact" ? "compact" : "default";

  return {
    label: String(values.label ?? ""),
    description: optionalString(values.description),
    kind: optionalString(values.kind),
    category: optionalString(values.category),
    tone: optionalString(values.tone),
    status: optionalString(values.status),
    variant,
    minimized: Boolean(values.minimized),
  };
}

export function getDefaultEdgeInspectorPatch<TEdgeData = Record<string, unknown>>(
  values: Record<string, InspectorFieldValue>,
): Partial<GraphEditorEdge<TEdgeData>> {
  return {
    status: optionalString(values.status),
    color: optionalString(values.color),
  };
}

export function getDefaultGroupInspectorPatch(
  values: Record<string, InspectorFieldValue>,
): Partial<GraphEditorGroup> {
  return {
    label: String(values.label ?? ""),
    minimized: Boolean(values.minimized),
  };
}

function optionalString(value: InspectorFieldValue) {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text : undefined;
}

function getGraphWorkbenchDocumentBounds(document: GraphEditorDocument<any, any, any>) {
  if (document.nodes.length === 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const boxes = document.nodes.map((node) => {
    const size = getGraphEditorNodeSize(node);
    return {
      x: node.x,
      y: node.y,
      width: size.width,
      height: size.height,
    };
  });
  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

const graphWorkbenchDocumentsEqual =
  createStableEditorJsonEquals<GraphEditorDocument<any, any, any>>();

function normalizeGraphWorkbenchDocument<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  normalizeDocument?: (
    document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  ) => GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
) {
  return (
    normalizeDocument?.(document) ??
    normalizeGraphEditorDocument<TNodeData, TEdgeData, TPortType>(document, { mode: "repair" })
  );
}

function selectionFromPasteResult(result: {
  nodeIds: string[];
  edgeIds: string[];
  groupIds?: string[];
}): GraphEditorSelectionState {
  const groupId = result.groupIds?.[0];
  const nodeId = result.nodeIds[0];
  const edgeId = result.edgeIds[0];

  return {
    nodeIds: result.nodeIds,
    edgeIds: result.edgeIds,
    ...(result.groupIds?.length ? { groupIds: result.groupIds } : {}),
    ...(groupId
      ? { primary: { type: "group" as const, id: groupId } }
      : nodeId
        ? { primary: { type: "node" as const, id: nodeId } }
        : edgeId
          ? { primary: { type: "edge" as const, id: edgeId } }
          : {}),
  };
}

function isGraphWorkbenchEmptyClipboardPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return true;
  }

  const candidate = payload as { nodes?: unknown[]; edges?: unknown[]; groups?: unknown[] };
  return (
    Array.isArray(candidate.nodes) &&
    Array.isArray(candidate.edges) &&
    candidate.nodes.length === 0 &&
    candidate.edges.length === 0 &&
    (!Array.isArray(candidate.groups) || candidate.groups.length === 0)
  );
}

function isGraphWorkbenchReadableClipboardPayload(payload: unknown, acceptsCustomPayload: boolean) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return (
    (payload as { format?: unknown }).format === graphEditorClipboardFormat || acceptsCustomPayload
  );
}

function createGraphWorkbenchDocumentOperation<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  selection: GraphEditorSelectionState,
  history = true,
): GraphEditorOperation<TNodeData, TEdgeData, TPortType> {
  return {
    id: "graph.replace-document",
    label: "Update document",
    apply: () => document,
    selectionAfter: selection,
    metadata: { graphEditor: { history } },
  };
}

export function createGraphWorkbenchConnectionValidationOptions<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  options: GraphEditorConnectionValidationOptions<TNodeData, TEdgeData, TPortType> | undefined,
  overrides: Partial<GraphEditorConnectionValidationOptions<TNodeData, TEdgeData, TPortType>> = {},
): GraphEditorConnectionValidationOptions<TNodeData, TEdgeData, TPortType> {
  return {
    ...options,
    ...overrides,
    arePortsCompatible:
      overrides.arePortsCompatible ??
      options?.arePortsCompatible ??
      ((sourcePort, targetPort) => {
        const sourceType = getGraphWorkbenchPortTypeSource(sourcePort);
        const targetType = getGraphWorkbenchPortTypeSource(targetPort);

        return !sourceType || !targetType || sourceType === targetType;
      }),
  };
}

function getGraphWorkbenchPortTypeSource(port: GraphEditorPort) {
  if (!port.type) {
    return undefined;
  }

  if (typeof port.type === "string") {
    return port.type.trim();
  }

  if (typeof port.type === "object" && port.type !== null) {
    const candidate = port.type as { source?: unknown; kind?: unknown };
    const source = candidate.source ?? candidate.kind;
    return typeof source === "string" ? source.trim() : undefined;
  }

  return undefined;
}

function getFirstValidGraphWorkbenchConnection<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  sourceNodeId: string,
  targetNodeId: string,
  getConnectionValidity: (
    document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    connection: GraphEditorConnectionInput,
  ) => GraphEditorConnectionValidity,
) {
  const sourceNode = document.nodes.find((node) => node.id === sourceNodeId);
  const targetNode = document.nodes.find((node) => node.id === targetNodeId);

  for (const sourcePort of sourceNode?.outputs ?? []) {
    for (const targetPort of targetNode?.inputs ?? []) {
      const connection = {
        sourceNodeId,
        sourcePortId: sourcePort.id,
        targetNodeId,
        targetPortId: targetPort.id,
      };
      if (getConnectionValidity(document, connection).valid) {
        return connection;
      }
    }
  }

  return null;
}

function createGraphWorkbenchNodeId(baseId: string, document: GraphEditorDocument<any, any, any>) {
  return createUniqueEditorId(baseId, new Set(document.nodes.map((node) => node.id)));
}

function createGraphWorkbenchEdgeId(
  document: GraphEditorDocument<any, any, any>,
  connection: GraphEditorConnectionInput,
) {
  return createUniqueEditorId(
    `edge-${connection.sourceNodeId}-${connection.sourcePortId}-${connection.targetNodeId}-${connection.targetPortId}`,
    new Set(document.edges.map((edge) => edge.id)),
  );
}
