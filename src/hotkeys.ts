import {
  getEditorHotkeyConflicts as getEditorCoreHotkeyConflicts,
  resolveEditorHotkeys,
  type EditorHotkeyMap,
} from "@moritzbrantner/editor-core/hotkeys";

import { graphEditorCommandShortcuts, type GraphEditorCommandId } from "./commands";

export type GraphEditorCanvasHotkeyId =
  | "selection.clear"
  | "navigate.up"
  | "navigate.right"
  | "navigate.down"
  | "navigate.left"
  | "move.up"
  | "move.right"
  | "move.down"
  | "move.left"
  | "move-fine.up"
  | "move-fine.right"
  | "move-fine.down"
  | "move-fine.left";

export type GraphEditorHotkeyId = GraphEditorCommandId | GraphEditorCanvasHotkeyId;
export type GraphEditorHotkeyMap = EditorHotkeyMap<GraphEditorHotkeyId>;
export type GraphEditorHotkeyOverrides = Partial<GraphEditorHotkeyMap>;

export type GraphEditorHotkeyDefinition = {
  id: GraphEditorHotkeyId;
  label: string;
  group: "Commands" | "Navigation" | "Movement";
};

export const graphEditorDefaultHotkeys: GraphEditorHotkeyMap = {
  ...graphEditorCommandShortcuts,
  "selection.clear": ["Escape"],
  "navigate.up": ["ArrowUp"],
  "navigate.right": ["ArrowRight"],
  "navigate.down": ["ArrowDown"],
  "navigate.left": ["ArrowLeft"],
  "move.up": ["Shift+ArrowUp"],
  "move.right": ["Shift+ArrowRight"],
  "move.down": ["Shift+ArrowDown"],
  "move.left": ["Shift+ArrowLeft"],
  "move-fine.up": ["Alt+Shift+ArrowUp"],
  "move-fine.right": ["Alt+Shift+ArrowRight"],
  "move-fine.down": ["Alt+Shift+ArrowDown"],
  "move-fine.left": ["Alt+Shift+ArrowLeft"],
};

export const graphEditorHotkeyDefinitions: readonly GraphEditorHotkeyDefinition[] = [
  { id: "undo", label: "Undo", group: "Commands" },
  { id: "redo", label: "Redo", group: "Commands" },
  { id: "copy", label: "Copy", group: "Commands" },
  { id: "paste", label: "Paste", group: "Commands" },
  { id: "duplicate", label: "Duplicate", group: "Commands" },
  { id: "delete", label: "Delete selection", group: "Commands" },
  { id: "select-all", label: "Select all", group: "Commands" },
  { id: "fit-view", label: "Fit view", group: "Commands" },
  { id: "auto-layout", label: "Auto layout", group: "Commands" },
  { id: "export-json", label: "Export JSON", group: "Commands" },
  { id: "import-json", label: "Import JSON", group: "Commands" },
  { id: "group-selection", label: "Group selection", group: "Commands" },
  { id: "ungroup-selection", label: "Ungroup selection", group: "Commands" },
  { id: "selection.clear", label: "Clear selection / cancel", group: "Navigation" },
  { id: "navigate.up", label: "Navigate up", group: "Navigation" },
  { id: "navigate.right", label: "Navigate right", group: "Navigation" },
  { id: "navigate.down", label: "Navigate down", group: "Navigation" },
  { id: "navigate.left", label: "Navigate left", group: "Navigation" },
  { id: "move.up", label: "Move selection up", group: "Movement" },
  { id: "move.right", label: "Move selection right", group: "Movement" },
  { id: "move.down", label: "Move selection down", group: "Movement" },
  { id: "move.left", label: "Move selection left", group: "Movement" },
  { id: "move-fine.up", label: "Move selection up finely", group: "Movement" },
  { id: "move-fine.right", label: "Move selection right finely", group: "Movement" },
  { id: "move-fine.down", label: "Move selection down finely", group: "Movement" },
  { id: "move-fine.left", label: "Move selection left finely", group: "Movement" },
];

export function resolveGraphEditorHotkeys(
  overrides: GraphEditorHotkeyOverrides = {},
): GraphEditorHotkeyMap {
  return resolveEditorHotkeys(graphEditorDefaultHotkeys, overrides);
}

export function getGraphEditorHotkeyConflicts(
  id: GraphEditorHotkeyId,
  hotkey: string,
  hotkeys: GraphEditorHotkeyMap = graphEditorDefaultHotkeys,
): GraphEditorHotkeyId[] {
  return getEditorCoreHotkeyConflicts(id, hotkey, hotkeys);
}
