"use client";

import { Maximize2Icon, Minimize2Icon } from "lucide-react";

import { graphNodeControlButtonClassName, type GraphNodeData } from "../index-core";

export function GraphNodeMinimizeButton({
  node,
  minimized,
  onMinimizedChange,
}: {
  node: GraphNodeData;
  minimized: boolean;
  onMinimizedChange: (minimized: boolean) => void;
}) {
  return (
    <button
      type="button"
      data-slot="workflow-node-minimize"
      aria-label={minimized ? `Expand ${node.label}` : `Minimize ${node.label}`}
      aria-pressed={minimized}
      className={graphNodeControlButtonClassName}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onMinimizedChange(!minimized);
      }}
    >
      {minimized ? (
        <Maximize2Icon className="size-3.5" aria-hidden="true" />
      ) : (
        <Minimize2Icon className="size-3.5" aria-hidden="true" />
      )}
    </button>
  );
}
