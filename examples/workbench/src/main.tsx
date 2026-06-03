import * as React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  GitBranchIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  NetworkIcon,
  PlusIcon,
  RotateCcwIcon,
  SaveIcon,
  Trash2Icon,
  WorkflowIcon,
} from "lucide-react";

import {
  GraphWorkbench,
  type GraphEditorDocument,
  type GraphEditorNodeTemplate,
  type GraphWorkbenchController,
} from "@moritzbrantner/graph-editor";
import { layoutGraphEditorDocument } from "@moritzbrantner/graph-editor/layout";
import {
  OrgChart,
  insertOrgChartNode,
  removeOrgChartNode,
  type OrgChartNodeData,
} from "@moritzbrantner/diagrams/org-chart";
import {
  ProcessMap,
  type ProcessMapStatus,
  type ProcessMapStepData,
  type ProcessMapTone,
} from "@moritzbrantner/diagrams/process-map";
import {
  RelationshipMap,
  type RelationshipMapEdge,
  type RelationshipMapNode,
  type RelationshipMapTone,
} from "@moritzbrantner/diagrams/relationship-map";

import "./styles.css";

type ExampleView = "workflow" | "diagrams";
type DiagramKind = "relationship" | "process" | "org";
type WorkflowPortType = "event" | "payload" | "text" | "decision";
type WorkflowNodeData = {
  owner: string;
  setting?: string;
};

const workflowTemplates: Array<GraphEditorNodeTemplate<WorkflowNodeData, WorkflowPortType>> = [
  {
    id: "trigger-template",
    label: "Event trigger",
    categoryPath: ["Workflow", "Inputs"],
    description: "Starts a workflow from an external signal.",
    kind: "trigger",
    tone: "info",
    packageLabel: "workflow-editor",
    outputs: [{ id: "event", label: "Event", type: "event", color: "#2563eb" }],
    data: { owner: "Ops" },
  },
  {
    id: "transform-template",
    label: "Transform data",
    categoryPath: ["Workflow", "Actions"],
    description: "Maps payload fields into a normalized shape.",
    kind: "action",
    inputs: [{ id: "input", label: "Payload", type: "payload", color: "#0f766e" }],
    outputs: [{ id: "output", label: "Payload", type: "payload", color: "#0f766e" }],
    data: { owner: "Platform" },
  },
  {
    id: "decision-template",
    label: "Decision",
    categoryPath: ["Workflow", "Logic"],
    description: "Routes work based on a boolean condition.",
    kind: "decision",
    tone: "warning",
    inputs: [{ id: "input", label: "Payload", type: "payload", color: "#0f766e" }],
    outputs: [
      { id: "yes", label: "Yes", type: "decision", color: "#16a34a" },
      { id: "no", label: "No", type: "decision", color: "#ca8a04" },
    ],
    data: { owner: "Product", setting: "priority > high" },
  },
  {
    id: "message-template",
    label: "Send message",
    categoryPath: ["Workflow", "Outputs"],
    description: "Publishes an update to a downstream channel.",
    kind: "output",
    tone: "success",
    inputs: [{ id: "body", label: "Text", type: "text", color: "#7c3aed" }],
    data: { owner: "Support" },
  },
];

const initialWorkflowDocument: GraphEditorDocument<
  WorkflowNodeData,
  Record<string, never>,
  WorkflowPortType
