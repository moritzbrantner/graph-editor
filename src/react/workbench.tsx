"use client";

import * as React from "react";
import {
  ClipboardPasteIcon,
  CopyIcon,
  DownloadIcon,
  FileUpIcon,
  GroupIcon,
  Maximize2Icon,
  MinusIcon,
  NetworkIcon,
  PanelLeftIcon,
  PanelRightIcon,
  PlusIcon,
  Redo2Icon,
  Rows3Icon,
  Trash2Icon,
  Undo2Icon,
  WorkflowIcon,
} from "lucide-react";

import { Badge, Button, Input, Separator, cn } from "@moritzbrantner/ui";
import {
  commitEditorSnapshotHistory,
  createEditorSnapshotHistory,
  downloadEditorJson,
  readEditorJsonFile,
  redoEditorSnapshotHistory,
  undoEditorSnapshotHistory,
  type EditorSnapshotHistory,
} from "@moritzbrantner/editor-core";
import {
  addGraphEditorEdge,
  copyGraphEditorSelection,
  createGraphEditorGroup,
  duplicateGraphEditorSelection,
  graphEditorClipboardFormat,
  normalizeGraphEditorDocument,
  normalizeGraphEditorSelection,
  pasteGraphEditorClipboardPayload,
  removeGraphEditorSelection,
  ungroupGraphEditorGroup,
  updateGraphEditorEdge,
  updateGraphEditorNode,
  validateGraphEditorConnection,
  validateGraphEditorDocument,
  type GraphEditorClipboardPayload,
  type GraphEditorConnectionInput,
  type GraphEditorConnectionValidationOptions,
  type GraphEditorConnectionValidity,
  type GraphEditorDocument,
  type GraphEditorDocumentDiagnostic,
  type GraphEditorEdge,
  type GraphEditorNode,
  type GraphEditorNodeTemplate,
  type GraphEditorSelectionState,
  type GraphEditorViewport,
} from "../core";
import { layoutGraphEditorDocument } from "../layout";
import { getGraphNodePortTypeSource, getGraphNodeSize } from "./graph-node";
import {
  InspectorPanel,
  type InspectorFieldValue,
  type InspectorPanelSectionData,
} from "./inspector-panel";
import { GraphCanvas, type GraphCanvasConnection, type GraphCanvasSelection } from "./graph-canvas";
import {
  getGraphWorkbenchCommandFromKeyboardEvent,
  getGraphWorkbenchShortcutLabel,
  type GraphWorkbenchAction,
  type GraphWorkbenchCommandId,
} from "./workbench-commands";
import {
  createGraphWorkbenchPaletteCategoryGroups,
  filterGraphWorkbenchPaletteTemplates,
  type GraphWorkbenchPaletteCategoryGroup,
  type GraphWorkbenchPaletteItem,
} from "./palette-model";

export type GraphWorkbenchInspectorSchema<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  getNodeSections?: (node: GraphEditorNode<TNodeData, TPortType>) => InspectorPanelSectionData[];
  getEdgeSections?: (edge: GraphEditorEdge<TEdgeData>) => InspectorPanelSectionData[];
  applyNodeValues?: (
    node: GraphEditorNode<TNodeData, TPortType>,
    values: Record<string, InspectorFieldValue>,
  ) => Partial<GraphEditorNode<TNodeData, TPortType>>;
  applyEdgeValues?: (
    edge: GraphEditorEdge<TEdgeData>,
    values: Record<string, InspectorFieldValue>,
  ) => Partial<GraphEditorEdge<TEdgeData>>;
};

export type GraphWorkbenchController<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  readOnly: boolean;
  selection: GraphEditorSelectionState;
  selectedNode?: GraphEditorNode<TNodeData, TPortType>;
  selectedEdge?: GraphEditorEdge<TEdgeData>;
  diagnostics: GraphEditorDocumentDiagnostic[];
  selectedDiagnostics: GraphEditorDocumentDiagnostic[];
  history: EditorSnapshotHistory<GraphEditorDocument<TNodeData, TEdgeData, TPortType>>;
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
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  nodeTemplates?: ReadonlyArray<GraphEditorNodeTemplate<TNodeData, TPortType>>;
  selectedNodeIds?: readonly string[] | null;
  selectedEdgeIds?: readonly string[] | null;
  selectedGroupIds?: readonly string[] | null;
  readOnly?: boolean;
  className?: string;
  showMiniMap?: boolean;
  history?: "internal" | "external" | false;
  maxHistory?: number;
  inspectorSchema?: GraphWorkbenchInspectorSchema<TNodeData, TEdgeData, TPortType>;
  onDocumentChange?: (document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>) => void;
  onSelectionStateChange?: (selection: GraphEditorSelectionState) => void;
  onViewportChange?: (viewport: GraphEditorViewport) => void;
  onImportDocument?: (file: File) => Promise<GraphEditorDocument<TNodeData, TEdgeData, TPortType>>;
  onExportDocument?: (document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>) => void;
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
};

