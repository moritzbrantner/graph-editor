import type {
  GraphEditorDocument,
  GraphEditorEdge,
  GraphEditorNode,
  GraphEditorNodeTemplate,
  GraphEditorPort,
} from "@moritzbrantner/graph-editor";

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

const workflowNodeTemplates: Array<GraphEditorNodeTemplate<WorkflowNodeData, WorkflowPortType>> = [
  template("event-trigger-template", "Event trigger", "Workflow", "Inputs", "trigger", {
    tone: "info",
    description: "Starts a graph from an external signal.",
    outputs: [port("event", "Event", "event")],
    data: { owner: "Ops" },
  }),
  template("transform-data-template", "Transform data", "Workflow", "Actions", "action", {
    description: "Maps incoming payload fields into a normalized shape.",
    inputs: [port("input", "Payload", "payload")],
    outputs: [port("output", "Payload", "payload")],
    data: { owner: "Platform" },
  }),
  template("decision-template", "Decision", "Workflow", "Logic", "decision", {
    tone: "warning",
    description: "Routes work based on a condition.",
    inputs: [port("input", "Payload", "payload")],
    outputs: [port("yes", "Yes", "decision"), port("no", "No", "decision")],
    data: { owner: "Product", setting: "condition == true" },
  }),
  template("service-call-template", "Service call", "Workflow", "Actions", "service", {
    tone: "info",
    description: "Calls an internal or external service.",
    inputs: [port("request", "Request", "payload")],
    outputs: [port("response", "Response", "payload")],
    data: { owner: "Platform" },
  }),
  template("queue-template", "Queue message", "Workflow", "Actions", "queue", {
    description: "Publishes work to an async queue.",
    inputs: [port("message", "Message", "payload")],
    outputs: [port("queued", "Queued", "event")],
    data: { owner: "Platform" },
  }),
  template("human-review-template", "Human review", "Workflow", "Operations", "review", {
    tone: "warning",
    description: "Pauses for a person to review and decide.",
    inputs: [port("case", "Case", "payload")],
    outputs: [port("approved", "Approved", "decision"), port("rejected", "Rejected", "decision")],
    data: { owner: "Operations" },
  }),
  template("metric-check-template", "Metric check", "Workflow", "Logic", "metric", {
    description: "Evaluates a metric threshold.",
    inputs: [port("metric", "Metric", "metric")],
    outputs: [port("breached", "Breached", "decision"), port("healthy", "Healthy", "decision")],
    data: { owner: "SRE", setting: "value > threshold" },
  }),
  template("retry-template", "Retry/backoff", "Workflow", "Reliability", "retry", {
    tone: "warning",
    description: "Retries failed work with a delay policy.",
    inputs: [port("failure", "Failure", "event")],
    outputs: [port("retry", "Retry", "event")],
    data: { owner: "Platform", setting: "3 attempts, exponential backoff" },
  }),
  template("terminal-output-template", "Terminal output", "Workflow", "Outputs", "output", {
    tone: "success",
    description: "Sends a final message or notification.",
    inputs: [port("input", "Input", "decision")],
    data: { owner: "Support" },
  }),
  template("state-template", "State", "Workflow", "State machines", "state", {
    description: "Represents a state transition step.",
    inputs: [port("previous", "Previous", "state")],
    outputs: [port("next", "Next", "state")],
    data: { owner: "Product" },
  }),
  template("artifact-template", "Artifact export", "Workflow", "Outputs", "artifact", {
    tone: "success",
    description: "Creates a durable artifact.",
    inputs: [port("input", "Payload", "payload")],
    outputs: [port("artifact", "Artifact", "artifact")],
    data: { owner: "Data" },
  }),
];

