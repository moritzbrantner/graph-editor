# @moritzbrantner/graph-editor 0.2.0

## Added

- Headless graph document modules for `/serialization`, `/persistence`, `/patches`, `/plugins`,
  `/interaction`, and `/operation-log`.
- Adapter-level graph persistence helpers, including local storage and in-memory storage adapters.
- Deterministic graph operation-log serialization/replay helpers and replace-document operations.
- Public graph-editor APIs now build on the published `@moritzbrantner/editor-core@0.3.0`
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
- `@moritzbrantner/editor-core` remains a normal dependency at `^0.3.0`; React and React DOM remain
  peer dependencies.
