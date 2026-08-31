"use client";

import { Maximize2Icon, MinusIcon, PlusIcon, Trash2Icon, WorkflowIcon } from "lucide-react";

import { Badge, Button, Separator, cn } from "@moritzbrantner/ui";

import { type GraphCanvasToolbarProps } from "../index-core";

export function GraphCanvasToolbar({
  zoom,
  minZoom = 0.5,
  maxZoom = 1.75,
  readOnly,
  selectedLabel,
  toolbarLabel = "Workflow",
  onZoomChange,
  onFitView,
  onDeleteSelection,
  className,
  ...props
}: GraphCanvasToolbarProps) {
  return (
    <div
      data-slot="workflow-builder-toolbar"
      role="toolbar"
      aria-label="Workflow builder controls"
      className={cn("flex flex-wrap items-center justify-between gap-2", className)}
      {...props}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <WorkflowIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        {toolbarLabel}
        {selectedLabel ? <Badge variant="secondary">{selectedLabel}</Badge> : null}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Zoom out"
          disabled={zoom <= minZoom}
          onClick={() => onZoomChange?.(zoom - 0.1)}
        >
          <MinusIcon />
        </Button>
        <span className="min-w-12 text-center text-xs text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Zoom in"
          disabled={zoom >= maxZoom}
          onClick={() => onZoomChange?.(zoom + 0.1)}
        >
          <PlusIcon />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Fit view"
          onClick={onFitView}
        >
          <Maximize2Icon />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Delete selected"
          disabled={readOnly || !selectedLabel}
          onClick={onDeleteSelection}
        >
          <Trash2Icon />
        </Button>
      </div>
    </div>
  );
}