export const workbenchExamples: WorkbenchExampleDefinition[] = [
  {
    id: "lead-routing",
    label: "Lead routing",
    category: "Revenue operations",
    description: "Qualifies new CRM leads and routes enterprise accounts to the right owner.",
    tags: ["workflow", "crm", "sales"],
    nodeTemplates: workflowNodeTemplates,
    document: document(
      [
        node("lead-created", "Lead created", "CRM webhook", "trigger", 40, 128, {
          tone: "info",
          outputs: [port("event", "Event", "event")],
          data: { owner: "Sales" },
        }),
        node(
          "enrich-account",
          "Enrich account",
          "Attach firmographic attributes",
          "service",
          340,
          96,
          {
            inputs: [port("request", "Lead", "event")],
            outputs: [port("response", "Account", "payload")],
            data: { owner: "Revenue Ops", setting: "Clearbit enrichment" },
          },
        ),
        node("score-fit", "Score fit", "Compute ICP score", "action", 660, 96, {
          inputs: [port("input", "Account", "payload")],
          outputs: [port("output", "Scored account", "payload")],
          data: { owner: "Data" },
        }),
        node("enterprise", "Enterprise?", "employeeCount > 500", "decision", 980, 88, {
          tone: "warning",
          inputs: [port("input", "Scored account", "payload")],
          outputs: [port("yes", "Enterprise", "decision"), port("no", "Standard", "decision")],
          data: { owner: "Revenue", setting: "score >= 80" },
        }),
        node("notify-owner", "Notify owner", "Create assignment update", "output", 1300, 56, {
          tone: "success",
          inputs: [port("input", "Enterprise", "decision")],
          data: { owner: "Sales" },
        }),
        node("standard-queue", "Standard queue", "Send to pooled SDR queue", "output", 1300, 208, {
          inputs: [port("input", "Standard", "decision")],
          data: { owner: "SDR" },
        }),
      ],
      [
        edge("lead-created", "event", "enrich-account", "request", "new lead"),
        edge("enrich-account", "response", "score-fit", "input", "enriched"),
        edge("score-fit", "output", "enterprise", "input", "scored"),
        edge("enterprise", "yes", "notify-owner", "input", "enterprise"),
        edge("enterprise", "no", "standard-queue", "input", "standard"),
      ],
    ),
  },
  {
    id: "support-escalation",
    label: "Support escalation",
    category: "Customer support",
    description: "Routes urgent tickets by sentiment, SLA risk, and escalation path.",
    tags: ["workflow", "support", "sla"],
    nodeTemplates: workflowNodeTemplates,
    document: document(
      [
        node("ticket-created", "Ticket created", "Helpdesk event", "trigger", 40, 128, {
          tone: "info",
          outputs: [port("event", "Ticket", "event")],
          data: { owner: "Support" },
        }),
        node(
          "classify-ticket",
          "Classify ticket",
          "Normalize priority and sentiment",
          "action",
          340,
          96,
          {
            inputs: [port("input", "Ticket", "event")],
            outputs: [port("output", "Ticket profile", "payload")],
            data: { owner: "CX Ops" },
          },
        ),
        node("sla-risk", "SLA at risk?", "Detect breach risk", "decision", 660, 88, {
          tone: "warning",
          inputs: [port("input", "Ticket profile", "payload")],
          outputs: [port("yes", "At risk", "decision"), port("no", "Healthy", "decision")],
          data: { owner: "Support", setting: "firstResponseDue < 30m" },
        }),
        node("page-manager", "Page manager", "Escalate urgent cases", "output", 980, 52, {
          tone: "error",
          inputs: [port("input", "At risk", "decision")],
          data: { owner: "Support leadership" },
        }),
        node("triage-queue", "Triage queue", "Assign to next specialist", "output", 980, 208, {
          inputs: [port("input", "Healthy", "decision")],
          data: { owner: "Support" },
        }),
      ],
      [
        edge("ticket-created", "event", "classify-ticket", "input"),
        edge("classify-ticket", "output", "sla-risk", "input"),
        edge("sla-risk", "yes", "page-manager", "input", "breach risk"),
        edge("sla-risk", "no", "triage-queue", "input", "normal triage"),
      ],
    ),
  },
  {
    id: "data-pipeline",
    label: "Data pipeline",
    category: "Data platform",
    description:
      "Ingests product events, validates schema, loads the warehouse, and alerts on quality issues.",
    tags: ["pipeline", "analytics", "quality"],
    nodeTemplates: workflowNodeTemplates,
    document: document(
      [
        node("events-ingested", "Events ingested", "Product analytics stream", "trigger", 40, 140, {
          tone: "info",
          outputs: [port("event", "Batch", "event")],
          data: { owner: "Data Platform" },
        }),
        node("validate-schema", "Validate schema", "Reject malformed records", "action", 340, 104, {
          inputs: [port("input", "Batch", "event")],
          outputs: [port("output", "Validated batch", "payload")],
          data: { owner: "Data Platform", setting: "tracking-plan v4" },
        }),
        node(
          "transform-session",
          "Transform sessions",
          "Build sessionized facts",
          "action",
          660,
          104,
          {
            inputs: [port("input", "Validated batch", "payload")],
            outputs: [port("output", "Facts", "payload")],
            data: { owner: "Analytics Engineering" },
          },
        ),
        node(
          "load-warehouse",
          "Load warehouse",
          "Write into modeled tables",
          "artifact",
          980,
          104,
          {
            tone: "success",
            inputs: [port("input", "Facts", "payload")],
            outputs: [port("artifact", "Warehouse table", "artifact")],
            data: { owner: "Analytics Engineering" },
          },
        ),
        node("quality-metric", "Quality metric", "Freshness and null checks", "metric", 1300, 104, {
          inputs: [port("metric", "Warehouse table", "artifact")],
          outputs: [
            port("breached", "Breached", "decision"),
            port("healthy", "Healthy", "decision"),
          ],
          data: { owner: "Data", setting: "null_rate < 2%" },
        }),
        node(
          "alert-data",
          "Alert data team",
          "Notify owner on quality breach",
          "output",
          1620,
          48,
          {
            tone: "error",
            inputs: [port("input", "Breached", "decision")],
            data: { owner: "Data" },
          },
        ),
        node(
          "publish-dashboard",
          "Publish dashboard",
          "Refresh product metrics",
          "output",
          1620,
          200,
          {
            tone: "success",
            inputs: [port("input", "Healthy", "decision")],
            data: { owner: "Product Analytics" },
          },
        ),
      ],
      [
        edge("events-ingested", "event", "validate-schema", "input"),
        edge("validate-schema", "output", "transform-session", "input"),
        edge("transform-session", "output", "load-warehouse", "input"),
        edge("load-warehouse", "artifact", "quality-metric", "metric"),
        edge("quality-metric", "breached", "alert-data", "input", "failed check"),
        edge("quality-metric", "healthy", "publish-dashboard", "input", "ready"),
      ],
    ),
  },
  {
    id: "incident-response",
    label: "Incident response",
    category: "Reliability",
    description:
      "Coordinates alert classification, paging, mitigation, and postmortem artifact creation.",
    tags: ["sre", "incident", "ops"],
    nodeTemplates: workflowNodeTemplates,
    document: document(
      [
        node("monitor-alert", "Monitor alert", "Latency SLO breach", "trigger", 40, 128, {
          tone: "error",
          outputs: [port("event", "Alert", "event")],
          data: { owner: "SRE" },
        }),
        node(
          "collect-context",
          "Collect context",
          "Attach traces and deploys",
          "service",
          340,
          96,
          {
            inputs: [port("request", "Alert", "event")],
            outputs: [port("response", "Incident context", "payload")],
            data: { owner: "Observability" },
          },
        ),
        node("severity", "Severity", "Classify impact", "decision", 660, 88, {
          tone: "warning",
          inputs: [port("input", "Incident context", "payload")],
          outputs: [port("yes", "SEV1/2", "decision"), port("no", "SEV3", "decision")],
          data: { owner: "SRE", setting: "affectedUsers > 5%" },
        }),
        node("page-oncall", "Page on-call", "Open incident channel", "output", 980, 44, {
          tone: "error",
          inputs: [port("input", "SEV1/2", "decision")],
          data: { owner: "SRE" },
        }),
        node("create-ticket", "Create ticket", "Track low-severity follow-up", "output", 980, 204, {
          inputs: [port("input", "SEV3", "decision")],
          data: { owner: "Engineering" },
        }),
        node(
          "postmortem",
          "Postmortem artifact",
          "Capture timeline and actions",
          "artifact",
          1300,
          44,
          {
            inputs: [port("input", "Incident context", "payload")],
            outputs: [port("artifact", "Report", "artifact")],
            data: { owner: "SRE" },
          },
        ),
      ],
      [
        edge("monitor-alert", "event", "collect-context", "request"),
        edge("collect-context", "response", "severity", "input"),
        edge("severity", "yes", "page-oncall", "input", "major"),
        edge("severity", "no", "create-ticket", "input", "minor"),
        edge("collect-context", "response", "postmortem", "input", "context"),
      ],
    ),
  },
  {
    id: "service-topology",
    label: "Service topology",
    category: "Architecture",
    description:
      "Shows request flow through a commerce service stack and downstream observability.",
    tags: ["services", "architecture", "topology"],
    nodeTemplates: workflowNodeTemplates,
    document: document(
      [
        node("api-gateway", "API gateway", "Ingress and routing", "service", 40, 112, {
          tone: "info",
          outputs: [port("response", "Request", "service")],
          data: { owner: "Platform" },
        }),
        node("auth-service", "Auth service", "Session validation", "service", 340, 40, {
          inputs: [port("request", "Request", "service")],
          outputs: [port("response", "Authorized request", "service")],
          data: { owner: "Identity" },
        }),
        node("billing-service", "Billing service", "Payment orchestration", "service", 660, 40, {
          inputs: [port("request", "Authorized request", "service")],
          outputs: [port("response", "Payment event", "event")],
          data: { owner: "Commerce" },
        }),
        node("orders-db", "Orders database", "Persist order records", "artifact", 660, 220, {
          inputs: [port("input", "Authorized request", "service")],
          outputs: [port("artifact", "Order record", "artifact")],
          data: { owner: "Commerce" },
        }),
        node("event-bus", "Event bus", "Publish domain events", "queue", 980, 72, {
          inputs: [port("message", "Payment event", "event")],
          outputs: [port("queued", "Queued event", "event")],
          data: { owner: "Platform" },
        }),
        node("observability", "Observability sink", "Metrics and traces", "output", 1300, 72, {
          tone: "success",
          inputs: [port("input", "Queued event", "event")],
          data: { owner: "SRE" },
        }),
      ],
      [
        edge("api-gateway", "response", "auth-service", "request", "route"),
        edge("auth-service", "response", "billing-service", "request", "checkout"),
        edge("auth-service", "response", "orders-db", "input", "order write"),
        edge("billing-service", "response", "event-bus", "message", "payment"),
        edge("event-bus", "queued", "observability", "input", "trace"),
      ],
    ),
  },
  {
    id: "checkout-state-machine",
    label: "Checkout state machine",
    category: "Product flows",
    description:
      "Tracks checkout transitions from cart through payment, review, fulfillment, and failure states.",
    tags: ["state machine", "checkout", "product"],
    nodeTemplates: workflowNodeTemplates,
    document: document(
      [
        node("cart", "Cart", "Customer is building an order", "state", 40, 128, {
          tone: "info",
          outputs: [port("next", "Submit order", "state")],
          data: { owner: "Commerce" },
        }),
        node("payment-pending", "Payment pending", "Awaiting authorization", "state", 340, 128, {
          inputs: [port("previous", "Submit order", "state")],
          outputs: [port("next", "Authorized", "state")],
          data: { owner: "Payments" },
        }),
        node(
          "fraud-review",
          "Fraud review",
          "Manual review for high-risk orders",
          "state",
          660,
          40,
          {
            tone: "warning",
            inputs: [port("previous", "Authorized", "state")],
            outputs: [port("next", "Approved", "state")],
            data: { owner: "Risk" },
          },
        ),
        node("paid", "Paid", "Order payment captured", "state", 980, 40, {
          tone: "success",
          inputs: [port("previous", "Approved", "state")],
          outputs: [port("next", "Fulfill", "state")],
          data: { owner: "Commerce" },
        }),
        node("fulfilled", "Fulfilled", "Shipment created", "state", 1300, 40, {
          tone: "success",
          inputs: [port("previous", "Fulfill", "state")],
          data: { owner: "Logistics" },
        }),
        node("cancelled", "Cancelled", "Payment rejected or abandoned", "state", 660, 224, {
          tone: "error",
          inputs: [port("previous", "Rejected", "state")],
          outputs: [port("next", "Refund review", "state")],
          data: { owner: "Commerce" },
        }),
        node("refunded", "Refunded", "Refund processed", "state", 980, 224, {
          inputs: [port("previous", "Refund review", "state")],
          data: { owner: "Payments" },
        }),
      ],
      [
        edge("cart", "next", "payment-pending", "previous", "submit"),
        edge("payment-pending", "next", "fraud-review", "previous", "review"),
        edge("fraud-review", "next", "paid", "previous", "approve"),
        edge("paid", "next", "fulfilled", "previous", "ship"),
        edge("payment-pending", "next", "cancelled", "previous", "reject"),
        edge("cancelled", "next", "refunded", "previous", "refund"),
      ],
    ),
  },
  {
    id: "risk-decision-tree",
    label: "Risk decision tree",
    category: "Governance",
    description:
      "Evaluates risk signals and routes requests to approval, manual review, or rejection.",
    tags: ["decision tree", "risk", "governance"],
    nodeTemplates: workflowNodeTemplates,
    document: document(
      [
        node("intake", "Intake", "New access request", "trigger", 40, 128, {
          tone: "info",
          outputs: [port("event", "Request", "event")],
          data: { owner: "Security" },
        }),
        node("score-risk", "Score risk", "Evaluate context and history", "action", 340, 96, {
          inputs: [port("input", "Request", "event")],
          outputs: [port("output", "Risk profile", "payload")],
          data: { owner: "Security", setting: "device + role + region" },
        }),
        node("policy-check", "Policy check", "Requires extra approval?", "decision", 660, 88, {
          tone: "warning",
          inputs: [port("input", "Risk profile", "payload")],
          outputs: [port("yes", "Needs review", "decision"), port("no", "Low risk", "decision")],
          data: { owner: "GRC", setting: "privileged role" },
        }),
        node("manual-review", "Manual review", "Security reviewer decision", "review", 980, 48, {
          inputs: [port("case", "Needs review", "decision")],
          outputs: [
            port("approved", "Approved", "decision"),
            port("rejected", "Rejected", "decision"),
          ],
          data: { owner: "Security" },
        }),
        node("approve", "Approve", "Grant access", "output", 1300, 88, {
          tone: "success",
          inputs: [port("input", "Approved", "decision")],
          data: { owner: "IT" },
        }),
        node("reject", "Reject", "Deny and notify requester", "output", 1300, 224, {
          tone: "error",
          inputs: [port("input", "Rejected", "decision")],
          data: { owner: "Security" },
        }),
      ],
      [
        edge("intake", "event", "score-risk", "input"),
        edge("score-risk", "output", "policy-check", "input"),
        edge("policy-check", "yes", "manual-review", "case", "privileged"),
        edge("policy-check", "no", "approve", "input", "low risk"),
        edge("manual-review", "approved", "approve", "input", "approved"),
        edge("manual-review", "rejected", "reject", "input", "rejected"),
      ],
    ),
  },
];

export const defaultWorkbenchExample = workbenchExamples[0];

export function cloneWorkbenchExampleDocument(example: WorkbenchExampleDefinition) {
  return structuredClone(example.document);
}

function template(
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

function node(
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

function port(
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

function edge(
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

function document(
  nodes: Array<GraphEditorNode<WorkflowNodeData, WorkflowPortType>>,
  edges: Array<GraphEditorEdge<WorkflowEdgeData>>,
): GraphEditorDocument<WorkflowNodeData, WorkflowEdgeData, WorkflowPortType> {
  return {
    nodes,
    edges,
    viewport: { x: 40, y: 40, zoom: 0.78 },
  };
}
