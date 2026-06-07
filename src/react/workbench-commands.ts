import type * as React from "react";

export {
  graphEditorCommandShortcuts as graphWorkbenchCommandShortcuts,
  getGraphEditorCommandFromKeyboardEvent as getGraphWorkbenchCommandFromKeyboardEvent,
  getGraphEditorShortcutLabel as getGraphWorkbenchShortcutLabel,
  isGraphEditorEditableTarget as isGraphWorkbenchEditableTarget,
  type GraphEditorCommandId as GraphWorkbenchCommandId,
  type GraphEditorShortcutEvent as GraphWorkbenchShortcutEvent,
} from "../commands";

export type GraphWorkbenchAction = {
  id: import("../commands").GraphEditorCommandId | string;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  disabled?: boolean;
  destructive?: boolean;
  run: () => void | Promise<void>;
};
