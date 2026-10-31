"use client";

import * as React from "react";

import { downloadEditorJson, readEditorJsonFile } from "@moenarch/editor-core/browser";
import {
  normalizeGraphEditorSelection,
  type GraphEditorConnectionInput,
  type GraphEditorDocument,
  type GraphEditorDocumentDiagnostic,
  type GraphEditorEdge,
  type GraphEditorNode,
  type GraphEditorNodeTemplate,
  type GraphEditorSelectionState,
  type GraphEditorViewport,
} from "../../../core";
import {
  applyGraphEditorOperation,
  createGraphEditorRuntime,
  redoGraphEditorRuntime,
  resetGraphEditorRuntime,
  setGraphEditorRuntimeSelection,
  undoGraphEditorRuntime,
  type GraphEditorRuntimeState,
} from "../../../runtime";
import {
  createGraphEditorAddNodeOperation,
  createGraphEditorCreateGroupOperation,
  createGraphEditorDuplicateSelectionOperation,
  createGraphEditorLayoutOperation,
  createGraphEditorRemoveSelectionOperation,
  createGraphEditorUngroupOperation,
  createGraphEditorUpdateViewportOperation,
  type GraphEditorOperation,
} from "../../../operations";
import { getGraphEditorNodeSize } from "../../../node-metrics";
import { type GraphWorkbenchCommandId } from "../../workbench-commands";
import {
  createGraphWorkbenchPaletteCategoryGroups,
  filterGraphWorkbenchPaletteTemplates,
  type GraphWorkbenchPaletteItem,
} from "../../palette-model";
import { useGraphWorkbenchActionError } from "../action-error";
import { useGraphWorkbenchClipboard } from "../clipboard";
import { createGraphWorkbenchActions } from "../commands";
import {
  getFirstValidGraphWorkbenchConnection,
  useGraphWorkbenchConnections,
} from "../connections";
import {
  createGraphWorkbenchDocumentOperation,
  createGraphWorkbenchNodeId,
  emptySelection,
  getGraphWorkbenchDocumentBounds,
  graphWorkbenchDocumentsEqual,
  normalizeGraphWorkbenchDocument,
  selectionFromPasteResult,
} from "../document-helpers";
import {
  type GraphWorkbenchCommitOptions,
  type GraphWorkbenchController,
  type GraphWorkbenchProps,
} from "../types";

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

  const { actionError, clearActionError, reportActionError } =
    useGraphWorkbenchActionError(onActionError);

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

  const { getConnectionValidity, connectDocument } = useGraphWorkbenchConnections<
    TNodeData,
    TEdgeData,
    TPortType
  >({
    connectionValidationOptions,
    createEdge,
    connectDocument: customConnectDocument,
  });

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

  const { clipboardPayload, copySelection, pasteSelection } = useGraphWorkbenchClipboard<
    TNodeData,
    TEdgeData,
    TPortType
  >({
    document,
    selection,
    readOnly,
    copySelection: customCopySelection,
    pasteClipboardPayload,
    commitDocument,
    dispatch,
    clearActionError,
    reportActionError,
  });

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