> = {
  nodes: [
    {
      id: "lead-created",
      label: "Lead created",
      description: "CRM event",
      kind: "trigger",
      packageLabel: "workflow-editor",
      tone: "info",
      x: 40,
      y: 120,
      outputs: [{ id: "event", label: "Event", type: "event", color: "#2563eb" }],
      data: { owner: "Sales" },
    },
    {
      id: "normalize",
      label: "Normalize record",
      description: "Prepare assignment data",
      kind: "action",
      x: 360,
      y: 92,
      inputs: [{ id: "input", label: "Payload", type: "event", color: "#2563eb" }],
      outputs: [{ id: "output", label: "Payload", type: "payload", color: "#0f766e" }],
      data: { owner: "Platform" },
    },
    {
      id: "route",
      label: "Route account",
      description: "Choose enterprise or standard follow-up.",
      kind: "decision",
      tone: "warning",
      x: 680,
      y: 88,
      inputs: [{ id: "input", label: "Payload", type: "payload", color: "#0f766e" }],
      outputs: [
        { id: "enterprise", label: "Enterprise", type: "decision", color: "#16a34a" },
        { id: "standard", label: "Standard", type: "decision", color: "#ca8a04" },
      ],
      data: { owner: "Revenue", setting: "employeeCount > 500" },
    },
    {
      id: "notify",
      label: "Notify owner",
      description: "Create an assignment message.",
      kind: "output",
      tone: "success",
      x: 1000,
      y: 120,
      inputs: [{ id: "body", label: "Decision", type: "decision", color: "#16a34a" }],
      data: { owner: "Sales" },
    },
  ],
  edges: [
    {
      id: "lead-created-normalize",
      sourceNodeId: "lead-created",
      sourcePortId: "event",
      targetNodeId: "normalize",
      targetPortId: "input",
    },
    {
      id: "normalize-route",
      sourceNodeId: "normalize",
      sourcePortId: "output",
      targetNodeId: "route",
      targetPortId: "input",
    },
    {
      id: "route-notify",
      sourceNodeId: "route",
      sourcePortId: "enterprise",
      targetNodeId: "notify",
      targetPortId: "body",
      status: "success",
    },
  ],
  viewport: { x: 40, y: 40, zoom: 0.82 },
};

const relationshipTones: RelationshipMapTone[] = [
  "default",
  "accent",
  "success",
  "warning",
  "danger",
  "muted",
];
const processTones: ProcessMapTone[] = [
  "default",
  "accent",
  "success",
  "warning",
  "danger",
  "muted",
];
const processStatuses: ProcessMapStatus[] = ["pending", "active", "done", "blocked", "warning"];

function App() {
  const [view, setView] = React.useState<ExampleView>("workflow");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h1 className="text-base font-semibold tracking-normal">Graph editor examples</h1>
          <p className="text-xs leading-5 text-muted-foreground">
            Workflow workbench and diagram builder examples
          </p>
        </div>
        <div
          className="inline-flex rounded-md border bg-card p-1"
          role="tablist"
          aria-label="Examples"
        >
          <SegmentButton active={view === "workflow"} onClick={() => setView("workflow")}>
            <WorkflowIcon className="size-4" aria-hidden="true" />
            Workflow
          </SegmentButton>
          <SegmentButton active={view === "diagrams"} onClick={() => setView("diagrams")}>
            <LayoutDashboardIcon className="size-4" aria-hidden="true" />
            Diagrams
          </SegmentButton>
        </div>
      </header>
      {view === "workflow" ? <WorkflowExample /> : <DiagramEditor />}
    </main>
  );
}

function WorkflowExample() {
  const [document, setDocument] = React.useState(initialWorkflowDocument);

  return (
    <section className="grid gap-3 p-4">
      <GraphWorkbench
        document={document}
        nodeTemplates={workflowTemplates}
        className="h-[calc(100vh-8.5rem)] min-h-[38rem] grid-cols-[15rem_minmax(0,1fr)_18rem] max-xl:grid-cols-[14rem_minmax(0,1fr)] max-lg:h-auto max-lg:grid-cols-1"
        onDocumentChange={setDocument}
        onViewportChange={(viewport) => setDocument((current) => ({ ...current, viewport }))}
        renderToolbar={(controller) => (
          <WorkflowToolbar
            controller={
              controller as GraphWorkbenchController<
                WorkflowNodeData,
                Record<string, never>,
                WorkflowPortType
              >
            }
            onReset={() => setDocument(initialWorkflowDocument)}
            onLayout={() =>
              setDocument(
                (current) =>
                  layoutGraphEditorDocument(current, {
                    direction: "right",
                    nodeSeparation: 80,
                    rankSeparation: 120,
                  }).document,
              )
            }
          />
        )}
        renderInspector={(controller) => (
          <WorkflowInspector
            controller={
              controller as GraphWorkbenchController<
                WorkflowNodeData,
                Record<string, never>,
                WorkflowPortType
              >
            }
          />
        )}
      />
    </section>
  );
}

