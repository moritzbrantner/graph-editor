import type { GraphEditorNode, GraphEditorPort } from "./core";

export type GraphEditorNodeSize = {
  width: number;
  height: number;
};

export type GraphEditorNodeLayoutOptions = {
  showPortColumnHeaders?: boolean;
  /**
   * Height in pixels of consumer-composed body content between a node's header and its ports
   * (see `GraphCanvas` `renderNodeBody`). Called with the full node; minimized and compact nodes
   * have no body. Keeps every geometry consumer (ports, edges, snapping, bounds) on one model.
   */
  nodeBodyHeight?: (node: GraphEditorNodeBodyMetricsInput) => number;
};

export type GraphEditorNodeBodyMetricsInput = GraphEditorNodeMetricsInput & {
  id?: string;
  kind?: string;
  data?: unknown;
};

export type GraphEditorNodeMetricsInput<TNodeData = Record<string, unknown>> = Pick<
  GraphEditorNode<TNodeData>,
  "description" | "minimized" | "packageLabel" | "variant"
> & {
  inputs?: readonly GraphEditorPort[];
  outputs?: readonly GraphEditorPort[];
};

const graphEditorNodeInlineWidth = 240;
const graphEditorNodeDefaultWidth = 310;
const graphEditorNodeMinimizedWidth = 230;
const graphEditorNodeCompactHeight = 48;
const graphEditorNodeMinimizedHeaderHeight = 54;
const graphEditorNodePortRowHeight = 64;
const graphEditorNodePortGap = 8;
const graphEditorNodePortColumnsPaddingY = 24;
const graphEditorNodePortColumnLabelHeight = 21;
const graphEditorNodeHeaderBaseHeight = 72;
const graphEditorNodeDescriptionLineHeight = 20;
const graphEditorNodeDescriptionMaxRows = 4;

export function getGraphEditorNodeSize<TNodeData = Record<string, unknown>>(
  node: GraphEditorNodeMetricsInput<TNodeData>,
  options: GraphEditorNodeLayoutOptions = {},
): GraphEditorNodeSize {
  if (graphEditorNodeUsesMinimizedVariant(node)) {
    return {
      width: graphEditorNodeMinimizedWidth,
      height: graphEditorNodeMinimizedHeaderHeight + getGraphEditorNodeMinimizedPortsHeight(node),
    };
  }

  if (graphEditorNodeUsesCompactVariant(node)) {
    return {
      width: graphEditorNodeInlineWidth,
      height: graphEditorNodeCompactHeight,
    };
  }

  const rows = Math.max(node.inputs?.length ?? 0, node.outputs?.length ?? 0, 1);
  const headerHeight =
    getGraphEditorNodeHeaderHeight(node) + getGraphEditorNodeBodyHeight(node, options);
  const portColumnLabelHeight =
    options.showPortColumnHeaders === false ? 0 : graphEditorNodePortColumnLabelHeight;
  const portsHeight =
    graphEditorNodePortColumnsPaddingY +
    portColumnLabelHeight +
    rows * graphEditorNodePortRowHeight +
    Math.max(rows - 1, 0) * graphEditorNodePortGap;

  return {
    width: graphEditorNodeDefaultWidth,
    height: headerHeight + portsHeight,
  };
}

export function getGraphEditorNodePortCenterOffset<TNodeData = Record<string, unknown>>(
  node: GraphEditorNodeMetricsInput<TNodeData>,
  portIndex: number,
  options: GraphEditorNodeLayoutOptions = {},
) {
  if (graphEditorNodeUsesCompactVariant(node)) {
    return getGraphEditorNodeSize(node, options).height / 2;
  }

  if (graphEditorNodeUsesMinimizedVariant(node)) {
    const ports = Math.max(node.inputs?.length ?? 0, node.outputs?.length ?? 0, 1);
    const top = graphEditorNodeMinimizedHeaderHeight;

    return top + ((portIndex + 1) / (ports + 1)) * getGraphEditorNodeMinimizedPortsHeight(node);
  }

  const headerHeight =
    getGraphEditorNodeHeaderHeight(node) + getGraphEditorNodeBodyHeight(node, options);
  const portColumnLabelHeight =
    options.showPortColumnHeaders === false ? 0 : graphEditorNodePortColumnLabelHeight;

  return (
    headerHeight +
    graphEditorNodePortColumnsPaddingY / 2 +
    portColumnLabelHeight +
    portIndex * (graphEditorNodePortRowHeight + graphEditorNodePortGap) +
    graphEditorNodePortRowHeight / 2
  );
}

/** Height of composed body content for an expanded, non-compact node (0 without a body). */
export function getGraphEditorNodeBodyHeight<TNodeData = Record<string, unknown>>(
  node: GraphEditorNodeMetricsInput<TNodeData>,
  options: GraphEditorNodeLayoutOptions = {},
) {
  if (
    !options.nodeBodyHeight ||
    graphEditorNodeUsesCompactVariant(node) ||
    graphEditorNodeUsesMinimizedVariant(node)
  ) {
    return 0;
  }
  const height = options.nodeBodyHeight(node as GraphEditorNodeBodyMetricsInput);
  return Number.isFinite(height) && height > 0 ? Math.ceil(height) : 0;
}

function graphEditorNodeUsesCompactVariant(node: GraphEditorNodeMetricsInput) {
  return node.variant === "compact";
}

function graphEditorNodeUsesMinimizedVariant(node: GraphEditorNodeMetricsInput) {
  return node.minimized === true;
}

function getGraphEditorNodeDescriptionRows(node: GraphEditorNodeMetricsInput) {
  if (!node.description) {
    return 0;
  }

  return Math.max(
    1,
    Math.min(graphEditorNodeDescriptionMaxRows, Math.ceil(node.description.length / 58)),
  );
}

export function getGraphEditorNodeHeaderHeight(node: GraphEditorNodeMetricsInput) {
  return (
    graphEditorNodeHeaderBaseHeight +
    getGraphEditorNodeDescriptionRows(node) * graphEditorNodeDescriptionLineHeight
  );
}

export function getGraphEditorNodeMinimizedPortsHeight(node: {
  inputs?: readonly GraphEditorPort[];
  outputs?: readonly GraphEditorPort[];
}) {
  const rows = Math.max(node.inputs?.length ?? 0, node.outputs?.length ?? 0, 1);

  return Math.max(40, rows * 16 + 16);
}
