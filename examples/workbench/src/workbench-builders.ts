import type {
  GraphEditorDocument,
  GraphEditorEdge,
  GraphEditorNode,
  GraphEditorNodeTemplate,
  GraphEditorPort,
} from "@moritzbrantner/graph-editor";

import type {
  WorkflowEdgeData,
  WorkflowNodeData,
  WorkflowPortType,
} from "./workbench-example-types";

const colorByPortType: Record<WorkflowPortType, string> = {
  event: "#2563eb",
  payload: "#0f766e",
  decision: "#ca8a04",
  text: "#7c3aed",
  metric: "#db2777",
  service: "#4f46e5",
  state: "#0891b2",
  artifact: "#475569",
};

export function template(
  id: string,
  label: string,
  category: string,
  subcategory: string,
  kind: string,
  values: Omit<
    GraphEditorNodeTemplate<WorkflowNodeData, WorkflowPortType>,
    "id" | "label" | "categoryPath" | "kind"
  >,
): GraphEditorNodeTemplate<WorkflowNodeData, WorkflowPortType> {
  return {
    id,
    label,
    categoryPath: [category, subcategory],
    kind,
    packageLabel: "workflow-editor",
    ...values,
  };
}

export function node(
  id: string,
  label: string,
  description: string,
  kind: string,
  x: number,
  y: number,
  values: Partial<GraphEditorNode<WorkflowNodeData, WorkflowPortType>>,
): GraphEditorNode<WorkflowNodeData, WorkflowPortType> {
  return {
    id,
    label,
    description,
    kind,
    packageLabel: "workflow-editor",
    x,
    y,
    ...values,
  };
}

export function port(
  id: string,
  label: string,
  type: WorkflowPortType,
): GraphEditorPort<WorkflowPortType> {
  return {
    id,
    label,
    type,
    color: colorByPortType[type],
  };
}

export function edge(
  sourceNodeId: string,
  sourcePortId: string,
  targetNodeId: string,
  targetPortId: string,
  label?: string,
): GraphEditorEdge<WorkflowEdgeData> {
  return {
    id: `edge-${sourceNodeId}-${sourcePortId}-${targetNodeId}-${targetPortId}`,
    sourceNodeId,
    sourcePortId,
    targetNodeId,
    targetPortId,
    ...(label ? { data: { label } } : {}),
  };
}

export function document(
  nodes: Array<GraphEditorNode<WorkflowNodeData, WorkflowPortType>>,
  edges: Array<GraphEditorEdge<WorkflowEdgeData>>,
): GraphEditorDocument<WorkflowNodeData, WorkflowEdgeData, WorkflowPortType> {
  return {
    nodes,
    edges,
    viewport: { x: 40, y: 40, zoom: 0.78 },
  };
}
