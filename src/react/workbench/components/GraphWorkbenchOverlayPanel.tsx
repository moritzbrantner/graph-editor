"use client";

import type * as React from "react";

import { cn } from "@moritzbrantner/ui";

export function GraphWorkbenchOverlayPanel({ children, className }: React.ComponentProps<"div">) {
  return (
    <div className={cn("rounded-md border bg-white p-3 shadow-sm", className)}>{children}</div>
  );
}
