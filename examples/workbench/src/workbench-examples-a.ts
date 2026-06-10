import type { WorkbenchExampleDefinition } from "./workbench-example-types";
import { document, edge, node, port } from "./workbench-builders";
import { workflowNodeTemplates } from "./workbench-node-templates";

export const workbenchExamplesA: WorkbenchExampleDefinition[] = [
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
];
