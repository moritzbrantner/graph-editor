import * as React from "react";
import { createRoot } from "react-dom/client";

import type { GraphEditorDocument, GraphEditorNodeTemplate } from "../core";
import { GraphWorkbench } from "../react";

import "./styles.css";

type E2EPortType = "event" | "payload";

const templates: Array<GraphEditorNodeTemplate<Record<string, never>, E2EPortType>> = [
  {
    id: "action-template",
    label: "Action",
    categoryPath: ["Basic"],
    inputs: [{ id: "input", label: "Input", type: "event" }],
    outputs: [{ id: "output", label: "Output", type: "payload" }],
  },
  {
    id: "finish-template",
    label: "Finish",
    categoryPath: ["Basic"],
    inputs: [{ id: "input", label: "Input", type: "payload" }],
  },
];

const initialDocument: GraphEditorDocument<
  Record<string, never>,
  Record<string, never>,
  E2EPortType
> = {
  nodes: [
    {
      id: "start",
      label: "Start",
      kind: "trigger",
      tone: "info",
      x: 48,
      y: 120,
      outputs: [{ id: "event", label: "Event", type: "event" }],
    },
    {
      id: "process",
      label: "Process",
      kind: "action",
      x: 380,
      y: 96,
      inputs: [{ id: "input", label: "Input", type: "event" }],
      outputs: [{ id: "output", label: "Output", type: "payload" }],
    },
    {
      id: "finish",
      label: "Finish",
      kind: "output",
      tone: "success",
      x: 720,
      y: 120,
      inputs: [{ id: "input", label: "Input", type: "payload" }],
    },
  ],
  edges: [
    {
      id: "start-process",
      sourceNodeId: "start",
      sourcePortId: "event",
      targetNodeId: "process",
      targetPortId: "input",
    },
    {
      id: "process-finish",
      sourceNodeId: "process",
      sourcePortId: "output",
      targetNodeId: "finish",
      targetPortId: "input",
    },
  ],
  viewport: { x: 24, y: 24, zoom: 0.9 },
};

function E2EApp() {
  const [document, setDocument] = React.useState(initialDocument);

  return (
    <main className="min-h-screen bg-background p-4 text-foreground">
      <GraphWorkbench
        document={document}
        nodeTemplates={templates}
        className="h-[calc(100vh-2rem)] min-h-[42rem] grid-cols-[14rem_minmax(0,1fr)_18rem] max-lg:h-auto max-lg:grid-cols-1"
        onDocumentChange={setDocument}
        onViewportChange={(viewport) => setDocument((current) => ({ ...current, viewport }))}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<E2EApp />);
