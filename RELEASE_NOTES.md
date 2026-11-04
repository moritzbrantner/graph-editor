# @moritzbrantner/graph-editor 0.2.0

## Unreleased

- `@moenarch/editor-core` is now a commit-pinned git dependency on editor-core `main` (`51463ab`, listed in `trustedDependencies`) instead of the npm `^0.4.1` release. The `src/runtime/core-compat.ts` fallback is gone; the runtime uses editor-core's `replaceEditorOperationRuntimeCoreState` and `recordHistory: false` directly. `verify:registry` is renamed `verify:pinned`.
- `@moritzbrantner/ui` is now the git pin `git+https://github.com/moritzbrantner/ui.git#2f8da60` (listed in `trustedDependencies` and `overrides`) instead of the npm `^1.1.0` release, because npm publishing of `ui` is retired. Apps that render the workbench must also import `@moritzbrantner/ui/component-sources.css` next to their theme stylesheet so Tailwind generates the classes of ui's components; the examples and e2e app now do.
- `GraphWorkbench` chrome uses ui's shared editor primitives instead of a fixed CSS grid. Public props and import paths are unchanged; the visible and DOM-level differences are:
  - The palette and inspector are `EditorPane`s in an `EditorPaneLayout` (labelled regions "Palette" and "Inspector"). They resize in pixels by pointer or keyboard splitter, and collapse to a rail with a "Show …" button. `view.showPalette`/`view.showInspector` map to the docked collapsed state, and hidden panes stay mounted instead of unmounting.
  - When the workbench container is narrower than 768px, the panes become overlay drawers that start closed, replacing the old stacked single-column layout. While drawers are active, the `view.showPalette`/`view.showInspector` values that `renderToolbar`, `renderPalette`, and `renderInspector` receive show and hide the drawers. Adding a node from the palette drawer closes it.
  - The toolbar is an `EditorToolbar` with one Tab stop and arrow-key navigation, with tooltips and shortcut hints on its commands. In narrow containers it keeps one horizontally scrolling row.
  - `renderPalette`/`renderInspector` output now renders inside the pane body instead of as a grid column. The built-in `GraphWorkbenchPalette` root is a `div` instead of an `aside`, and its search field has an accessible name.
  - The canvas fills the remaining height of the workbench. Give the `GraphWorkbench` a height through `className`; it defaults to `min-h-[36rem]`. Grid-column classes passed through `className` no longer have any effect.
- `InspectorPanel` renders its header, scrolling body, and footer with `EditorInspector`, `EditorInspectorHeader`, `EditorInspectorContent`, and `EditorInspectorFooter`. Its root is a labelled `section` instead of an `aside`, and it keeps `data-slot="inspector-panel"`.
- `GraphWorkbench` arrow-key navigation (`navigate.*` hotkeys, including rebound keys) is now handled by `GraphCanvas` through its retained spatial index (`findGraphEditorNodeInDirection`). It no longer scans every node, and it skips hidden nodes the same way canvas navigation does.

## Added

- Edge culling (#36, part of #1): while node culling is active, `GraphCanvas` renders only edges whose curve bounds intersect the culling bounds, plus selected, hovered, and rewired edges. Cross-viewport edges render their full path, so selection and rewire keep working. New exports from the root and `/react`: `planGraphCanvasEdgeRender`, `getGraphCanvasEdgeCurveBounds`, `graphCanvasEdgeCurveMargin`, and the `GraphCanvasEdgeRenderPlan`, `GraphCanvasEdgeRenderPlanInput`, and `GraphCanvasEdgeRenderPlanStats` types. The surface adds `data-edges-rendered` and `data-edges-considered`.

- Index-backed interactions (#37, part of #1): `GraphCanvas` drag snapping, marquee selection, and arrow-key navigation query the retained spatial index instead of scanning every node. Results are unchanged. New headless `/core` helpers: `queryGraphEditorNodesNearBounds`, `getGraphEditorSelectionFromSpatialIndex`, `findGraphEditorNodeInDirection` (with the `GraphEditorSpatialDirection` type), and `GraphEditorSpatialIndex.getIndexedBounds()`. `getGraphEditorSelectionFromBounds` and `normalizeGraphEditorSelection` no longer renormalize once per selected item, so large marquee selections stay linear.

- Category chip control (part of #49): `GraphCanvas` `showNodeCategory={false}` (`GraphNode` `showCategory`) keeps the category/kind chip off node headers. An explicit `eyebrow` still shows. The chip now has `data-slot="graph-node-category"`.
- Node width and inline minimized layout (part of #44). Layout options `nodeWidth(node)` and `minimizedLayout: "inline"` feed every geometry consumer: size, port offsets, edges, bounds and the minimap. `GraphCanvas` takes them as `getNodeWidth` and `minimizedNodeLayout`, `GraphNode` as `nodeWidth` and `minimizedLayout`. An inline minimized node is one 36px header line with its port dots on the left and right edges (`data-minimized-layout="inline"`). Consumers no longer need CSS overrides for this.
- Quieter idle nodes (part of #49): `GraphNode` draws its status dot (`data-slot="graph-node-status-dot"`, `data-tone`) only for a non-neutral tone or a running/success/warning/error status. Idle or missing status shows no indicator.
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

## Fixed

- Pressing an edge's hit path or rewire handle no longer also starts a surface pan or marquee. SVG targets were not recognized as interactive, so dragging a rewire handle with a mouse panned the canvas and detached the edge.

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
