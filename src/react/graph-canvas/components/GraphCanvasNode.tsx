"use client";

import * as React from "react";

import { cn } from "@moritzbrantner/ui";

import { GraphNode, getGraphNodeSize } from "../../nodes";
import { type GraphCanvasNodeProps } from "../index-core";

export const GraphCanvasNode = React.memo(function GraphCanvasNode({
  node,
  selected,
  hidden,
  readOnly,
  pendingConnection,
  inputsConnectable,
  showPortColumnHeaders = true,
  onNodeSelect,
  onNodeMinimizedChange,
  onStartConnection,
  onCompleteConnection,
  onInputPointerUp,
  onOutputPointerDown,
  onOutputPointerUp,
  onNodePointerDown,
  className,
  ...props
}: GraphCanvasNodeProps) {
  const layoutOptions = React.useMemo(() => ({ showPortColumnHeaders }), [showPortColumnHeaders]);
  const nodeSize = getGraphNodeSize(node, layoutOptions);

  return (
    <div
      data-slot="workflow-builder-node"
      data-node-id={node.id}
      data-selected={selected ? "true" : undefined}
      data-hidden={hidden ? "true" : undefined}
      data-status={node.status}
      aria-hidden={hidden ? true : undefined}
      className={cn("absolute", className)}
      style={{
        left: node.x,
        pointerEvents: hidden ? "none" : undefined,
        top: node.y,
        visibility: hidden ? "hidden" : undefined,
        width: nodeSize.width,
      }}
      onPointerDown={(event) => onNodePointerDown?.(event, node)}
      onMouseDown={(event) => onNodePointerDown?.(event, node)}
      {...props}
    >
      <GraphNode
        node={node}
        selected={selected}
        readOnly={readOnly}
        inputDisabled={readOnly || !(pendingConnection || inputsConnectable)}
        outputDisabled={readOnly}
        showPortColumnHeaders={showPortColumnHeaders}
        onNodeSelect={() => onNodeSelect?.(node)}
        onMinimizedChange={(_, minimized) => onNodeMinimizedChange?.(node.id, minimized)}
        onInputClick={(port) => onCompleteConnection?.(node.id, port.id)}
        onOutputClick={(port) => onStartConnection?.(node.id, port.id)}
        onInputPointerUp={(port, _, event) => onInputPointerUp?.(event, node.id, port.id)}
        onOutputPointerDown={(port, _, event) => onOutputPointerDown?.(event, node.id, port.id)}
        onOutputPointerUp={(port, _, event) => onOutputPointerUp?.(event, node.id, port.id)}
        getInputAriaLabel={(port) => `Connect to ${node.label} ${port.label}`}
        getOutputAriaLabel={(port) => `Start ${node.label} ${port.label}`}
      />
    </div>
  );
});
