"use client";

import * as React from "react";

import { cn } from "@moritzbrantner/ui";

import {
  getGraphNodeHeaderHeight,
  getGraphNodePackageLabel,
  getGraphNodeToneClasses,
  getGraphNodeToneDotClass,
  getGraphNodeToneFromStatus,
  graphNodeMinimizedHeaderHeight,
  type GraphNodeData,
  type GraphNodeMenuItem,
} from "../index-core";
import { GraphNodeMenu } from "./GraphNodeMenu";
import { GraphNodeMinimizeButton } from "./GraphNodeMinimizeButton";

export type GraphNodeHeaderProps = React.ComponentProps<"div"> & {
  node: GraphNodeData;
  minimized: boolean;
  menuItems?: GraphNodeMenuItem[];
  menuLabel?: React.ReactNode;
  onNodeSelect?: (node: GraphNodeData) => void;
  onMinimizedChange: (minimized: boolean) => void;
  onMenuItemSelect?: (item: GraphNodeMenuItem, node: GraphNodeData) => void;
};

export function GraphNodeHeader({
  node,
  minimized,
  menuItems = [],
  menuLabel = "Actions",
  onNodeSelect,
  onMinimizedChange,
  onMenuItemSelect,
  className,
  ...props
}: GraphNodeHeaderProps) {
  return (
    <div
      data-slot="workflow-node-header"
      className={cn(
        "shrink-0 overflow-hidden rounded-t-lg px-3 py-2",
        !minimized && "border-b",
        getGraphNodeToneClasses(node.tone ?? getGraphNodeToneFromStatus(node.status)),
        className,
      )}
      style={{
        minHeight: minimized ? graphNodeMinimizedHeaderHeight : getGraphNodeHeaderHeight(node),
        ...props.style,
      }}
      {...props}
    >
      <div className={cn("flex justify-between gap-3", minimized ? "items-center" : "items-start")}>
        <button
          type="button"
          data-slot="workflow-node-select"
          aria-label={node.label}
          className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          onClick={(event) => {
            event.stopPropagation();
            onNodeSelect?.(node);
          }}
        >
          <div className="truncate text-sm font-semibold text-zinc-950">{node.label}</div>
          {getGraphNodePackageLabel(node) ? (
            <div className="mt-0.5 truncate text-[11px] font-medium text-zinc-600">
              {getGraphNodePackageLabel(node)}
            </div>
          ) : null}
        </button>
        <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
          {(node.eyebrow ?? node.category ?? node.kind) && !minimized ? (
            <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-600">
              {node.eyebrow ?? node.category ?? node.kind}
            </span>
          ) : null}
          <span
            aria-hidden="true"
            className={cn(
              "block h-2.5 w-2.5 rounded-full",
              getGraphNodeToneDotClass(node.tone ?? getGraphNodeToneFromStatus(node.status)),
            )}
          />
          <GraphNodeMinimizeButton
            node={node}
            minimized={minimized}
            onMinimizedChange={onMinimizedChange}
          />
          <GraphNodeMenu
            node={node}
            items={menuItems}
            label={menuLabel}
            onItemSelect={onMenuItemSelect}
          />
        </div>
      </div>
      {node.description && !minimized ? (
        <p className="mt-2 line-clamp-4 text-xs leading-5 text-zinc-600">{node.description}</p>
      ) : null}
    </div>
  );
}