function WorkflowToolbar({
  controller,
  onLayout,
  onReset,
}: {
  controller: GraphWorkbenchController<WorkflowNodeData, Record<string, never>, WorkflowPortType>;
  onLayout: () => void;
  onReset: () => void;
}) {
  const hasSelection =
    controller.selection.nodeIds.length > 0 || controller.selection.edgeIds.length > 0;

  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
        <WorkflowIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        Workflow editor
        <span className="rounded border px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
          {controller.document.nodes.length} nodes
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <IconTextButton type="button" onClick={onLayout}>
          <NetworkIcon className="size-4" aria-hidden="true" />
          Layout
        </IconTextButton>
        <IconTextButton type="button" onClick={onReset}>
          <RotateCcwIcon className="size-4" aria-hidden="true" />
          Reset
        </IconTextButton>
        <IconTextButton
          type="button"
          disabled={!hasSelection}
          onClick={controller.actions.deleteSelection}
        >
          <Trash2Icon className="size-4" aria-hidden="true" />
          Delete
        </IconTextButton>
      </div>
    </div>
  );
}

function WorkflowInspector({
  controller,
}: {
  controller: GraphWorkbenchController<WorkflowNodeData, Record<string, never>, WorkflowPortType>;
}) {
  const node = controller.selectedNode;
  const edge = controller.selectedEdge;

  return (
    <aside className="min-h-0 overflow-auto border-l pl-3 max-xl:border-l-0 max-xl:border-t max-xl:pt-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <SaveIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        Inspector
      </div>
      {node ? (
        <div className="grid gap-3 text-sm">
          <Property label="Label" value={node.label} />
          <Property label="Kind" value={node.kind ?? "node"} />
          <Property label="Owner" value={node.data?.owner ?? "Unassigned"} />
          {node.data?.setting ? <Property label="Rule" value={node.data.setting} /> : null}
          <PortList label="Inputs" ports={node.inputs ?? []} />
          <PortList label="Outputs" ports={node.outputs ?? []} />
        </div>
      ) : edge ? (
        <div className="grid gap-3 text-sm">
          <Property label="Edge" value={edge.id} />
          <Property label="From" value={`${edge.sourceNodeId}.${edge.sourcePortId}`} />
          <Property label="To" value={`${edge.targetNodeId}.${edge.targetPortId}`} />
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">
          Select a node or connection to inspect its ports and metadata.
        </p>
      )}
    </aside>
  );
}

