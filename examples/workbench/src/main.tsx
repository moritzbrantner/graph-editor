import * as React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  GitBranchIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  NetworkIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
  WorkflowIcon,
} from "lucide-react";

import {
  GraphWorkbench,
  createGraphEditorRuntime,
  normalizeGraphEditorDocument,
  validateGraphEditorDocument,
  type GraphEditorRuntimeState,
  type GraphWorkbenchInspectorSchema,
} from "@moritzbrantner/graph-editor";
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
import {
  cloneWorkbenchExampleDocument,
  defaultWorkbenchExample,
  workbenchExamples,
  type WorkflowEdgeData,
  type WorkflowNodeData,
  type WorkflowPortType,
} from "./workbench-examples";

import "./styles.css";

type ExampleView = "workflow" | "diagrams";
type DiagramKind = "relationship" | "process" | "org";

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
const workflowTones = ["", "neutral", "info", "success", "warning", "error"];
const workflowStatuses = ["", "idle", "running", "success", "warning", "error"];

const workflowInspectorSchema: GraphWorkbenchInspectorSchema<
  WorkflowNodeData,
  WorkflowEdgeData,
  WorkflowPortType
> = {
  getNodeSections(node) {
    return [
      {
        id: "general",
        title: "General",
        defaultOpen: true,
        fields: [
          { id: "label", label: "Label", type: "text", value: node.label },
          {
            id: "description",
            label: "Description",
            type: "textarea",
            value: node.description ?? "",
          },
          { id: "owner", label: "Owner", type: "text", value: node.data?.owner ?? "" },
          { id: "setting", label: "Setting", type: "text", value: node.data?.setting ?? "" },
        ],
      },
      {
        id: "presentation",
        title: "Presentation",
        fields: [
          {
            id: "tone",
            label: "Tone",
            type: "select",
            value: node.tone ?? "",
            options: workflowTones.map((value) => ({
              label: value || "Default",
              value,
            })),
          },
          {
            id: "status",
            label: "Status",
            type: "select",
            value: node.status ?? "",
            options: workflowStatuses.map((value) => ({
              label: value || "Default",
              value,
            })),
          },
          { id: "minimized", label: "Minimized", type: "boolean", value: Boolean(node.minimized) },
        ],
      },
      {
        id: "data",
        title: "Data",
        defaultOpen: false,
        fields: [
          {
            id: "data",
            label: "Data",
            type: "code",
            readOnly: true,
            value: JSON.stringify(node.data ?? {}, null, 2),
          },
          {
            id: "metadata",
            label: "Metadata",
            type: "code",
            readOnly: true,
            value: JSON.stringify(node.metadata ?? {}, null, 2),
          },
        ],
      },
    ];
  },
  getEdgeSections(edge) {
    return [
      {
        id: "general",
        title: "Connection",
        defaultOpen: true,
        fields: [
          { id: "label", label: "Label", type: "text", value: edge.data?.label ?? "" },
          {
            id: "status",
            label: "Status",
            type: "select",
            value: edge.status ?? "",
            options: workflowStatuses.map((value) => ({
              label: value || "Default",
              value,
            })),
          },
          { id: "color", label: "Color", type: "color", value: edge.color ?? "#000000" },
        ],
      },
      {
        id: "data",
        title: "Data",
        defaultOpen: false,
        fields: [
          {
            id: "data",
            label: "Data",
            type: "code",
            readOnly: true,
            value: JSON.stringify(edge.data ?? {}, null, 2),
          },
          {
            id: "metadata",
            label: "Metadata",
            type: "code",
            readOnly: true,
            value: JSON.stringify(edge.metadata ?? {}, null, 2),
          },
        ],
      },
    ];
  },
  applyNodeValues(node, values) {
    return {
      label: String(values.label ?? ""),
      description: optionalText(values.description),
      tone: optionalText(values.tone),
      status: optionalText(values.status),
      minimized: Boolean(values.minimized),
      data: {
        ...(node.data ?? { owner: "" }),
        owner: String(values.owner ?? ""),
        setting: optionalText(values.setting),
      },
    };
  },
  applyEdgeValues(edge, values) {
    return {
      status: optionalText(values.status),
      color: optionalText(values.color),
      data: {
        ...(edge.data ?? {}),
        label: optionalText(values.label),
      },
    };
  },
};

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
  const [exampleId, setExampleId] = React.useState(defaultWorkbenchExample.id);
  const [readOnly, setReadOnly] = React.useState(false);
  const selectedExample =
    workbenchExamples.find((example) => example.id === exampleId) ?? defaultWorkbenchExample;
  const [runtime, setRuntime] = React.useState(() =>
    createGraphEditorRuntime<WorkflowNodeData, WorkflowEdgeData, WorkflowPortType>({
      initialDocument: normalizeGraphEditorDocument(cloneWorkbenchExampleDocument(selectedExample)),
    }),
  );
  const document = runtime.document;
  const categories = React.useMemo(
    () => Array.from(new Set(workbenchExamples.map((example) => example.category))),
    [],
  );
  const pristineDocument = React.useMemo(
    () => normalizeGraphEditorDocument(cloneWorkbenchExampleDocument(selectedExample)),
    [selectedExample],
  );
  const diagnostics = React.useMemo(() => validateGraphEditorDocument(document), [document]);
  const dirty = !areDocumentsEqual(document, pristineDocument);

  const selectExample = (nextExampleId: string) => {
    const nextExample = workbenchExamples.find((example) => example.id === nextExampleId);
    if (!nextExample || nextExample.id === selectedExample.id) {
      return;
    }
    if (
      dirty &&
      typeof window !== "undefined" &&
      !window.confirm("Replace the current graph with the selected example?")
    ) {
      return;
    }
    setExampleId(nextExample.id);
    setRuntime(
      createGraphEditorRuntime<WorkflowNodeData, WorkflowEdgeData, WorkflowPortType>({
        initialDocument: normalizeGraphEditorDocument(cloneWorkbenchExampleDocument(nextExample)),
      }),
    );
  };

  const selectCategory = (category: string) => {
    const nextExample = workbenchExamples.find((example) => example.category === category);
    if (nextExample) {
      selectExample(nextExample.id);
    }
  };

  const resetExample = () => {
    setRuntime(
      createGraphEditorRuntime<WorkflowNodeData, WorkflowEdgeData, WorkflowPortType>({
        initialDocument: normalizeGraphEditorDocument(
          cloneWorkbenchExampleDocument(selectedExample),
        ),
      }),
    );
  };
  const commitWorkbenchRuntime = React.useCallback(
    (
      nextRuntime: GraphEditorRuntimeState<WorkflowNodeData, WorkflowEdgeData, WorkflowPortType>,
    ) => {
      if (typeof window === "undefined" || typeof window.queueMicrotask !== "function") {
        setRuntime(nextRuntime);
        return;
      }
      window.queueMicrotask(() => setRuntime(nextRuntime));
    },
    [],
  );

  return (
    <section className="grid gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="grid min-w-64 gap-1">
          <div className="text-sm font-semibold">{selectedExample.label}</div>
          <div className="text-xs leading-5 text-muted-foreground">
            {selectedExample.description}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SelectField
            label="Category"
            value={selectedExample.category}
            values={categories}
            onChange={selectCategory}
          />
          <SelectField
            label="Graph"
            value={selectedExample.id}
            values={workbenchExamples.map((example) => example.id)}
            labels={Object.fromEntries(
              workbenchExamples.map((example) => [example.id, example.label]),
            )}
            onChange={selectExample}
          />
          <IconTextButton type="button" disabled={!dirty} onClick={resetExample}>
            <RefreshCwIcon className="size-4" aria-hidden="true" />
            Reset
          </IconTextButton>
          <IconTextButton
            type="button"
            aria-pressed={readOnly}
            onClick={() => setReadOnly((current) => !current)}
          >
            Read only
          </IconTextButton>
          <MetricBadge label={`${document.nodes.length} nodes`} />
          <MetricBadge label={`${document.edges.length} edges`} />
          {diagnostics.length > 0 ? (
            <MetricBadge tone="error" label={`${diagnostics.length} issues`} />
          ) : (
            <MetricBadge tone="success" label="Valid" />
          )}
        </div>
      </div>
      <GraphWorkbench
        runtime={runtime}
        nodeTemplates={selectedExample.nodeTemplates}
        inspectorSchema={workflowInspectorSchema}
        readOnly={readOnly}
        className="h-[calc(100vh-12rem)] min-h-[38rem] grid-cols-[15rem_minmax(0,1fr)_18rem] max-xl:grid-cols-[14rem_minmax(0,1fr)] max-lg:h-auto max-lg:grid-cols-1"
        onRuntimeChange={commitWorkbenchRuntime}
      />
    </section>
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

function MetricBadge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success" | "error";
}) {
  return (
    <span
      className={cx(
        "inline-flex h-8 items-center rounded-md border px-2.5 text-xs font-medium",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "error" && "border-red-200 bg-red-50 text-red-700",
        tone === "default" && "bg-card text-muted-foreground",
      )}
    >
      {label}
    </span>
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
  labels,
  onChange,
}: {
  label: string;
  value: string;
  values: readonly string[];
  labels?: Record<string, string>;
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
            {labels?.[item] ?? item}
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

function optionalText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text : undefined;
}

function areDocumentsEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
