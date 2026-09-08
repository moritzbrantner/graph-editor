"use client";

import * as React from "react";

import {
  getEditorHotkeyFromKeyboardEvent,
  isEditorHotkeyValid,
} from "@moritzbrantner/editor-core/hotkeys";

import {
  getGraphEditorHotkeyConflicts,
  graphEditorHotkeyDefinitions,
  type GraphEditorHotkeyId,
  type GraphEditorHotkeyMap,
  type GraphEditorHotkeyOverrides,
} from "../../../hotkeys";

const hotkeyGroups = ["Commands", "Navigation", "Movement"] as const;
const modifierKeys = new Set(["Alt", "Control", "Meta", "Shift"]);
const hotkeyLabels = new Map(
  graphEditorHotkeyDefinitions.map((definition) => [definition.id, definition.label] as const),
);

export function GraphWorkbenchHotkeySettings({
  hotkeys,
  overrides,
  onHotkeysChange,
  onResetHotkey,
  onResetAll,
}: {
  hotkeys: GraphEditorHotkeyMap;
  overrides: GraphEditorHotkeyOverrides;
  onHotkeysChange: (id: GraphEditorHotkeyId, hotkeys: readonly string[]) => void;
  onResetHotkey: (id: GraphEditorHotkeyId) => void;
  onResetAll: () => void;
}) {
  return (
    <details className="mb-2 rounded-md border bg-background">
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium">
        Keyboard shortcuts
      </summary>
      <div
        className="max-h-[28rem] overflow-auto border-t p-3"
        onKeyDown={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Focus a shortcut field and press the keys you want to add. Remove every binding to
            disable an action.
          </p>
          <button
            type="button"
            className="shrink-0 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
            onClick={onResetAll}
          >
            Reset all
          </button>
        </div>
        <div className="space-y-4">
          {hotkeyGroups.map((group) => (
            <section key={group} aria-labelledby={`graph-hotkeys-${group.toLowerCase()}`}>
              <h3
                id={`graph-hotkeys-${group.toLowerCase()}`}
                className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {group}
              </h3>
              <div className="divide-y rounded-md border">
                {graphEditorHotkeyDefinitions
                  .filter((definition) => definition.group === group)
                  .map((definition) => (
                    <GraphWorkbenchHotkeyRow
                      key={definition.id}
                      id={definition.id}
                      label={definition.label}
                      hotkeys={hotkeys}
                      overridden={Object.prototype.hasOwnProperty.call(overrides, definition.id)}
                      onHotkeysChange={onHotkeysChange}
                      onResetHotkey={onResetHotkey}
                    />
                  ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </details>
  );
}

function GraphWorkbenchHotkeyRow({
  id,
  label,
  hotkeys,
  overridden,
  onHotkeysChange,
  onResetHotkey,
}: {
  id: GraphEditorHotkeyId;
  label: string;
  hotkeys: GraphEditorHotkeyMap;
  overridden: boolean;
  onHotkeysChange: (id: GraphEditorHotkeyId, hotkeys: readonly string[]) => void;
  onResetHotkey: (id: GraphEditorHotkeyId) => void;
}) {
  const bindings = hotkeys[id];
  const conflicts = Array.from(
    new Set(bindings.flatMap((binding) => getGraphEditorHotkeyConflicts(id, binding, hotkeys))),
  );

  return (
    <div className="grid gap-2 p-2 md:grid-cols-[minmax(10rem,1fr)_minmax(12rem,2fr)_auto] md:items-start">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <code className="text-[0.7rem] text-muted-foreground">{id}</code>
      </div>
      <div>
        <div className="mb-1 flex min-h-7 flex-wrap items-center gap-1">
          {bindings.length === 0 ? (
            <span className="text-xs text-muted-foreground">Unbound</span>
          ) : (
            bindings.map((binding) => (
              <span
                key={binding}
                className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5"
              >
                <kbd className="text-xs">{binding}</kbd>
                <button
                  type="button"
                  className="rounded px-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Remove ${binding} from ${label}`}
                  onClick={() =>
                    onHotkeysChange(
                      id,
                      bindings.filter((candidate) => candidate !== binding),
                    )
                  }
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
        <input
          readOnly
          aria-label={`Add shortcut for ${label}`}
          className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Press shortcut to add"
          onKeyDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (modifierKeys.has(event.key)) {
              return;
            }

            const hotkey = getEditorHotkeyFromKeyboardEvent(event.nativeEvent);
            if (!isEditorHotkeyValid(hotkey) || bindings.includes(hotkey)) {
              return;
            }
            onHotkeysChange(id, [...bindings, hotkey]);
          }}
        />
        {conflicts.length > 0 ? (
          <p role="alert" className="mt-1 text-xs text-destructive">
            Conflicts with{" "}
            {conflicts.map((conflict) => hotkeyLabels.get(conflict) ?? conflict).join(", ")}.
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
        disabled={!overridden}
        onClick={() => onResetHotkey(id)}
      >
        Reset
      </button>
    </div>
  );
}
