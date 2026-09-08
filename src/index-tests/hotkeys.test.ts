// oxlint-disable no-unused-vars
import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  GraphWorkbench,
  getGraphEditorCommandFromKeyboardEvent,
  getGraphEditorHotkeyConflicts,
  resolveGraphEditorHotkeys,
  type GraphEditorDocument,
  type GraphEditorHotkeyOverrides,
  type GraphEditorSelectionState,
} from "@moritzbrantner/graph-editor";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("configurable graph editor hotkeys", () => {
  test("resolves overrides without changing unrelated defaults and reports conflicts", () => {
    const hotkeys = resolveGraphEditorHotkeys({
      "navigate.left": ["h"],
      "navigate.right": ["l"],
    });

    expect(hotkeys["navigate.left"]).toEqual(["h"]);
    expect(hotkeys["navigate.right"]).toEqual(["l"]);
    expect(hotkeys.undo).toEqual(["Mod+Z"]);

    const conflicting = resolveGraphEditorHotkeys({
      "navigate.left": ["l"],
      "navigate.right": ["l"],
    });
    expect(getGraphEditorHotkeyConflicts("navigate.left", "l", conflicting)).toContain(
      "navigate.right",
    );
  });

  test("allows headless command shortcuts to be overridden", () => {
    const target = document.body;

    expect(
      getGraphEditorCommandFromKeyboardEvent(
        {
          key: "u",
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          altKey: false,
          target,
        },
        { undo: ["u"] },
      ),
    ).toBe("undo");
    expect(
      getGraphEditorCommandFromKeyboardEvent(
        {
          key: "z",
          ctrlKey: true,
          metaKey: false,
          shiftKey: false,
          altKey: false,
          target,
        },
        { undo: ["u"] },
      ),
    ).toBeNull();
  });

  test("uses configured navigation, movement, clear, and delete bindings in the workbench", async () => {
    const selections: GraphEditorSelectionState[] = [];
    let latestDocument: GraphEditorDocument<unknown, unknown, unknown> = {
      nodes: [
        { id: "source", label: "Source", x: 0, y: 0 },
        { id: "target", label: "Target", x: 260, y: 0 },
      ],
      edges: [],
    };
    const hotkeys: GraphEditorHotkeyOverrides = {
      "navigate.right": ["l"],
      "move.right": ["Shift+L"],
      "selection.clear": ["q"],
      delete: ["x"],
    };

    const fixture = render(
      React.createElement(GraphWorkbench, {
        document: latestDocument,
        defaultHotkeys: hotkeys,
        showMiniMap: false,
        onDocumentChange(document: GraphEditorDocument<unknown, unknown, unknown>) {
          latestDocument = document;
        },
        onSelectionStateChange(selection: GraphEditorSelectionState) {
          selections.push(selection);
        },
      }),
    );
    const canvas = fixture.container.querySelector<HTMLElement>('[data-slot="workflow-builder"]')!;

    await act(async () => {
      fireEvent.keyDown(canvas, { key: "ArrowRight" });
    });
    expect(selections).toHaveLength(0);

    await act(async () => {
      fireEvent.keyDown(canvas, { key: "l" });
    });
    expect(selections.at(-1)?.nodeIds).toEqual(["source"]);

    await act(async () => {
      fireEvent.keyDown(canvas, { key: "l" });
    });
    expect(selections.at(-1)?.nodeIds).toEqual(["target"]);

    await act(async () => {
      fireEvent.keyDown(canvas, { key: "L", shiftKey: true });
    });
    expect(latestDocument.nodes.find((node) => node.id === "target")).toMatchObject({
      x: 270,
      y: 0,
    });

    await act(async () => {
      fireEvent.keyDown(canvas, { key: "q" });
    });
    expect(selections.at(-1)?.nodeIds).toEqual([]);

    await act(async () => {
      fireEvent.keyDown(canvas, { key: "l" });
    });
    await act(async () => {
      fireEvent.keyDown(canvas, { key: "x" });
    });
    expect(latestDocument.nodes).toHaveLength(1);
  });

  test("routes a remapped clear binding through canvas interaction cancellation", async () => {
    const fixture = render(
      React.createElement(GraphWorkbench, {
        document: {
          nodes: [
            {
              id: "source",
              label: "Source",
              x: 0,
              y: 0,
              outputs: [{ id: "out", label: "Out" }],
            },
            {
              id: "target",
              label: "Target",
              x: 260,
              y: 0,
              inputs: [{ id: "in", label: "In" }],
            },
          ],
          edges: [],
        },
        defaultHotkeys: { "selection.clear": ["q"] },
        showMiniMap: false,
      }),
    );
    const canvas = fixture.container.querySelector<HTMLElement>('[data-slot="workflow-builder"]')!;
    const output = screen.getByRole("button", { name: "Start Source Out" });

    await act(async () => {
      fireEvent.pointerDown(output, { button: 0, clientX: 10, clientY: 10 });
    });
    expect(
      fixture.container.querySelector('[data-slot="workflow-builder-connection-preview"]'),
    ).toBeTruthy();

    await act(async () => {
      fireEvent.keyDown(canvas, { key: "Escape" });
    });
    expect(
      fixture.container.querySelector('[data-slot="workflow-builder-connection-preview"]'),
    ).toBeTruthy();

    await act(async () => {
      fireEvent.keyDown(canvas, { key: "q" });
    });
    expect(
      fixture.container.querySelector('[data-slot="workflow-builder-connection-preview"]'),
    ).toBeNull();
  });

  test("lets users add bindings from the keyboard settings surface", async () => {
    const onHotkeysChange = vi.fn();
    render(
      React.createElement(GraphWorkbench, {
        document: { nodes: [], edges: [] },
        showMiniMap: false,
        onHotkeysChange,
      }),
    );

    expect(screen.getByText("Keyboard shortcuts")).toBeTruthy();
    const input = screen.getByLabelText("Add shortcut for Navigate left");
    await act(async () => {
      fireEvent.keyDown(input, { key: "h" });
    });

    expect(onHotkeysChange).toHaveBeenCalledWith(
      expect.objectContaining({ "navigate.left": ["ArrowLeft", "H"] }),
    );
  });
});
