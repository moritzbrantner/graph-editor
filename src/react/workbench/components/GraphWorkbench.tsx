"use client";

import * as React from "react";

import { cn } from "@moritzbrantner/ui";

import type { GraphWorkbenchProps } from "../index-core";
import {
  createGraphWorkbenchHotkeyCommands,
  emptySelection,
  useGraphWorkbenchController,
  useGraphWorkbenchHotkeys,
} from "../index-core";
import { GraphWorkbenchCanvas } from "./GraphWorkbenchCanvas";
import { GraphWorkbenchInspector } from "./GraphWorkbenchInspector";
import { GraphWorkbenchPalette } from "./GraphWorkbenchPalette";
import { GraphWorkbenchToolbar } from "./GraphWorkbenchToolbar";

export function GraphWorkbench<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(props: GraphWorkbenchProps<TNodeData, TEdgeData, TPortType>) {
  const {
    className,
    showMiniMap = true,
    inspectorSchema,
    onViewportChange,
    connectionValidationOptions,
    createEdge,
    connectDocument,
    renderToolbar,
    renderPalette,
    renderInspector,
    renderContextPad,
    renderCanvasOverlay,
    onCanvasContextMenuCapture,
    onCanvasDoubleClickCapture,
  } = props;
  const controller = useGraphWorkbenchController(props);
  const workbenchRef = React.useRef<HTMLDivElement>(null);
  const hotkeyCommands = React.useMemo(
    () => createGraphWorkbenchHotkeyCommands(controller.commands),
    [controller.commands],
  );

  useGraphWorkbenchHotkeys({
    allowEditableTargets: false,
    commands: hotkeyCommands,
    readOnly: controller.readOnly,
    scopeRef: workbenchRef,
  });

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        controller.actions.setSelection(emptySelection);
      }
    },
    [controller.actions],
  );

  return (
    <div
      ref={workbenchRef}
      data-slot="graph-workbench"
      className={cn(
        "grid min-h-0 grid-cols-[16rem_minmax(0,1fr)_20rem] gap-3 outline-none max-xl:grid-cols-[14rem_minmax(0,1fr)] max-lg:grid-cols-1",
        !controller.view.showPalette &&
          "grid-cols-[minmax(0,1fr)_20rem] max-xl:grid-cols-[minmax(0,1fr)]",
        !controller.view.showInspector &&
          "grid-cols-[16rem_minmax(0,1fr)] max-xl:grid-cols-[14rem_minmax(0,1fr)]",
        !controller.view.showPalette && !controller.view.showInspector && "grid-cols-1",
        className,
      )}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {controller.view.showPalette ? (
        renderPalette ? (
          renderPalette(controller)
        ) : (
          <GraphWorkbenchPalette controller={controller} />
        )
      ) : null}
      <div className="min-h-0">
        {renderToolbar ? (
          renderToolbar(controller)
        ) : (
          <GraphWorkbenchToolbar controller={controller} />
        )}
        <GraphWorkbenchCanvas
          controller={controller}
          showMiniMap={controller.view.showMiniMap ?? showMiniMap}
          onViewportChange={onViewportChange}
          connectionValidationOptions={connectionValidationOptions}
          createEdge={createEdge}
          connectDocument={connectDocument}
          renderContextPad={renderContextPad}
          renderCanvasOverlay={renderCanvasOverlay}
          onCanvasContextMenuCapture={onCanvasContextMenuCapture}
          onCanvasDoubleClickCapture={onCanvasDoubleClickCapture}
        />
      </div>
      {controller.view.showInspector ? (
        renderInspector ? (
          renderInspector(controller)
        ) : (
          <GraphWorkbenchInspector controller={controller} inspectorSchema={inspectorSchema} />
        )
      ) : null}
    </div>
  );
}
