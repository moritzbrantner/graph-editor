"use client";

import * as React from "react";

import { cn } from "@moritzbrantner/ui";

import {
  getGraphNodeHeaderHeight,
  getGraphNodePackageLabel,
  getGraphNodePortLayout,
  getGraphNodeSize,
  getGraphNodeToneClasses,
  getGraphNodeToneDotClass,
  getGraphNodeToneFromStatus,
  graphNodeMinimizedHeaderHeight,
  graphNodeUsesCompactVariant,
  type GraphNodeProps,
} from "../index-core";
import { GraphNodeInline } from "./GraphNodeInline";
import { GraphNodeMenu } from "./GraphNodeMenu";
import { GraphNodeMinimizeButton } from "./GraphNodeMinimizeButton";
import { GraphNodeMinimizedPorts } from "./GraphNodeMinimizedPorts";
import { GraphNodePortColumn } from "./GraphNodePortColumn";

export function GraphNode({
  node,
  selected,
  readOnly = false,
  inputDisabled = false,
  outputDisabled = false,
  showPortColumnHeaders = true,
  menuItems = [],
  menuLabel = "Actions",
  onNodeSelect,
  onMinimizedChange,
  onMenuItemSelect,
  onInputClick,
  onOutputClick,
  onInputPointerUp,
  onOutputPointerDown,
  onOutputPointerUp,
  getInputAriaLabel,
  getOutputAriaLabel,
  className,
  style,
  ...props
}: GraphNodeProps) {
  const [uncontrolledMinimized, setUncontrolledMinimized] = React.useState(node.minimized ?? false);

  React.useEffect(() => {
    setUncontrolledMinimized(node.minimized ?? false);
  }, [node.id, node.minimized]);

  const minimized = node.minimized ?? uncontrolledMinimized;
  const resolvedNode = React.useMemo(
    () => (node.minimized === minimized ? node : { ...node, minimized }),
    [minimized, node],
  );
  const layoutOptions = React.useMemo(() => ({ showPortColumnHeaders }), [showPortColumnHeaders]);
  const compact = graphNodeUsesCompactVariant(resolvedNode);
  const size = getGraphNodeSize(resolvedNode, layoutOptions);
  const portLayout = getGraphNodePortLayout(resolvedNode);

  const changeMinimized = (nextMinimized: boolean) => {
    if (node.minimized === undefined) {
      setUncontrolledMinimized(nextMinimized);
    }
    onMinimizedChange?.(resolvedNode, nextMinimized);
  };

  if (compact) {
    return (
      <div
        data-slot="workflow-node"
        data-compact="true"
        data-selected={selected ? "true" : undefined}
        data-status={resolvedNode.status}
        className={cn(
          "relative overflow-visible rounded-lg border bg-white text-left shadow-sm transition-colors",
          selected ? "border-zinc-950 ring-2 ring-zinc-950/10" : "border-zinc-200",
          className,
        )}
        style={{ width: size.width, height: size.height, ...style }}
        {...props}
      >
        <GraphNodeInline
          node={resolvedNode}
          readOnly={readOnly}
          inputDisabled={inputDisabled}
          outputDisabled={outputDisabled}
          onNodeSelect={onNodeSelect}
          onInputClick={onInputClick}
          onOutputClick={onOutputClick}
          onInputPointerUp={onInputPointerUp}
          onOutputPointerDown={onOutputPointerDown}
          onOutputPointerUp={onOutputPointerUp}
          getInputAriaLabel={getInputAriaLabel}
          getOutputAriaLabel={getOutputAriaLabel}
        />
      </div>
    );
  }

  return (
    <div
      data-slot="workflow-node"
      data-minimized={minimized ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      data-status={resolvedNode.status}
      className={cn(
        "relative flex flex-col overflow-visible rounded-lg border bg-white text-left shadow-sm transition-colors",
        selected ? "border-zinc-950 ring-2 ring-zinc-950/10" : "border-zinc-200",
        className,
      )}
      style={{ width: size.width, height: size.height, ...style }}
      {...props}
    >
      <div
        data-slot="workflow-node-header"
        className={cn(
          "shrink-0 overflow-hidden rounded-t-lg px-3 py-2",
          !minimized && "border-b",
          getGraphNodeToneClasses(
            resolvedNode.tone ?? getGraphNodeToneFromStatus(resolvedNode.status),
          ),
        )}
        style={{
          minHeight: minimized
            ? graphNodeMinimizedHeaderHeight
            : getGraphNodeHeaderHeight(resolvedNode),
        }}
      >
        <div
          className={cn("flex justify-between gap-3", minimized ? "items-center" : "items-start")}
        >
          <button
            type="button"
            data-slot="workflow-node-select"
            aria-label={resolvedNode.label}
            className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            onClick={(event) => {
              event.stopPropagation();
              onNodeSelect?.(resolvedNode);
            }}
          >
            <div className="truncate text-sm font-semibold text-zinc-950">{resolvedNode.label}</div>
            {getGraphNodePackageLabel(resolvedNode) ? (
              <div className="mt-0.5 truncate text-[11px] font-medium text-zinc-600">
                {getGraphNodePackageLabel(resolvedNode)}
              </div>
            ) : null}
          </button>
          <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
            {(resolvedNode.eyebrow ?? resolvedNode.category ?? resolvedNode.kind) && !minimized ? (
              <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-600">
                {resolvedNode.eyebrow ?? resolvedNode.category ?? resolvedNode.kind}
              </span>
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "block h-2.5 w-2.5 rounded-full",
                getGraphNodeToneDotClass(
                  resolvedNode.tone ?? getGraphNodeToneFromStatus(resolvedNode.status),
                ),
              )}
            />
            <GraphNodeMinimizeButton
              node={resolvedNode}
              minimized={minimized}
              onMinimizedChange={changeMinimized}
            />
            <GraphNodeMenu
              node={resolvedNode}
              items={menuItems}
              label={menuLabel}
              onItemSelect={onMenuItemSelect}
            />
          </div>
        </div>
        {resolvedNode.description && !compact && !minimized ? (
          <p className="mt-2 line-clamp-4 text-xs leading-5 text-zinc-600">
            {resolvedNode.description}
          </p>
        ) : null}
      </div>
      {minimized ? (
        <GraphNodeMinimizedPorts
          node={resolvedNode}
          inputDisabled={inputDisabled}
          outputDisabled={outputDisabled || readOnly}
          onInputClick={onInputClick}
          onOutputClick={onOutputClick}
          onInputPointerUp={onInputPointerUp}
          onOutputPointerDown={onOutputPointerDown}
          onOutputPointerUp={onOutputPointerUp}
          getInputAriaLabel={getInputAriaLabel}
          getOutputAriaLabel={getOutputAriaLabel}
        />
      ) : (
        <div
          data-slot="workflow-node-ports"
          data-port-layout={portLayout}
          className={cn(
            "grid min-h-0 flex-1 gap-3 px-0 py-3 text-xs",
            portLayout === "duplex" ? "grid-cols-2" : "grid-cols-1",
          )}
        >
          {portLayout !== "output-only" ? (
            <GraphNodePortColumn
              title="Inputs"
              direction="input"
              node={resolvedNode}
              ports={resolvedNode.inputs ?? []}
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
              node={resolvedNode}
              ports={resolvedNode.outputs ?? []}
              disabled={outputDisabled || readOnly}
              showHeader={showPortColumnHeaders}
              onClick={onOutputClick}
              onPointerDown={onOutputPointerDown}
              onPointerUp={onOutputPointerUp}
              getAriaLabel={getOutputAriaLabel}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
