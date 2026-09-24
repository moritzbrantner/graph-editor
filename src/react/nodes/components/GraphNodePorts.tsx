"use client";

import * as React from "react";

import { cn } from "@moritzbrantner/ui";

import {
  getGraphNodePortLayout,
  type GraphNodeData,
  type GraphNodePort,
} from "../index-core";
import { GraphNodePortColumn } from "./GraphNodePortColumn";

export type GraphNodePortsProps = React.ComponentProps<"div"> & {
  node: GraphNodeData;
  readOnly?: boolean;
  inputDisabled?: boolean;
  outputDisabled?: boolean;
  showPortColumnHeaders?: boolean;
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
};

export function GraphNodePorts({
  node,
  readOnly = false,
  inputDisabled = false,
  outputDisabled = false,
  showPortColumnHeaders = true,
  onInputClick,
  onOutputClick,
  onInputPointerUp,
  onOutputPointerDown,
  onOutputPointerUp,
  getInputAriaLabel,
  getOutputAriaLabel,
  className,
  ...props
}: GraphNodePortsProps) {
  const portLayout = getGraphNodePortLayout(node);

  return (
    <div
      data-slot="workflow-node-ports"
      data-port-layout={portLayout}
      className={cn(
        "grid min-h-0 flex-1 gap-3 px-0 py-3 text-xs",
        portLayout === "duplex" ? "grid-cols-2" : "grid-cols-1",
        className,
      )}
      {...props}
    >
      {portLayout !== "output-only" ? (
        <GraphNodePortColumn
          title="Inputs"
          direction="input"
          node={node}
          ports={node.inputs ?? []}
          disabled={inputDisabled}
          showHeader={showPortColumnHeaders}
          onClick={onInputClick}
          onPointerUp={onInputPointerUp}
          getAriaLabel={getInputAriaLabel}
        />
      ) : null}
      {portLayout !== "input-only" ? (
        <GraphNodePortColumn
          title="Outputs"
          direction="output"
          node={node}
          ports={node.outputs ?? []}
          disabled={outputDisabled || readOnly}
          showHeader={showPortColumnHeaders}
          onClick={onOutputClick}
          onPointerDown={onOutputPointerDown}
          onPointerUp={onOutputPointerUp}
          getAriaLabel={getOutputAriaLabel}
        />
      ) : null}
    </div>
  );
}
