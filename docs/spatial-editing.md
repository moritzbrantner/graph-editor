# Spatial editing

Graph Editor keeps spatial editing deterministic and document-oriented. The public helpers in `@moritzbrantner/graph-editor` operate on a `GraphEditorDocument` and return the next normalized document together with the node ids that actually changed.

## Operations

- `nudgeGraphEditorNodes` moves a selected set by a caller-defined delta. Keyboard bindings remain host-owned.
- `snapGraphEditorNodesToGrid` snaps selected node origins to a configurable grid and origin.
- `alignGraphEditorNodes` aligns measured node bounds on left, center, right, top, middle, or bottom axes.
- `distributeGraphEditorNodes` evenly distributes three or more measured nodes while preserving the outer span.

These functions do not own UI, selection gestures, or rendering. Hosts can compose them with Graph Editor operations/history so the same deterministic mechanics work in React, headless tools, or other renderers.

## Spatial index

`createGraphEditorSpatialIndex(document, { getNodeBounds, cellSize?, hiddenNodeIds? })` (also on `/core`) builds a React-independent, retained grid index over node bounds supplied by the caller. `query(bounds, { overscan })` returns intersecting node ids in document order; touching edges count as intersecting.

The index owns a snapshot and never observes documents. Callers invalidate it explicitly: `updateNodes(document, nodeIds)` re-reads geometry for moved or resized nodes, and falls back to `rebuild(document)` when nodes were added, removed, or reordered. Hidden nodes and the cell size are fixed per index; create a new index to change them. `getStats()` exposes deterministic `candidateVisits`, `queries`, `rebuilds`, and `updates` counters for regression ratchets.
