import type * as React from "react";

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
  return graphWorkbenchCommandShortcuts[commandId][0];
}

export function getGraphWorkbenchCommandFromKeyboardEvent(
  event: GraphWorkbenchShortcutEvent,
): GraphWorkbenchCommandId | null {
  if (isGraphWorkbenchEditableTarget(event.target)) {
    return null;
  }

  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const mod = event.metaKey || event.ctrlKey;

  if (mod && !event.altKey && key === "z") {
    return event.shiftKey ? "redo" : "undo";
  }
  if (mod && !event.altKey && key === "y") {
    return "redo";
  }
  if (mod && !event.altKey && !event.shiftKey && key === "c") {
    return "copy";
  }
  if (mod && !event.altKey && !event.shiftKey && key === "v") {
    return "paste";
  }
  if (mod && !event.altKey && !event.shiftKey && key === "d") {
    return "duplicate";
  }
  if (mod && !event.altKey && !event.shiftKey && key === "a") {
    return "select-all";
  }
  if (!mod && !event.altKey && !event.shiftKey && (key === "Delete" || key === "Backspace")) {
    return "delete";
  }

  return null;
}

export function isGraphWorkbenchEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();

  return (
    tagName === "input" ||
    tagName === "select" ||
    tagName === "textarea" ||
    target.isContentEditable ||
    Boolean(target.closest("[contenteditable='true']"))
  );
}
