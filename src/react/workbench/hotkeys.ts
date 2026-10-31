"use client";

import * as React from "react";

import {
  isEditorEditableTarget,
  matchesEditorHotkey,
  type EditorCommandDefinition,
} from "@moenarch/editor-core/hotkeys";

type UseGraphWorkbenchHotkeysOptions<TId extends string> = {
  commands: readonly EditorCommandDefinition<TId>[];
  disabled?: boolean;
  readOnly?: boolean;
  allowEditableTargets?: boolean;
  scopeRef?: React.RefObject<HTMLElement | null>;
};

export function useGraphWorkbenchHotkeys<TId extends string>({
  commands,
  disabled = false,
  readOnly = false,
  allowEditableTargets = false,
  scopeRef,
}: UseGraphWorkbenchHotkeysOptions<TId>) {
  React.useEffect(() => {
    if (disabled || typeof document === "undefined") {
      return;
    }

    const scope = scopeRef?.current ?? null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (scope && !isGraphWorkbenchHotkeyInScope(scope, event)) {
        return;
      }

      if (!allowEditableTargets && isEditorEditableTarget(event.target)) {
        return;
      }

      const commandId =
        commands.find(
          (command) =>
            !command.disabled &&
            command.hotkeys?.some((hotkey) => matchesEditorHotkey(event, hotkey)),
        )?.id ?? null;
      const command = commands.find((candidate) => candidate.id === commandId);
      if (!command?.run) {
        return;
      }

      event.preventDefault();
      void command.run(event);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [allowEditableTargets, commands, disabled, readOnly, scopeRef]);
}

function isGraphWorkbenchHotkeyInScope(scope: HTMLElement, event: KeyboardEvent) {
  const target = event.target;
  if (target instanceof Node && scope.contains(target)) {
    return true;
  }

  const activeElement = document.activeElement;
  return activeElement === document.body || Boolean(activeElement && scope.contains(activeElement));
}
