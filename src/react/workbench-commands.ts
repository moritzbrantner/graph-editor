import type * as React from "react";
import {
  formatEditorShortcutLabel,
  getEditorCommandIdFromKeyboardEvent,
  isEditorEditableTarget,
  type EditorCommandDefinition,
} from "@moritzbrantner/editor-core/hotkeys";

export type GraphWorkbenchCommandId =
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

export type GraphWorkbenchAction = {
  id: GraphWorkbenchCommandId | string;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  disabled?: boolean;
  destructive?: boolean;
  run: () => void | Promise<void>;
};

export type GraphWorkbenchShortcutEvent = Pick<
  KeyboardEvent | React.KeyboardEvent,
  "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey" | "target"
>;

export const graphWorkbenchCommandShortcuts: Record<GraphWorkbenchCommandId, string[]> = {
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

export function getGraphWorkbenchShortcutLabel(commandId: GraphWorkbenchCommandId) {
  return formatEditorShortcutLabel(graphWorkbenchCommandShortcuts[commandId][0] ?? "");
}

export function getGraphWorkbenchCommandFromKeyboardEvent(
  event: GraphWorkbenchShortcutEvent,
): GraphWorkbenchCommandId | null {
  return getEditorCommandIdFromKeyboardEvent(event, graphWorkbenchCommandDefinitions);
}

export function isGraphWorkbenchEditableTarget(target: EventTarget | null) {
  return isEditorEditableTarget(target);
}

const graphWorkbenchCommandDefinitions: Array<EditorCommandDefinition<GraphWorkbenchCommandId>> =
  Object.entries(graphWorkbenchCommandShortcuts).map(([id, hotkeys]) => ({
    id: id as GraphWorkbenchCommandId,
    label: id,
    hotkeys,
  }));
