# @moritzbrantner/graph-editor

Generic graph document utilities and React primitives for node graph editors.

Built on `@moritzbrantner/editor-core` for shared document serialization, history, hotkeys,
viewport math, graph adapters, indexing, and entity selection primitives.

## Install

```sh
bun add @moritzbrantner/graph-editor
```

## Main APIs

- `GraphCanvas` and `GraphNode` for controlled React graph editing primitives.
- `GraphWorkbench` for a compact generic graph editor shell.
- `normalizeGraphEditorDocument(...)`, `validateGraphEditorDocument(...)`, and mutation helpers.
- `createGraphEditorAddNodeOperation(...)` and other semantic graph operation factories.
- `createGraphEditorRuntime(...)` and `applyGraphEditorOperation(...)` for headless editing,
  undo/redo, normalized selection, diagnostics, and dirty state.
- `createGraphEditorCommands(...)` and shortcut helpers for generic graph editor command menus.
- `copyGraphEditorSelection(...)`, `pasteGraphEditorClipboardPayload(...)`, and selection helpers.
- `layoutGraphEditorDocument(...)` for deterministic Dagre-powered layout.

## Layers

- `@moritzbrantner/graph-editor/core`: document types, validation, normalization, mutation
  helpers, graph adapters, indexes, and selection conversion.
- `@moritzbrantner/graph-editor/operations`: semantic graph edits that can be used without React.
- `@moritzbrantner/graph-editor/runtime`: operation runtime integration with undo/redo,
  normalized selection, validation diagnostics, and saved/dirty tracking.
- `@moritzbrantner/graph-editor/commands`: command definitions, shortcut matching, and command
  resolution helpers.
- `@moritzbrantner/graph-editor/react`: React canvas, node, inspector, palette, and workbench UI.

```ts
import {
  applyGraphEditorOperation,
  createGraphEditorAddNodeOperation,
  createGraphEditorRuntime,
} from "@moritzbrantner/graph-editor";

const runtime = createGraphEditorRuntime({
  initialDocument: { nodes: [], edges: [] },
});

const next = applyGraphEditorOperation(
  runtime,
  createGraphEditorAddNodeOperation({
    node: { id: "node-1", label: "Node 1", x: 0, y: 0 },
  }),
);
```

This package intentionally does not include workflow templates, typed workflow semantics,
persistence backends, sharing UI, collaboration, or a document-library editor shell. Persistence
and sharing should be supplied by consumers through adapter-level integration.