function DiagramEditor() {
  const [diagramKind, setDiagramKind] = React.useState<DiagramKind>("relationship");
  const [relationshipNodes, setRelationshipNodes] = React.useState<RelationshipMapNode[]>([
    { id: "product", label: "Product", description: "Roadmap", x: 0, y: 90, tone: "accent" },
    { id: "design", label: "Design", description: "System", x: 280, y: 0, tone: "success" },
    { id: "platform", label: "Platform", description: "Package", x: 280, y: 180 },
  ]);
  const [relationshipEdges, setRelationshipEdges] = React.useState<RelationshipMapEdge[]>([
    { id: "product-design", source: "product", target: "design", label: "briefs" },
    { id: "product-platform", source: "product", target: "platform", label: "prioritizes" },
  ]);
  const [processSteps, setProcessSteps] = React.useState<ProcessMapStepData[]>([
    {
      id: "scope",
      label: "Scope",
      description: "Choose the diagram goal.",
      meta: "Done",
      status: "done",
      tone: "success",
    },
    {
      id: "model",
      label: "Model",
      description: "Add the important entities.",
      meta: "Active",
      status: "active",
      tone: "accent",
    },
    {
      id: "share",
      label: "Share",
      description: "Publish the final view.",
      meta: "Next",
      status: "pending",
    },
  ]);
  const [orgNodes, setOrgNodes] = React.useState<OrgChartNodeData[]>([
    {
      id: "lead",
      label: "Program lead",
      description: "Owns delivery",
      children: [
        { id: "design-systems", label: "Design systems", description: "Component model" },
        { id: "frontend", label: "Frontend platform", description: "Package quality" },
      ],
    },
  ]);

  const diagramJson = React.useMemo(() => {
    if (diagramKind === "relationship") {
      return JSON.stringify(
        { type: "relationship-map", nodes: relationshipNodes, edges: relationshipEdges },
        null,
        2,
      );
    }
    if (diagramKind === "process") {
      return JSON.stringify({ type: "process-map", steps: processSteps }, null, 2);
    }
    return JSON.stringify({ type: "org-chart", nodes: orgNodes }, null, 2);
  }, [diagramKind, orgNodes, processSteps, relationshipEdges, relationshipNodes]);

  return (
    <section className="grid min-h-[calc(100vh-4.5rem)] grid-cols-[22rem_minmax(0,1fr)] gap-4 p-4 max-lg:grid-cols-1">
      <aside className="min-h-0 overflow-auto border-r pr-4 max-lg:border-r-0 max-lg:border-b max-lg:pb-4">
        <div
          className="mb-3 inline-flex rounded-md border bg-card p-1"
          role="tablist"
          aria-label="Diagram types"
        >
          <SegmentButton
            active={diagramKind === "relationship"}
            onClick={() => setDiagramKind("relationship")}
          >
            <NetworkIcon className="size-4" aria-hidden="true" />
            Map
          </SegmentButton>
          <SegmentButton
            active={diagramKind === "process"}
            onClick={() => setDiagramKind("process")}
          >
            <ListChecksIcon className="size-4" aria-hidden="true" />
            Process
          </SegmentButton>
          <SegmentButton active={diagramKind === "org"} onClick={() => setDiagramKind("org")}>
            <GitBranchIcon className="size-4" aria-hidden="true" />
            Org
          </SegmentButton>
        </div>
        {diagramKind === "relationship" ? (
          <RelationshipEditor
            nodes={relationshipNodes}
            edges={relationshipEdges}
            onNodesChange={setRelationshipNodes}
            onEdgesChange={setRelationshipEdges}
          />
        ) : diagramKind === "process" ? (
          <ProcessEditor steps={processSteps} onStepsChange={setProcessSteps} />
        ) : (
          <OrgEditor nodes={orgNodes} onNodesChange={setOrgNodes} />
        )}
      </aside>
      <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_14rem] gap-4">
        <div className="min-h-0 overflow-auto rounded-md border bg-card p-4">
          {diagramKind === "relationship" ? (
            <RelationshipMap
              ariaLabel="Editable relationship map preview"
              nodes={relationshipNodes}
              edges={relationshipEdges}
              caption="RelationshipMap preview from @moritzbrantner/diagrams."
            />
          ) : diagramKind === "process" ? (
            <ProcessMap steps={processSteps} />
          ) : (
            <OrgChart nodes={orgNodes} />
          )}
        </div>
        <textarea
          className="min-h-0 resize-none rounded-md border bg-muted/30 p-3 font-mono text-xs leading-5 text-muted-foreground"
          value={diagramJson}
          readOnly
          aria-label="Diagram JSON"
        />
      </div>
    </section>
  );
}

