"use client";

import * as React from "react";

import { cn } from "@moritzbrantner/ui";

export type GraphNodeInteractiveBodyProps = React.ComponentProps<"div">;

export function GraphNodeInteractiveBody({
  className,
  onKeyDown,
  onMouseDown,
  onPointerDown,
  ...props
}: GraphNodeInteractiveBodyProps) {
  return (
    <div
      data-slot="workflow-node-interactive-body"
      className={cn("min-h-0", className)}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        event.stopPropagation();
      }}
      onMouseDown={(event) => {
        onMouseDown?.(event);
        event.stopPropagation();
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        event.stopPropagation();
      }}
      {...props}
    />
  );
}
