# Source development

Graph Editor keeps published semver dependencies in `package.json`, but coordinated editor-family development should use sibling source checkouts instead of waiting for package publication.

By default, source mode expects this layout:

```text
workspace/
  editor-core/
  graph-editor/
```

Use `EDITOR_CORE_SOURCE=/absolute/path/to/editor-core` when the repositories are elsewhere.

## Commands

```sh
bun run source:prepare
bun run source:status
bun run source:smoke
bun run verify:source
```

`source:prepare` installs the frozen dependency sets, recursively prepares upstream source dependencies when supported, builds the sibling checkout, and materializes that build into `node_modules/@moritzbrantner/editor-core` under the package identity this consumer expects. It records the sibling Git revision under `node_modules/.editor-source-deps/` so the active source can be inspected without changing committed package metadata or the lockfile.

`source:smoke` proves the materialized package is active and importable. `verify:source` goes further and runs Graph Editor against that exact source build; it intentionally fails when Graph Editor still depends on an API that has changed on the selected editor-core revision. That compatibility work belongs in a coordinated migration, not in the source-mode plumbing itself.

To switch back to the published dependency contract:

```sh
bun run source:restore
bun run verify
```

`verify` is intentionally release-oriented and restores the frozen registry install first. Source mode must fail when the expected checkout is absent or is not an editor-core package; it must not silently claim source verification while testing the registry package.
