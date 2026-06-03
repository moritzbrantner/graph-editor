declare module "@moritzbrantner/diagrams/org-chart" {
  import type * as React from "react";

  export type OrgChartNodeData = {
    id: string;
    label: React.ReactNode;
    description?: React.ReactNode;
    children?: OrgChartNodeData[];
  };

  export type OrgChartProps = React.ComponentProps<"div"> & {
    nodes: readonly OrgChartNodeData[];
  };

  export const OrgChart: React.ComponentType<OrgChartProps>;
  export function insertOrgChartNode(
    nodes: readonly OrgChartNodeData[],
    parentNodeId: string | null,
    node: OrgChartNodeData,
  ): OrgChartNodeData[];
  export function removeOrgChartNode(
    nodes: readonly OrgChartNodeData[],
    nodeId: string,
  ): OrgChartNodeData[];
}

declare module "@moritzbrantner/diagrams/process-map" {
  import type * as React from "react";

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
  export type ProcessMapProps = React.ComponentProps<"div"> & {
    steps?: readonly ProcessMapStepData[];
    orientation?: "horizontal" | "vertical";
  };

  export const ProcessMap: React.ComponentType<ProcessMapProps>;
}

declare module "@moritzbrantner/diagrams/relationship-map" {
  import type * as React from "react";

  export type RelationshipMapTone =
    | "default"
    | "accent"
    | "success"
    | "warning"
    | "danger"
    | "muted";
  export type RelationshipMapEdgeKind = "default" | "dependency" | "blocking" | "success" | "risk";
  export type RelationshipMapDirection = "forward" | "backward" | "both" | "none";
  export type RelationshipMapPoint = {
    x: number;
    y: number;
  };
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
    kind?: RelationshipMapEdgeKind;
    direction?: RelationshipMapDirection;
    points?: RelationshipMapPoint[];
  };
  export type RelationshipMapProps = Omit<React.ComponentProps<"figure">, "children"> & {
    nodes: readonly RelationshipMapNode[];
    edges?: readonly RelationshipMapEdge[];
    ariaLabel?: string;
    caption?: React.ReactNode;
    emptyMessage?: React.ReactNode;
    padding?: number;
    autoLayoutColumns?: number;
  };

  export const RelationshipMap: React.ComponentType<RelationshipMapProps>;
}
