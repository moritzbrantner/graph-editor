"use client";

import {
  getGraphEditorNodeHeaderHeight,
  getGraphEditorNodeMinimizedPortsHeight,
  getGraphEditorNodePortCenterOffset,
  getGraphEditorNodeSize,
} from "../../node-metrics";
import type {
  GraphNodeData,
  GraphNodeLayoutOptions,
  GraphNodeSize,
  GraphNodePort,
} from "./index";

export const graphNodeMinimizedHeaderHeight = 54;
export const graphNodeControlButtonClassName =
  "inline-flex h-6 w-6 items-center justify-center rounded-md border border-zinc-300 bg-white/80 text-zinc-700 outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1";

export function graphNodeCompactPortSummary(node: GraphNodeData) {
  const input = node.inputs?.[0];
  const output = node.outputs?.[0];

  if (input && output) {
    return `${graphNodePortSummaryLabel(input)} -> ${graphNodePortSummaryLabel(output)}`;
  }

  if (input || output) {
    return graphNodePortSummaryLabel(input ?? output);
  }

  return "No ports";
}

export function graphNodePortSummaryLabel(port: GraphNodePort | undefined) {
  if (!port) {
    return "port";
  }

  return formatGraphNodePortKind(getGraphNodePortTypeLabel(port) ?? port.badge ?? port.label);
}

export function getGraphNodePortTypeLabel(port: GraphNodePort) {
  if (!port.type) {
    return port.kind;
  }

  if (typeof port.type === "string") {
    return port.type.trim();
  }

  const label = port.type.label ?? port.type.source ?? port.type.kind;
  return typeof label === "string" ? label.trim() : port.kind;
}

export function getGraphNodePortTypeSource(port: GraphNodePort) {
  if (!port.type) {
    return undefined;
  }

  const source = typeof port.type === "string" ? port.type : (port.type.source ?? port.type.kind);
  return typeof source === "string" ? source.trim() : undefined;
}

export function getGraphNodePortLayout(node: GraphNodeData) {
  const hasInputs = (node.inputs?.length ?? 0) > 0;
  const hasOutputs = (node.outputs?.length ?? 0) > 0;

  if (hasInputs && !hasOutputs) {
    return "input-only";
  }

  if (!hasInputs && hasOutputs) {
    return "output-only";
  }

  return "duplex";
}

export function graphNodeUsesCompactVariant(node: GraphNodeData) {
  return node.variant === "compact";
}

export function getGraphNodeSize(
  node: GraphNodeData,
  options: GraphNodeLayoutOptions = {},
): GraphNodeSize {
  return getGraphEditorNodeSize(node, options);
}

export function getGraphNodePortCenterOffset(
  node: GraphNodeData,
  portIndex: number,
  options: GraphNodeLayoutOptions = {},
) {
  return getGraphEditorNodePortCenterOffset(node, portIndex, options);
}

export function getGraphNodeToneFromStatus(status?: string) {
  if (status === "success") {
    return "success";
  }
  if (status === "warning") {
    return "warning";
  }
  if (status === "error") {
    return "error";
  }
  if (status === "running") {
    return "info";
  }
  return "neutral";
}

export function getGraphNodeToneClasses(tone?: GraphNodeData["tone"]) {
  if (tone === "success" || tone === "emerald") {
    return "border-emerald-100 bg-emerald-50";
  }
  if (tone === "warning" || tone === "amber") {
    return "border-amber-100 bg-amber-50";
  }
  if (tone === "error" || tone === "rose") {
    return "border-rose-100 bg-rose-50";
  }
  if (tone === "info" || tone === "sky") {
    return "border-sky-100 bg-sky-50";
  }
  if (tone === "violet") {
    return "border-violet-100 bg-violet-50";
  }
  if (tone === "cyan") {
    return "border-cyan-100 bg-cyan-50";
  }
  if (tone === "indigo") {
    return "border-indigo-100 bg-indigo-50";
  }
  if (tone === "fuchsia") {
    return "border-fuchsia-100 bg-fuchsia-50";
  }
  if (tone === "slate") {
    return "border-slate-100 bg-slate-50";
  }
  return "border-zinc-100 bg-zinc-50";
}

