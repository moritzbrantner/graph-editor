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

import {
  Badge,
  EditorToolbar,
  EditorToolbarButton,
  EditorToolbarGroup,
  Separator,
  cn,
} from "@moritzbrantner/ui";

import type { GraphWorkbenchCommandId } from "../../workbench-commands";
import type { GraphWorkbenchController } from "../index-core";
import { GraphWorkbenchIconButton } from "./GraphWorkbenchIconButton";

/** Pane element ids supplied by `GraphWorkbench`, so pane toggles can name what they control. */
export const GraphWorkbenchPaneIdsContext = React.createContext<{
  palette: string;
  inspector: string;
  /** `overlay` while panes are drawers in a narrow container. */
  presentation: "docked" | "overlay";
} | null>(null);

export function GraphWorkbenchToolbar<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>({ controller }: { controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType> }) {
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const paneIds = React.useContext(GraphWorkbenchPaneIdsContext);
  const zoom = controller.document.viewport?.zoom ?? 1;
  const actionError = controller.status.actionError;
  const commandButton = (commandId: GraphWorkbenchCommandId, icon: React.ReactNode) => {
    const command = controller.commands.find((candidate) => candidate.id === commandId);
    return (
      <EditorToolbarButton
        label={String(command?.label ?? commandId)}
        icon={icon}
        shortcut={command?.shortcut}
        disabled={command?.disabled}
        onClick={() => void command?.run()}
      />
    );
  };

  return (
    <div data-slot="graph-workbench-toolbar" className="flex flex-wrap items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
        <WorkflowIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span>Graph</span>
        <Badge variant="secondary">{controller.document.nodes.length} nodes</Badge>
        {controller.diagnostics.length > 0 ? (
          <Badge variant="destructive">{controller.diagnostics.length} issues</Badge>
        ) : null}
        {actionError ? (
          <div
            role="alert"
            className="flex min-w-0 max-w-[18rem] items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive"
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
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          void controller.actions.importJson(file);
          event.currentTarget.value = "";
        }}
      />
      <EditorToolbar
        aria-label="Workbench commands"
        density="compact"
        // Narrow containers keep one scrollable command row so the canvas keeps its height.
        overflow={paneIds?.presentation === "overlay" ? "scroll" : "wrap"}
        className={cn(
          "min-w-0 border-0 bg-transparent p-0 shadow-none",
          paneIds?.presentation === "overlay" ? "w-full" : "w-auto",
        )}
      >
        <EditorToolbarGroup aria-label="File">
          <EditorToolbarButton
            label="Import JSON"
            icon={<FileUpIcon />}
            disabled={controller.readOnly}
            onClick={() => importInputRef.current?.click()}
          />
          <EditorToolbarButton
            label="Export JSON"
            icon={<DownloadIcon />}
            onClick={controller.actions.exportJson}
          />
        </EditorToolbarGroup>
        <Separator orientation="vertical" className="h-6" />
        <EditorToolbarGroup aria-label="Edit">
          {commandButton("undo", <Undo2Icon />)}
          {commandButton("redo", <Redo2Icon />)}
          {commandButton("copy", <CopyIcon />)}
          {commandButton("paste", <ClipboardPasteIcon />)}
          {commandButton("delete", <Trash2Icon />)}
          {commandButton("group-selection", <GroupIcon />)}
          {commandButton("ungroup-selection", <Rows3Icon />)}
        </EditorToolbarGroup>
        <Separator orientation="vertical" className="h-6" />
        <EditorToolbarGroup aria-label="View">
          {commandButton("auto-layout", <NetworkIcon />)}
          {commandButton("fit-view", <Maximize2Icon />)}
          <EditorToolbarButton
            label="Zoom out"
            icon={<MinusIcon />}
            disabled={zoom <= 0.5}
            onClick={() => controller.view.setZoom(zoom - 0.1)}
          />
          <span className="min-w-10 text-center text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
            {Math.round(zoom * 100)}%
          </span>
          <EditorToolbarButton
            label="Zoom in"
            icon={<PlusIcon />}
            disabled={zoom >= 1.75}
            onClick={() => controller.view.setZoom(zoom + 0.1)}
          />
        </EditorToolbarGroup>
        <Separator orientation="vertical" className="h-6" />
        <EditorToolbarGroup aria-label="Panels">
          <EditorToolbarButton
            label={controller.view.showPalette ? "Hide palette" : "Show palette"}
            icon={<PanelLeftIcon />}
            aria-controls={paneIds?.palette}
            aria-expanded={paneIds ? controller.view.showPalette : undefined}
            onClick={() => controller.view.setShowPalette(!controller.view.showPalette)}
          />
          <EditorToolbarButton
            label={controller.view.showInspector ? "Hide inspector" : "Show inspector"}
            icon={<PanelRightIcon />}
            aria-controls={paneIds?.inspector}
            aria-expanded={paneIds ? controller.view.showInspector : undefined}
            onClick={() => controller.view.setShowInspector(!controller.view.showInspector)}
          />
          <EditorToolbarButton
            label={controller.view.showMiniMap ? "Hide minimap" : "Show minimap"}
            icon={<MapIcon />}
            onClick={() => controller.view.setShowMiniMap(!controller.view.showMiniMap)}
          />
        </EditorToolbarGroup>
      </EditorToolbar>
    </div>
  );
}
