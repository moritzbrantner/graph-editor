# Graph Editor roadmap

Graph Editor should become the reference specialization of editor-core: deep enough to prove shared editor contracts, but still generic enough that workflow and other graph-shaped products can build on it without inheriting domain semantics.

## 1. Adopt the current editor kernel

Use source-first development to migrate Graph Editor onto current editor-core APIs before expanding the public surface.

### Acceptance criteria

- generic history, command, selection, persistence, serialization, validation, and interaction behavior uses editor-core where semantics match
- graph-specific wrappers remain only when they enforce graph semantics
- source verification passes against the selected editor-core revision
- packed/registry verification still passes independently

## 2. Complete graph interaction semantics

Flesh out the generic graph canvas and workbench around operations that belong to graph editing itself.

### Selection and manipulation

- complete keyboard and pointer multi-selection
- stable primary-selection behavior
- deterministic duplicate/copy/paste semantics
- group/ungroup and group movement
- nudge and coarse/fine keyboard movement

### Connections

- accessible create/rewire/delete flows
- explicit connection diagnostics and invalid reasons
- port-focused keyboard connection menus
- preserve edge identity on rewires

### Spatial editing

- configurable grid snapping
- node-to-node alignment guides
- distribution commands
- fit selection / fit graph
- deterministic layout integration without making auto-layout authoritative document state

## 3. Workbench extensibility

Keep the graph model generic while making the workbench easier to specialize.

### Acceptance criteria

- inspector sections can be supplied per node, edge, and group
- toolbar, palette, inspector, context pad, and overlays remain replaceable
- annotations/status badges can be rendered without adding workflow concepts to the graph model
- host-owned import/export and clipboard formats remain supported

## 4. Large-graph behavior

Add performance work only where benchmarks show it is needed.

Candidate work:

- viewport culling/virtualization
- incremental indexes
- minimized rerender surfaces
- overview/minimap projection
- deterministic benchmarks for representative graph sizes

### Acceptance criteria

- performance budgets are measured rather than guessed
- optimizations do not change document semantics
- overview/minimap state is derived view state

## 5. Accessibility and reference demos

Graph Editor is the place to prove editor-family interaction quality.

Add demos that exercise:

- relationship map
- process/flow map
- grouped architecture graph
- dense graph performance fixture
- keyboard-only editing

Cover pointer, keyboard, mobile/touch where meaningful, reduced motion, and automated accessibility checks.

## Boundary

Graph Editor owns generic graph semantics and graph interaction. It does not own typed workflow ports, workflow execution, workflow catalogs, product document libraries, or a universal editor shell.