type GraphWorkbenchCommitOptions = {
  history?: boolean;
  drag?: "move" | "end";
};

const emptySelection: GraphEditorSelectionState = { nodeIds: [], edgeIds: [] };
const graphWorkbenchDefaultZoom = 0.9;

export function GraphWorkbench<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>({
  document,
  nodeTemplates = [],
  selectedNodeIds,
  selectedEdgeIds,
  selectedGroupIds,
  readOnly = false,
  className,
  showMiniMap = true,
  history: historyMode = "internal",
  maxHistory = 100,
  inspectorSchema,
  onDocumentChange,
  onSelectionStateChange,
  onViewportChange,
  onImportDocument,
  onExportDocument,
  onCommand,
  connectionValidationOptions,
  createEdge,
  renderToolbar,
  renderPalette,
  renderInspector,
  renderContextPad,
}: GraphWorkbenchProps<TNodeData, TEdgeData, TPortType>) {
  const [internalSelection, setInternalSelection] =
    React.useState<GraphEditorSelectionState>(emptySelection);
  const [searchValue, setSearchValue] = React.useState("");
  const [showPalette, setShowPalette] = React.useState(true);
  const [showInspector, setShowInspector] = React.useState(true);
  const [internalShowMiniMap, setShowMiniMap] = React.useState(showMiniMap);
  const [clipboardPayload, setClipboardPayload] = React.useState<GraphEditorClipboardPayload<
    TNodeData,
    TEdgeData,
    TPortType
  > | null>(null);
  const [historyState, setHistoryState] = React.useState(() =>
    createEditorSnapshotHistory(document),
  );
  const workbenchRef = React.useRef<HTMLDivElement>(null);
  const dragHistoryBaseRef = React.useRef<GraphEditorDocument<
    TNodeData,
    TEdgeData,
    TPortType
  > | null>(null);
  const externalSelectionProvided =
    selectedNodeIds !== undefined ||
    selectedEdgeIds !== undefined ||
    selectedGroupIds !== undefined;
  const rawSelection = externalSelectionProvided
    ? {
        nodeIds: [...(selectedNodeIds ?? [])],
        edgeIds: [...(selectedEdgeIds ?? [])],
        ...(selectedGroupIds?.length ? { groupIds: [...selectedGroupIds] } : {}),
      }
    : internalSelection;
  const selection = React.useMemo(
    () => normalizeGraphEditorSelection(document, rawSelection),
    [document, rawSelection],
  );
  const selectedNode = document.nodes.find((node) => node.id === selection.nodeIds.at(-1));
  const selectedEdge = document.edges.find((edge) => edge.id === selection.edgeIds.at(-1));
  const diagnostics = React.useMemo(() => validateGraphEditorDocument(document), [document]);
  const selectedDiagnostics = React.useMemo(
    () =>
      diagnostics.filter(
        (diagnostic) =>
          (selectedNode &&
            (diagnostic.nodeId === selectedNode.id ||
              diagnostic.sourceNodeId === selectedNode.id ||
              diagnostic.targetNodeId === selectedNode.id)) ||
          (selectedEdge && diagnostic.edgeId === selectedEdge.id),
      ),
    [diagnostics, selectedEdge, selectedNode],
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
    setHistoryState((current) =>
      current.present === document ? current : { ...current, present: document },
    );
  }, [document]);

  React.useEffect(() => {
    setShowMiniMap(showMiniMap);
  }, [showMiniMap]);

  const commitSelection = React.useCallback(
    (nextSelection: GraphEditorSelectionState) => {
      const normalized = normalizeGraphEditorSelection(document, nextSelection);
      if (!externalSelectionProvided) {
        setInternalSelection(normalized);
      }
      onSelectionStateChange?.(normalized);
    },
    [document, externalSelectionProvided, onSelectionStateChange],
  );

  const commitDocument = React.useCallback(
    (
      nextDocument: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
      options: GraphWorkbenchCommitOptions = {},
    ) => {
      const withHistory = historyMode !== false && options.history !== false;

      if (options.drag === "move") {
        dragHistoryBaseRef.current ??= document;
        onDocumentChange?.(nextDocument);
        return;
      }

      if (options.drag === "end") {
        const baseDocument = dragHistoryBaseRef.current;
        dragHistoryBaseRef.current = null;

        if (
          withHistory &&
          baseDocument &&
          !graphWorkbenchDocumentsEqual(baseDocument, nextDocument)
        ) {
          setHistoryState((current) =>
            commitEditorSnapshotHistory({ ...current, present: baseDocument }, nextDocument, {
              limit: maxHistory,
              equals: graphWorkbenchDocumentsEqual,
            }),
          );
        }
        onDocumentChange?.(nextDocument);
        return;
      }

      if (withHistory) {
        setHistoryState((current) =>
          commitEditorSnapshotHistory(current, nextDocument, {
            limit: maxHistory,
            equals: graphWorkbenchDocumentsEqual,
          }),
        );
      } else {
        setHistoryState((current) => ({ ...current, present: nextDocument }));
      }
      onDocumentChange?.(nextDocument);
    },
    [document, historyMode, maxHistory, onDocumentChange],
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
      const nextDocument = normalizeGraphEditorDocument({
        ...document,
        nodes: [
          ...document.nodes,
          {
            ...template,
            id,
            x: position.x,
            y: position.y,
          } as GraphEditorNode<TNodeData, TPortType>,
        ],
      });
      commitDocument(nextDocument);
      commitSelection({ nodeIds: [id], edgeIds: [], primary: { type: "node", id } });
    },
    [commitDocument, commitSelection, document, getViewportCenterPosition, readOnly],
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
    [createEdge, getConnectionValidity],
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
        const sourceSize = getGraphNodeSize(sourceNode as any);
        const nextNode = {
          ...candidateTemplate,
          id,
          x: sourceNode.x + sourceSize.width + 120,
          y: sourceNode.y,
        } as GraphEditorNode<TNodeData, TPortType>;
        const documentWithNode = normalizeGraphEditorDocument({
          ...document,
          nodes: [...document.nodes, nextNode],
        });
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

        commitDocument(result.document);
        commitSelection({ nodeIds: [id], edgeIds: [], primary: { type: "node", id } });
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

      const imported = onImportDocument
        ? await onImportDocument(file)
        : await readEditorJsonFile<GraphEditorDocument<TNodeData, TEdgeData, TPortType>>(file);
      const normalized = normalizeGraphEditorDocument(imported, { mode: "repair" });
      commitDocument(normalized);
      commitSelection(emptySelection);
    },
    [commitDocument, commitSelection, onImportDocument, readOnly],
  );

  const copySelection = React.useCallback(async () => {
    const payload = copyGraphEditorSelection(document, selection);
    setClipboardPayload(payload);

    if (payload.nodes.length === 0 && payload.edges.length === 0) {
      return;
    }

    const text = JSON.stringify(payload);
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // The in-memory fallback still enables paste in the current session.
    }
  }, [document, selection]);

  const readClipboardPayload = React.useCallback(async () => {
    try {
      const text = await navigator.clipboard?.readText();
      const payload = text ? JSON.parse(text) : null;
      if (payload?.format === graphEditorClipboardFormat) {
        return payload as GraphEditorClipboardPayload<TNodeData, TEdgeData, TPortType>;
      }
    } catch {
      return clipboardPayload;
    }

    return clipboardPayload;
  }, [clipboardPayload]);

  const pasteSelection = React.useCallback(async () => {
    if (readOnly) {
      return;
    }

    const payload = await readClipboardPayload();
    if (!payload) {
      return;
    }

    const result = pasteGraphEditorClipboardPayload(document, payload);
    commitDocument(result.document);
    commitSelection({
      nodeIds: result.nodeIds,
      edgeIds: result.edgeIds,
      ...(result.groupIds?.length ? { groupIds: result.groupIds } : {}),
      primary:
        result.nodeIds.length > 0
          ? { type: "node", id: result.nodeIds.at(-1)! }
          : result.edgeIds.length > 0
            ? { type: "edge", id: result.edgeIds.at(-1)! }
            : undefined,
    });
  }, [commitDocument, commitSelection, document, readClipboardPayload, readOnly]);

  const duplicateSelection = React.useCallback(() => {
    if (readOnly || selection.nodeIds.length === 0) {
      return;
    }

    const result = duplicateGraphEditorSelection(document, selection);
    commitDocument(result.document);
    commitSelection({
      nodeIds: result.nodeIds,
      edgeIds: result.edgeIds,
      ...(result.groupIds?.length ? { groupIds: result.groupIds } : {}),
      primary: result.nodeIds.length > 0 ? { type: "node", id: result.nodeIds.at(-1)! } : undefined,
    });
  }, [commitDocument, commitSelection, document, readOnly, selection]);

  const fitView = React.useCallback(() => {
    const bounds = getGraphWorkbenchDocumentBounds(document);
    const viewport = {
      x: Math.round(48 - bounds.x * graphWorkbenchDefaultZoom),
      y: Math.round(48 - bounds.y * graphWorkbenchDefaultZoom),
      zoom: graphWorkbenchDefaultZoom,
    };
    const nextDocument = { ...document, viewport };
    commitDocument(nextDocument, { history: false });
    onViewportChange?.(viewport);
  }, [commitDocument, document, onViewportChange]);

  const setZoom = React.useCallback(
    (zoom: number) => {
      const safeZoom = Math.min(Math.max(zoom, 0.5), 1.75);
      const viewport = { ...(document.viewport ?? { x: 0, y: 0, zoom: 1 }), zoom: safeZoom };
      const nextDocument = { ...document, viewport };
      commitDocument(nextDocument, { history: false });
      onViewportChange?.(viewport);
    },
    [commitDocument, document, onViewportChange],
  );

  const deleteSelection = React.useCallback(() => {
    if (readOnly) {
      return;
    }
    commitDocument(removeGraphEditorSelection(document, selection));
    commitSelection(emptySelection);
  }, [commitDocument, commitSelection, document, readOnly, selection]);

  const groupSelection = React.useCallback(() => {
    if (readOnly || selection.nodeIds.length < 1) {
      return;
    }

    const nextDocument = createGraphEditorGroup(document, { nodeIds: selection.nodeIds });
    commitDocument(nextDocument);
  }, [commitDocument, document, readOnly, selection.nodeIds]);

  const ungroupSelection = React.useCallback(() => {
    if (readOnly || !selection.groupIds?.length) {
      return;
    }

    const nextDocument = selection.groupIds.reduce(
      (currentDocument, groupId) => ungroupGraphEditorGroup(currentDocument, groupId),
      document,
    );
    commitDocument(nextDocument);
    commitSelection({ nodeIds: selection.nodeIds, edgeIds: selection.edgeIds });
  }, [commitDocument, commitSelection, document, readOnly, selection]);

  const autoLayout = React.useCallback(() => {
    if (readOnly) {
      return;
    }

    commitDocument(
      layoutGraphEditorDocument(document, {
        direction: "right",
        nodeSeparation: 80,
        rankSeparation: 120,
      }).document,
    );
  }, [commitDocument, document, readOnly]);

  const undo = React.useCallback(() => {
    if (historyMode === false || !historyState.canUndo) {
      return;
    }

    setHistoryState((current) => {
      const next = undoEditorSnapshotHistory(current);
      onDocumentChange?.(next.present);
      return next;
    });
  }, [historyMode, historyState.canUndo, onDocumentChange]);

  const redo = React.useCallback(() => {
    if (historyMode === false || !historyState.canRedo) {
      return;
    }

    setHistoryState((current) => {
      const next = redoEditorSnapshotHistory(current);
      onDocumentChange?.(next.present);
      return next;
    });
  }, [historyMode, historyState.canRedo, onDocumentChange]);

  const actionsRef = React.useRef<Record<string, () => void | Promise<void>>>({});
  const runCommand = React.useCallback(
    (commandId: GraphWorkbenchCommandId | string) => {
      onCommand?.(commandId);
      return actionsRef.current[commandId]?.();
    },
    [onCommand],
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
      canPaste: Boolean(clipboardPayload),
      canRedo: historyState.canRedo,
      canUndo: historyState.canUndo,
      hasSelection: selection.nodeIds.length > 0 || selection.edgeIds.length > 0,
      nodeSelectionCount: selection.nodeIds.length,
      readOnly,
      selectedGroupCount: selection.groupIds?.length ?? 0,
    });

    return {
      document,
      readOnly,
      selection,
      selectedNode,
      selectedEdge,
      diagnostics,
      selectedDiagnostics,
      history: historyState,
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
  }, [
    addTemplateNode,
    appendTemplateNode,
    autoLayout,
    clipboardPayload,
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
    historyState,
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
    setZoom,
    showInspector,
    showPalette,
    undo,
    ungroupSelection,
  ]);

  React.useEffect(() => {
    actionsRef.current = Object.fromEntries(
      controller.commands.map((command) => [command.id, command.run]),
    );
  }, [controller.commands]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        commitSelection(emptySelection);
        return;
      }

      const commandId = getGraphWorkbenchCommandFromKeyboardEvent(event);
      if (!commandId) {
        return;
      }

      const command = controller.commands.find((candidate) => candidate.id === commandId);
      if (!command || command.disabled) {
        return;
      }

      event.preventDefault();
      void command.run();
    },
    [commitSelection, controller.commands],
  );

  React.useEffect(() => {
    const workbench = workbenchRef.current;

    if (!workbench || typeof window === "undefined") {
      return;
    }

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      const activeElement = window.document.activeElement;
      if (activeElement !== window.document.body && !workbench.contains(activeElement)) {
        return;
      }

      const commandId = getGraphWorkbenchCommandFromKeyboardEvent(event);
      if (!commandId) {
        return;
      }

      const command = controller.commands.find((candidate) => candidate.id === commandId);
      if (!command || command.disabled) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void command.run();
    };

    window.document.addEventListener("keydown", handleDocumentKeyDown, true);

    return () => {
      window.document.removeEventListener("keydown", handleDocumentKeyDown, true);
    };
  }, [controller.commands]);

  const canvasSelection = selectedNode
    ? ({ type: "node", id: selectedNode.id, node: selectedNode } as GraphCanvasSelection)
    : selectedEdge
      ? ({ type: "edge", id: selectedEdge.id, edge: selectedEdge } as GraphCanvasSelection)
      : null;

  return (
    <div
      ref={workbenchRef}
      data-slot="graph-workbench"
      className={cn(
        "grid min-h-0 grid-cols-[16rem_minmax(0,1fr)_20rem] gap-3 outline-none max-xl:grid-cols-[14rem_minmax(0,1fr)] max-lg:grid-cols-1",
        !showPalette && "grid-cols-[minmax(0,1fr)_20rem] max-xl:grid-cols-[minmax(0,1fr)]",
        !showInspector && "grid-cols-[16rem_minmax(0,1fr)] max-xl:grid-cols-[14rem_minmax(0,1fr)]",
        !showPalette && !showInspector && "grid-cols-1",
        className,
      )}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {showPalette ? (
        renderPalette ? (
          renderPalette(controller)
        ) : (
          <GraphWorkbenchPalette controller={controller as any} />
        )
      ) : null}
      <div className="min-h-0">
        {renderToolbar ? (
          renderToolbar(controller)
        ) : (
          <GraphWorkbenchToolbar controller={controller as any} />
        )}
        <GraphWorkbenchCanvas
          controller={controller}
          canvasSelection={canvasSelection}
          showMiniMap={internalShowMiniMap}
          onViewportChange={onViewportChange}
          connectionValidationOptions={connectionValidationOptions}
          createEdge={createEdge}
          renderContextPad={renderContextPad}
        />
      </div>
      {showInspector ? (
        renderInspector ? (
          renderInspector(controller)
        ) : (
          <GraphWorkbenchInspector
            controller={controller as any}
            inspectorSchema={inspectorSchema as any}
          />
        )
      ) : null}
    </div>
  );
}

