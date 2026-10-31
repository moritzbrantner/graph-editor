import { type EditorCommandDefinition } from "@moenarch/editor-core/hotkeys";
import { createEditorDocumentIoCommands } from "@moenarch/editor-core/runtime";
import { type GraphEditorDocument, type GraphEditorSelectionState } from "../../core";
import { type GraphEditorRuntimeState } from "../../runtime";
import {
  graphWorkbenchCommandShortcuts,
  getGraphWorkbenchShortcutLabel,
  type GraphWorkbenchAction,
  type GraphWorkbenchCommandId,
} from "../workbench-commands";
import { type GraphWorkbenchController } from "./types";

export function createGraphWorkbenchActions<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>({
  actions,
  canPaste,
  canRedo,
  canUndo,
  hasSelection,
  nodeSelectionCount,
  readOnly,
  runtime,
  selectedGroupCount,
}: {
  actions: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>["actions"];
  canPaste: boolean;
  canRedo: boolean;
  canUndo: boolean;
  hasSelection: boolean;
  nodeSelectionCount: number;
  readOnly: boolean;
  runtime: GraphEditorRuntimeState<TNodeData, TEdgeData, TPortType>["runtime"];
  selectedGroupCount: number;
}): GraphWorkbenchAction[] {
  const documentIoActions = createEditorDocumentIoCommands<
    GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    GraphEditorSelectionState
  >({
    runtime,
    export: {
      disabled: false,
      run: actions.exportJson,
    },
    import: {
      disabled: readOnly,
      run: () => actions.importJson(),
    },
    include: ["export", "import"],
    labels: {
      export: "Export JSON",
      import: "Import JSON",
    },
  });
  const documentIoWorkbenchActions: GraphWorkbenchAction[] = documentIoActions.map((command) => ({
    id: command.id === "export" ? "export-json" : "import-json",
    label: command.label,
    disabled: command.disabled,
    run() {
      if (!command.run) {
        return;
      }
      return command.run({
        altKey: false,
        ctrlKey: false,
        key: "",
        metaKey: false,
        shiftKey: false,
        target: null,
      });
    },
  }));

  return [
    {
      id: "undo",
      label: "Undo",
      shortcut: getGraphWorkbenchShortcutLabel("undo"),
      disabled: !canUndo,
      run: actions.undo,
    },
    {
      id: "redo",
      label: "Redo",
      shortcut: getGraphWorkbenchShortcutLabel("redo"),
      disabled: !canRedo,
      run: actions.redo,
    },
    {
      id: "copy",
      label: "Copy",
      shortcut: getGraphWorkbenchShortcutLabel("copy"),
      disabled: !hasSelection,
      run: actions.copySelection,
    },
    {
      id: "paste",
      label: "Paste",
      shortcut: getGraphWorkbenchShortcutLabel("paste"),
      disabled: readOnly || !canPaste,
      run: actions.pasteSelection,
    },
    {
      id: "duplicate",
      label: "Duplicate",
      shortcut: getGraphWorkbenchShortcutLabel("duplicate"),
      disabled: readOnly || nodeSelectionCount === 0,
      run: actions.duplicateSelection,
    },
    {
      id: "delete",
      label: "Delete",
      shortcut: getGraphWorkbenchShortcutLabel("delete"),
      destructive: true,
      disabled: readOnly || !hasSelection,
      run: actions.deleteSelection,
    },
    {
      id: "select-all",
      label: "Select all",
      shortcut: getGraphWorkbenchShortcutLabel("select-all"),
      disabled: false,
      run: actions.selectAll,
    },
    {
      id: "fit-view",
      label: "Fit view",
      disabled: false,
      run: actions.fitView,
    },
    {
      id: "auto-layout",
      label: "Auto layout",
      disabled: readOnly,
      run: actions.autoLayout,
    },
    ...documentIoWorkbenchActions,
    {
      id: "group-selection",
      label: "Group selection",
      disabled: readOnly || nodeSelectionCount < 1,
      run: actions.groupSelection,
    },
    {
      id: "ungroup-selection",
      label: "Ungroup selection",
      disabled: readOnly || selectedGroupCount < 1,
      run: actions.ungroupSelection,
    },
  ];
}

export function createGraphWorkbenchHotkeyCommands(
  commands: readonly GraphWorkbenchAction[],
): Array<EditorCommandDefinition<GraphWorkbenchCommandId | string>> {
  return commands.map((command) => ({
    disabled: command.disabled,
    hotkeys: graphWorkbenchCommandShortcuts[command.id as GraphWorkbenchCommandId] ?? [],
    id: command.id,
    label: String(command.label ?? command.id),
    run: command.run,
  }));
}
