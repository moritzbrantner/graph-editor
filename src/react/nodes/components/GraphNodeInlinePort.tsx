"use client";

import * as React from "react";

import { cn } from "@moritzbrantner/ui";

import { getGraphNodePortColor, type GraphNodeData, type GraphNodePort } from "../index-core";

export function GraphNodeInlinePort({
  direction,
  node,
  port,
  disabled,
  onClick,
  onPointerUp,
  onPointerDown,
  getAriaLabel,
}: {
  direction: "input" | "output";
  node: GraphNodeData;
  port?: GraphNodePort;
  disabled: boolean;
  onClick?: (port: GraphNodePort, node: GraphNodeData) => void;
  onPointerUp?: (
    port: GraphNodePort,
    node: GraphNodeData,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
  onPointerDown?: (
    port: GraphNodePort,
    node: GraphNodeData,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
  getAriaLabel?: (port: GraphNodePort, node: GraphNodeData) => string;
}) {
  if (!port) {
    return null;
  }

  const isInput = direction === "input";
  const color = getGraphNodePortColor(port);
  const interactive = Boolean(onClick || onPointerUp || onPointerDown);

  return (
    <button
      type="button"
      data-slot="workflow-node-port"
      data-port-direction={direction}
      data-port-id={port.id}
      disabled={disabled || !interactive}
      aria-label={getAriaLabel?.(port, node) ?? `${node.label} ${port.label}`}
      className={cn(
        "absolute top-1/2 z-10 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-60",
        isInput ? "-left-1.5" : "-right-1.5",
      )}
      style={{ backgroundColor: color }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(port, node);
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown?.(port, node, event);
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        onPointerUp?.(port, node, event);
      }}
    >
      <span data-slot="workflow-node-port-dot" className="block h-full w-full rounded-full" />
    </button>
  );
}
