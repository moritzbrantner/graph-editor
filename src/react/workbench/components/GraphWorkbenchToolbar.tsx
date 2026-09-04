"use client";

import * as React from "react";
import {
  ClipboardPasteIcon,
  CopyIcon,
  DownloadIcon,
  FileUpIcon,
  GroupIcon,
  MapIcon,
  Maximize2Icon,
  MinusIcon,
  NetworkIcon,
  PanelLeftIcon,
  PanelRightIcon,
  PlusIcon,
  Redo2Icon,
  Rows3Icon,
  Trash2Icon,
  Undo2Icon,
  WorkflowIcon,
  XIcon,
} from "lucide-react";

import { Badge, Separator } from "@moritzbrantner/ui";

import type { GraphWorkbenchController } from "../index-core";
import { GraphWorkbenchCommandButton } from "./GraphWorkbenchCommandButton";
import { GraphWorkbenchIconButton } from "./GraphWorkbenchIconButton";

export function GraphWorkbenchToolbar<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>({ controller }: { controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType> }) {
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const zoom = controller.document.viewport?.zoom ?? 1;
  const actionError = controller.status.actionError;

  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
        <WorkflowIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        Graph
        <Badge variant="secondary">{controller.document.nodes.length} nodes</Badge>
        {controller.diagnostics.length > 0 ? (
          <Badge variant="destructive">{controller.diagnostics.length} issues</Badge>
        ) : null}
        {actionError ? (
          <div
            role="alert"
            className="flex max-w-[18rem] items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive"
          >
            <span className="truncate" title={actionError.detail}>
              {actionError.message}
            </span>
            <GraphWorkbenchIconButton
              label="Dismiss error"
              onClick={controller.status.clearActionError}
            >
              <XIcon />
            </GraphWorkbenchIconButton>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            void controller.actions.importJson(file);
            event.currentTarget.value = "";
          }}
        />
        <GraphWorkbenchIconButton
          label="Import JSON"
          disabled={controller.readOnly}
          onClick={() => importInputRef.current?.click()}
        >
          <FileUpIcon />
        </GraphWorkbenchIconButton>
        <GraphWorkbenchIconButton label="Export JSON" onClick={controller.actions.exportJson}>
          <DownloadIcon />
        </GraphWorkbenchIconButton>
        <Separator orientation="vertical" className="h-6" />
        <GraphWorkbenchCommandButton controller={controller} commandId="undo">
          <Undo2Icon />
        </GraphWorkbenchCommandButton>
        <GraphWorkbenchCommandButton controller={controller} commandId="redo">
          <Redo2Icon />
        </GraphWorkbenchCommandButton>
        <GraphWorkbenchCommandButton controller={controller} commandId="copy">
          <CopyIcon />
        </GraphWorkbenchCommandButton>
        <GraphWorkbenchCommandButton controller={controller} commandId="paste">
          <ClipboardPasteIcon />
        </GraphWorkbenchCommandButton>
        <GraphWorkbenchCommandButton controller={controller} commandId="delete">
          <Trash2Icon />
        </GraphWorkbenchCommandButton>
        <GraphWorkbenchCommandButton controller={controller} commandId="group-selection">
          <GroupIcon />
        </GraphWorkbenchCommandButton>
        <GraphWorkbenchCommandButton controller={controller} commandId="ungroup-selection">
          <Rows3Icon />
        </GraphWorkbenchCommandButton>
        <Separator orientation="vertical" className="h-6" />
        <GraphWorkbenchCommandButton controller={controller} commandId="auto-layout">
          <NetworkIcon />
        </GraphWorkbenchCommandButton>
        <GraphWorkbenchCommandButton controller={controller} commandId="fit-view">
          <Maximize2Icon />
        </GraphWorkbenchCommandButton>
        <GraphWorkbenchIconButton
          label="Zoom out"
          disabled={zoom <= 0.5}
          onClick={() => controller.view.setZoom(zoom - 0.1)}
        >
          <MinusIcon />
        </GraphWorkbenchIconButton>
        <span className="min-w-10 text-center text-xs text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <GraphWorkbenchIconButton
          label="Zoom in"
          disabled={zoom >= 1.75}
          onClick={() => controller.view.setZoom(zoom + 0.1)}
        >
          <PlusIcon />
        </GraphWorkbenchIconButton>
        <Separator orientation="vertical" className="h-6" />
        <GraphWorkbenchIconButton
          label={controller.view.showPalette ? "Hide palette" : "Show palette"}
          onClick={() => controller.view.setShowPalette(!controller.view.showPalette)}
        >
          <PanelLeftIcon />
        </GraphWorkbenchIconButton>
        <GraphWorkbenchIconButton
          label={controller.view.showInspector ? "Hide inspector" : "Show inspector"}
          onClick={() => controller.view.setShowInspector(!controller.view.showInspector)}
        >
          <PanelRightIcon />
        </GraphWorkbenchIconButton>
        <GraphWorkbenchIconButton
          label={controller.view.showMiniMap ? "Hide minimap" : "Show minimap"}
          onClick={() => controller.view.setShowMiniMap(!controller.view.showMiniMap)}
        >
          <MapIcon />
        </GraphWorkbenchIconButton>
      </div>
    </div>
  );
}
