"use client";

import * as React from "react";

import { type GraphNodeData, type GraphNodePort } from "../index-core";
import { GraphNodePortAnchor } from "./GraphNodePortAnchor";

export function GraphNodePortColumn({
  title,
  direction,
  node,
  ports,
  disabled,
  showHeader,
  onClick,
  onPointerUp,
  onPointerDown,
  getAriaLabel,
}: {
  title: string;
  direction: "input" | "output";
  node: GraphNodeData;
  ports: readonly GraphNodePort[];
  disabled: boolean;
  showHeader: boolean;
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
  return (
    <div className="flex min-h-0 flex-col">
      {showHeader ? (
        <div className="mb-2 shrink-0 text-[11px] font-semibold uppercase text-zinc-500">
          {title}
        </div>
      ) : (
        <div style={{ display: "none" }}>{title}</div>
      )}
      {ports.length === 0 ? (
        <div className="flex h-16 min-h-0 flex-1 items-center rounded-md border border-dashed border-zinc-200 px-2 py-1.5 text-xs text-zinc-700">
          none
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-2">
          {ports.map((port) => (
            <GraphNodePortAnchor
              key={`${direction}-${port.id}`}
              direction={direction}
              node={node}
              port={port}
              disabled={disabled}
              onClick={onClick}
              onPointerUp={onPointerUp}
              onPointerDown={onPointerDown}
              getAriaLabel={getAriaLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
