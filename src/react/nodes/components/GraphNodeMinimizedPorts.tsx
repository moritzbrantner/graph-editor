"use client";

import * as React from "react";

import {
  getGraphNodeMinimizedPortsHeight,
  type GraphNodeData,
  type GraphNodePort,
} from "../index-core";
import { GraphNodeMinimizedPortStack } from "./GraphNodeMinimizedPortStack";

export function GraphNodeMinimizedPorts({
  node,
  layout = "stacked",
  inputDisabled,
  outputDisabled,
  onInputClick,
  onOutputClick,
  onInputPointerUp,
  onOutputPointerDown,
  onOutputPointerUp,
  getInputAriaLabel,
  getOutputAriaLabel,
}: {
  node: GraphNodeData;
  /** `inline`: the dots overlay the single header line, on the node's left and right edges. */
  layout?: "stacked" | "inline";
  inputDisabled: boolean;
  outputDisabled: boolean;
  onInputClick?: (port: GraphNodePort, node: GraphNodeData) => void;
  onOutputClick?: (port: GraphNodePort, node: GraphNodeData) => void;
  onInputPointerUp?: (
    port: GraphNodePort,
    node: GraphNodeData,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
  onOutputPointerDown?: (
    port: GraphNodePort,
    node: GraphNodeData,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
  onOutputPointerUp?: (
    port: GraphNodePort,
    node: GraphNodeData,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
  getInputAriaLabel?: (port: GraphNodePort, node: GraphNodeData) => string;
  getOutputAriaLabel?: (port: GraphNodePort, node: GraphNodeData) => string;
}) {
  const inputs = node.inputs ?? [];
  const outputs = node.outputs ?? [];

  const inline = layout === "inline";

  return (
    <div
      data-slot="workflow-node-minimized-ports"
      data-layout={layout}
      className={
        inline
          ? "pointer-events-none absolute inset-0 z-30"
          : "relative border-t border-zinc-100 bg-white"
      }
      style={inline ? undefined : { height: getGraphNodeMinimizedPortsHeight(node) }}
    >
      {inline ? null : (
        <div className="pointer-events-none absolute inset-x-3 top-1/2 flex -translate-y-1/2 items-center justify-between text-[10px] font-semibold uppercase text-zinc-500">
          <span>{inputs.length} in</span>
          <span>{outputs.length} out</span>
        </div>
      )}
      <GraphNodeMinimizedPortStack
        direction="input"
        node={node}
        ports={inputs}
        inline={inline}
        disabled={inputDisabled}
        onClick={onInputClick}
        onPointerUp={onInputPointerUp}
        getAriaLabel={getInputAriaLabel}
      />
      <GraphNodeMinimizedPortStack
        direction="output"
        node={node}
        ports={outputs}
        inline={inline}
        disabled={outputDisabled}
        onClick={onOutputClick}
        onPointerDown={onOutputPointerDown}
        onPointerUp={onOutputPointerUp}
        getAriaLabel={getOutputAriaLabel}
      />
    </div>
  );
}
