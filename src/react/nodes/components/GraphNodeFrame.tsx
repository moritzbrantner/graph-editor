"use client";

import * as React from "react";

import { cn } from "@moritzbrantner/ui";

import {
  getGraphNodeSize,
  graphNodeUsesCompactVariant,
  type GraphNodeData,
  type GraphNodeLayoutOptions,
  type GraphNodeSize,
} from "../index-core";

export type GraphNodeFrameProps = React.ComponentProps<"div"> & {
  node: GraphNodeData;
  selected?: boolean;
  minimized?: boolean;
  layoutOptions?: GraphNodeLayoutOptions;
  size?: GraphNodeSize;
};

export function GraphNodeFrame({
  node,
  selected,
  minimized = node.minimized ?? false,
  layoutOptions,
  size,
  className,
  style,
  ...props
}: GraphNodeFrameProps) {
  const resolvedNode = node.minimized === minimized ? node : { ...node, minimized };
  const compact = graphNodeUsesCompactVariant(resolvedNode);
  const resolvedSize = size ?? getGraphNodeSize(resolvedNode, layoutOptions);

  return (
    <div
      data-slot="workflow-node"
      data-compact={compact ? "true" : undefined}
      data-minimized={!compact && minimized ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      data-status={resolvedNode.status}
      className={cn(
        "relative overflow-visible rounded-lg border bg-white text-left shadow-sm transition-colors",
        !compact && "flex flex-col",
        selected ? "border-zinc-950 ring-2 ring-zinc-950/10" : "border-zinc-200",
        className,
      )}
      style={{ width: resolvedSize.width, height: resolvedSize.height, ...style }}
      {...props}
    />
  );
}
