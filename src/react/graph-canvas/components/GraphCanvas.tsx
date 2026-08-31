"use client";

import * as React from "react";

import { cn } from "@moritzbrantner/ui";

import {
  clearGraphEditorSelection,
  getGraphEditorGroupBounds,
  getGraphEditorSelectionFromBounds,
  normalizeGraphEditorBounds,
  normalizeGraphEditorSelection,
  replaceGraphEditorSelection,
  updateGraphEditorSelection,
  type GraphEditorSelectionItem,
  type GraphEditorSelectionMode,
  type GraphEditorSelectionState,
} from "../../../core";
import {
  clampWorkflowValue,
  getGraphCanvasConnectionValidity,
  getGraphCanvasEdgeStatusColor,
  getGraphCanvasKeyboardDirection,
  getGraphCanvasKeyboardNudgeDelta,
  getGraphCanvasPointerPoint,
  getGraphCanvasPortElementFromPoint,
  getGraphCanvasSnappedNodePosition,
  getNextGraphCanvasNodeSelection,
  getWorkflowBounds,
  getWorkflowConnectionDragLine,
  getWorkflowEdgeEndpointPoint,
  getWorkflowEdgeLine,
  getWorkflowPointDistance,
  getWorkflowPointer,
  graphCanvasPortPointMapsAreEqual,
  graphNodeSizeFallback,
  isGraphCanvasEditableTarget,
  isGraphCanvasInteractiveTarget,
  isGraphNodeControlEvent,
  measureGraphCanvasPortPoints,
  nudgeGraphCanvasNodes,
  orderedGraphCanvasNodeIds,
  type DragState,
  type GraphCanvasConnection,
  type GraphCanvasConnectionDrag,
  type GraphCanvasDisconnectReason,
  type GraphCanvasEdge,
  type GraphCanvasGroup,
  type GraphCanvasNodeData,
  type GraphCanvasPoint,
  type GraphCanvasPortDirection,
  type GraphCanvasPortPointMap,
  type GraphCanvasProps,
  type GraphCanvasSelection,
  type GraphCanvasViewport,
  type MarqueeState,
  type PanState,
  type PendingConnection,
} from "../index-core";
import { getGraphNodeSize } from "../../nodes";
import { GraphCanvasEdgeHandle } from "./GraphCanvasEdgeHandle";
import { GraphCanvasMiniMap } from "./GraphCanvasMiniMap";
import { GraphCanvasNode } from "./GraphCanvasNode";
import { GraphCanvasToolbar } from "./GraphCanvasToolbar";

const graphCanvasConnectionDragThreshold = 4;