export function getGraphNodeToneDotClass(tone?: GraphNodeData["tone"]) {
  if (tone === "success" || tone === "emerald") {
    return "bg-emerald-500";
  }
  if (tone === "warning" || tone === "amber") {
    return "bg-amber-500";
  }
  if (tone === "error" || tone === "rose") {
    return "bg-rose-500";
  }
  if (tone === "info" || tone === "sky") {
    return "bg-sky-500";
  }
  if (tone === "violet") {
    return "bg-violet-500";
  }
  if (tone === "cyan") {
    return "bg-cyan-500";
  }
  if (tone === "indigo") {
    return "bg-indigo-500";
  }
  if (tone === "fuchsia") {
    return "bg-fuchsia-500";
  }
  if (tone === "slate") {
    return "bg-slate-500";
  }
  return "bg-zinc-500";
}

export function getGraphNodeHeaderHeight(node: GraphNodeData) {
  return getGraphEditorNodeHeaderHeight(node);
}

export function getGraphNodeMinimizedPortsHeight(node: GraphNodeData) {
  return getGraphEditorNodeMinimizedPortsHeight(node);
}

export function getGraphNodePackageLabel(node: GraphNodeData) {
  return node.packageLabel;
}

export function graphNodeInlineTitle(node: GraphNodeData) {
  const input = node.inputs?.[0];
  const output = node.outputs?.[0];

  if (input && output) {
    return `${node.label} - ${input.label} to ${output.label}`;
  }

  return `${node.label} - ${(input ?? output)?.label ?? "port"}`;
}

const graphNodePortKindColors: Record<string, string> = {
  asset: "#2563eb",
  audio: "#0d9488",
  boolean: "#059669",
  document: "#7c3aed",
  event: "#ea580c",
  image: "#db2777",
  labels: "#16a34a",
  null: "#71717a",
  number: "#ca8a04",
  object: "#7c3aed",
  page: "#0891b2",
  promise: "#4f46e5",
  result: "#4f46e5",
  string: "#0284c7",
  table: "#ca8a04",
  task: "#dc2626",
  text: "#0284c7",
  unknown: "#71717a",
  video: "#9333ea",
  void: "#71717a",
};

const graphNodePortFallbackColors = [
  "#0284c7",
  "#16a34a",
  "#ca8a04",
  "#db2777",
  "#7c3aed",
  "#ea580c",
  "#4f46e5",
  "#0d9488",
];

export function getGraphNodePortColor(port: GraphNodePort) {
  if (port.color) {
    return port.color;
  }

  const key = (port.kind ?? getGraphNodePortTypeLabel(port) ?? port.badge ?? port.label)
    .toLowerCase()
    .trim();
  const knownColor = graphNodePortKindColors[key];

  if (knownColor) {
    return knownColor;
  }

  const hash = Array.from(key).reduce((value, char) => value + char.charCodeAt(0), 0);

  return graphNodePortFallbackColors[hash % graphNodePortFallbackColors.length] ?? "#71717a";
}

export function formatGraphNodePortKind(value: string) {
  return value.replace(/[_-]/g, " ");
}

export function hexToRgba(hex: string, alpha: number) {
  const normalized = normalizeHexColor(hex);

  if (!normalized) {
    return `rgba(113, 113, 122, ${alpha})`;
  }

  const value = Number.parseInt(normalized.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function normalizeHexColor(value: string) {
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
    return value;
  }

  if (/^#[0-9A-Fa-f]{3}$/.test(value)) {
    return `#${value
      .slice(1)
      .split("")
      .map((part) => `${part}${part}`)
      .join("")}`;
  }

  return null;
}

export function getGraphNodePortBadgeTextColor() {
  return "#18181b";
}