export function GraphWorkbenchCanvas<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>({
  controller,
  canvasSelection,
  showMiniMap = true,
  onViewportChange,
  connectionValidationOptions,
  createEdge,
  renderContextPad,
}: {
  controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>;
  canvasSelection?: GraphCanvasSelection;
  showMiniMap?: boolean;
  onViewportChange?: (viewport: GraphEditorViewport) => void;
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
  renderContextPad?: (
    controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>,
  ) => React.ReactNode;
}) {
  return (
    <div
      className="relative min-h-0"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("application/x-graph-workbench-template")) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(event) => {
        const templateId = event.dataTransfer.getData("application/x-graph-workbench-template");
        const template = controller.palette.items.find((item) => item.id === templateId);
        if (!template) {
          return;
        }

        event.preventDefault();
        const surface = (event.target as HTMLElement | null)?.closest<HTMLElement>(
          "[data-slot='workflow-builder-surface']",
        );
        const surfaceRect = surface?.getBoundingClientRect();
        const viewport = controller.document.viewport ?? { x: 0, y: 0, zoom: 1 };
        const fallback = { x: 80, y: 80 };
        const position = surfaceRect
          ? {
              x: Math.round((event.clientX - surfaceRect.left - viewport.x) / viewport.zoom),
              y: Math.round((event.clientY - surfaceRect.top - viewport.y) / viewport.zoom),
            }
          : fallback;

        controller.actions.addTemplateNode(template, position);
      }}
    >
      <GraphCanvas
        nodes={controller.document.nodes as any}
        edges={controller.document.edges as any}
        readOnly={controller.readOnly}
        selectedNodeId={canvasSelection?.type === "node" ? canvasSelection.id : null}
        selectedEdgeId={canvasSelection?.type === "edge" ? canvasSelection.id : null}
        showMiniMap={showMiniMap}
        showToolbar={false}
        viewport={controller.document.viewport}
        onViewportChange={(viewport) => {
          controller.actions.updateDocument(
            { ...controller.document, viewport },
            { history: false },
          );
          onViewportChange?.(viewport);
        }}
        onNodesChange={(nodes) =>
          controller.actions.updateDocument(
            { ...controller.document, nodes: nodes as any },
            { history: false, drag: "move" },
          )
        }
        onNodesChangeEnd={(nodes) =>
          controller.actions.updateDocument(
            { ...controller.document, nodes: nodes as any },
            { drag: "end" },
          )
        }
        onEdgesChange={(edges) =>
          controller.actions.updateDocument({ ...controller.document, edges: edges as any })
        }
        isConnectionValid={(connection) =>
          validateGraphEditorConnection(
            controller.document,
            connection,
            createGraphWorkbenchConnectionValidationOptions(connectionValidationOptions, {
              ignoreEdgeId: connection.ignoreEdgeId,
            }),
          )
        }
        onConnectionComplete={(connection: GraphCanvasConnection) => {
          controller.actions.updateDocument(
            connectGraphWorkbenchNodes(
              controller.document,
              connection,
              connectionValidationOptions,
              createEdge,
            ),
          );
          return true;
        }}
        onSelectionChange={(selection) => {
          controller.actions.setSelection(
            selection?.type === "node"
              ? {
                  nodeIds: [selection.id],
                  edgeIds: [],
                  primary: { type: "node", id: selection.id },
                }
              : selection?.type === "edge"
                ? {
                    nodeIds: [],
                    edgeIds: [selection.id],
                    primary: { type: "edge", id: selection.id },
                  }
                : emptySelection,
          );
        }}
      />
      {renderContextPad ? (
        renderContextPad(controller)
      ) : (
        <GraphWorkbenchContextPad controller={controller as any} />
      )}
    </div>
  );
}

