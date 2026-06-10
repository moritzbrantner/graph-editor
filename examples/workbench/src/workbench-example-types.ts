import type { GraphEditorDocument, GraphEditorNodeTemplate } from "@moritzbrantner/graph-editor";

export type WorkflowExampleId =
  | "lead-routing"
  | "support-escalation"
  | "data-pipeline"
  | "incident-response"
  | "service-topology"
  | "checkout-state-machine"
  | "risk-decision-tree";

export type WorkflowPortType =
  | "event"
  | "payload"
  | "decision"
  | "text"
  | "metric"
  | "service"
  | "state"
  | "artifact";

export type WorkflowNodeData = {
  owner: string;
  setting?: string;
};

export type WorkflowEdgeData = {
  label?: string;
};

export type WorkbenchExampleDefinition = {
  id: WorkflowExampleId;
  label: string;
  category: string;
  description: string;
  tags: string[];
  document: GraphEditorDocument<WorkflowNodeData, WorkflowEdgeData, WorkflowPortType>;
  nodeTemplates: Array<GraphEditorNodeTemplate<WorkflowNodeData, WorkflowPortType>>;
};
