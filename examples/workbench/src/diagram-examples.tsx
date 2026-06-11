import * as React from "react";

export type RelationshipMapTone = "default" | "accent" | "success" | "warning" | "danger" | "muted";

export type RelationshipMapNode = {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  group?: React.ReactNode;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  tone?: RelationshipMapTone;
};

export type RelationshipMapEdge = {
  id: string;
  source: string;
  target: string;
  label?: React.ReactNode;
  kind?: "default" | "dependency" | "blocking" | "success" | "risk";
  direction?: "forward" | "backward" | "both" | "none";
  points?: Array<{ x: number; y: number }>;
};

export type ProcessMapTone = "default" | "accent" | "success" | "warning" | "danger" | "muted";
export type ProcessMapStatus = "pending" | "active" | "done" | "blocked" | "warning";

export type ProcessMapStepData = {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  status?: ProcessMapStatus;
  tone?: ProcessMapTone;
  icon?: React.ComponentType<{ className?: string }>;
};

export type OrgChartNodeData = {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  children?: OrgChartNodeData[];
};

const relationshipToneClasses: Record<RelationshipMapTone, string> = {
  default: "border-border bg-background",
  accent: "border-primary/40 bg-primary/5",
  success: "border-emerald-500/40 bg-emerald-500/10",
  warning: "border-amber-500/50 bg-amber-500/10",
  danger: "border-destructive/40 bg-destructive/10",
  muted: "border-border bg-muted/60",
};

const processToneClasses: Record<ProcessMapTone, string> = {
  default: "border-border bg-card",
  accent: "border-primary/40 bg-primary/5",
  success: "border-emerald-500/40 bg-emerald-500/10",
  warning: "border-amber-500/50 bg-amber-500/10",
  danger: "border-destructive/40 bg-destructive/10",
  muted: "border-border bg-muted/50",
};

