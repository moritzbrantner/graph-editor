"use client";

import * as React from "react";
import { Maximize2Icon, MinusIcon, PlusIcon, Trash2Icon, WorkflowIcon } from "lucide-react";

import { Badge, Button, Separator, cn } from "@moritzbrantner/ui";
import {
  GraphNode,
  getGraphNodePortCenterOffset,
  getGraphNodeSize,
  type GraphNodeData as WorkflowCanvasNodeData,
  type GraphNodeLayoutOptions,
  type GraphNodePort as WorkflowCanvasNodePort,
} from "./graph-node";

type GraphCanvasPort<TypeScriptType = unknown> = WorkflowCanvasNodePort<TypeScriptType>;

type GraphCanvasNodeData<
  Inputs extends readonly GraphCanvasPort[] = GraphCanvasPort[],
  Outputs extends readonly GraphCanvasPort[] = GraphCanvasPort[],
> = WorkflowCanvasNodeData<Inputs, Outputs> & {
  x: number;
  y: number;
};

type GraphCanvasEdge = {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  color?: string;
  status?: "idle" | "running" | "success" | "error" | "warning" | string;
  metadata?: Record<string, unknown>;
};

type GraphCanvasSelection =
  | { type: "node"; id: string; node: GraphCanvasNodeData }
  | { type: "edge"; id: string; edge: GraphCanvasEdge }
  | { type: "group"; id: string }
  | null;

type GraphCanvasConnectionValidityInput = {
  nodes: GraphCanvasNodeData[];
  edges: GraphCanvasEdge[];
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  ignoreEdgeId?: string;
};

type GraphCanvasConnectionValidity = {
  valid: boolean;
  reason?:
    | "duplicate"
    | "input-occupied"
    | "kind-mismatch"
    | "missing-port"
    | "self-connection"
    | "type-mismatch";
};

type GraphCanvasViewport = {
  x: number;
  y: number;
  zoom: number;
};

type GraphCanvasConnection = {
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
};

type GraphCanvasDisconnectReason =
  | "edge-delete"
  | "edge-double-click"
  | "endpoint-detach"
  | "node-delete"
  | "rewire";

type GraphCanvasProps = Omit<React.ComponentProps<"div">, "onChange"> & {
  nodes: GraphCanvasNodeData[];
  edges: GraphCanvasEdge[];
  onNodesChange?: (nodes: GraphCanvasNodeData[]) => void;
  onEdgesChange?: (edges: GraphCanvasEdge[]) => void;
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
  selectedGroupId?: string | null;
  hiddenNodeIds?: readonly string[];
  hiddenEdgeIds?: readonly string[];
  getNodeDragGroupIds?: (nodeId: string) => readonly string[];
  onNodePointerSelect?: (nodeId: string) => GraphCanvasSelection | undefined;
  onSelectionChange?: (selection: GraphCanvasSelection) => void;
  readOnly?: boolean;
  defaultZoom?: number;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  viewport?: GraphCanvasViewport;
  defaultViewport?: GraphCanvasViewport;
  onViewportChange?: (viewport: GraphCanvasViewport) => void;
  isConnectionValid?: (
    connection: GraphCanvasConnectionValidityInput,
  ) => GraphCanvasConnectionValidity;
  onConnectionStart?: (
    connection: Pick<GraphCanvasConnection, "sourceNodeId" | "sourcePortId">,
  ) => void;
  onConnectionCancel?: () => void;
  onConnectionComplete?: (connection: GraphCanvasConnection) => void;
  onConnectionDisconnect?: (edge: GraphCanvasEdge, reason: GraphCanvasDisconnectReason) => void;
  minZoom?: number;
  maxZoom?: number;
  surfaceHeight?: number | string;
  canvasSize?: { width: number; height: number };
  showMiniMap?: boolean;
  showPortColumnHeaders?: boolean;
  toolbarLabel?: React.ReactNode;
  measurePorts?: "auto" | "dom" | "deterministic";
};

