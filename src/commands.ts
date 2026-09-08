import type * as React from "react";
import {
  resolveEditorCommands,
  type EditorCommandContext,
  type EditorContextualCommandDefinition,
  type EditorResolvedCommandDefinition,
} from "@moritzbrantner/editor-core/commands";
import {
  formatEditorShortcutLabel,
  isEditorEditableTarget,
  matchesEditorHotkey,
  resolveEditorHotkeys,
  type EditorHotkeyMap,
} from "@moritzbrantner/editor-core/hotkeys";

import type { GraphEditorDocument, GraphEditorSelectionState, GraphEditorViewport } from "./core";

export type GraphEditorCommandId =
  | "undo"
  | "redo"
  | "copy"
  | "paste"
  | "duplicate"
  | "delete"
  | "select-all"
  | "fit-view"
  | "auto-layout"
  | "export-json"
  | "import-json"
  | "group-selection"
  | "ungroup-selection";

export type GraphEditorCommand = EditorResolvedCommandDefinition<GraphEditorCommandId>;

export type GraphEditorShortcutEvent = Pick<
  KeyboardEvent | React.KeyboardEvent,
  "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey" | "target"
>;

export type CreateGraphEditorCommandsOptions<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  context: EditorCommandContext<
    GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    GraphEditorSelectionState,
    GraphEditorViewport
  > & {
    canPaste?: boolean;
    canRedo?: boolean;
    canUndo?: boolean;
    selectedGroupCount?: number;
  };
  actions: Record<GraphEditorCommandId, () => void | Promise<void>>;
  labels?: Partial<Record<GraphEditorCommandId, React.ReactNode>>;
  disabled?: Partial<Record<GraphEditorCommandId, boolean>>;
  hotkeys?: Partial<EditorHotkeyMap<GraphEditorCommandId>>;
};

export const graphEditorCommandShortcuts: EditorHotkeyMap<GraphEditorCommandId> = {
  undo: ["Mod+Z"],
  redo: ["Mod+Shift+Z", "Mod+Y"],
  copy: ["Mod+C"],
  paste: ["Mod+V"],
  duplicate: ["Mod+D"],
  delete: ["Delete", "Backspace"],
  "select-all": ["Mod+A"],
  "fit-view": [],
  "auto-layout": [],
  "export-json": [],
  "import-json": [],
  "group-selection": [],
  "ungroup-selection": [],
};

export function createGraphEditorCommands<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  options: CreateGraphEditorCommandsOptions<TNodeData, TEdgeData, TPortType>,
): readonly GraphEditorCommand[] {
  const definitions = createGraphEditorCommandDefinitions(options);
  return resolveEditorCommands(definitions, options.context).map((command) => {
    command.disabled = command.disabled || options.disabled?.[command.id] === true;
    return command;
  });
}

export function getGraphEditorShortcutLabel(
  commandId: GraphEditorCommandId,
  hotkeys: Partial<EditorHotkeyMap<GraphEditorCommandId>> = {},
) {
  const resolvedHotkeys = resolveEditorHotkeys(graphEditorCommandShortcuts, hotkeys);
  return formatEditorShortcutLabel(resolvedHotkeys[commandId][0] ?? "");
}

export function getGraphEditorCommandFromKeyboardEvent(
  event: GraphEditorShortcutEvent,
  hotkeys: Partial<EditorHotkeyMap<GraphEditorCommandId>> = {},
): GraphEditorCommandId | null {
  if (isEditorEditableTarget(event.target)) {
    return null;
  }

  const keyboardEvent = {
    altKey: Boolean(event.altKey),
    ctrlKey: Boolean(event.ctrlKey),
    key: event.key,
    metaKey: Boolean(event.metaKey),
    shiftKey: Boolean(event.shiftKey),
    target: event.target,
  };
  const resolvedHotkeys = resolveEditorHotkeys(graphEditorCommandShortcuts, hotkeys);
  return (
    (Object.entries(resolvedHotkeys) as Array<[GraphEditorCommandId, readonly string[]]>).find(
      ([, commandHotkeys]) =>
        commandHotkeys.some((hotkey) => matchesEditorHotkey(keyboardEvent, hotkey)),
    )?.[0] ?? null
  );
}

