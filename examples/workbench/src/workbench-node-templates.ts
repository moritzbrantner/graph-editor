import type { GraphEditorNodeTemplate } from "@moritzbrantner/graph-editor";

import { port, template } from "./workbench-builders";
import type { WorkflowNodeData, WorkflowPortType } from "./workbench-example-types";

export const workflowNodeTemplates: Array<
  GraphEditorNodeTemplate<WorkflowNodeData, WorkflowPortType>
> = [
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
