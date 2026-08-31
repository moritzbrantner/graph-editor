"use client";

import * as React from "react";

import { cn } from "@moritzbrantner/ui";

import {
  getGraphNodePortColor,
  graphNodePortSummaryLabel,
  type GraphNodeData,
  type GraphNodePort,
} from "../index-core";

export function GraphNodeMinimizedPortStack({
  direction,
  node,
  ports,
  disabled,
  onClick,
  onPointerUp,
  onPointerDown,
  getAriaLabel,
}: {
  direction: "input" | "output";
  node: GraphNodeData;
  ports: readonly GraphNodePort[];
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
  const isInput = direction === "input";

  return (
    <>
      {ports.map((port, index) => (
        <button
          key={`${direction}-${port.id}`}
          type="button"
          data-slot="workflow-node-port"
          data-port-direction={direction}
          data-port-id={port.id}
          disabled={disabled || !(onClick || onPointerUp || onPointerDown)}
          aria-label={getAriaLabel?.(port, node) ?? `${node.label} ${port.label}`}
          className={cn(
            "absolute z-10 h-3 w-3 rounded-full border-2 border-white outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-60",
            isInput ? "-left-1.5" : "-right-1.5",
          )}
          style={{
            backgroundColor: getGraphNodePortColor(port),
            top: `${((index + 1) / (ports.length + 1)) * 100}%`,
          }}
          title={`${port.label} ${graphNodePortSummaryLabel(port)}`}
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
      ))}
    </>
  );
}
