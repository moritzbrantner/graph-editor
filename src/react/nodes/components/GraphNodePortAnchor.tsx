"use client";

import * as React from "react";

import { cn } from "@moritzbrantner/ui";

import {
  formatGraphNodePortKind,
  getGraphNodePortBadgeTextColor,
  getGraphNodePortColor,
  getGraphNodePortTypeLabel,
  hexToRgba,
  type GraphNodeData,
  type GraphNodePort,
} from "../index-core";

export function GraphNodePortAnchor({
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
  const isInput = direction === "input";

  if (!port) {
    return (
      <div
        data-slot="workflow-node-port"
        data-port-direction={direction}
        className={cn(
          "flex h-16 min-h-0 items-center rounded-md border border-dashed border-zinc-200 px-2 py-1.5 text-xs text-zinc-700",
        )}
      >
        none
      </div>
    );
  }

  const color = getGraphNodePortColor(port);
  const typeLabel = getGraphNodePortTypeLabel(port);

  return (
    <button
      type="button"
      data-slot="workflow-node-port"
      data-port-direction={direction}
      data-port-id={port.id}
      disabled={disabled || !(onClick || onPointerUp || onPointerDown)}
      aria-label={getAriaLabel?.(port, node) ?? `${node.label} ${port.label}`}
      className={cn(
        "relative block h-16 w-full overflow-visible rounded-md border px-2 py-1.5 text-left outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-60",
        isInput ? "pl-3" : "pr-3",
      )}
      style={{
        backgroundColor: hexToRgba(color, 0.08),
        borderColor: hexToRgba(color, 0.32),
        boxShadow: `inset ${isInput ? "3px" : "-3px"} 0 0 ${color}`,
      }}
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
      <div
        className={cn(
          "flex h-full min-h-0 flex-col gap-1 overflow-hidden",
          isInput ? "items-start" : "items-end text-right",
        )}
      >
        <span
          data-slot="workflow-node-port-dot"
          className={cn(
            "absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white",
            isInput ? "-left-1.5" : "-right-1.5",
          )}
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <span className="max-w-full truncate text-xs font-medium text-zinc-800">{port.label}</span>
        <span
          className={cn(
            "flex max-w-full flex-nowrap gap-1 overflow-hidden",
            isInput ? "justify-start" : "justify-end",
          )}
        >
          {typeLabel ? (
            <span
              className="max-w-full truncate whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
              style={{
                backgroundColor: hexToRgba(color, 0.16),
                color: getGraphNodePortBadgeTextColor(color),
              }}
            >
              {formatGraphNodePortKind(typeLabel)}
            </span>
          ) : null}
          {port.badge ? (
            <span className="max-w-full truncate whitespace-nowrap rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-700">
              {port.badge}
            </span>
          ) : null}
          {port.required ? (
            <span className="max-w-full truncate whitespace-nowrap rounded bg-zinc-950 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
              required
            </span>
          ) : null}
        </span>
        {port.description ? <span className="sr-only">{port.description}</span> : null}
      </div>
    </button>
  );
}
