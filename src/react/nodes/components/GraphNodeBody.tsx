"use client";

import * as React from "react";

import { cn } from "@moritzbrantner/ui";

export type GraphNodeBodyProps = React.ComponentProps<"div"> & {
  /** Height reserved by the node geometry model; the body never grows past it. */
  height: number;
};

/**
 * Composition slot for domain content between a node's header and its ports. Pointer
 * interaction inside it never starts a node drag, and graph shortcuts ignore editable targets,
 * so form controls behave normally.
 */
export function GraphNodeBody({
  height,
  className,
  style,
  children,
  ...props
}: GraphNodeBodyProps) {
  return (
    <div
      data-slot="graph-node-body"
      className={cn("shrink-0 overflow-hidden border-b px-3 py-2 text-xs", className)}
      style={{ height, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
