# @moritzbrantner/graph-editor

Generic graph document utilities and React primitives for node graph editors.

## Install

```sh
bun add @moritzbrantner/graph-editor
```

## Main APIs

- `GraphCanvas` and `GraphNode` for controlled React graph editing primitives.
- `GraphWorkbench` for a compact generic graph editor shell.
- `normalizeGraphEditorDocument(...)`, `validateGraphEditorDocument(...)`, and mutation helpers.
- `copyGraphEditorSelection(...)`, `pasteGraphEditorClipboardPayload(...)`, and selection helpers.
- `layoutGraphEditorDocument(...)` for deterministic Dagre-powered layout.

This package intentionally does not include workflow templates, typed workflow semantics,
persistence, sharing, history, or a document-library editor shell.
