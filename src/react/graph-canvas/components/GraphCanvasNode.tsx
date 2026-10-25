"use client";

import * as React from "react";

import { cn } from "@moritzbrantner/ui";

import { GraphNode, getGraphNodeBodyHeight, getGraphNodeSize } from "../../nodes";
import { type GraphCanvasNodeProps, type GraphCanvasPort } from "../index-core";

export const GraphCanvasNode = React.memo(function GraphCanvasNode({
  node,
  selected,
  hidden,
  layer,
  readOnly,
  pendingConnection,
  inputsConnectable,
  showPortColumnHeaders = true,
  showNodeCategory = true,
  getNodeWidth,
  minimizedNodeLayout = "stacked",
  renderNodeBody,
  getNodeBodyHeight,
  renderMinimizedNodeContent,
  renderPortContent,
  getNodeMenuItems,
  nodeMenuLabel,
  renderNodeTitle,
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
  const nodeBodyHeight =
    renderNodeBody && getNodeBodyHeight
      ? (getNodeBodyHeight as (node: unknown) => number)
      : undefined;
  const nodeWidth = getNodeWidth as ((node: unknown) => number | undefined) | undefined;
  const layoutOptions = React.useMemo(
    () => ({
      showPortColumnHeaders,
      minimizedLayout: minimizedNodeLayout,
      ...(nodeBodyHeight ? { nodeBodyHeight } : {}),
      ...(nodeWidth ? { nodeWidth } : {}),
    }),
    [minimizedNodeLayout, nodeBodyHeight, nodeWidth, showPortColumnHeaders],
  );
  const nodeSize = getGraphNodeSize(node, layoutOptions);
  const bodyHeight = getGraphNodeBodyHeight(node, layoutOptions);

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
        zIndex: layer,
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
        showCategory={showNodeCategory}
        nodeBodyHeight={nodeBodyHeight}
        nodeWidth={nodeWidth}
        minimizedLayout={minimizedNodeLayout}
        body={
          renderNodeBody && bodyHeight > 0
            ? renderNodeBody({
                node,
                selected: !!selected,
                readOnly: !!readOnly,
                height: bodyHeight,
              })
            : undefined
        }
        minimizedContent={
          renderMinimizedNodeContent && node.minimized
            ? renderMinimizedNodeContent({
                node,
                selected: !!selected,
                readOnly: !!readOnly,
                height: 0,
              })
            : undefined
        }
        menuItems={getNodeMenuItems?.(node)}
        {...(nodeMenuLabel === undefined ? {} : { menuLabel: nodeMenuLabel })}
        titleContent={renderNodeTitle?.({
          node,
          selected: !!selected,
          readOnly: !!readOnly,
          height: 0,
        })}
        renderPortContent={
          renderPortContent
            ? (port, direction) =>
                renderPortContent({
                  node,
                  selected: !!selected,
                  readOnly: !!readOnly,
                  height: 0,
                  port: port as GraphCanvasPort,
                  direction,
                })
            : undefined
        }
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