export function RelationshipMap({
  nodes,
  edges = [],
  ariaLabel = "Relationship map",
  caption,
  emptyMessage = "No relationships to display.",
  padding = 32,
  className,
  ...props
}: Omit<React.ComponentProps<"figure">, "children"> & {
  nodes: readonly RelationshipMapNode[];
  edges?: readonly RelationshipMapEdge[];
  ariaLabel?: string;
  caption?: React.ReactNode;
  emptyMessage?: React.ReactNode;
  padding?: number;
}) {
  const positionedNodes = nodes.map((node, index) => ({
    ...node,
    x: node.x ?? (index % 3) * 280,
    y: node.y ?? Math.floor(index / 3) * 170,
    width: node.width ?? 184,
    height: node.height ?? 92,
  }));
  const nodeMap = new Map(positionedNodes.map((node) => [node.id, node]));
  const bounds = getBounds(positionedNodes, padding);

  return (
    <figure
      data-slot="relationship-map"
      className={cx("grid min-w-0 gap-2 overflow-auto rounded-md border bg-card p-3", className)}
      {...props}
    >
      {positionedNodes.length ? (
        <svg
          aria-label={ariaLabel}
          role="img"
          viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
          className="min-h-72 w-full min-w-[40rem]"
        >
          <defs>
            <marker
              id="relationship-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" className="fill-muted-foreground" />
            </marker>
          </defs>
          {edges.map((edge) => {
            const source = nodeMap.get(edge.source);
            const target = nodeMap.get(edge.target);
            if (!source || !target) {
              return null;
            }
            const start = { x: source.x + source.width, y: source.y + source.height / 2 };
            const end = { x: target.x, y: target.y + target.height / 2 };
            const midX = start.x + (end.x - start.x) / 2;

            return (
              <g key={edge.id}>
                <path
                  d={`M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`}
                  className="fill-none stroke-muted-foreground"
                  strokeWidth="2"
                  markerEnd={edge.direction === "none" ? undefined : "url(#relationship-arrow)"}
                />
                {edge.label ? (
                  <text
                    x={midX}
                    y={(start.y + end.y) / 2 - 8}
                    textAnchor="middle"
                    className="fill-muted-foreground text-xs"
                  >
                    {edge.label}
                  </text>
                ) : null}
              </g>
            );
          })}
          {positionedNodes.map((node) => (
            <foreignObject
              key={node.id}
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
            >
              <div
                className={cx(
                  "grid h-full content-center gap-1 rounded-md border p-3 text-sm shadow-sm",
                  relationshipToneClasses[node.tone ?? "default"],
                )}
              >
                <div className="truncate font-medium">{node.label}</div>
                {node.description ? (
                  <div className="truncate text-xs text-muted-foreground">{node.description}</div>
                ) : null}
              </div>
            </foreignObject>
          ))}
        </svg>
      ) : (
        <div className="grid min-h-72 place-items-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      )}
      {caption ? (
        <figcaption className="text-xs text-muted-foreground">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

export function ProcessMap({
  steps = [],
  orientation = "horizontal",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  steps?: readonly ProcessMapStepData[];
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <div
      data-slot="process-map"
      data-orientation={orientation}
      className={cx("overflow-auto rounded-md border bg-card/60 p-3", className)}
      {...props}
    >
      <div
        role="list"
        className={cx(
          "flex min-w-0 gap-3",
          orientation === "vertical" ? "flex-col" : "min-w-max flex-col md:flex-row",
        )}
      >
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <React.Fragment key={step.id}>
              <div
                role="listitem"
                data-slot="process-map-step"
                data-status={step.status}
                data-tone={step.tone ?? "default"}
                className={cx(
                  "grid min-h-28 w-full min-w-0 gap-2 rounded-md border p-4 md:w-56 md:min-w-56",
                  processToneClasses[step.tone ?? "default"],
                )}
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="font-medium leading-5">{step.label}</div>
                  {Icon ? <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> : null}
                </div>
                {step.description ? (
                  <div className="text-sm leading-5 text-muted-foreground">{step.description}</div>
                ) : null}
                {step.meta ? (
                  <div className="text-xs text-muted-foreground">{step.meta}</div>
                ) : null}
              </div>
              {index < steps.length - 1 ? (
                <div
                  aria-hidden="true"
                  className={cx(
                    "self-center bg-border",
                    orientation === "vertical" ? "h-6 w-px" : "h-px w-8",
                  )}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export function OrgChart({
  nodes,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  nodes: readonly OrgChartNodeData[];
}) {
  return (
    <div
      data-slot="org-chart"
      className={cx("overflow-auto rounded-md border bg-card/60 p-4", className)}
      {...props}
    >
      {nodes.length ? (
        <div className="grid min-w-max gap-4">
          {nodes.map((node) => (
            <OrgNode key={node.id} node={node} />
          ))}
        </div>
      ) : (
        <div className="grid min-h-48 place-items-center text-sm text-muted-foreground">
          No organization data.
        </div>
      )}
    </div>
  );
}

export function insertOrgChartNode(
  nodes: readonly OrgChartNodeData[],
  parentNodeId: string | null,
  node: OrgChartNodeData,
): OrgChartNodeData[] {
  if (!parentNodeId) {
    return [...nodes, node];
  }

  return nodes.map((currentNode) =>
    currentNode.id === parentNodeId
      ? { ...currentNode, children: [...(currentNode.children ?? []), node] }
      : {
          ...currentNode,
          children: currentNode.children
            ? insertOrgChartNode(currentNode.children, parentNodeId, node)
            : undefined,
        },
  );
}

export function removeOrgChartNode(
  nodes: readonly OrgChartNodeData[],
  nodeId: string,
): OrgChartNodeData[] {
  const nextNodes: OrgChartNodeData[] = [];
  for (const node of nodes) {
    if (node.id === nodeId) {
      continue;
    }
    nextNodes.push({
      ...node,
      children: node.children ? removeOrgChartNode(node.children, nodeId) : undefined,
    });
  }
  return nextNodes;
}

function OrgNode({ node }: { node: OrgChartNodeData }) {
  return (
    <div className="grid justify-items-start gap-3">
      <div className="min-w-48 rounded-md border bg-background p-3 shadow-sm">
        <div className="text-sm font-medium">{node.label}</div>
        {node.description ? (
          <div className="text-xs text-muted-foreground">{node.description}</div>
        ) : null}
      </div>
      {node.children?.length ? (
        <div className="ml-8 grid gap-3 border-l pl-4">
          {node.children.map((child) => (
            <OrgNode key={child.id} node={child} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getBounds(
  nodes: Array<RelationshipMapNode & { x: number; y: number; width: number; height: number }>,
  padding: number,
) {
  const maxX = Math.max(...nodes.map((node) => node.x + node.width), 640);
  const maxY = Math.max(...nodes.map((node) => node.y + node.height), 320);

  return {
    x: -padding,
    y: -padding,
    width: maxX + padding * 2,
    height: maxY + padding * 2,
  };
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
