# Release Notes Draft

## Added

- Headless graph document modules for `/serialization`, `/persistence`, `/patches`, `/plugins`,
  `/interaction`, and `/operation-log`.
- Adapter-level graph persistence helpers, including local storage and in-memory storage adapters.
- Deterministic graph operation-log serialization/replay helpers and replace-document operations.

## Hardened

- Published `editor-core` subpath consumption is checked in CI scripts.
- Package smoke coverage now verifies every public graph-editor export subpath.
- Workbench tests now lock document IO commands to graph-editor's public import/export ids while
  using editor-core helpers internally.
- Edge-case tests cover malformed serialized input, persistence failures, patch strictness,
  plugin diagnostics, interaction commits, and operation-log replay/rejection behavior.

## Compatibility

- The package continues to avoid persistence backends/UI, sharing UI, collaboration transport,
  sync, presence, and a document-library shell. Persistence support is adapter-level and headless.