export function isGraphEditorEditableTarget(target: EventTarget | null) {
  return isEditorEditableTarget(target);
}

function createGraphEditorCommandDefinitions<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  options: CreateGraphEditorCommandsOptions<TNodeData, TEdgeData, TPortType>,
): Array<
  EditorContextualCommandDefinition<
    GraphEditorCommandId,
    GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    GraphEditorSelectionState,
    GraphEditorViewport
  >
> {
  const selection = options.context.selection;
  const hasSelection =
    selection.nodeIds.length > 0 ||
    selection.edgeIds.length > 0 ||
    (selection.groupIds?.length ?? 0) > 0;
  const nodeSelectionCount = selection.nodeIds.length;
  const selectedGroupCount = options.context.selectedGroupCount ?? selection.groupIds?.length ?? 0;
  const canUndo = options.context.canUndo ?? false;
  const canRedo = options.context.canRedo ?? false;
  const canPaste = options.context.canPaste ?? false;
  const hotkeys = resolveEditorHotkeys(graphEditorCommandShortcuts, options.hotkeys);

  return [
    command("undo", options, hotkeys, { canRun: () => canUndo }),
    command("redo", options, hotkeys, { canRun: () => canRedo }),
    command("copy", options, hotkeys, { canRun: () => hasSelection }),
    command("paste", options, hotkeys, { canRun: () => canPaste }),
    command("duplicate", options, hotkeys, { canRun: () => nodeSelectionCount > 0 }),
    command("delete", options, hotkeys, {
      canRun: () => hasSelection,
      destructive: true,
    }),
    command("select-all", options, hotkeys, { canRun: () => true }),
    command("fit-view", options, hotkeys, { canRun: () => true }),
    command("auto-layout", options, hotkeys, { canRun: () => true }),
    command("export-json", options, hotkeys, { canRun: () => true }),
    command("import-json", options, hotkeys, { canRun: () => true }),
    command("group-selection", options, hotkeys, { canRun: () => nodeSelectionCount > 0 }),
    command("ungroup-selection", options, hotkeys, { canRun: () => selectedGroupCount > 0 }),
  ];
}

function command<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  id: GraphEditorCommandId,
  options: CreateGraphEditorCommandsOptions<TNodeData, TEdgeData, TPortType>,
  hotkeys: EditorHotkeyMap<GraphEditorCommandId>,
  config: {
    canRun: () => boolean;
    destructive?: boolean;
  },
): EditorContextualCommandDefinition<
  GraphEditorCommandId,
  GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  GraphEditorSelectionState,
  GraphEditorViewport
> {
  return {
    id,
    label:
      typeof options.labels?.[id] === "string" ? options.labels[id] : graphEditorCommandLabels[id],
    hotkeys: hotkeys[id],
    canRun: (context) =>
      options.disabled?.[id] !== true &&
      (isReadOnlyAllowedCommand(id) || context.readOnly !== true) &&
      config.canRun(),
    run: options.actions[id],
    ...(config.destructive ? { group: "destructive" } : {}),
  };
}

function isReadOnlyAllowedCommand(id: GraphEditorCommandId) {
  return id === "copy" || id === "export-json" || id === "fit-view" || id === "select-all";
}

const graphEditorCommandLabels: Record<GraphEditorCommandId, string> = {
  undo: "Undo",
  redo: "Redo",
  copy: "Copy",
  paste: "Paste",
  duplicate: "Duplicate",
  delete: "Delete",
  "select-all": "Select all",
  "fit-view": "Fit view",
  "auto-layout": "Auto layout",
  "export-json": "Export JSON",
  "import-json": "Import JSON",
  "group-selection": "Group selection",
  "ungroup-selection": "Ungroup selection",
};
