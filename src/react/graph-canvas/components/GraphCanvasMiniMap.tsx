"use client";

import * as React from "react";

import { cn } from "@moritzbrantner/ui";

import { getWorkflowBounds, type GraphCanvasMiniMapProps } from "../index-core";

export function GraphCanvasMiniMap({
  nodes,
  edges: _edges,
  selectedNodeId,
  showPortColumnHeaders = true,
  className,
  ...props
}: GraphCanvasMiniMapProps) {
  void _edges;
  const layoutOptions = React.useMemo(() => ({ showPortColumnHeaders }), [showPortColumnHeaders]);
  const bounds = React.useMemo(
    () => getWorkflowBounds(nodes, layoutOptions),
    [layoutOptions, nodes],
  );
  const minimapNodes = React.useMemo(
    () =>
      nodes.map((node) => ({
        id: node.id,
        left: ((node.x - bounds.x) / bounds.width) * 100,
        top: ((node.y - bounds.y) / bounds.height) * 100,
      })),
    [bounds, nodes],
  );

  return (
    <div
      data-slot="workflow-builder-minimap"
      role="img"
      aria-label="Workflow minimap"
      className={cn("h-24 w-36 rounded-md border bg-background/90 p-2 shadow-sm", className)}
      {...props}
    >
      <div className="relative size-full">
        {minimapNodes.map((node) => (
          <span
            key={node.id}
            data-slot="workflow-builder-minimap-node"
            data-selected={node.id === selectedNodeId ? "true" : undefined}
            className="absolute size-2 rounded-sm bg-muted-foreground data-[selected=true]:bg-primary"
            style={{ left: `${node.left}%`, top: `${node.top}%` }}
          />
        ))}
      </div>
    </div>
  );
}
