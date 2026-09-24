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
        if (!event.defaultPrevented) {
          event.stopPropagation();
        }
      }}
      onMouseDown={(event) => {
        onMouseDown?.(event);
        if (!event.defaultPrevented) {
          event.stopPropagation();
        }
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented) {
          event.stopPropagation();
        }
      }}
      {...props}
    />
  );
}