export function GraphWorkbenchToolbar({ controller }: { controller: GraphWorkbenchController }) {
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const zoom = controller.document.viewport?.zoom ?? 1;

  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
        <WorkflowIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        Graph
        <Badge variant="secondary">{controller.document.nodes.length} nodes</Badge>
        {controller.diagnostics.length > 0 ? (
          <Badge variant="destructive">{controller.diagnostics.length} issues</Badge>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            void controller.actions.importJson(file);
            event.currentTarget.value = "";
          }}
        />
        <GraphWorkbenchIconButton
          label="Import JSON"
          disabled={controller.readOnly}
          onClick={() => importInputRef.current?.click()}
        >
          <FileUpIcon />
        </GraphWorkbenchIconButton>
        <GraphWorkbenchIconButton label="Export JSON" onClick={controller.actions.exportJson}>
          <DownloadIcon />
        </GraphWorkbenchIconButton>
        <Separator orientation="vertical" className="h-6" />
        <GraphWorkbenchCommandButton controller={controller} commandId="undo">
          <Undo2Icon />
        </GraphWorkbenchCommandButton>
        <GraphWorkbenchCommandButton controller={controller} commandId="redo">
          <Redo2Icon />
        </GraphWorkbenchCommandButton>
        <GraphWorkbenchCommandButton controller={controller} commandId="copy">
          <CopyIcon />
        </GraphWorkbenchCommandButton>
        <GraphWorkbenchCommandButton controller={controller} commandId="paste">
          <ClipboardPasteIcon />
        </GraphWorkbenchCommandButton>
        <GraphWorkbenchCommandButton controller={controller} commandId="delete">
          <Trash2Icon />
        </GraphWorkbenchCommandButton>
        <Separator orientation="vertical" className="h-6" />
        <GraphWorkbenchCommandButton controller={controller} commandId="auto-layout">
          <NetworkIcon />
        </GraphWorkbenchCommandButton>
        <GraphWorkbenchCommandButton controller={controller} commandId="fit-view">
          <Maximize2Icon />
        </GraphWorkbenchCommandButton>
        <GraphWorkbenchIconButton
          label="Zoom out"
          disabled={zoom <= 0.5}
          onClick={() => controller.view.setZoom(zoom - 0.1)}
        >
          <MinusIcon />
        </GraphWorkbenchIconButton>
        <span className="min-w-10 text-center text-xs text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <GraphWorkbenchIconButton
          label="Zoom in"
          disabled={zoom >= 1.75}
          onClick={() => controller.view.setZoom(zoom + 0.1)}
        >
          <PlusIcon />
        </GraphWorkbenchIconButton>
        <Separator orientation="vertical" className="h-6" />
        <GraphWorkbenchIconButton
          label={controller.view.showPalette ? "Hide palette" : "Show palette"}
          onClick={() => controller.view.setShowPalette(!controller.view.showPalette)}
        >
          <PanelLeftIcon />
        </GraphWorkbenchIconButton>
        <GraphWorkbenchIconButton
          label={controller.view.showInspector ? "Hide inspector" : "Show inspector"}
          onClick={() => controller.view.setShowInspector(!controller.view.showInspector)}
        >
          <PanelRightIcon />
        </GraphWorkbenchIconButton>
      </div>
    </div>
  );
}