function RelationshipEditor({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
}: {
  nodes: RelationshipMapNode[];
  edges: RelationshipMapEdge[];
  onNodesChange: (nodes: RelationshipMapNode[]) => void;
  onEdgesChange: (edges: RelationshipMapEdge[]) => void;
}) {
  const [label, setLabel] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [tone, setTone] = React.useState<RelationshipMapTone>("default");
  const [edgeSource, setEdgeSource] = React.useState(nodes[0]?.id ?? "");
  const [edgeTarget, setEdgeTarget] = React.useState(nodes[1]?.id ?? "");
  const [edgeLabel, setEdgeLabel] = React.useState("");

  React.useEffect(() => {
    if (!nodes.some((node) => node.id === edgeSource)) {
      setEdgeSource(nodes[0]?.id ?? "");
    }
    if (!nodes.some((node) => node.id === edgeTarget)) {
      setEdgeTarget(nodes[1]?.id ?? nodes[0]?.id ?? "");
    }
  }, [edgeSource, edgeTarget, nodes]);

  const addNode = () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      return;
    }
    const id = createId(
      trimmedLabel,
      nodes.map((node) => node.id),
    );
    const index = nodes.length;
    onNodesChange([
      ...nodes,
      {
        id,
        label: trimmedLabel,
        description: description.trim() || undefined,
        tone,
        x: (index % 3) * 280,
        y: Math.floor(index / 3) * 170,
      },
    ]);
    setLabel("");
    setDescription("");
  };
  const addEdge = () => {
    if (!edgeSource || !edgeTarget || edgeSource === edgeTarget) {
      return;
    }
    onEdgesChange([
      ...edges,
      {
        id: createId(
          `${edgeSource}-${edgeTarget}`,
          edges.map((edge) => edge.id),
        ),
        source: edgeSource,
        target: edgeTarget,
        label: edgeLabel.trim() || undefined,
      },
    ]);
    setEdgeLabel("");
  };

  return (
    <div className="grid gap-5">
      <PanelTitle
        title="Relationship map"
        detail={`${nodes.length} nodes, ${edges.length} edges`}
      />
      <div className="grid gap-2">
        <FieldLabel label="Node label" value={label} onChange={setLabel} />
        <FieldLabel label="Description" value={description} onChange={setDescription} />
        <SelectField
          label="Tone"
          value={tone}
          values={relationshipTones}
          onChange={(value) => setTone(value as RelationshipMapTone)}
        />
        <IconTextButton type="button" onClick={addNode}>
          <PlusIcon className="size-4" aria-hidden="true" />
          Add node
        </IconTextButton>
      </div>
      <div className="grid gap-2">
        <SelectField
          label="Source"
          value={edgeSource}
          values={nodes.map((node) => node.id)}
          onChange={setEdgeSource}
        />
        <SelectField
          label="Target"
          value={edgeTarget}
          values={nodes.map((node) => node.id)}
          onChange={setEdgeTarget}
        />
        <FieldLabel label="Edge label" value={edgeLabel} onChange={setEdgeLabel} />
        <IconTextButton type="button" onClick={addEdge}>
          <PlusIcon className="size-4" aria-hidden="true" />
          Add edge
        </IconTextButton>
      </div>
      <ItemList
        items={nodes.map((node) => ({ id: node.id, label: String(node.label) }))}
        onRemove={(id) => {
          onNodesChange(nodes.filter((node) => node.id !== id));
          onEdgesChange(edges.filter((edge) => edge.source !== id && edge.target !== id));
        }}
      />
    </div>
  );
}

