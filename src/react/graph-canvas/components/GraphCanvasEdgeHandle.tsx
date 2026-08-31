"use client";

import * as React from "react";

import { type GraphCanvasPoint } from "../index-core";

export function GraphCanvasEdgeHandle({
  label,
  point,
  onPointerDown,
}: {
  label: string;
  point: GraphCanvasPoint;
  onPointerDown: (event: React.PointerEvent<SVGGElement>) => void;
}) {
  return (
    <g
      data-slot="workflow-builder-edge-handle"
      role="button"
      tabIndex={0}
      aria-label={label}
      className="pointer-events-auto cursor-grab outline-none"
      transform={`translate(${point.x} ${point.y})`}
      onPointerDown={onPointerDown}
    >
      <circle r={12} className="fill-transparent" />
      <circle r={5} className="fill-background stroke-primary" strokeWidth={2} />
    </g>
  );
}
