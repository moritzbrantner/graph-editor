import type { WorkbenchExampleDefinition } from "./workbench-example-types";
import { document, edge, node, port } from "./workbench-builders";
import { workflowNodeTemplates } from "./workbench-node-templates";

export const workbenchExamplesB: WorkbenchExampleDefinition[] = [
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