export type GraphCanvasNodeProps = Omit<React.ComponentProps<"div">, "onSelect"> & {
  node: GraphCanvasNodeData;
  selected?: boolean;
  hidden?: boolean;
  readOnly?: boolean;
  pendingConnection?: PendingConnection | null;
  inputsConnectable?: boolean;
  showPortColumnHeaders?: boolean;
  onNodeSelect?: (node: GraphCanvasNodeData) => void;
  onNodeMinimizedChange?: (nodeId: string, minimized: boolean) => void;
  onStartConnection?: (nodeId: string, portId: string) => void;
  onCompleteConnection?: (nodeId: string, portId: string) => void;
  onInputPointerUp?: (
    event: React.PointerEvent<HTMLButtonElement>,
    nodeId: string,
    portId: string,
  ) => void;
  onOutputPointerDown?: (
    event: React.PointerEvent<HTMLButtonElement>,
    nodeId: string,
    portId: string,
  ) => void;
  onOutputPointerUp?: (
    event: React.PointerEvent<HTMLButtonElement>,
    nodeId: string,
    portId: string,
  ) => void;
  onNodePointerDown?: (
    event: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>,
    node: GraphCanvasNodeData,
  ) => void;
};

export type GraphCanvasToolbarProps = React.ComponentProps<"div"> & {
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  readOnly?: boolean;
  selectedLabel?: string;
  toolbarLabel?: React.ReactNode;
  onZoomChange?: (zoom: number) => void;
  onFitView?: () => void;
  onDeleteSelection?: () => void;
};

export type GraphCanvasMiniMapProps = React.ComponentProps<"div"> & {
  nodes: GraphCanvasNodeData[];
  edges?: GraphCanvasEdge[];
  selectedNodeId?: string | null;
  showPortColumnHeaders?: boolean;
};

type PendingConnection = {
  sourceNodeId: string;
  sourcePortId: string;
};

type GraphCanvasConnectionDrag =
  | {
      type: "new";
      sourceNodeId: string;
      sourcePortId: string;
      startPoint: GraphCanvasPoint;
      pointerPoint: GraphCanvasPoint;
      started: boolean;
      targetNodeId?: string;
      targetPortId?: string;
      targetValid?: boolean;
    }
  | {
      type: "rewire-source";
      edge: GraphCanvasEdge;
      startPoint: GraphCanvasPoint;
      pointerPoint: GraphCanvasPoint;
      targetNodeId?: string;
      targetPortId?: string;
      targetValid?: boolean;
    }
  | {
      type: "rewire-target";
      edge: GraphCanvasEdge;
      startPoint: GraphCanvasPoint;
      pointerPoint: GraphCanvasPoint;
      targetNodeId?: string;
      targetPortId?: string;
      targetValid?: boolean;
    };

type GraphCanvasPortDirection = "input" | "output";

type GraphCanvasPoint = {
  x: number;
  y: number;
};

type GraphCanvasPortPointMap = Record<string, GraphCanvasPoint>;

type DragState = {
  nodeId: string;
  nodeIds: string[];
  startX: number;
  startY: number;
  originalX: number;
  originalY: number;
  originalPositions: Record<string, GraphCanvasPoint>;
} | null;

const graphCanvasSnapDistance = 28;
const graphCanvasConnectionDragThreshold = 4;

function GraphCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  selectedNodeId,
  selectedEdgeId,
  selectedGroupId,
  hiddenNodeIds,
  hiddenEdgeIds,
  getNodeDragGroupIds,
  onNodePointerSelect,
  onSelectionChange,
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
  minZoom = 0.5,
  maxZoom = 1.75,
  surfaceHeight = "32rem",
  canvasSize,
  showMiniMap = true,
  showPortColumnHeaders = true,
  toolbarLabel = "Workflow",
  measurePorts = "auto",
  className,
  ...props
}: GraphCanvasProps) {
  const [internalZoom, setInternalZoom] = React.useState(defaultZoom);
  const [internalViewport, setInternalViewport] = React.useState<GraphCanvasViewport>(
    defaultViewport ?? { x: 0, y: 0, zoom: defaultZoom },
  );
  const [internalSelectedNodeId, setInternalSelectedNodeId] = React.useState<string | null>(null);
  const [internalSelectedEdgeId, setInternalSelectedEdgeId] = React.useState<string | null>(null);
  const [pendingConnection, setPendingConnection] = React.useState<PendingConnection | null>(null);
  const [connectionDrag, setConnectionDrag] = React.useState<GraphCanvasConnectionDrag | null>(
    null,
  );
  const [hoveredEdgeId, setHoveredEdgeId] = React.useState<string | null>(null);
  const [dragState, setDragState] = React.useState<DragState>(null);
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
  const currentSelectedNodeId = selectedNodeId ?? internalSelectedNodeId;
  const currentSelectedEdgeId = selectedEdgeId ?? internalSelectedEdgeId;
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

  const commitSelection = React.useCallback(
    (selection: GraphCanvasSelection) => {
      setInternalSelectedNodeId(selection?.type === "node" ? selection.id : null);
      setInternalSelectedEdgeId(selection?.type === "edge" ? selection.id : null);
      onSelectionChange?.(selection);
    },
    [onSelectionChange],
  );

  const selectNode = React.useCallback(
    (node: GraphCanvasNodeData) => {
      commitSelection({ type: "node", id: node.id, node });
    },
    [commitSelection],
  );

  const selectEdge = React.useCallback(
    (edge: GraphCanvasEdge) => {
      commitSelection({ type: "edge", id: edge.id, edge });
    },
    [commitSelection],
  );
  const selectNodeFromPointer = React.useCallback(
    (node: GraphCanvasNodeData) => {
      const pointerSelection = onNodePointerSelect?.(node.id);
      if (pointerSelection !== undefined) {
        commitSelection(pointerSelection);
        return;
      }

      selectNode(node);
    },
    [commitSelection, onNodePointerSelect, selectNode],
  );

  const removeEdge = (edge: GraphCanvasEdge, reason: GraphCanvasDisconnectReason) => {
    onEdgesChange?.(edges.filter((currentEdge) => currentEdge.id !== edge.id));
    onConnectionDisconnect?.(edge, reason);
    if (currentSelectedEdgeId === edge.id) {
      commitSelection(null);
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

      onEdgesChange?.([
        ...edges,
        {
          id: `edge-${connection.sourceNodeId}-${connection.sourcePortId}-${connection.targetNodeId}-${connection.targetPortId}`,
          ...connection,
        },
      ]);
      onConnectionComplete?.(connection);
      return true;
    },
    [edges, getConnectionValidity, onConnectionComplete, onEdgesChange],
  );

  const rewireConnection = React.useCallback(
    (edge: GraphCanvasEdge, connection: GraphCanvasConnection) => {
      const validity = getConnectionValidity(connection, edge.id);

      if (!validity.valid) {
        return false;
      }

      const nextEdge = { ...edge, ...connection };
      onEdgesChange?.(
        edges.map((currentEdge) => (currentEdge.id === edge.id ? nextEdge : currentEdge)),
      );
      onConnectionDisconnect?.(edge, "rewire");
      onConnectionComplete?.(connection);
      commitSelection({ type: "edge", id: edge.id, edge: nextEdge });
      return true;
    },
    [
      commitSelection,
      edges,
      getConnectionValidity,
      onConnectionComplete,
      onConnectionDisconnect,
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
      commitSelection(null);
      return;
    }

    if (selectedEdge) {
      removeEdge(selectedEdge, "edge-delete");
    }
  };

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
      selectNodeFromPointer(node);
      if (
        readOnly ||
        (event.button !== 0 && event.button !== undefined) ||
        isGraphNodeControlEvent(event.target)
      ) {
        return;
      }
      const pointer = getWorkflowPointer(event);
      const dragNodeIds = orderedGraphCanvasNodeIds(
        nodes,
        getNodeDragGroupIds?.(node.id) ?? [node.id],
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
    [getNodeDragGroupIds, nodeById, nodes, readOnly, selectNodeFromPointer],
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
      commitSelection(null);
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
      <GraphCanvasToolbar
        zoom={currentZoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        readOnly={readOnly}
        selectedLabel={selectedGroupId ?? selectedNode?.label ?? selectedEdge?.id}
        toolbarLabel={toolbarLabel}
        onZoomChange={commitZoom}
        onFitView={fitView}
        onDeleteSelection={deleteSelection}
      />
      <div
        data-slot="workflow-builder-surface"
        tabIndex={0}
        className="relative overflow-auto rounded-md border bg-muted/20"
        style={{ height: typeof surfaceHeight === "number" ? `${surfaceHeight}px` : surfaceHeight }}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => {
          completeConnectionDragFromPointer(event);
          setDragState(null);
        }}
        onPointerLeave={() => setDragState(null)}
        onMouseMove={handlePointerMove}
        onMouseUp={(event) => {
          completeConnectionDragFromPointer(event);
          setDragState(null);
        }}
        onMouseLeave={() => setDragState(null)}
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
                    onClick={() => selectEdge(edge)}
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
              selected={node.id === currentSelectedNodeId}
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

const GraphCanvasNode = React.memo(function GraphCanvasNode({
  node,
  selected,
  hidden,
  readOnly,
  pendingConnection,
  inputsConnectable,
  showPortColumnHeaders = true,
  onNodeSelect,
  onNodeMinimizedChange,
  onStartConnection,
  onCompleteConnection,
  onInputPointerUp,
  onOutputPointerDown,
  onOutputPointerUp,
  onNodePointerDown,
  className,
  ...props
}: GraphCanvasNodeProps) {
  const layoutOptions = React.useMemo(() => ({ showPortColumnHeaders }), [showPortColumnHeaders]);
  const nodeSize = getGraphNodeSize(node, layoutOptions);

  return (
    <div
      data-slot="workflow-builder-node"
      data-node-id={node.id}
      data-selected={selected ? "true" : undefined}
      data-hidden={hidden ? "true" : undefined}
      data-status={node.status}
      aria-hidden={hidden ? true : undefined}
      className={cn("absolute", className)}
      style={{
        left: node.x,
        pointerEvents: hidden ? "none" : undefined,
        top: node.y,
        visibility: hidden ? "hidden" : undefined,
        width: nodeSize.width,
      }}
      onPointerDown={(event) => onNodePointerDown?.(event, node)}
      onMouseDown={(event) => onNodePointerDown?.(event, node)}
      {...props}
    >
      <GraphNode
        node={node}
        selected={selected}
        readOnly={readOnly}
        inputDisabled={readOnly || !(pendingConnection || inputsConnectable)}
        outputDisabled={readOnly}
        showPortColumnHeaders={showPortColumnHeaders}
        onNodeSelect={() => onNodeSelect?.(node)}
        onMinimizedChange={(_, minimized) => onNodeMinimizedChange?.(node.id, minimized)}
        onInputClick={(port) => onCompleteConnection?.(node.id, port.id)}
        onOutputClick={(port) => onStartConnection?.(node.id, port.id)}
        onInputPointerUp={(port, _, event) => onInputPointerUp?.(event, node.id, port.id)}
        onOutputPointerDown={(port, _, event) => onOutputPointerDown?.(event, node.id, port.id)}
        onOutputPointerUp={(port, _, event) => onOutputPointerUp?.(event, node.id, port.id)}
        getInputAriaLabel={(port) => `Connect to ${node.label} ${port.label}`}
        getOutputAriaLabel={(port) => `Start ${node.label} ${port.label}`}
      />
    </div>
  );
});

function GraphCanvasToolbar({
  zoom,
  minZoom = 0.5,
  maxZoom = 1.75,
  readOnly,
  selectedLabel,
  toolbarLabel = "Workflow",
  onZoomChange,
  onFitView,
  onDeleteSelection,
  className,
  ...props
}: GraphCanvasToolbarProps) {
  return (
    <div
      data-slot="workflow-builder-toolbar"
      role="toolbar"
      aria-label="Workflow builder controls"
      className={cn("flex flex-wrap items-center justify-between gap-2", className)}
      {...props}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <WorkflowIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        {toolbarLabel}
        {selectedLabel ? <Badge variant="secondary">{selectedLabel}</Badge> : null}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Zoom out"
          disabled={zoom <= minZoom}
          onClick={() => onZoomChange?.(zoom - 0.1)}
        >
          <MinusIcon />
        </Button>
        <span className="min-w-12 text-center text-xs text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Zoom in"
          disabled={zoom >= maxZoom}
          onClick={() => onZoomChange?.(zoom + 0.1)}
        >
          <PlusIcon />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Fit view"
          onClick={onFitView}
        >
          <Maximize2Icon />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Delete selected"
          disabled={readOnly || !selectedLabel}
          onClick={onDeleteSelection}
        >
          <Trash2Icon />
        </Button>
      </div>
    </div>
  );
}

function GraphCanvasMiniMap({
  nodes,
  edges: _edges,
  selectedNodeId,
  showPortColumnHeaders = true,
  className,
  ...props
}: GraphCanvasMiniMapProps) {
  void _edges;
  const layoutOptions = React.useMemo(() => ({ showPortColumnHeaders }), [showPortColumnHeaders]);
  const bounds = React.useMemo(
    () => getWorkflowBounds(nodes, layoutOptions),
    [layoutOptions, nodes],
  );
  const minimapNodes = React.useMemo(
    () =>
      nodes.map((node) => ({
        id: node.id,
        left: ((node.x - bounds.x) / bounds.width) * 100,
        top: ((node.y - bounds.y) / bounds.height) * 100,
      })),
    [bounds, nodes],
  );

  return (
    <div
      data-slot="workflow-builder-minimap"
      role="img"
      aria-label="Workflow minimap"
      className={cn("h-24 w-36 rounded-md border bg-background/90 p-2 shadow-sm", className)}
      {...props}
    >
      <div className="relative size-full">
        {minimapNodes.map((node) => {
          return (
            <span
              key={node.id}
              data-slot="workflow-builder-minimap-node"
              data-selected={node.id === selectedNodeId ? "true" : undefined}
              className="absolute size-2 rounded-sm bg-muted-foreground data-[selected=true]:bg-primary"
              style={{ left: `${node.left}%`, top: `${node.top}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

function GraphCanvasEdgeHandle({
  label,
  point,
  onPointerDown,
}: {
  label: string;
  point: GraphCanvasPoint;
  onPointerDown: (event: React.PointerEvent<SVGGElement>) => void;
}) {
  return (
    <g
      data-slot="workflow-builder-edge-handle"
      role="button"
      tabIndex={0}
      aria-label={label}
      className="pointer-events-auto cursor-grab outline-none"
      transform={`translate(${point.x} ${point.y})`}
      onPointerDown={onPointerDown}
    >
      <circle r={12} className="fill-transparent" />
      <circle r={5} className="fill-background stroke-primary" strokeWidth={2} />
    </g>
  );
}

function getGraphCanvasConnectionValidity({
  nodes,
  edges,
  sourceNodeId,
  sourcePortId,
  targetNodeId,
  targetPortId,
  ignoreEdgeId,
}: GraphCanvasConnectionValidityInput): GraphCanvasConnectionValidity {
  const sourceNode = nodes.find((node) => node.id === sourceNodeId);
  const targetNode = nodes.find((node) => node.id === targetNodeId);
  const sourcePort = sourceNode?.outputs?.find((port) => port.id === sourcePortId);
  const targetPort = targetNode?.inputs?.find((port) => port.id === targetPortId);

  if (!sourceNode || !targetNode || !sourcePort || !targetPort) {
    return { valid: false, reason: "missing-port" };
  }

  if (sourceNodeId === targetNodeId) {
    return { valid: false, reason: "self-connection" };
  }

  const sourceType = getGraphCanvasPortTypeSource(sourcePort);
  const targetType = getGraphCanvasPortTypeSource(targetPort);

  if (sourceType && targetType && sourceType !== targetType) {
    return { valid: false, reason: "type-mismatch" };
  }

  if (sourcePort.kind && targetPort.kind && sourcePort.kind !== targetPort.kind) {
    return { valid: false, reason: "kind-mismatch" };
  }

  const duplicate = edges.some(
    (edge) =>
      edge.id !== ignoreEdgeId &&
      edge.sourceNodeId === sourceNodeId &&
      edge.sourcePortId === sourcePortId &&
      edge.targetNodeId === targetNodeId &&
      edge.targetPortId === targetPortId,
  );

  if (duplicate) {
    return { valid: false, reason: "duplicate" };
  }

  const incomingEdge = getGraphCanvasIncomingEdge(edges, targetNodeId, targetPortId, ignoreEdgeId);

  if (incomingEdge) {
    return { valid: false, reason: "input-occupied" };
  }

  return { valid: true };
}

function getGraphCanvasIncomingEdge(
  edges: GraphCanvasEdge[],
  targetNodeId: string,
  targetPortId: string,
  ignoreEdgeId?: string,
) {
  return edges.find(
    (edge) =>
      edge.id !== ignoreEdgeId &&
      edge.targetNodeId === targetNodeId &&
      edge.targetPortId === targetPortId,
  );
}

function getGraphCanvasEdgeStatusColor(status: GraphCanvasEdge["status"]) {
  if (status === "error") {
    return "var(--destructive)";
  }
  if (status === "success") {
    return "#10b981";
  }
  if (status === "running") {
    return "#3b82f6";
  }
  return undefined;
}

function getWorkflowEdgeLine(
  nodeById: ReadonlyMap<string, GraphCanvasNodeData>,
  edge: GraphCanvasEdge,
  portPoints: GraphCanvasPortPointMap = {},
  layoutOptions: GraphNodeLayoutOptions = {},
) {
  const sourceNode = nodeById.get(edge.sourceNodeId);
  const targetNode = nodeById.get(edge.targetNodeId);
  const source = sourceNode
    ? getGraphNodePortPoint(sourceNode, "output", edge.sourcePortId, portPoints, layoutOptions)
    : { x: 0, y: 0 };
  const target = targetNode
    ? getGraphNodePortPoint(targetNode, "input", edge.targetPortId, portPoints, layoutOptions)
    : { x: 0, y: 0 };
  const handle = Math.max(48, Math.abs(target.x - source.x) / 2);

  return {
    path: `M ${source.x} ${source.y} C ${source.x + handle} ${source.y}, ${target.x - handle} ${target.y}, ${target.x} ${target.y}`,
  };
}

function getGraphCanvasConnectionPreviewLine(source: GraphCanvasPoint, target: GraphCanvasPoint) {
  const handle = Math.max(48, Math.abs(target.x - source.x) / 2);

  return {
    path: `M ${source.x} ${source.y} C ${source.x + handle} ${source.y}, ${target.x - handle} ${target.y}, ${target.x} ${target.y}`,
  };
}

function getWorkflowConnectionDragLine(
  nodeById: ReadonlyMap<string, GraphCanvasNodeData>,
  drag: GraphCanvasConnectionDrag,
  portPoints: GraphCanvasPortPointMap = {},
  layoutOptions: GraphNodeLayoutOptions = {},
) {
  if (drag.type === "rewire-source") {
    const targetNode = nodeById.get(drag.edge.targetNodeId);
    const target = targetNode
      ? getGraphNodePortPoint(
          targetNode,
          "input",
          drag.edge.targetPortId,
          portPoints,
          layoutOptions,
        )
      : drag.pointerPoint;

    return getGraphCanvasConnectionPreviewLine(drag.pointerPoint, target);
  }

  const sourceNode = nodeById.get(drag.type === "new" ? drag.sourceNodeId : drag.edge.sourceNodeId);
  const sourcePortId = drag.type === "new" ? drag.sourcePortId : drag.edge.sourcePortId;
  const source = sourceNode
    ? getGraphNodePortPoint(sourceNode, "output", sourcePortId, portPoints, layoutOptions)
    : drag.pointerPoint;

  return getGraphCanvasConnectionPreviewLine(source, drag.pointerPoint);
}

function getWorkflowEdgeEndpointPoint(
  nodeById: ReadonlyMap<string, GraphCanvasNodeData>,
  edge: GraphCanvasEdge,
  endpoint: "source" | "target",
  portPoints: GraphCanvasPortPointMap = {},
  layoutOptions: GraphNodeLayoutOptions = {},
) {
  const node = nodeById.get(endpoint === "source" ? edge.sourceNodeId : edge.targetNodeId);

  if (!node) {
    return { x: 0, y: 0 };
  }

  return getGraphNodePortPoint(
    node,
    endpoint === "source" ? "output" : "input",
    endpoint === "source" ? edge.sourcePortId : edge.targetPortId,
    portPoints,
    layoutOptions,
  );
}

function getGraphNodePortPoint(
  node: GraphCanvasNodeData,
  direction: GraphCanvasPortDirection,
  portId: string,
  portPoints: GraphCanvasPortPointMap = {},
  layoutOptions: GraphNodeLayoutOptions = {},
): GraphCanvasPoint {
  const size = getGraphNodeSize(node, layoutOptions);
  const compact = node.variant === "compact";
  const measuredPoint = portPoints[getGraphCanvasPortPointKey(node.id, direction, portId)];

  if (measuredPoint) {
    return measuredPoint;
  }

  const x = node.x + getGraphNodePortDotXOffset(node, direction, layoutOptions);

  if (compact) {
    return {
      x,
      y: node.y + size.height / 2,
    };
  }

  const ports = direction === "input" ? (node.inputs ?? []) : (node.outputs ?? []);
  const portIndex = ports.findIndex((port) => port.id === portId);

  if (portIndex === -1) {
    return {
      x,
      y: node.y + size.height / 2,
    };
  }

  return {
    x,
    y: node.y + getGraphNodePortCenterOffset(node, portIndex, layoutOptions),
  };
}

function getWorkflowBounds(
  nodes: GraphCanvasNodeData[],
  layoutOptions: GraphNodeLayoutOptions = {},
) {
  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => node.y);
  const minX = Math.min(...xs, 0);
  const minY = Math.min(...ys, 0);
  const sizes = nodes.map((node) => getGraphNodeSize(node, layoutOptions));
  const maxX = Math.max(
    ...xs.map((x, index) => x + sizes[index]!.width),
    graphNodeSizeFallback().width,
  );
  const maxY = Math.max(
    ...ys.map((y, index) => y + sizes[index]!.height),
    graphNodeSizeFallback().height,
  );

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  };
}

function getGraphNodePortDotXOffset(
  node: GraphCanvasNodeData,
  direction: GraphCanvasPortDirection,
  layoutOptions: GraphNodeLayoutOptions = {},
) {
  const size = getGraphNodeSize(node, layoutOptions);

  return direction === "input" ? 0 : size.width;
}

function getGraphCanvasSnappedNodePosition(
  node: GraphCanvasNodeData,
  nodes: GraphCanvasNodeData[],
  position: GraphCanvasPoint,
  layoutOptions: GraphNodeLayoutOptions = {},
): GraphCanvasPoint {
  let closestSnap: (GraphCanvasPoint & { distance: number }) | null = null;
  const nodeSize = getGraphNodeSize(node, layoutOptions);

  for (const otherNode of nodes) {
    if (otherNode.id === node.id) {
      continue;
    }

    const otherSize = getGraphNodeSize(otherNode, layoutOptions);

    for (const inputMatch of getGraphCanvasPortMatches(node.inputs, otherNode.outputs)) {
      const snap = {
        x: otherNode.x + otherSize.width,
        y:
          otherNode.y +
          getGraphNodePortCenterOffset(otherNode, inputMatch.otherIndex, layoutOptions) -
          getGraphNodePortCenterOffset(node, inputMatch.nodeIndex, layoutOptions),
      };
      const distance = getWorkflowPointDistance(position, snap);

      if (
        distance <= graphCanvasSnapDistance &&
        (!closestSnap || distance < closestSnap.distance)
      ) {
        closestSnap = { ...snap, distance };
      }
    }

    for (const outputMatch of getGraphCanvasPortMatches(node.outputs, otherNode.inputs)) {
      const snap = {
        x: otherNode.x - nodeSize.width,
        y:
          otherNode.y +
          getGraphNodePortCenterOffset(otherNode, outputMatch.otherIndex, layoutOptions) -
          getGraphNodePortCenterOffset(node, outputMatch.nodeIndex, layoutOptions),
      };
      const distance = getWorkflowPointDistance(position, snap);

      if (
        distance <= graphCanvasSnapDistance &&
        (!closestSnap || distance < closestSnap.distance)
      ) {
        closestSnap = { ...snap, distance };
      }
    }
  }

  return closestSnap ? { x: closestSnap.x, y: closestSnap.y } : position;
}

function orderedGraphCanvasNodeIds(
  nodes: readonly GraphCanvasNodeData[],
  nodeIds: readonly string[],
) {
  const requestedIds = new Set(nodeIds);
  return nodes.flatMap((node) => (requestedIds.has(node.id) ? [node.id] : []));
}

function getGraphCanvasPortMatches(
  nodePorts: readonly GraphCanvasPort[] | undefined,
  otherPorts: readonly GraphCanvasPort[] | undefined,
) {
  const matches: { nodeIndex: number; otherIndex: number }[] = [];

  nodePorts?.forEach((nodePort, nodeIndex) => {
    otherPorts?.forEach((otherPort, otherIndex) => {
      if (graphCanvasPortsMatch(nodePort, otherPort)) {
        matches.push({ nodeIndex, otherIndex });
      }
    });
  });

  return matches;
}

function graphCanvasPortsMatch(firstPort: GraphCanvasPort, secondPort: GraphCanvasPort) {
  return getGraphCanvasPortMatchKey(firstPort) === getGraphCanvasPortMatchKey(secondPort);
}

function getGraphCanvasPortMatchKey(port: GraphCanvasPort) {
  const typeSource = getGraphCanvasPortTypeSource(port);

  if (typeSource) {
    return `type:${typeSource}`;
  }

  return (port.kind ?? port.id ?? port.label).trim().toLowerCase();
}

function getGraphCanvasPortTypeSource(port: GraphCanvasPort) {
  if (!port.type) {
    return undefined;
  }

  const source = typeof port.type === "string" ? port.type : (port.type.source ?? port.type.kind);
  return typeof source === "string" ? source.trim() : undefined;
}

function getWorkflowPointDistance(firstPoint: GraphCanvasPoint, secondPoint: GraphCanvasPoint) {
  return Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y);
}

function measureGraphCanvasPortPoints(
  viewport: HTMLElement,
  zoom: number,
): GraphCanvasPortPointMap {
  const viewportRect = viewport.getBoundingClientRect();

  if (viewportRect.width === 0 || viewportRect.height === 0 || zoom <= 0) {
    return {};
  }

  const portPoints: GraphCanvasPortPointMap = {};
  const portElements = viewport.querySelectorAll<HTMLElement>(
    "[data-slot='workflow-node-port'][data-port-id]",
  );

  portElements.forEach((portElement) => {
    const nodeElement = portElement.closest<HTMLElement>("[data-slot='workflow-builder-node']");
    const dotElement = portElement.querySelector<HTMLElement>(
      "[data-slot='workflow-node-port-dot']",
    );
    const nodeId = nodeElement?.dataset.nodeId;
    const portId = portElement.dataset.portId;
    const direction = portElement.dataset.portDirection as GraphCanvasPortDirection | undefined;

    if (!nodeId || !portId || !dotElement || !isGraphCanvasPortDirection(direction)) {
      return;
    }

    const dotRect = dotElement.getBoundingClientRect();

    if (dotRect.width === 0 || dotRect.height === 0) {
      return;
    }

    portPoints[getGraphCanvasPortPointKey(nodeId, direction, portId)] = {
      x: (dotRect.left + dotRect.width / 2 - viewportRect.left) / zoom,
      y: (dotRect.top + dotRect.height / 2 - viewportRect.top) / zoom,
    };
  });

  return portPoints;
}

function graphCanvasPortPointMapsAreEqual(
  first: GraphCanvasPortPointMap,
  second: GraphCanvasPortPointMap,
) {
  const firstKeys = Object.keys(first);
  const secondKeys = Object.keys(second);

  return (
    firstKeys.length === secondKeys.length &&
    firstKeys.every((key) => first[key]?.x === second[key]?.x && first[key]?.y === second[key]?.y)
  );
}

function getGraphCanvasPortPointKey(
  nodeId: string,
  direction: GraphCanvasPortDirection,
  portId: string,
) {
  return getGraphCanvasPortKey(nodeId, direction, portId);
}

function getGraphCanvasPortKey(
  nodeId: string,
  direction: GraphCanvasPortDirection,
  portId: string,
) {
  return `${nodeId}:${direction}:${portId}`;
}

function isGraphCanvasPortDirection(
  direction: string | undefined,
): direction is GraphCanvasPortDirection {
  return direction === "input" || direction === "output";
}

function isGraphNodeControlEvent(target: EventTarget) {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        [
          "[data-slot='workflow-builder-port']",
          "[data-slot='workflow-node-port']",
          "[data-slot='workflow-node-minimize']",
          "[data-slot='workflow-node-menu-trigger']",
        ].join(", "),
      ),
    )
  );
}

function getWorkflowPointer(event: React.PointerEvent<Element> | React.MouseEvent<Element>) {
  const nativeEvent = event.nativeEvent as (PointerEvent | MouseEvent) & {
    pageX?: number;
    pageY?: number;
    x?: number;
    y?: number;
  };
  const x = [nativeEvent.clientX, nativeEvent.pageX, nativeEvent.x, event.clientX].find(
    (value) => typeof value === "number" && Number.isFinite(value),
  );
  const y = [nativeEvent.clientY, nativeEvent.pageY, nativeEvent.y, event.clientY].find(
    (value) => typeof value === "number" && Number.isFinite(value),
  );

  return {
    x: x ?? 0,
    y: y ?? 0,
  };
}

function getGraphCanvasPointerPoint(
  event: React.PointerEvent<Element> | React.MouseEvent<Element>,
  viewport: HTMLElement | null,
  zoom: number,
) {
  const pointer = getWorkflowPointer(event);
  const viewportRect = viewport?.getBoundingClientRect();

  if (!viewportRect || zoom <= 0) {
    return pointer;
  }

  return {
    x: (pointer.x - viewportRect.left) / zoom,
    y: (pointer.y - viewportRect.top) / zoom,
  };
}

function getGraphCanvasPortElementFromPoint(
  clientX: number,
  clientY: number,
  direction: GraphCanvasPortDirection,
) {
  const elementFromPoint = document.elementFromPoint?.(clientX, clientY);
  const portElement = elementFromPoint?.closest<HTMLElement>(
    `[data-slot='workflow-node-port'][data-port-direction='${direction}'][data-port-id]`,
  );

  return portElement ?? null;
}

function clampWorkflowValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function graphNodeSizeFallback() {
  return {
    width: 248,
    height: 124,
  };
}

export {
  GraphCanvas,
  GraphCanvasMiniMap,
  GraphCanvasNode,
  GraphCanvasToolbar,
  getGraphCanvasConnectionValidity,
};
export type {
  GraphCanvasConnection,
  GraphCanvasConnectionValidity,
  GraphCanvasConnectionValidityInput,
  GraphCanvasDisconnectReason,
  GraphCanvasEdge,
  GraphCanvasNodeData,
  GraphCanvasPort,
  GraphCanvasProps,
  GraphCanvasSelection,
  GraphCanvasViewport,
};
