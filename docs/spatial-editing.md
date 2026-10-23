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

## Viewport culling in GraphCanvas

`GraphCanvas` uses the retained index to render only nodes near the visible surface. The `virtualization` prop is automatic by default: culling activates only when the node count exceeds `threshold` (default 500), so smaller documents render exactly as before. `virtualization={false}` always renders every node; `virtualization={{ threshold, overscan }}` tunes the threshold and the screen-pixel overscan (default 400, converted to graph units by the current zoom).

While culling:

- culled nodes leave the DOM and appear when they enter the overscan (plain pop-in, no placeholders);
- the focused node, dragged node(s), the connection source and hovered target, and the keyboard navigation target always render; off-screen selected nodes do not, because delete, nudge, and inspectors operate by id;
- group frames render when their bounds intersect the culling bounds;
- a polite status (`data-slot="workflow-builder-render-status"`) reads "Showing N of M nodes", and the surface exposes `data-virtualized`, `data-nodes-rendered`, and `data-nodes-considered`;
- edges still render in full; edges to culled nodes use computed port geometry, because `measurePorts="dom"` can only measure rendered nodes. Edge culling is tracked separately.

`planGraphCanvasNodeRender` is the pure planner behind this. Its `stats` (`totalNodes`, `nodesConsidered`, `nodesRendered`, `pinnedOutsideViewport`) are deterministic work counters for regression ratchets. Fit view, the minimap, marquee selection, and keyboard navigation read document geometry, not the DOM, so they cover culled nodes too.
