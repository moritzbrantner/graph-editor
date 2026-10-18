# @moritzbrantner/graph-editor 0.2.0

## Added

- Node action menu and title slot (part of #49): `GraphCanvas` `getNodeMenuItems` / `nodeMenuLabel` fill each node's built-in action menu, and `renderNodeTitle` (`GraphNode` `titleContent`) replaces the header title with consumer content such as an inline rename field (`data-slot="graph-node-title"`), which never starts a drag.
- Port content slot (#47): `GraphCanvas` `renderPortContent` and `GraphNode` `renderPortContent` render compact content on a port card (`data-slot="graph-node-port-content"`) without changing port geometry or nesting controls inside the port button.
- Minimized node content (#48): `GraphCanvas` `renderMinimizedNodeContent` and `GraphNode` `minimizedContent` render compact domain controls inline in a minimized node's header (`data-slot="graph-node-minimized-content"`). They never start a node drag, and the minimized geometry is unchanged.
- Node composition seam (#45): `GraphCanvas` `renderNodeBody` / `getNodeBodyHeight`, `GraphNode`
  `body` / `nodeBodyHeight`, and the exported `GraphNodeBody` slot. They let consumers put
  interactive domain content inside nodes without portals or DOM patching.
  - Body heights enter the deterministic geometry model through
    `GraphNodeLayoutOptions.nodeBodyHeight`, also exposed as `getGraphEditorNodeBodyHeight` on
    `/layout`.
  - `alignGraphEditorNodes` and `distributeGraphEditorNodes` take an optional `layoutOptions`
    argument.
- Headless graph document modules for `/serialization`, `/persistence`, `/patches`, `/plugins`,
  `/interaction`, and `/operation-log`.
- Adapter-level graph persistence helpers, including local storage and in-memory storage adapters.
- Deterministic graph operation-log serialization/replay helpers and replace-document operations.
- Public graph-editor APIs now build on the published `@moenarch/editor-core@0.3.0`
  foundation for serialization, runtime, operations, selection, indexes, patches, plugins,
  persistence, interaction, hotkeys, entities, JSON helpers, browser utilities, and viewport state.

## Hardened

- Published `editor-core` subpath consumption is checked locally and in CI before release.
- Package smoke coverage now verifies every public graph-editor export subpath.
- Workbench tests now lock document IO commands to graph-editor's public import/export ids while
  using editor-core helpers internally.
- Edge-case tests cover malformed serialized input, persistence failures, patch strictness,
  plugin diagnostics, interaction commits, and operation-log replay/rejection behavior.

## Compatibility

- The package continues to avoid persistence backends/UI, sharing UI, collaboration transport,
  sync, presence, and a document-library shell. Persistence support is adapter-level and headless.
- `@moenarch/editor-core` remains a normal dependency at `^0.3.0`; React and React DOM remain
  peer dependencies.
