"use client";

import * as React from "react";

import {
  formatEditorShortcutLabel,
  isEditorEditableTarget,
  matchesEditorHotkey,
} from "@moritzbrantner/editor-core/hotkeys";
import { cn } from "@moritzbrantner/ui";

import {
  resolveGraphEditorHotkeys,
  type GraphEditorHotkeyId,
  type GraphEditorHotkeyOverrides,
} from "../../../hotkeys";
import type { GraphWorkbenchController, GraphWorkbenchProps } from "../index-core";
import {
  createGraphWorkbenchHotkeyCommands,
  emptySelection,
  useGraphWorkbenchController,
  useGraphWorkbenchHotkeys,
} from "../index-core";
import { GraphWorkbenchCanvas } from "./GraphWorkbenchCanvas";
import { GraphWorkbenchHotkeySettings } from "./GraphWorkbenchHotkeySettings";
import { GraphWorkbenchInspector } from "./GraphWorkbenchInspector";
import { GraphWorkbenchPalette } from "./GraphWorkbenchPalette";
import { GraphWorkbenchToolbar } from "./GraphWorkbenchToolbar";

export type GraphWorkbenchKeyboardProps = {
  hotkeys?: GraphEditorHotkeyOverrides;
  defaultHotkeys?: GraphEditorHotkeyOverrides;
  onHotkeysChange?: (hotkeys: GraphEditorHotkeyOverrides) => void;
};

export function GraphWorkbench<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  props: GraphWorkbenchProps<TNodeData, TEdgeData, TPortType> & GraphWorkbenchKeyboardProps,
) {
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
    hotkeys: controlledHotkeys,
    defaultHotkeys = {},
    onHotkeysChange,
  } = props;
  const controller = useGraphWorkbenchController(props);
  const [internalHotkeyOverrides, setInternalHotkeyOverrides] =
    React.useState<GraphEditorHotkeyOverrides>(() => ({ ...defaultHotkeys }));
  const hotkeyOverrides = controlledHotkeys ?? internalHotkeyOverrides;
  const resolvedHotkeys = React.useMemo(
    () => resolveGraphEditorHotkeys(hotkeyOverrides),
    [hotkeyOverrides],
  );
  const workbenchRef = React.useRef<HTMLDivElement>(null);

  const commitHotkeyOverrides = React.useCallback(
    (next: GraphEditorHotkeyOverrides) => {
      if (controlledHotkeys === undefined) {
        setInternalHotkeyOverrides(next);
      }
      onHotkeysChange?.(next);
    },
    [controlledHotkeys, onHotkeysChange],
  );
  const setHotkeyBindings = React.useCallback(
    (id: GraphEditorHotkeyId, bindings: readonly string[]) => {
      commitHotkeyOverrides({ ...hotkeyOverrides, [id]: [...bindings] });
    },
    [commitHotkeyOverrides, hotkeyOverrides],
  );
  const resetHotkey = React.useCallback(
    (id: GraphEditorHotkeyId) => {
      const next = { ...hotkeyOverrides };
      delete next[id];
      commitHotkeyOverrides(next);
    },
    [commitHotkeyOverrides, hotkeyOverrides],
  );
  const resetAllHotkeys = React.useCallback(() => {
    commitHotkeyOverrides({});
  }, [commitHotkeyOverrides]);

  const configuredController = React.useMemo<
    GraphWorkbenchController<TNodeData, TEdgeData, TPortType>
  >(
    () => ({
      ...controller,
      commands: controller.commands.map((command) => {
        const bindings = resolvedHotkeys[command.id as GraphEditorHotkeyId];
        return bindings
          ? {
              ...command,
              shortcut: formatEditorShortcutLabel(bindings[0] ?? ""),
            }
          : command;
      }),
    }),
    [controller, resolvedHotkeys],
  );
  const hotkeyCommands = React.useMemo(
    () =>
      createGraphWorkbenchHotkeyCommands(configuredController.commands).map((command) => ({
        ...command,
        hotkeys: resolvedHotkeys[command.id as GraphEditorHotkeyId] ?? command.hotkeys,
      })),
    [configuredController.commands, resolvedHotkeys],
  );

  useGraphWorkbenchHotkeys({
    allowEditableTargets: false,
    commands: hotkeyCommands,
    readOnly: configuredController.readOnly,
    scopeRef: workbenchRef,
  });

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.defaultPrevented || isEditorEditableTarget(event.target)) {
        return;
      }
      if (
        resolvedHotkeys["selection.clear"].some((hotkey) =>
          matchesEditorHotkey(event.nativeEvent, hotkey),
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
        configuredController.actions.setSelection(emptySelection);
      }
    },
    [configuredController.actions, resolvedHotkeys],
  );

  return (
    <div
      ref={workbenchRef}
      data-slot="graph-workbench"
      className={cn(
        "grid min-h-0 grid-cols-[16rem_minmax(0,1fr)_20rem] gap-3 outline-none max-xl:grid-cols-[14rem_minmax(0,1fr)] max-lg:grid-cols-1",
        !configuredController.view.showPalette &&
          "grid-cols-[minmax(0,1fr)_20rem] max-xl:grid-cols-[minmax(0,1fr)]",
        !configuredController.view.showInspector &&
          "grid-cols-[16rem_minmax(0,1fr)] max-xl:grid-cols-[14rem_minmax(0,1fr)]",
        !configuredController.view.showPalette &&
          !configuredController.view.showInspector &&
          "grid-cols-1",
        className,
      )}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {configuredController.view.showPalette ? (
        renderPalette ? (
          renderPalette(configuredController)
        ) : (
          <GraphWorkbenchPalette controller={configuredController} />
        )
      ) : null}
      <div className="min-h-0">
        {renderToolbar ? (
          renderToolbar(configuredController)
        ) : (
          <GraphWorkbenchToolbar controller={configuredController} />
        )}
        <GraphWorkbenchHotkeySettings
          hotkeys={resolvedHotkeys}
          overrides={hotkeyOverrides}
          onHotkeysChange={setHotkeyBindings}
          onResetHotkey={resetHotkey}
          onResetAll={resetAllHotkeys}
        />
        <GraphWorkbenchCanvas
          controller={configuredController}
          hotkeys={resolvedHotkeys}
          showMiniMap={configuredController.view.showMiniMap ?? showMiniMap}
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
      {configuredController.view.showInspector ? (
        renderInspector ? (
          renderInspector(configuredController)
        ) : (
          <GraphWorkbenchInspector
            controller={configuredController}
            inspectorSchema={inspectorSchema}
          />
        )
      ) : null}
    </div>
  );
}