export function GraphWorkbenchPalette({ controller }: { controller: GraphWorkbenchController }) {
  return (
    <aside className="min-h-0 overflow-auto border-r pr-3 max-lg:border-r-0 max-lg:border-b max-lg:pb-3">
      <Input
        value={controller.palette.searchValue}
        placeholder="Search nodes"
        onChange={(event) => controller.palette.setSearchValue(event.target.value)}
      />
      <div className="mt-3 grid gap-3" onDragOver={(event) => event.preventDefault()}>
        {controller.palette.groups.length > 0 ? (
          controller.palette.groups.map((group) => (
            <GraphWorkbenchPaletteGroup key={group.id} group={group} controller={controller} />
          ))
        ) : (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No nodes match the current search.
          </div>
        )}
      </div>
    </aside>
  );
}

function GraphWorkbenchPaletteGroup({
  group,
  controller,
}: {
  group: GraphWorkbenchPaletteCategoryGroup;
  controller: GraphWorkbenchController;
}) {
  return (
    <section>
      <div className="mb-1 text-xs font-semibold uppercase text-zinc-500">{group.label}</div>
      <div className="grid gap-1">
        {group.templates.map((template) => (
          <Button
            key={template.id}
            type="button"
            variant="outline"
            disabled={controller.readOnly}
            draggable={!controller.readOnly}
            onDragStart={(event) => {
              event.dataTransfer.setData("application/x-graph-workbench-template", template.id);
              event.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => controller.actions.addTemplateNode(template)}
          >
            {template.label}
          </Button>
        ))}
      </div>
      {group.children.map((child) => (
        <GraphWorkbenchPaletteGroup key={child.id} group={child} controller={controller} />
      ))}
    </section>
  );
}

export function GraphWorkbenchInspector({
  controller,
  inspectorSchema,
}: {
  controller: GraphWorkbenchController;
  inspectorSchema?: GraphWorkbenchInspectorSchema;
}) {
  const node = controller.selectedNode;
  const edge = controller.selectedEdge;
  const selection = node ?? edge;
  const title = node ? node.label : edge ? edge.id : "No selection";
  const description = node
    ? (node.kind ?? "Node")
    : edge
      ? `${edge.sourceNodeId}.${edge.sourcePortId} -> ${edge.targetNodeId}.${edge.targetPortId}`
      : "Select a node or connection to edit its properties.";
  const sections = node
    ? (inspectorSchema?.getNodeSections?.(node) ?? getDefaultNodeInspectorSections(node))
    : edge
      ? (inspectorSchema?.getEdgeSections?.(edge) ?? getDefaultEdgeInspectorSections(edge))
      : [];

  return (
    <aside className="min-h-0 overflow-auto border-l pl-3 max-xl:border-l-0 max-xl:border-t max-xl:pt-3">
      <InspectorPanel
        key={selection ? `${"label" in selection ? "node" : "edge"}:${selection.id}` : "empty"}
        title={title}
        description={description}
        sections={sections}
        readOnly={controller.readOnly || !selection}
        validationMessages={Object.fromEntries(
          controller.selectedDiagnostics.map((diagnostic, index) => [
            index === 0 ? "label" : `diagnostic-${index}`,
            diagnostic.message,
          ]),
        )}
        onApply={(values) => {
          if (node) {
            const patch =
              inspectorSchema?.applyNodeValues?.(node, values) ??
              getDefaultNodeInspectorPatch(values);
            controller.actions.updateDocument(
              updateGraphEditorNode(controller.document, node.id, patch as any),
            );
          }
          if (edge) {
            const patch =
              inspectorSchema?.applyEdgeValues?.(edge, values) ??
              getDefaultEdgeInspectorPatch(values);
            controller.actions.updateDocument(
              updateGraphEditorEdge(controller.document, edge.id, patch as any),
            );
          }
        }}
      />
    </aside>
  );
}

export function GraphWorkbenchContextPad({ controller }: { controller: GraphWorkbenchController }) {
  const node = controller.selectedNode;

  if (!node) {
    return null;
  }

  const viewport = controller.document.viewport ?? { x: 0, y: 0, zoom: 1 };
  const nodeSize = getGraphNodeSize(node as any);
  const style: React.CSSProperties = {
    left: viewport.x + (node.x + nodeSize.width + 12) * viewport.zoom,
    top: viewport.y + node.y * viewport.zoom,
  };

  return (
    <div
      data-slot="graph-workbench-context-pad"
      className="absolute z-10 flex items-center gap-1 rounded-md border bg-background p-1 shadow-sm"
      style={style}
    >
      <GraphWorkbenchIconButton
        label="Append node"
        disabled={controller.readOnly || controller.palette.filteredItems.length === 0}
        onClick={() => controller.actions.appendTemplateNode(undefined, node.id)}
      >
        <PlusIcon />
      </GraphWorkbenchIconButton>
      <GraphWorkbenchCommandButton controller={controller} commandId="duplicate">
        <CopyIcon />
      </GraphWorkbenchCommandButton>
      <GraphWorkbenchIconButton
        label={node.minimized ? "Expand node" : "Minimize node"}
        disabled={controller.readOnly}
        onClick={() =>
          controller.actions.updateDocument(
            updateGraphEditorNode(controller.document, node.id, { minimized: !node.minimized }),
          )
        }
      >
        <Rows3Icon />
      </GraphWorkbenchIconButton>
      <GraphWorkbenchCommandButton controller={controller} commandId="group-selection">
        <GroupIcon />
      </GraphWorkbenchCommandButton>
      <GraphWorkbenchCommandButton controller={controller} commandId="delete">
        <Trash2Icon />
      </GraphWorkbenchCommandButton>
    </div>
  );
}

export function GraphWorkbenchOverlayPanel({ children, className }: React.ComponentProps<"div">) {
  return (
    <div className={cn("rounded-md border bg-white p-3 shadow-sm", className)}>{children}</div>
  );
}

function GraphWorkbenchCommandButton({
  controller,
  commandId,
  children,
}: {
  controller: GraphWorkbenchController;
  commandId: GraphWorkbenchCommandId;
  children: React.ReactNode;
}) {
  const command = controller.commands.find((candidate) => candidate.id === commandId);

  return (
    <GraphWorkbenchIconButton
      label={String(command?.label ?? commandId)}
      disabled={command?.disabled}
      onClick={() => void command?.run()}
    >
      {children}
    </GraphWorkbenchIconButton>
  );
}

function GraphWorkbenchIconButton({
  label,
  children,
  disabled,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
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
  selectedGroupCount,
}: {
  actions: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>["actions"];
  canPaste: boolean;
  canRedo: boolean;
  canUndo: boolean;
  hasSelection: boolean;
  nodeSelectionCount: number;
  readOnly: boolean;
  selectedGroupCount: number;
}): GraphWorkbenchAction[] {
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
    {
      id: "export-json",
      label: "Export JSON",
      disabled: false,
      run: actions.exportJson,
    },
    {
      id: "import-json",
      label: "Import JSON",
      disabled: readOnly,
      run: () => actions.importJson(),
    },
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

function getDefaultNodeInspectorSections(node: GraphEditorNode): InspectorPanelSectionData[] {
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

function getDefaultEdgeInspectorSections(edge: GraphEditorEdge): InspectorPanelSectionData[] {
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

function getDefaultNodeInspectorPatch(values: Record<string, InspectorFieldValue>) {
  return {
    label: String(values.label ?? ""),
    description: optionalString(values.description),
    kind: optionalString(values.kind),
    category: optionalString(values.category),
    tone: optionalString(values.tone),
    status: optionalString(values.status),
    variant: values.variant === "compact" ? "compact" : "default",
    minimized: Boolean(values.minimized),
  };
}

function getDefaultEdgeInspectorPatch(values: Record<string, InspectorFieldValue>) {
  return {
    status: optionalString(values.status),
    color: optionalString(values.color),
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
    const size = getGraphNodeSize(node as any);
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

function graphWorkbenchDocumentsEqual<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  left: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  right: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function connectGraphWorkbenchNodes<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  connection: GraphCanvasConnection,
  connectionValidationOptions?: GraphEditorConnectionValidationOptions<
    TNodeData,
    TEdgeData,
    TPortType
  >,
  createEdge?: (
    connection: GraphEditorConnectionInput,
    context: {
      document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
      validity: GraphEditorConnectionValidity;
    },
  ) => GraphEditorEdge<TEdgeData>,
) {
  const validity = validateGraphEditorConnection(
    document,
    connection,
    createGraphWorkbenchConnectionValidationOptions(connectionValidationOptions),
  );

  if (!validity.valid) {
    return document;
  }

  const edge =
    createEdge?.(connection, { document, validity }) ??
    ({
      id: createGraphWorkbenchEdgeId(document, connection),
      ...connection,
    } as GraphEditorEdge<TEdgeData>);

  return addGraphEditorEdge(document, edge);
}

function createGraphWorkbenchConnectionValidationOptions<
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
        const sourceType = getGraphNodePortTypeSource(sourcePort as any);
        const targetType = getGraphNodePortTypeSource(targetPort as any);

        return !sourceType || !targetType || sourceType === targetType;
      }),
  };
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
  return createGraphWorkbenchUniqueId(baseId, new Set(document.nodes.map((node) => node.id)));
}

function createGraphWorkbenchEdgeId(
  document: GraphEditorDocument<any, any, any>,
  connection: GraphEditorConnectionInput,
) {
  return createGraphWorkbenchUniqueId(
    `edge-${connection.sourceNodeId}-${connection.sourcePortId}-${connection.targetNodeId}-${connection.targetPortId}`,
    new Set(document.edges.map((edge) => edge.id)),
  );
}

function createGraphWorkbenchUniqueId(baseId: string, existingIds: ReadonlySet<string>) {
  const sanitized = baseId.trim() || "item";
  if (!existingIds.has(sanitized)) {
    return sanitized;
  }

  let index = 2;
  while (existingIds.has(`${sanitized}-${index}`)) {
    index += 1;
  }
  return `${sanitized}-${index}`;
}
