"use client";

import type * as React from "react";
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
} from "../../core";
import {
  getGraphNodePortCenterOffset,
  getGraphNodeSize,
  type GraphNodeData as WorkflowCanvasNodeData,
  type GraphNodeLayoutOptions,
  type GraphNodePort as WorkflowCanvasNodePort,
} from "../nodes";

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

type GraphCanvasGroup = {
  id: string;
  label: string;
  nodeIds: string[];
  minimized?: boolean;
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
    | "cycle"
    | "duplicate"
    | "input-occupied"
    | "kind-mismatch"
    | "missing-node"
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
  groups?: GraphCanvasGroup[];
  onNodesChange?: (nodes: GraphCanvasNodeData[]) => void;
  onNodesChangeEnd?: (nodes: GraphCanvasNodeData[]) => void;
  onEdgesChange?: (edges: GraphCanvasEdge[]) => void;
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
  selectedGroupId?: string | null;
  selectedNodeIds?: readonly string[] | null;
  selectedEdgeIds?: readonly string[] | null;
  selectedGroupIds?: readonly string[] | null;
  hiddenNodeIds?: readonly string[];
  hiddenEdgeIds?: readonly string[];
  getNodeDragGroupIds?: (nodeId: string) => readonly string[];
  onNodePointerSelect?: (nodeId: string) => GraphCanvasSelection | undefined;
  onSelectionChange?: (selection: GraphCanvasSelection) => void;
  onSelectionStateChange?: (selection: GraphEditorSelectionState) => void;
  selectionMode?: "single" | "multi";
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
  onConnectionComplete?: (connection: GraphCanvasConnection) => boolean | void;
  onConnectionDisconnect?: (edge: GraphCanvasEdge, reason: GraphCanvasDisconnectReason) => void;
  onConnectionCreate?: (connection: GraphCanvasConnection) => boolean | void;
  onConnectionRewire?: (edge: GraphCanvasEdge, connection: GraphCanvasConnection) => boolean | void;
  onConnectionDelete?: (edge: GraphCanvasEdge, reason: GraphCanvasDisconnectReason) => void;
  minZoom?: number;
  maxZoom?: number;
  surfaceHeight?: number | string;
  canvasSize?: { width: number; height: number };
  showMiniMap?: boolean;
  showToolbar?: boolean;
  showPortColumnHeaders?: boolean;
  enableMarqueeSelection?: boolean;
  enablePan?: boolean;
  enableWheelZoom?: boolean;
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

type GraphCanvasKeyboardDirection = "up" | "right" | "down" | "left";

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

type MarqueeState = {
  startPoint: GraphCanvasPoint;
  pointerPoint: GraphCanvasPoint;
  selectionBefore: GraphEditorSelectionState;
  mode: GraphEditorSelectionMode;
} | null;

type PanState = {
  startX: number;
  startY: number;
  viewport: GraphCanvasViewport;
} | null;

const graphCanvasSnapDistance = 28;
const graphCanvasConnectionDragThreshold = 4;

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

function getGraphCanvasKeyboardDirection(key: string): GraphCanvasKeyboardDirection | null {
  if (key === "ArrowUp") {
    return "up";
  }
  if (key === "ArrowRight") {
    return "right";
  }
  if (key === "ArrowDown") {
    return "down";
  }
  if (key === "ArrowLeft") {
    return "left";
  }

  return null;
}

function getGraphCanvasKeyboardNudgeDelta(
  direction: GraphCanvasKeyboardDirection,
  distance: number,
): GraphCanvasPoint {
  if (direction === "up") {
    return { x: 0, y: -distance };
  }
  if (direction === "right") {
    return { x: distance, y: 0 };
  }
  if (direction === "down") {
    return { x: 0, y: distance };
  }

  return { x: -distance, y: 0 };
}

function getGraphCanvasNodeCenter(
  node: GraphCanvasNodeData,
  layoutOptions: GraphNodeLayoutOptions = {},
): GraphCanvasPoint {
  const size = getGraphNodeSize(node, layoutOptions);
  return {
    x: node.x + size.width / 2,
    y: node.y + size.height / 2,
  };
}

function getNextGraphCanvasNodeSelection(
  nodes: GraphCanvasNodeData[],
  currentNodeId: string | null,
  direction: GraphCanvasKeyboardDirection,
  layoutOptions: GraphNodeLayoutOptions,
  hiddenNodeIdSet: ReadonlySet<string>,
) {
  const visibleNodes = nodes
    .filter((node) => !hiddenNodeIdSet.has(node.id))
    .sort(
      (first, second) =>
        first.y - second.y || first.x - second.x || first.id.localeCompare(second.id),
    );

  if (visibleNodes.length === 0) {
    return null;
  }

  const currentNode =
    (currentNodeId ? visibleNodes.find((node) => node.id === currentNodeId) : null) ?? null;

  if (!currentNode) {
    return visibleNodes[0]!;
  }

  const currentCenter = getGraphCanvasNodeCenter(currentNode, layoutOptions);
  const candidates = visibleNodes.flatMap((node) => {
    if (node.id === currentNode.id) {
      return [];
    }

    const center = getGraphCanvasNodeCenter(node, layoutOptions);
    const primaryDistance =
      direction === "right"
        ? center.x - currentCenter.x
        : direction === "left"
          ? currentCenter.x - center.x
          : direction === "down"
            ? center.y - currentCenter.y
            : currentCenter.y - center.y;

    if (primaryDistance <= 0) {
      return [];
    }

    const perpendicularDistance =
      direction === "right" || direction === "left"
        ? Math.abs(center.y - currentCenter.y)
        : Math.abs(center.x - currentCenter.x);

    return [{ node, perpendicularDistance, primaryDistance }];
  });

  return (
    candidates.sort(
      (first, second) =>
        first.perpendicularDistance - second.perpendicularDistance ||
        first.primaryDistance - second.primaryDistance ||
        first.node.id.localeCompare(second.node.id),
    )[0]?.node ?? null
  );
}

function nudgeGraphCanvasNodes(
  nodes: GraphCanvasNodeData[],
  selectedNodeIds: readonly string[],
  delta: GraphCanvasPoint,
  hiddenNodeIdSet: ReadonlySet<string>,
): GraphCanvasNodeData[] {
  const selectedNodeIdSet = new Set(selectedNodeIds);

  if (selectedNodeIdSet.size === 0) {
    return nodes;
  }

  let moved = false;
  const nextNodes = nodes.map((node) => {
    if (!selectedNodeIdSet.has(node.id) || hiddenNodeIdSet.has(node.id)) {
      return node;
    }

    moved = true;
    return {
      ...node,
      x: node.x + delta.x,
      y: node.y + delta.y,
    };
  });

  return moved ? nextNodes : nodes;
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

function isGraphCanvasEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const editable = target.closest("input, textarea, select, [contenteditable='true']");
  return editable instanceof HTMLElement;
}

function isGraphCanvasInteractiveTarget(target: EventTarget) {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        [
          "[data-slot='workflow-builder-node']",
          "[data-slot='workflow-builder-edge-hit']",
          "[data-slot='workflow-builder-edge-handle']",
          "[data-slot='workflow-builder-group']",
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
  getGraphCanvasConnectionValidity,
  getGraphCanvasEdgeStatusColor,
  getWorkflowEdgeLine,
  getWorkflowConnectionDragLine,
  getWorkflowEdgeEndpointPoint,
  getWorkflowBounds,
  getNextGraphCanvasNodeSelection,
  getGraphCanvasKeyboardDirection,
  getGraphCanvasKeyboardNudgeDelta,
  nudgeGraphCanvasNodes,
  getGraphCanvasSnappedNodePosition,
  orderedGraphCanvasNodeIds,
  getGraphCanvasPortTypeSource,
  measureGraphCanvasPortPoints,
  graphCanvasPortPointMapsAreEqual,
  isGraphNodeControlEvent,
  isGraphCanvasEditableTarget,
  isGraphCanvasInteractiveTarget,
  getWorkflowPointer,
  getWorkflowPointDistance,
  getGraphCanvasPointerPoint,
  getGraphCanvasPortElementFromPoint,
  clampWorkflowValue,
  graphNodeSizeFallback,
};
export type {
  DragState,
  GraphCanvasConnection,
  GraphCanvasConnectionDrag,
  GraphCanvasConnectionValidity,
  GraphCanvasConnectionValidityInput,
  GraphCanvasDisconnectReason,
  GraphCanvasEdge,
  GraphCanvasGroup,
  GraphCanvasKeyboardDirection,
  GraphCanvasNodeData,
  GraphCanvasNodeProps,
  GraphCanvasPoint,
  GraphCanvasPort,
  GraphCanvasPortDirection,
  GraphCanvasPortPointMap,
  GraphCanvasProps,
  GraphCanvasSelection,
  GraphCanvasToolbarProps,
  GraphCanvasViewport,
  GraphCanvasMiniMapProps,
  MarqueeState,
  PanState,
  PendingConnection,
};