export function GraphCanvas({
  nodes,
  edges,
  groups = [],
  onNodesChange,
  onNodesChangeEnd,
  onEdgesChange,
  selectedNodeId,
  selectedEdgeId,
  selectedGroupId,
  selectedNodeIds,
  selectedEdgeIds,
  selectedGroupIds,
  hiddenNodeIds,
  hiddenEdgeIds,
  getNodeDragGroupIds,
  onNodePointerSelect,
  onSelectionChange,
  onSelectionStateChange,
  selectionMode = "multi",
  readOnly = false,
  defaultZoom = 1,
  zoom,
  onZoomChange,
  viewport,
  defaultViewport,
  onViewportChange,
  isConnectionValid = getGraphCanvasConnectionValidity,
  onConnectionStart,
  onConnectionCancel,
  onConnectionComplete,
  onConnectionDisconnect,
  onConnectionCreate,
  onConnectionRewire,
  onConnectionDelete,
  minZoom = 0.5,
  maxZoom = 1.75,
  surfaceHeight = "32rem",
  canvasSize,
  showMiniMap = true,
  showToolbar = true,
  showPortColumnHeaders = true,
  enableMarqueeSelection = true,
  enablePan = true,
  enableWheelZoom = true,
  toolbarLabel = "Workflow",
  measurePorts = "auto",
  className,
  ...props
}: GraphCanvasProps) {
  const [internalZoom, setInternalZoom] = React.useState(defaultZoom);
  const [internalViewport, setInternalViewport] = React.useState<GraphCanvasViewport>(
    defaultViewport ?? { x: 0, y: 0, zoom: defaultZoom },
  );
  const [internalSelection, setInternalSelection] =
    React.useState<GraphEditorSelectionState>(clearGraphEditorSelection);
  const [pendingConnection, setPendingConnection] = React.useState<PendingConnection | null>(null);
  const [connectionDrag, setConnectionDrag] = React.useState<GraphCanvasConnectionDrag | null>(
    null,
  );
  const [hoveredEdgeId, setHoveredEdgeId] = React.useState<string | null>(null);
  const [dragState, setDragState] = React.useState<DragState>(null);
  const [marqueeState, setMarqueeState] = React.useState<MarqueeState>(null);
  const [panState, setPanState] = React.useState<PanState>(null);
  const [portPoints, setPortPoints] = React.useState<GraphCanvasPortPointMap>({});
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const suppressNextPortClickRef = React.useRef(false);
  const pendingDragNodesRef = React.useRef<GraphCanvasNodeData[] | null>(null);
  const dragFrameRef = React.useRef<number | null>(null);
  const currentViewport = viewport ?? {
    ...internalViewport,
    zoom: zoom ?? internalViewport.zoom ?? internalZoom,
  };
  const currentZoom = currentViewport.zoom;
  const selectionDocument = React.useMemo(() => ({ nodes, edges, groups }), [edges, groups, nodes]);
  const externalSelectionProvided =
    selectedNodeIds !== undefined ||
    selectedEdgeIds !== undefined ||
    selectedGroupIds !== undefined ||
    selectedNodeId !== undefined ||
    selectedEdgeId !== undefined ||
    selectedGroupId !== undefined;
  const currentSelection = React.useMemo(
    () =>
      externalSelectionProvided
        ? {
            nodeIds: selectedNodeIds
              ? [...selectedNodeIds]
              : selectedNodeId
                ? [selectedNodeId]
                : [],
            edgeIds: selectedEdgeIds
              ? [...selectedEdgeIds]
              : selectedEdgeId
                ? [selectedEdgeId]
                : [],
            groupIds: selectedGroupIds
              ? [...selectedGroupIds]
              : selectedGroupId
                ? [selectedGroupId]
                : [],
            primary:
              selectedNodeIds?.at(-1) || selectedNodeId
                ? ({
                    type: "node",
                    id: selectedNodeIds?.at(-1) ?? selectedNodeId!,
                  } as const)
                : selectedEdgeIds?.at(-1) || selectedEdgeId
                  ? ({
                      type: "edge",
                      id: selectedEdgeIds?.at(-1) ?? selectedEdgeId!,
                    } as const)
                  : selectedGroupIds?.at(-1) || selectedGroupId
                    ? ({
                        type: "group",
                        id: selectedGroupIds?.at(-1) ?? selectedGroupId!,
                      } as const)
                    : undefined,
          }
        : internalSelection,
    [
      externalSelectionProvided,
      internalSelection,
      selectedEdgeId,
      selectedEdgeIds,
      selectedGroupId,
      selectedGroupIds,
      selectedNodeId,
      selectedNodeIds,
    ],
  );
  const currentSelectedNodeIds = currentSelection.nodeIds;
  const currentSelectedEdgeIds = currentSelection.edgeIds;
  const currentSelectedGroupIds = currentSelection.groupIds ?? [];
  const currentSelectedNodeId =
    currentSelection.primary?.type === "node"
      ? currentSelection.primary.id
      : (currentSelectedNodeIds.at(-1) ?? null);
  const currentSelectedEdgeId =
    currentSelection.primary?.type === "edge"
      ? currentSelection.primary.id
      : (currentSelectedEdgeIds.at(-1) ?? null);
  const currentSelectedGroupId =
    currentSelection.primary?.type === "group"
      ? currentSelection.primary.id
      : (currentSelectedGroupIds.at(-1) ?? null);
  const hiddenNodeIdSet = React.useMemo(() => new Set(hiddenNodeIds ?? []), [hiddenNodeIds]);
  const hiddenEdgeIdSet = React.useMemo(() => new Set(hiddenEdgeIds ?? []), [hiddenEdgeIds]);
  const visibleEdges = React.useMemo(
    () => edges.filter((edge) => !hiddenEdgeIdSet.has(edge.id)),
    [edges, hiddenEdgeIdSet],
  );
  const nodeById = React.useMemo(
    () => new Map(nodes.map((node) => [node.id, node] as const)),
    [nodes],
  );
  const layoutOptions = React.useMemo(() => ({ showPortColumnHeaders }), [showPortColumnHeaders]);
  const selectedNode = currentSelectedNodeId ? nodeById.get(currentSelectedNodeId) : undefined;
  const selectedEdge = React.useMemo(
    () => edges.find((edge) => edge.id === currentSelectedEdgeId),
    [currentSelectedEdgeId, edges],
  );
  const nodeBounds = React.useMemo(
    () =>
      new Map(
        nodes.map((node) => {
          const size = getGraphNodeSize(node, layoutOptions);
          return [node.id, { x: node.x, y: node.y, width: size.width, height: size.height }];
        }),
      ),
    [layoutOptions, nodes],
  );
  const groupBounds = React.useMemo(
    () =>
      getGraphEditorGroupBounds(
        selectionDocument,
        (node) => {
          const bounds = nodeBounds.get(node.id);
          return bounds ?? { x: node.x, y: node.y, ...graphNodeSizeFallback() };
        },
        { hiddenNodeIds },
      ),
    [hiddenNodeIds, nodeBounds, selectionDocument],
  );
  const edgeGeometry = React.useMemo(
    () =>
      new Map(
        visibleEdges.map((edge) => [
          edge.id,
          {
            line: getWorkflowEdgeLine(nodeById, edge, portPoints, layoutOptions),
            sourcePoint: getWorkflowEdgeEndpointPoint(
              nodeById,
              edge,
              "source",
              portPoints,
              layoutOptions,
            ),
            targetPoint: getWorkflowEdgeEndpointPoint(
              nodeById,
              edge,
              "target",
              portPoints,
              layoutOptions,
            ),
          },
        ]),
      ),
    [layoutOptions, nodeById, portPoints, visibleEdges],
  );

  React.useEffect(() => {
    return () => {
      pendingDragNodesRef.current = null;
      if (dragFrameRef.current !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
    };
  }, []);

  const scheduleDraggedNodesChange = React.useCallback(
    (nextNodes: GraphCanvasNodeData[], immediate = false) => {
      if (immediate) {
        pendingDragNodesRef.current = null;
        if (dragFrameRef.current !== null && typeof window !== "undefined") {
          window.cancelAnimationFrame(dragFrameRef.current);
          dragFrameRef.current = null;
        }
        onNodesChange?.(nextNodes);
        return;
      }

      pendingDragNodesRef.current = nextNodes;

      if (dragFrameRef.current !== null || typeof window === "undefined") {
        if (typeof window === "undefined") {
          onNodesChange?.(nextNodes);
        }
        return;
      }

      dragFrameRef.current = window.requestAnimationFrame(() => {
        dragFrameRef.current = null;
        const pendingNodes = pendingDragNodesRef.current;
        pendingDragNodesRef.current = null;

        if (pendingNodes) {
          onNodesChange?.(pendingNodes);
        }
      });
    },
    [onNodesChange],
  );

  const commitViewport = (nextViewport: GraphCanvasViewport) => {
    const safeViewport = {
      ...nextViewport,
      zoom: clampWorkflowValue(nextViewport.zoom, minZoom, maxZoom),
    };
    setInternalViewport(safeViewport);
    setInternalZoom(safeViewport.zoom);
    onZoomChange?.(safeViewport.zoom);
    onViewportChange?.(safeViewport);
  };

  const commitZoom = (nextZoom: number) => {
    const safeZoom = clampWorkflowValue(nextZoom, minZoom, maxZoom);
    commitViewport({ ...currentViewport, zoom: safeZoom });
  };

  const getCanvasSelection = React.useCallback(
    (selection: GraphEditorSelectionState): GraphCanvasSelection => {
      const primary =
        selection.primary ??
        (selection.nodeIds.at(-1)
          ? ({ type: "node", id: selection.nodeIds.at(-1)! } as const)
          : selection.edgeIds.at(-1)
            ? ({ type: "edge", id: selection.edgeIds.at(-1)! } as const)
            : selection.groupIds?.at(-1)
              ? ({ type: "group", id: selection.groupIds.at(-1)! } as const)
              : null);
      if (!primary) {
        return null;
      }
      if (primary.type === "node") {
        const node = nodeById.get(primary.id);
        return node ? { type: "node", id: primary.id, node } : null;
      }
      if (primary.type === "edge") {
        const edge = edges.find((candidate) => candidate.id === primary.id);
        return edge ? { type: "edge", id: primary.id, edge } : null;
      }
      return { type: "group", id: primary.id };
    },
    [edges, nodeById],
  );

  const commitSelectionState = React.useCallback(
    (selection: GraphEditorSelectionState) => {
      const normalized = normalizeGraphEditorSelection(selectionDocument, selection);
      setInternalSelection(normalized);
      onSelectionStateChange?.(normalized);
      onSelectionChange?.(getCanvasSelection(normalized));
    },
    [getCanvasSelection, onSelectionChange, onSelectionStateChange, selectionDocument],
  );

  const getSelectionModeFromEvent = (
    event: Pick<React.PointerEvent | React.MouseEvent, "ctrlKey" | "metaKey" | "shiftKey">,
  ): GraphEditorSelectionMode =>
    selectionMode === "multi" && (event.ctrlKey || event.metaKey)
      ? "toggle"
      : selectionMode === "multi" && event.shiftKey
        ? "extend"
        : "replace";

  const selectItem = React.useCallback(
    (
      item: GraphEditorSelectionItem,
      mode: GraphEditorSelectionMode = "replace",
      selection = currentSelection,
    ) => {
      commitSelectionState(updateGraphEditorSelection(selectionDocument, selection, item, mode));
    },
    [commitSelectionState, currentSelection, selectionDocument],
  );

  const selectNode = React.useCallback(
    (node: GraphCanvasNodeData, mode: GraphEditorSelectionMode = "replace") => {
      selectItem({ type: "node", id: node.id }, mode);
    },
    [selectItem],
  );

  const selectEdge = React.useCallback(
    (edge: GraphCanvasEdge, mode: GraphEditorSelectionMode = "replace") => {
      selectItem({ type: "edge", id: edge.id }, mode);
    },
    [selectItem],
  );

  const selectNodeFromPointer = React.useCallback(
    (node: GraphCanvasNodeData, event?: React.PointerEvent | React.MouseEvent) => {
      const pointerSelection = onNodePointerSelect?.(node.id);
      if (pointerSelection !== undefined) {
        const item =
          pointerSelection?.type === "node"
            ? ({ type: "node", id: pointerSelection.id } as const)
            : pointerSelection?.type === "edge"
              ? ({ type: "edge", id: pointerSelection.id } as const)
              : pointerSelection?.type === "group"
                ? ({ type: "group", id: pointerSelection.id } as const)
                : null;
        commitSelectionState(replaceGraphEditorSelection(selectionDocument, item));
        return;
      }

      selectNode(node, event ? getSelectionModeFromEvent(event) : "replace");
    },
    [commitSelectionState, onNodePointerSelect, selectNode, selectionDocument],
  );

  const removeEdge = (edge: GraphCanvasEdge, reason: GraphCanvasDisconnectReason) => {
    if (onConnectionDelete) {
      onConnectionDelete(edge, reason);
    } else {
      onEdgesChange?.(edges.filter((currentEdge) => currentEdge.id !== edge.id));
    }
    onConnectionDisconnect?.(edge, reason);
    if (currentSelectedEdgeId === edge.id) {
      commitSelectionState(clearGraphEditorSelection());
    }
  };

  const getConnectionValidity = React.useCallback(
    (connection: GraphCanvasConnection, ignoreEdgeId?: string) =>
      isConnectionValid({
        nodes,
        edges,
        ...connection,
        ignoreEdgeId,
      }),
    [edges, isConnectionValid, nodes],
  );

  const addConnection = React.useCallback(
    (connection: GraphCanvasConnection) => {
      const validity = getConnectionValidity(connection);

      if (!validity.valid) {
        return false;
      }

      const handled =
        onConnectionCreate?.(connection) === true || onConnectionComplete?.(connection) === true;
      if (!handled) {
        onEdgesChange?.([
          ...edges,
          {
            id: `edge-${connection.sourceNodeId}-${connection.sourcePortId}-${connection.targetNodeId}-${connection.targetPortId}`,
            ...connection,
          },
        ]);
      }
      return true;
    },
    [edges, getConnectionValidity, onConnectionComplete, onConnectionCreate, onEdgesChange],
  );

  const rewireConnection = React.useCallback(
    (edge: GraphCanvasEdge, connection: GraphCanvasConnection) => {
      const validity = getConnectionValidity(connection, edge.id);

      if (!validity.valid) {
        return false;
      }

      const nextEdge = { ...edge, ...connection };
      const handled = onConnectionRewire?.(edge, connection) === true;
      if (!handled) {
        onEdgesChange?.(
          edges.map((currentEdge) => (currentEdge.id === edge.id ? nextEdge : currentEdge)),
        );
      }
      onConnectionDisconnect?.(edge, "rewire");
      commitSelectionState({
        nodeIds: [],
        edgeIds: [edge.id],
        primary: { type: "edge", id: edge.id },
      });
      return true;
    },
    [
      commitSelectionState,
      edges,
      getConnectionValidity,
      onConnectionDisconnect,
      onConnectionRewire,
      onEdgesChange,
    ],
  );

  const deleteSelection = () => {
    if (readOnly) {
      return;
    }

    if (selectedNode) {
      const incidentEdges = edges.filter(
        (edge) => edge.sourceNodeId === selectedNode.id || edge.targetNodeId === selectedNode.id,
      );
      onNodesChange?.(nodes.filter((node) => node.id !== selectedNode.id));
      onEdgesChange?.(
        edges.filter(
          (edge) => edge.sourceNodeId !== selectedNode.id && edge.targetNodeId !== selectedNode.id,
        ),
      );
      incidentEdges.forEach((edge) => onConnectionDisconnect?.(edge, "node-delete"));
      commitSelectionState(clearGraphEditorSelection());
      return;
    }

    if (selectedEdge) {
      removeEdge(selectedEdge, "edge-delete");
      return;
    }

    if (currentSelectedNodeIds.length > 0 || currentSelectedEdgeIds.length > 0) {
      const nodeIds = new Set(currentSelectedNodeIds);
      const edgeIds = new Set(currentSelectedEdgeIds);
      onNodesChange?.(nodes.filter((node) => !nodeIds.has(node.id)));
      onEdgesChange?.(
        edges.filter(
          (edge) =>
            !edgeIds.has(edge.id) &&
            !nodeIds.has(edge.sourceNodeId) &&
            !nodeIds.has(edge.targetNodeId),
        ),
      );
      commitSelectionState(clearGraphEditorSelection());
    }
  };

  const finishNodeDrag = React.useCallback(() => {
    if (!dragState) {
      return;
    }

    const nextNodes = pendingDragNodesRef.current ?? nodes;
    pendingDragNodesRef.current = null;
    onNodesChangeEnd?.(nextNodes);
    setDragState(null);
  }, [dragState, nodes, onNodesChangeEnd]);

  const getConnectionDragCandidate = (
    event: React.PointerEvent<HTMLElement> | React.MouseEvent<HTMLElement>,
    drag: GraphCanvasConnectionDrag,
  ) => {
    const direction = drag.type === "rewire-source" ? "output" : "input";
    const portElement = getGraphCanvasPortElementFromPoint(event.clientX, event.clientY, direction);
    const nodeElement = portElement?.closest<HTMLElement>("[data-slot='workflow-builder-node']");
    const nodeId = nodeElement?.dataset.nodeId;
    const portId = portElement?.dataset.portId;

    if (!nodeId || !portId) {
      return {};
    }

    const connection =
      drag.type === "new"
        ? {
            sourceNodeId: drag.sourceNodeId,
            sourcePortId: drag.sourcePortId,
            targetNodeId: nodeId,
            targetPortId: portId,
          }
        : drag.type === "rewire-target"
          ? {
              sourceNodeId: drag.edge.sourceNodeId,
              sourcePortId: drag.edge.sourcePortId,
              targetNodeId: nodeId,
              targetPortId: portId,
            }
          : {
              sourceNodeId: nodeId,
              sourcePortId: portId,
              targetNodeId: drag.edge.targetNodeId,
              targetPortId: drag.edge.targetPortId,
            };
    const validity = getConnectionValidity(
      connection,
      drag.type === "new" ? undefined : drag.edge.id,
    );

    return {
      targetNodeId: nodeId,
      targetPortId: portId,
      targetValid: validity.valid,
    };
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>,
  ) => {
    if (marqueeState && !readOnly) {
      const pointerPoint = getGraphCanvasPointerPoint(event, viewportRef.current, currentZoom);
      setMarqueeState((current) => (current ? { ...current, pointerPoint } : current));
      return;
    }

    if (panState && !readOnly) {
      const pointer = getWorkflowPointer(event);
      commitViewport({
        ...panState.viewport,
        x: Math.round(panState.viewport.x + pointer.x - panState.startX),
        y: Math.round(panState.viewport.y + pointer.y - panState.startY),
      });
      return;
    }

    if (connectionDrag && !readOnly) {
      const pointerPoint = getGraphCanvasPointerPoint(event, viewportRef.current, currentZoom);
      const distance = getWorkflowPointDistance(connectionDrag.startPoint, pointerPoint);
      const candidate = getConnectionDragCandidate(event, connectionDrag);

      setConnectionDrag((currentDrag) => {
        if (!currentDrag) {
          return currentDrag;
        }

        if (currentDrag.type === "new" && !currentDrag.started) {
          const started = distance >= graphCanvasConnectionDragThreshold;

          if (started) {
            onConnectionStart?.({
              sourceNodeId: currentDrag.sourceNodeId,
              sourcePortId: currentDrag.sourcePortId,
            });
          }

          return {
            ...currentDrag,
            ...candidate,
            pointerPoint,
            started,
          };
        }

        return {
          ...currentDrag,
          ...candidate,
          pointerPoint,
        };
      });
      return;
    }

    if (!dragState || readOnly) {
      return;
    }
    const pointer = getWorkflowPointer(event);
    const draggedNode = nodeById.get(dragState.nodeId);

    if (!draggedNode) {
      return;
    }

    const rawPosition = {
      x: Math.round(dragState.originalX + (pointer.x - dragState.startX) / currentZoom),
      y: Math.round(dragState.originalY + (pointer.y - dragState.startY) / currentZoom),
    };
    const draggedNodeIds = new Set(dragState.nodeIds);
    const nextPosition = getGraphCanvasSnappedNodePosition(
      draggedNode,
      nodes.filter((node) => !draggedNodeIds.has(node.id)),
      rawPosition,
      layoutOptions,
    );
    const delta = {
      x: nextPosition.x - dragState.originalX,
      y: nextPosition.y - dragState.originalY,
    };
    const shouldCommitImmediately =
      nextPosition.x !== rawPosition.x || nextPosition.y !== rawPosition.y;
    const nextNodes = nodes.map((node) => {
      const originalPosition = dragState.originalPositions[node.id];
      return originalPosition
        ? { ...node, x: originalPosition.x + delta.x, y: originalPosition.y + delta.y }
        : node;
    });
    scheduleDraggedNodesChange(nextNodes, shouldCommitImmediately);
  };

  const handleNodePointerDown = React.useCallback(
    (
      event: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>,
      node: GraphCanvasNodeData,
    ) => {
      selectNodeFromPointer(node, event);
      if (
        readOnly ||
        (event.button !== 0 && event.button !== undefined) ||
        isGraphNodeControlEvent(event.target)
      ) {
        return;
      }
      const pointer = getWorkflowPointer(event);
      const selectedNodeDragIds =
        currentSelectedNodeIds.includes(node.id) && currentSelectedNodeIds.length > 1
          ? currentSelectedNodeIds
          : null;
      const selectedGroupNodeIds = currentSelectedGroupIds.flatMap((groupId) => {
        const group = groups.find((candidate) => candidate.id === groupId);
        return group?.nodeIds ?? [];
      });
      const dragNodeIds = orderedGraphCanvasNodeIds(
        nodes,
        getNodeDragGroupIds?.(node.id) ??
          selectedNodeDragIds ??
          (selectedGroupNodeIds.includes(node.id) ? selectedGroupNodeIds : [node.id]),
      );
      const originalPositions = Object.fromEntries(
        dragNodeIds.flatMap((nodeId) => {
          const dragNode = nodeById.get(nodeId);
          return dragNode ? [[nodeId, { x: dragNode.x, y: dragNode.y }]] : [];
        }),
      ) as Record<string, GraphCanvasPoint>;
      setDragState({
        nodeId: node.id,
        nodeIds: dragNodeIds,
        startX: pointer.x,
        startY: pointer.y,
        originalX: node.x,
        originalY: node.y,
        originalPositions,
      });
    },
    [
      currentSelectedGroupIds,
      currentSelectedNodeIds,
      getNodeDragGroupIds,
      groups,
      nodeById,
      nodes,
      readOnly,
      selectNodeFromPointer,
    ],
  );

  const selectableBounds = React.useMemo(() => {
    const edgeItems = visibleEdges.flatMap((edge) => {
      const geometry = edgeGeometry.get(edge.id);
      if (!geometry) {
        return [];
      }
      const minX = Math.min(geometry.sourcePoint.x, geometry.targetPoint.x);
      const minY = Math.min(geometry.sourcePoint.y, geometry.targetPoint.y);
      const maxX = Math.max(geometry.sourcePoint.x, geometry.targetPoint.x);
      const maxY = Math.max(geometry.sourcePoint.y, geometry.targetPoint.y);
      return [
        {
          type: "edge" as const,
          id: edge.id,
          bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
        },
      ];
    });

    return [
      ...nodes.flatMap((node) => {
        const bounds = nodeBounds.get(node.id);
        return bounds && !hiddenNodeIdSet.has(node.id)
          ? [{ type: "node" as const, id: node.id, bounds }]
          : [];
      }),
      ...edgeItems,
      ...groupBounds.map((group) => ({
        type: "group" as const,
        id: group.groupId,
        bounds: group.bounds,
      })),
    ];
  }, [edgeGeometry, groupBounds, hiddenNodeIdSet, nodeBounds, nodes, visibleEdges]);

  const commitMarqueeSelection = React.useCallback(() => {
    if (!marqueeState) {
      return;
    }

    const bounds = normalizeGraphEditorBounds({
      x: marqueeState.startPoint.x,
      y: marqueeState.startPoint.y,
      width: marqueeState.pointerPoint.x - marqueeState.startPoint.x,
      height: marqueeState.pointerPoint.y - marqueeState.startPoint.y,
    });
    const nextSelection = getGraphEditorSelectionFromBounds(
      selectionDocument,
      bounds,
      selectableBounds,
      {
        mode: marqueeState.mode,
        selection: marqueeState.selectionBefore,
      },
    );
    commitSelectionState(nextSelection);
    setMarqueeState(null);
  }, [commitSelectionState, marqueeState, selectableBounds, selectionDocument]);

  const handleSurfacePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
      if (
        readOnly ||
        (event.button !== 0 && event.button !== undefined) ||
        isGraphCanvasInteractiveTarget(event.target)
      ) {
        return;
      }

      const pointer = getWorkflowPointer(event);
      const canvasPoint = getGraphCanvasPointerPoint(event, viewportRef.current, currentZoom);
      const useMarquee =
        enableMarqueeSelection && (!enablePan || event.shiftKey || event.ctrlKey || event.metaKey);

      if (useMarquee) {
        setMarqueeState({
          startPoint: canvasPoint,
          pointerPoint: canvasPoint,
          selectionBefore: currentSelection,
          mode: getSelectionModeFromEvent(event),
        });
        return;
      }

      if (enablePan) {
        setPanState({
          startX: pointer.x,
          startY: pointer.y,
          viewport: currentViewport,
        });
      }
    },
    [currentSelection, currentViewport, currentZoom, enableMarqueeSelection, enablePan, readOnly],
  );

  const finishSurfaceGesture = React.useCallback(() => {
    commitMarqueeSelection();
    setPanState(null);
  }, [commitMarqueeSelection]);

  const handleWheel = React.useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!enableWheelZoom || (event.ctrlKey === false && event.metaKey === false)) {
        return;
      }

      event.preventDefault();
      const surfaceRect = event.currentTarget.getBoundingClientRect();
      const nextZoom = clampWorkflowValue(
        currentZoom * (event.deltaY > 0 ? 0.9 : 1.1),
        minZoom,
        maxZoom,
      );
      const pointer = {
        x: event.clientX - surfaceRect.left,
        y: event.clientY - surfaceRect.top,
      };
      const canvasPoint = {
        x: (pointer.x - currentViewport.x) / currentZoom,
        y: (pointer.y - currentViewport.y) / currentZoom,
      };
      commitViewport({
        x: Math.round(pointer.x - canvasPoint.x * nextZoom),
        y: Math.round(pointer.y - canvasPoint.y * nextZoom),
        zoom: nextZoom,
      });
    },
    [currentViewport, currentZoom, enableWheelZoom, maxZoom, minZoom],
  );

  const completeConnection = React.useCallback(
    (targetNodeId: string, targetPortId: string) => {
      if (!pendingConnection || readOnly) {
        return;
      }

      addConnection({
        sourceNodeId: pendingConnection.sourceNodeId,
        sourcePortId: pendingConnection.sourcePortId,
        targetNodeId,
        targetPortId,
      });

      setPendingConnection(null);
    },
    [addConnection, pendingConnection, readOnly],
  );

  const completeConnectionDragOnPort = React.useCallback(
    (direction: GraphCanvasPortDirection, nodeId: string, portId: string) => {
      if (!connectionDrag || readOnly) {
        return false;
      }

      if (connectionDrag.type === "new" && direction === "input") {
        const completed = addConnection({
          sourceNodeId: connectionDrag.sourceNodeId,
          sourcePortId: connectionDrag.sourcePortId,
          targetNodeId: nodeId,
          targetPortId: portId,
        });
        setConnectionDrag(null);
        setPendingConnection(null);
        suppressNextPortClickRef.current = true;
        return completed;
      }

      if (connectionDrag.type === "rewire-target" && direction === "input") {
        const completed = rewireConnection(connectionDrag.edge, {
          sourceNodeId: connectionDrag.edge.sourceNodeId,
          sourcePortId: connectionDrag.edge.sourcePortId,
          targetNodeId: nodeId,
          targetPortId: portId,
        });
        setConnectionDrag(null);
        setPendingConnection(null);
        return completed;
      }

      if (connectionDrag.type === "rewire-source" && direction === "output") {
        const completed = rewireConnection(connectionDrag.edge, {
          sourceNodeId: nodeId,
          sourcePortId: portId,
          targetNodeId: connectionDrag.edge.targetNodeId,
          targetPortId: connectionDrag.edge.targetPortId,
        });
        setConnectionDrag(null);
        setPendingConnection(null);
        return completed;
      }

      return false;
    },
    [addConnection, connectionDrag, readOnly, rewireConnection],
  );

  const cancelOrDetachConnectionDrag = () => {
    if (!connectionDrag || readOnly) {
      setConnectionDrag(null);
      setPendingConnection(null);
      return;
    }

    if (connectionDrag.type === "new") {
      if (connectionDrag.started) {
        onConnectionCancel?.();
      }
      setConnectionDrag(null);
      setPendingConnection(null);
      return;
    }

    removeEdge(connectionDrag.edge, "endpoint-detach");
    setConnectionDrag(null);
    setPendingConnection(null);
  };

  const completeConnectionDragFromPointer = (
    event: React.PointerEvent<HTMLElement> | React.MouseEvent<HTMLElement>,
  ) => {
    if (!connectionDrag || readOnly) {
      return;
    }

    const direction = connectionDrag.type === "rewire-source" ? "output" : "input";
    const portElement = getGraphCanvasPortElementFromPoint(event.clientX, event.clientY, direction);
    const nodeElement = portElement?.closest<HTMLElement>("[data-slot='workflow-builder-node']");
    const nodeId = nodeElement?.dataset.nodeId;
    const portId = portElement?.dataset.portId;

    if (nodeId && portId && completeConnectionDragOnPort(direction, nodeId, portId)) {
      return;
    }

    cancelOrDetachConnectionDrag();
  };

  const changeNodeMinimized = React.useCallback(
    (nodeId: string, minimized: boolean) => {
      onNodesChange?.(nodes.map((node) => (node.id === nodeId ? { ...node, minimized } : node)));
    },
    [nodes, onNodesChange],
  );

  const fitView = () => {
    if (!canvasSize || nodes.length === 0) {
      commitViewport({ x: 0, y: 0, zoom: 1 });
      return;
    }

    const bounds = getWorkflowBounds(nodes, layoutOptions);
    const padding = 48;
    const nextZoom = Math.min(
      maxZoom,
      Math.max(
        minZoom,
        Math.min(
          canvasSize.width / Math.max(bounds.width + padding * 2, 1),
          canvasSize.height / Math.max(bounds.height + padding * 2, 1),
        ),
      ),
    );

    commitViewport({
      x: Math.round(padding - bounds.x * nextZoom),
      y: Math.round(padding - bounds.y * nextZoom),
      zoom: nextZoom,
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isGraphCanvasEditableTarget(event.target)) {
      return;
    }

    const keyboardDirection = getGraphCanvasKeyboardDirection(event.key);

    if (keyboardDirection) {
      if (event.shiftKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();

        if (readOnly) {
          return;
        }

        const distance = event.altKey ? 1 : 10;
        const delta = getGraphCanvasKeyboardNudgeDelta(keyboardDirection, distance);
        const nextNodes = nudgeGraphCanvasNodes(
          nodes,
          currentSelectedNodeIds,
          delta,
          hiddenNodeIdSet,
        );

        if (nextNodes !== nodes) {
          onNodesChange?.(nextNodes);
          onNodesChangeEnd?.(nextNodes);
        }
        return;
      }

      if (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        const nextNode = getNextGraphCanvasNodeSelection(
          nodes,
          currentSelectedNodeId,
          keyboardDirection,
          layoutOptions,
          hiddenNodeIdSet,
        );

        if (nextNode) {
          event.preventDefault();
          commitSelectionState({
            nodeIds: [nextNode.id],
            edgeIds: [],
            primary: { type: "node", id: nextNode.id },
          });
        }
        return;
      }
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deleteSelection();
    }
    if (event.key === "Escape") {
      if (pendingConnection || connectionDrag?.type === "new") {
        onConnectionCancel?.();
      }
      setPendingConnection(null);
      setConnectionDrag(null);
      setMarqueeState(null);
      setPanState(null);
      commitSelectionState(clearGraphEditorSelection());
    }
  };

  const handleStartConnection = React.useCallback(
    (sourceNodeId: string, sourcePortId: string) => {
      if (suppressNextPortClickRef.current) {
        suppressNextPortClickRef.current = false;
        return;
      }
      const nextConnection = { sourceNodeId, sourcePortId };
      if (
        pendingConnection?.sourceNodeId === sourceNodeId &&
        pendingConnection.sourcePortId === sourcePortId
      ) {
        return;
      }
      setConnectionDrag(null);
      setPendingConnection(nextConnection);
      onConnectionStart?.(nextConnection);
    },
    [onConnectionStart, pendingConnection],
  );

  const handleInputPointerUp = React.useCallback(
    (_event: React.PointerEvent<HTMLButtonElement>, nodeId: string, portId: string) => {
      completeConnectionDragOnPort("input", nodeId, portId);
    },
    [completeConnectionDragOnPort],
  );

  const handleOutputPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, nodeId: string, portId: string) => {
      if (readOnly || (event.button !== 0 && event.button !== undefined)) {
        return;
      }
      const pointerPoint = getGraphCanvasPointerPoint(event, viewportRef.current, currentZoom);
      const nextConnection = { sourceNodeId: nodeId, sourcePortId: portId };
      setPendingConnection(null);
      setPendingConnection(nextConnection);
      onConnectionStart?.(nextConnection);
      setConnectionDrag({
        type: "new",
        sourceNodeId: nodeId,
        sourcePortId: portId,
        startPoint: pointerPoint,
        pointerPoint,
        started: true,
      });
    },
    [currentZoom, onConnectionStart, readOnly],
  );

  const handleOutputPointerUp = React.useCallback(
    (_event: React.PointerEvent<HTMLButtonElement>, nodeId: string, portId: string) => {
      completeConnectionDragOnPort("output", nodeId, portId);
    },
    [completeConnectionDragOnPort],
  );

  React.useEffect(() => {
    if (measurePorts !== "dom") {
      setPortPoints((currentPortPoints) =>
        Object.keys(currentPortPoints).length === 0 ? currentPortPoints : {},
      );
      return;
    }

    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const measuredPortPoints = measureGraphCanvasPortPoints(viewport, currentZoom);

    if (Object.keys(measuredPortPoints).length === 0) {
      setPortPoints((currentPortPoints) =>
        Object.keys(currentPortPoints).length === 0 ? currentPortPoints : {},
      );
      return;
    }

    setPortPoints((currentPortPoints) =>
      graphCanvasPortPointMapsAreEqual(currentPortPoints, measuredPortPoints)
        ? currentPortPoints
        : measuredPortPoints,
    );
  }, [connectionDrag, currentZoom, edges, measurePorts, nodes, pendingConnection]);

  React.useEffect(() => {
    return () => {
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current);
      }
    };
  }, []);

  return (
    <div
      data-slot="workflow-builder"
      data-read-only={readOnly ? "true" : undefined}
      className={cn("space-y-3", className)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {showToolbar ? (
        <GraphCanvasToolbar
          zoom={currentZoom}
          minZoom={minZoom}
          maxZoom={maxZoom}
          readOnly={readOnly}
          selectedLabel={currentSelectedGroupId ?? selectedNode?.label ?? selectedEdge?.id}
          toolbarLabel={toolbarLabel}
          onZoomChange={commitZoom}
          onFitView={fitView}
          onDeleteSelection={deleteSelection}
        />
      ) : null}
      <div
        data-slot="workflow-builder-surface"
        tabIndex={0}
        className="relative overflow-auto rounded-md border bg-muted/20"
        style={{ height: typeof surfaceHeight === "number" ? `${surfaceHeight}px` : surfaceHeight }}
        onPointerDown={handleSurfacePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => {
          completeConnectionDragFromPointer(event);
          finishNodeDrag();
          finishSurfaceGesture();
        }}
        onPointerLeave={() => {
          finishNodeDrag();
          finishSurfaceGesture();
        }}
        onWheel={handleWheel}
        onMouseDown={handleSurfacePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={(event) => {
          completeConnectionDragFromPointer(event);
          finishNodeDrag();
          finishSurfaceGesture();
        }}
        onMouseLeave={() => {
          finishNodeDrag();
          finishSurfaceGesture();
        }}
      >
        <div
          ref={viewportRef}
          data-slot="workflow-builder-viewport"
          className="relative min-h-[52rem] min-w-[72rem] origin-top-left"
          style={{
            transform: `translate(${currentViewport.x}px, ${currentViewport.y}px) scale(${currentZoom})`,
            minWidth: canvasSize?.width,
            minHeight: canvasSize?.height,
            width: `${100 / currentZoom}%`,
          }}
        >
          {groupBounds.map((group) => {
            const sourceGroup = groups.find((candidate) => candidate.id === group.groupId);
            const selected = currentSelectedGroupIds.includes(group.groupId);
            return (
              <div
                key={group.groupId}
                data-slot="workflow-builder-group"
                data-group-id={group.groupId}
                data-selected={selected ? "true" : undefined}
                role="button"
                tabIndex={0}
                aria-label={sourceGroup?.label ?? group.groupId}
                className={cn(
                  "absolute rounded-md border border-dashed bg-background/30 text-xs text-muted-foreground",
                  selected && "border-primary bg-primary/5 text-primary",
                )}
                style={{
                  left: group.bounds.x,
                  top: group.bounds.y,
                  width: group.bounds.width,
                  height: group.bounds.height,
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  selectItem(
                    { type: "group", id: group.groupId },
                    getSelectionModeFromEvent(event),
                  );
                  if (readOnly || (event.button !== 0 && event.button !== undefined)) {
                    return;
                  }
                  const firstNode = group.nodeIds.flatMap((nodeId) => {
                    const node = nodeById.get(nodeId);
                    return node ? [node] : [];
                  })[0];
                  if (!firstNode) {
                    return;
                  }
                  const pointer = getWorkflowPointer(event);
                  const originalPositions = Object.fromEntries(
                    group.nodeIds.flatMap((nodeId) => {
                      const dragNode = nodeById.get(nodeId);
                      return dragNode ? [[nodeId, { x: dragNode.x, y: dragNode.y }]] : [];
                    }),
                  ) as Record<string, GraphCanvasPoint>;
                  setDragState({
                    nodeId: firstNode.id,
                    nodeIds: orderedGraphCanvasNodeIds(nodes, group.nodeIds),
                    startX: pointer.x,
                    startY: pointer.y,
                    originalX: firstNode.x,
                    originalY: firstNode.y,
                    originalPositions,
                  });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectItem({ type: "group", id: group.groupId });
                  }
                }}
              >
                <span className="absolute -top-5 left-2 max-w-full truncate rounded bg-background px-1.5 py-0.5">
                  {sourceGroup?.label ?? group.groupId}
                </span>
              </div>
            );
          })}
          <svg
            data-slot="workflow-builder-edges"
            aria-label="Workflow connections"
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
          >
            {visibleEdges.map((edge) => {
              const geometry = edgeGeometry.get(edge.id);
              const line =
                geometry?.line ?? getWorkflowEdgeLine(nodeById, edge, portPoints, layoutOptions);
              const selected = edge.id === currentSelectedEdgeId;
              const showEndpointHandles = !readOnly && (selected || edge.id === hoveredEdgeId);
              const edgeStroke = getGraphCanvasEdgeStatusColor(edge.status) ?? edge.color;
              const sourcePoint =
                geometry?.sourcePoint ??
                getWorkflowEdgeEndpointPoint(nodeById, edge, "source", portPoints, layoutOptions);
              const targetPoint =
                geometry?.targetPoint ??
                getWorkflowEdgeEndpointPoint(nodeById, edge, "target", portPoints, layoutOptions);
              return (
                <g
                  key={edge.id}
                  onPointerEnter={() => setHoveredEdgeId(edge.id)}
                  onPointerLeave={() =>
                    setHoveredEdgeId((currentHoveredEdgeId) =>
                      currentHoveredEdgeId === edge.id ? null : currentHoveredEdgeId,
                    )
                  }
                >
                  <path
                    data-slot="workflow-builder-edge-hit"
                    role="button"
                    tabIndex={0}
                    aria-label={`Connection ${edge.id}`}
                    d={line.path}
                    className="pointer-events-auto cursor-pointer fill-none stroke-transparent"
                    strokeWidth={16}
                    onClick={(event) => selectEdge(edge, getSelectionModeFromEvent(event))}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      if (!readOnly) {
                        removeEdge(edge, "edge-double-click");
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectEdge(edge);
                      }
                    }}
                  />
                  <path
                    data-slot="workflow-builder-edge"
                    data-status={edge.status}
                    data-selected={selected ? "true" : undefined}
                    d={line.path}
                    className={cn(
                      "fill-none stroke-border",
                      selected && "stroke-primary",
                      edge.status === "error" && "stroke-destructive",
                      edge.status === "success" && "stroke-emerald-500",
                      edge.status === "running" && "stroke-blue-500",
                    )}
                    strokeWidth={selected ? 3 : 2}
                    stroke={edgeStroke}
                  />
                  {showEndpointHandles ? (
                    <>
                      <GraphCanvasEdgeHandle
                        label={`Rewire source for connection ${edge.id}`}
                        point={sourcePoint}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          selectEdge(edge);
                          setPendingConnection(null);
                          const pointerPoint = getGraphCanvasPointerPoint(
                            event,
                            viewportRef.current,
                            currentZoom,
                          );
                          setConnectionDrag({
                            type: "rewire-source",
                            edge,
                            startPoint: pointerPoint,
                            pointerPoint,
                          });
                        }}
                      />
                      <GraphCanvasEdgeHandle
                        label={`Rewire target for connection ${edge.id}`}
                        point={targetPoint}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          selectEdge(edge);
                          setPendingConnection(null);
                          const pointerPoint = getGraphCanvasPointerPoint(
                            event,
                            viewportRef.current,
                            currentZoom,
                          );
                          setConnectionDrag({
                            type: "rewire-target",
                            edge,
                            startPoint: pointerPoint,
                            pointerPoint,
                          });
                        }}
                      />
                    </>
                  ) : null}
                </g>
              );
            })}
            {connectionDrag ? (
              <path
                data-slot="workflow-builder-connection-preview"
                d={
                  getWorkflowConnectionDragLine(nodeById, connectionDrag, portPoints, layoutOptions)
                    .path
                }
                className={cn(
                  "fill-none stroke-muted-foreground",
                  connectionDrag.targetValid === true && "stroke-primary",
                  connectionDrag.targetValid === false && "stroke-destructive",
                )}
                strokeDasharray={connectionDrag.targetValid ? undefined : "6 5"}
                strokeWidth={3}
              />
            ) : null}
          </svg>
          {nodes.map((node) => (
            <GraphCanvasNode
              key={node.id}
              node={node}
              selected={currentSelectedNodeIds.includes(node.id)}
              hidden={hiddenNodeIdSet.has(node.id)}
              readOnly={readOnly}
              pendingConnection={pendingConnection}
              inputsConnectable={
                connectionDrag?.type === "new" || connectionDrag?.type === "rewire-target"
              }
              showPortColumnHeaders={showPortColumnHeaders}
              onNodeSelect={selectNodeFromPointer}
              onNodeMinimizedChange={onNodesChange ? changeNodeMinimized : undefined}
              onStartConnection={handleStartConnection}
              onCompleteConnection={completeConnection}
              onInputPointerUp={handleInputPointerUp}
              onOutputPointerDown={handleOutputPointerDown}
              onOutputPointerUp={handleOutputPointerUp}
              onNodePointerDown={handleNodePointerDown}
            />
          ))}
          {marqueeState ? (
            <div
              data-slot="workflow-builder-marquee"
              className="pointer-events-none absolute rounded-sm border border-primary bg-primary/10"
              style={normalizeGraphEditorBounds({
                x: marqueeState.startPoint.x,
                y: marqueeState.startPoint.y,
                width: marqueeState.pointerPoint.x - marqueeState.startPoint.x,
                height: marqueeState.pointerPoint.y - marqueeState.startPoint.y,
              })}
            />
          ) : null}
        </div>
        {showMiniMap ? (
          <GraphCanvasMiniMap
            nodes={nodes}
            edges={visibleEdges}
            selectedNodeId={currentSelectedNodeId}
            showPortColumnHeaders={showPortColumnHeaders}
            className="absolute right-3 bottom-3"
          />
        ) : null}
      </div>
    </div>
  );
}