function ProcessEditor({
  steps,
  onStepsChange,
}: {
  steps: ProcessMapStepData[];
  onStepsChange: (steps: ProcessMapStepData[]) => void;
}) {
  const [label, setLabel] = React.useState("");
  const [description, setDescription] = React.useState("");

  const addStep = () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      return;
    }
    onStepsChange([
      ...steps,
      {
        id: createId(
          trimmedLabel,
          steps.map((step) => step.id),
        ),
        label: trimmedLabel,
        description: description.trim() || undefined,
        status: "pending",
      },
    ]);
    setLabel("");
    setDescription("");
  };

  return (
    <div className="grid gap-5">
      <PanelTitle title="Process map" detail={`${steps.length} steps`} />
      <div className="grid gap-2">
        <FieldLabel label="Step label" value={label} onChange={setLabel} />
        <FieldLabel label="Description" value={description} onChange={setDescription} />
        <IconTextButton type="button" onClick={addStep}>
          <PlusIcon className="size-4" aria-hidden="true" />
          Add step
        </IconTextButton>
      </div>
      <div className="grid gap-2">
        {steps.map((step) => (
          <div key={step.id} className="grid gap-2 rounded-md border bg-card p-3">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="truncate text-sm font-medium">{step.label}</div>
              <IconOnlyButton
                label="Remove step"
                onClick={() =>
                  onStepsChange(steps.filter((currentStep) => currentStep.id !== step.id))
                }
              >
                <Trash2Icon className="size-4" aria-hidden="true" />
              </IconOnlyButton>
            </div>
            <SelectField
              label="Status"
              value={step.status ?? "pending"}
              values={processStatuses}
              onChange={(status) =>
                onStepsChange(
                  steps.map((currentStep) =>
                    currentStep.id === step.id
                      ? { ...currentStep, status: status as ProcessMapStatus }
                      : currentStep,
                  ),
                )
              }
            />
            <SelectField
              label="Tone"
              value={step.tone ?? "default"}
              values={processTones}
              onChange={(tone) =>
                onStepsChange(
                  steps.map((currentStep) =>
                    currentStep.id === step.id
                      ? { ...currentStep, tone: tone as ProcessMapTone }
                      : currentStep,
                  ),
                )
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function OrgEditor({
  nodes,
  onNodesChange,
}: {
  nodes: OrgChartNodeData[];
  onNodesChange: (nodes: OrgChartNodeData[]) => void;
}) {
  const flatNodes = React.useMemo(() => flattenOrgNodes(nodes), [nodes]);
  const [label, setLabel] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [parentId, setParentId] = React.useState("");

  const addNode = () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      return;
    }
    onNodesChange(
      insertOrgChartNode(nodes, parentId || null, {
        id: createId(
          trimmedLabel,
          flatNodes.map((node) => node.id),
        ),
        label: trimmedLabel,
        description: description.trim() || undefined,
      }),
    );
    setLabel("");
    setDescription("");
  };

  return (
    <div className="grid gap-5">
      <PanelTitle title="Org chart" detail={`${flatNodes.length} people`} />
      <div className="grid gap-2">
        <FieldLabel label="Name" value={label} onChange={setLabel} />
        <FieldLabel label="Description" value={description} onChange={setDescription} />
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Parent
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
          >
            <option value="">Top level</option>
            {flatNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label}
              </option>
            ))}
          </select>
        </label>
        <IconTextButton type="button" onClick={addNode}>
          <PlusIcon className="size-4" aria-hidden="true" />
          Add person
        </IconTextButton>
      </div>
      <ItemList
        items={flatNodes.map((node) => ({ id: node.id, label: String(node.label) }))}
        onRemove={(id) => onNodesChange(removeOrgChartNode(nodes, id))}
      />
    </div>
  );
}

function SegmentButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-sm transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
      aria-selected={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function IconTextButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50",
        props.className,
      )}
    />
  );
}

function IconOnlyButton({
  label,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex size-8 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
        props.className,
      )}
    />
  );
}

function PanelTitle({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="grid gap-1">
      <h2 className="text-sm font-semibold tracking-normal">{title}</h2>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function FieldLabel({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <input
        className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <select
        className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {values.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function ItemList({
  items,
  onRemove,
}: {
  items: Array<{ id: string; label: string }>;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex min-w-0 items-center justify-between gap-2 rounded-md border bg-card px-3 py-2"
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{item.label}</div>
            <div className="truncate text-xs text-muted-foreground">{item.id}</div>
          </div>
          <IconOnlyButton label={`Remove ${item.label}`} onClick={() => onRemove(item.id)}>
            <Trash2Icon className="size-4" aria-hidden="true" />
          </IconOnlyButton>
        </div>
      ))}
    </div>
  );
}

function Property({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-md border bg-card px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="break-words text-sm">{value}</div>
    </div>
  );
}

function PortList({
  label,
  ports,
}: {
  label: string;
  ports: Array<{ id: string; label: string; type?: WorkflowPortType }>;
}) {
  return (
    <div className="grid gap-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {ports.length ? (
        <div className="grid gap-1">
          {ports.map((port) => (
            <div key={port.id} className="rounded-md border bg-card px-3 py-2 text-sm">
              {port.label}
              {port.type ? (
                <span className="ml-2 text-xs text-muted-foreground">{port.type}</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">None</div>
      )}
    </div>
  );
}

function flattenOrgNodes(nodes: readonly OrgChartNodeData[]): OrgChartNodeData[] {
  return nodes.flatMap((node) => [node, ...flattenOrgNodes(node.children ?? [])]);
}

function createId(label: string, existingIds: readonly string[]) {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "item";
  const existing = new Set(existingIds);
  let id = base;
  let index = 2;
  while (existing.has(id)) {
    id = `${base}-${index}`;
    index += 1;
  }
  return id;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
