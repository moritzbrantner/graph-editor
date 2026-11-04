"use client";

import * as React from "react";

import {
  formatEditorShortcutLabel,
  isEditorEditableTarget,
  matchesEditorHotkey,
} from "@moenarch/editor-core/hotkeys";
import {
  EditorPane,
  EditorPaneContent,
  EditorPaneHeader,
  EditorPaneLayout,
  EditorPaneMain,
  cn,
  type EditorPanePresentation,
} from "@moritzbrantner/ui";

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
import { GraphWorkbenchPaneIdsContext, GraphWorkbenchToolbar } from "./GraphWorkbenchToolbar";

export type GraphWorkbenchKeyboardProps = {
  hotkeys?: GraphEditorHotkeyOverrides;
  defaultHotkeys?: GraphEditorHotkeyOverrides;
  onHotkeysChange?: (hotkeys: GraphEditorHotkeyOverrides) => void;
};

export function GraphWorkbench<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(props: GraphWorkbenchProps<TNodeData, TEdgeData, TPortType> & GraphWorkbenchKeyboardProps) {
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

  // Pane chrome is presentation state. Docked panes collapse with the controller's
  // `showPalette`/`showInspector`; narrow containers present them as drawers that start closed
  // and keep their own open state, exposed through the same `view` fields while active.
  const [presentation, setPresentation] = React.useState<EditorPanePresentation>("docked");
  const [paletteDrawerOpen, setPaletteDrawerOpen] = React.useState(false);
  const [inspectorDrawerOpen, setInspectorDrawerOpen] = React.useState(false);
  const overlay = presentation === "overlay";
  const paneIdPrefix = React.useId().replaceAll(":", "");
  const paneIds = React.useMemo(
    () => ({
      palette: `graph-workbench-${paneIdPrefix}-palette`,
      inspector: `graph-workbench-${paneIdPrefix}-inspector`,
      presentation,
    }),
    [paneIdPrefix, presentation],
  );
  const handlePresentationChange = React.useCallback((next: EditorPanePresentation) => {
    setPresentation(next);
    setPaletteDrawerOpen(false);
    setInspectorDrawerOpen(false);
  }, []);

  const configuredController = React.useMemo<
    GraphWorkbenchController<TNodeData, TEdgeData, TPortType>
  >(
    () => ({
      ...controller,
      view: overlay
        ? {
            ...controller.view,
            showPalette: paletteDrawerOpen,
            showInspector: inspectorDrawerOpen,
            setShowPalette: setPaletteDrawerOpen,
            setShowInspector: setInspectorDrawerOpen,
          }
        : controller.view,
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
    [controller, inspectorDrawerOpen, overlay, paletteDrawerOpen, resolvedHotkeys],
  );
  // A drawer covers the canvas, so adding a node from it closes it to reveal the result.
  const paletteController = React.useMemo<
    GraphWorkbenchController<TNodeData, TEdgeData, TPortType>
  >(
    () =>
      overlay
        ? {
            ...configuredController,
            actions: {
              ...configuredController.actions,
              addTemplateNode: (template, position) => {
                configuredController.actions.addTemplateNode(template, position);
                setPaletteDrawerOpen(false);
              },
            },
          }
        : configuredController,
    [configuredController, overlay],
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

  const view = configuredController.view;

  return (
    <div
      ref={workbenchRef}
      data-slot="graph-workbench"
      data-presentation={presentation}
      className={cn("flex min-h-[36rem] min-w-0 flex-col outline-none", className)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <GraphWorkbenchPaneIdsContext.Provider value={paneIds}>
        <EditorPaneLayout
          data-slot="graph-workbench-panes"
          className="min-h-0 flex-1 rounded-md border bg-background"
          onPresentationChange={handlePresentationChange}
        >
          <EditorPane
            id={paneIds.palette}
            side="start"
            label="Palette"
            defaultSize={256}
            minSize={192}
            maxSize={420}
            collapsed={!controller.view.showPalette}
            onCollapsedChange={(collapsed) => controller.view.setShowPalette(!collapsed)}
            overlayOpen={paletteDrawerOpen}
            onOverlayOpenChange={setPaletteDrawerOpen}
          >
            <EditorPaneHeader title="Nodes" />
            <EditorPaneContent>
              {renderPalette ? (
                renderPalette(paletteController)
              ) : (
                <GraphWorkbenchPalette controller={paletteController} />
              )}
            </EditorPaneContent>
          </EditorPane>
          <EditorPaneMain
            data-slot="graph-workbench-main"
            className="flex flex-col gap-2 overflow-hidden p-2"
          >
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
            <div className="min-h-0 flex-1">
              <GraphWorkbenchCanvas
                controller={configuredController}
                hotkeys={resolvedHotkeys}
                showMiniMap={view.showMiniMap ?? showMiniMap}
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
          </EditorPaneMain>
          <EditorPane
            id={paneIds.inspector}
            side="end"
            label="Inspector"
            defaultSize={320}
            minSize={240}
            maxSize={560}
            collapsed={!controller.view.showInspector}
            onCollapsedChange={(collapsed) => controller.view.setShowInspector(!collapsed)}
            overlayOpen={inspectorDrawerOpen}
            onOverlayOpenChange={setInspectorDrawerOpen}
          >
            <EditorPaneHeader title="Inspector" />
            <div className="flex min-h-0 flex-1 flex-col">
              {renderInspector ? (
                renderInspector(configuredController)
              ) : (
                <GraphWorkbenchInspector
                  controller={configuredController}
                  inspectorSchema={inspectorSchema}
                />
              )}
            </div>
          </EditorPane>
        </EditorPaneLayout>
      </GraphWorkbenchPaneIdsContext.Provider>
    </div>
  );
}
