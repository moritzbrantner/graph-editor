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

The index owns a snapshot and never observes documents. Callers invalidate it explicitly: `updateNodes(document, nodeIds)` re-reads geometry for moved or resized nodes, and falls back to `rebuild(document)` when nodes were added, removed, or reordered. Hidden nodes and the cell size are fixed per index; create a new index to change them. `getIndexedBounds()` returns the extent of all indexed nodes (maintained incrementally). `getStats()` exposes deterministic `candidateVisits`, `queries`, `rebuilds`, and `updates` counters for regression ratchets.

## Viewport culling in GraphCanvas

`GraphCanvas` uses the retained index to render only nodes near the visible surface. The `virtualization` prop is automatic by default: culling activates only when the node count exceeds `threshold` (default 500), so smaller documents render exactly as before. `virtualization={false}` always renders every node; `virtualization={{ threshold, overscan }}` tunes the threshold and the screen-pixel overscan (default 400, converted to graph units by the current zoom).

While culling:

- culled nodes leave the DOM and appear when they enter the overscan (plain pop-in, no placeholders);
- the focused node, dragged node(s), the connection source and hovered target, and the keyboard navigation target always render; off-screen selected nodes do not, because delete, nudge, and inspectors operate by id;
- group frames render when their bounds intersect the culling bounds;
- a polite status (`data-slot="workflow-builder-render-status"`) reads "Showing N of M nodes", and the surface exposes `data-virtualized`, `data-nodes-rendered`, and `data-nodes-considered`;
- edges still render in full; edges to culled nodes use computed port geometry, because `measurePorts="dom"` can only measure rendered nodes. Edge culling is tracked separately.

`planGraphCanvasNodeRender` is the pure planner behind this. Its `stats` (`totalNodes`, `nodesConsidered`, `nodesRendered`, `pinnedOutsideViewport`) are deterministic work counters for regression ratchets. Fit view, the minimap, marquee selection, and keyboard navigation read document geometry, not the DOM, so they cover culled nodes too.

## Index-backed interactions

The same retained index answers the hot interaction queries, so their cost follows the neighbourhood rather than the document size. All helpers are headless (`/core`) and return the same result as the whole-document scan they replace; differential tests keep the reference scans alongside them.

- `queryGraphEditorNodesNearBounds(index, bounds, { distance, excludeNodeIds })` returns node ids within `distance` of `bounds` on both axes. `GraphCanvas` drag snapping queries the dragged node's bounds at the pointer position expanded by the 28px snap distance, then applies its port-matching rules to those candidates only. Port centers lie inside node bounds, so no reachable snap target is missed. Hidden nodes stay snap targets, as before.
- `getGraphEditorSelectionFromSpatialIndex(document, bounds, index, { mode, selection, excludeNodeIds, items })` is marquee selection with nodes queried from the index; `items` (edge and group bounds) are still tested directly. The result equals `getGraphEditorSelectionFromBounds` over every node followed by `items`. Both now apply hits in one normalization pass, and `normalizeGraphEditorSelection` is linear in document size for selections of any size.
- `findGraphEditorNodeInDirection(index, fromNodeId, direction, { excludeNodeIds })` is directional keyboard navigation over node centers: nodes strictly ahead win by smallest perpendicular offset, then smallest distance ahead, then `localeCompare` id order. It sweeps a band around the origin's axis in doubling chunks, starting with exact alignment, widening only while nothing is found and narrowing to the best offset once something is.

`GraphCanvas` keeps one index over every node (hidden ones included) for culling, snapping, marquee, and navigation; each consumer filters hidden nodes. `src/index-tests/spatial-interactions.test.ts` ratchets the index's `candidateVisits` for each query on 500, 2,000, and 10,000-node grids, and `src/graph-editor.bench.ts` benchmarks each query against its reference scan. `GraphWorkbench`'s own navigation hotkeys still use the reference scan, since the workbench has no retained index.
