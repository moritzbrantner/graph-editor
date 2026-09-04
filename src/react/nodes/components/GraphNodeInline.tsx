"use client";

import * as React from "react";

import { cn } from "@moritzbrantner/ui";

import {
  getGraphNodeToneClasses,
  getGraphNodeToneFromStatus,
  graphNodeCompactPortSummary,
  graphNodeInlineTitle,
  type GraphNodeData,
  type GraphNodePort,
} from "../index-core";
import { GraphNodeInlinePort } from "./GraphNodeInlinePort";

export function GraphNodeInline({
  node,
  readOnly,
  inputDisabled,
  outputDisabled,
  onNodeSelect,
  onInputClick,
  onOutputClick,
  onInputPointerUp,
  onOutputPointerDown,
  onOutputPointerUp,
  getInputAriaLabel,
  getOutputAriaLabel,
}: {
  node: GraphNodeData;
  readOnly: boolean;
  inputDisabled: boolean;
  outputDisabled: boolean;
  onNodeSelect?: (node: GraphNodeData) => void;
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
  const input = node.inputs?.[0];
  const output = node.outputs?.[0];

  return (
    <div
      data-slot="workflow-node-inline"
      className={cn(
        "relative flex h-12 items-center gap-2 rounded-lg px-3",
        getGraphNodeToneClasses(node.tone ?? getGraphNodeToneFromStatus(node.status)),
      )}
      title={graphNodeInlineTitle(node)}
    >
      <GraphNodeInlinePort
        direction="input"
        node={node}
        port={input}
        disabled={inputDisabled}
        onClick={onInputClick}
        onPointerUp={onInputPointerUp}
        getAriaLabel={getInputAriaLabel}
      />
      <button
        type="button"
        data-slot="workflow-node-select"
        aria-label={node.label}
        className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-1"
        onClick={(event) => {
          event.stopPropagation();
          onNodeSelect?.(node);
        }}
      >
        <div className="truncate text-xs font-semibold text-zinc-950">{node.label}</div>
        <div className="truncate text-[10px] font-medium text-zinc-600">
          {graphNodeCompactPortSummary(node)}
        </div>
      </button>
      <GraphNodeInlinePort
        direction="output"
        node={node}
        port={output}
        disabled={outputDisabled || readOnly}
        onClick={onOutputClick}
        onPointerDown={onOutputPointerDown}
        onPointerUp={onOutputPointerUp}
        getAriaLabel={getOutputAriaLabel}
      />
    </div>
  );
}
