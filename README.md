# @moritzbrantner/graph-editor

Generic graph document utilities and React primitives for node graph editors.

Built on `@moritzbrantner/editor-core` for shared document serialization, history, hotkeys,
viewport math, graph adapters, indexing, and entity selection primitives.

## Install

```sh
bun add @moritzbrantner/graph-editor
```

## Local Development

```sh
bun install --frozen-lockfile
bun run verify
bun run dev:examples
```

Use `bun run verify:full` before larger releases. It runs the fast checks, coverage, example build,
and Playwright e2e suite.

## Main APIs

- `GraphCanvas` and `GraphNode` for controlled React graph editing primitives.
- `GraphWorkbench` for a compact generic graph editor shell with multi-select, groups, panning,
  wheel zoom, clipboard, import/export, and inspectable node/edge/group properties.
- `normalizeGraphEditorDocument(...)`, `validateGraphEditorDocument(...)`, and mutation helpers.
- `createGraphEditorAddNodeOperation(...)` and other semantic graph operation factories.
- `createGraphEditorRuntime(...)` and `applyGraphEditorOperation(...)` for headless editing,
  undo/redo, normalized selection, diagnostics, and dirty state.
- `createGraphEditorCommands(...)` and shortcut helpers for generic graph editor command menus.
- `copyGraphEditorSelection(...)`, `pasteGraphEditorClipboardPayload(...)`, and selection helpers.
- `layoutGraphEditorDocument(...)` for deterministic Dagre-powered layout.
- `getGraphEditorNodeSize(...)` for headless deterministic node measurement.

## Layers

- `@moritzbrantner/graph-editor/core`: document types, validation, normalization, mutation
  helpers, graph adapters, indexes, and selection conversion.
- `@moritzbrantner/graph-editor/operations`: semantic graph edits that can be used without React.
- `@moritzbrantner/graph-editor/runtime`: operation runtime integration with undo/redo,
  normalized selection, validation diagnostics, and saved/dirty tracking.
- `@moritzbrantner/graph-editor/commands`: command definitions, shortcut matching, and command
  resolution helpers.
- `@moritzbrantner/graph-editor/react`: React canvas, node, inspector, palette, and workbench UI.

```ts
import {
  applyGraphEditorOperation,
  createGraphEditorAddNodeOperation,
  createGraphEditorRuntime,
} from "@moritzbrantner/graph-editor";

const runtime = createGraphEditorRuntime({
  initialDocument: { nodes: [], edges: [] },
});

const next = applyGraphEditorOperation(
  runtime,
  createGraphEditorAddNodeOperation({
    node: { id: "node-1", label: "Node 1", x: 0, y: 0 },
  }),
);
```

## Quickstarts

### Core

```ts
import {
  normalizeGraphEditorDocument,
  validateGraphEditorDocument,
} from "@moritzbrantner/graph-editor/core";

const document = normalizeGraphEditorDocument({
  nodes: [{ id: "source", label: "Source", x: 0, y: 0 }],
  edges: [],
});

const diagnostics = validateGraphEditorDocument(document);
```

### Operations

```ts
import { createGraphEditorAddNodeOperation } from "@moritzbrantner/graph-editor/operations";

const operation = createGraphEditorAddNodeOperation({
  node: { id: "node-1", label: "Node 1", x: 0, y: 0 },
});
```

### Runtime

```ts
import {
  applyGraphEditorOperation,
  createGraphEditorRuntime,
} from "@moritzbrantner/graph-editor/runtime";
import { createGraphEditorAddNodeOperation } from "@moritzbrantner/graph-editor/operations";

let runtime = createGraphEditorRuntime({ initialDocument: { nodes: [], edges: [] } });
runtime = applyGraphEditorOperation(
  runtime,
  createGraphEditorAddNodeOperation({
    node: { id: "node-1", label: "Node 1", x: 0, y: 0 },
  }),
);
```

### Commands

```ts
import { createGraphEditorCommands } from "@moritzbrantner/graph-editor/commands";

const commands = createGraphEditorCommands({
  context: {
    document: { nodes: [], edges: [] },
    selection: { nodeIds: [], edgeIds: [] },
    readOnly: false,
  },
  actions: {
    undo() {},
    redo() {},
    copy() {},
    paste() {},
    duplicate() {},
    delete() {},
    "select-all"() {},
    "fit-view"() {},
    "auto-layout"() {},
    "export-json"() {},
    "import-json"() {},
    "group-selection"() {},
    "ungroup-selection"() {},
  },
});
```

### Layout

```ts
import {
  getGraphEditorNodeSize,
  layoutGraphEditorDocument,
} from "@moritzbrantner/graph-editor/layout";

const result = layoutGraphEditorDocument(document, { direction: "right" });
const size = getGraphEditorNodeSize(result.document.nodes[0]);
```

### React

```tsx
import { GraphWorkbench } from "@moritzbrantner/graph-editor/react";

export function Editor() {
  return (
    <GraphWorkbench
      document={{ nodes: [], edges: [] }}
      nodeTemplates={[{ id: "task", label: "Task", inputs: [], outputs: [] }]}
      onDocumentChange={(nextDocument) => console.log(nextDocument)}
    />
  );
}
```

`GraphCanvas` supports controlled multi-selection through `selectedNodeIds`, `selectedEdgeIds`,
`selectedGroupIds`, and `onSelectionStateChange`. Use modifier-clicks to extend/toggle selection
and modifier-drag on the canvas to marquee-select nodes, edges, and groups. Empty-canvas drag pans
the viewport, and modifier wheel zooms around the pointer.

Connection lifecycle callbacks are split by intent:

```tsx
<GraphCanvas
  nodes={nodes}
  edges={edges}
  groups={groups}
  onConnectionCreate={(connection) => {
    // add one edge
    return true;
  }}
  onConnectionRewire={(edge, connection) => {
    // update edge in place; preserve edge.id
    return true;
  }}
  onConnectionDelete={(edge, reason) => {
    // remove one edge
  }}
/>
```

`GraphWorkbench` exposes the same selection state through its controller and default UI. Consumers
can add host-specific commands with the `commands` prop and can customize group inspection with
`inspectorSchema.getGroupSections` and `inspectorSchema.applyGroupValues`.

### Controlled Workbench

```tsx
import * as React from "react";
import {
  GraphWorkbench,
  createGraphEditorRuntime,
  type GraphEditorRuntimeState,
} from "@moritzbrantner/graph-editor";

export function ControlledEditor() {
  const [runtime, setRuntime] = React.useState<GraphEditorRuntimeState>(() =>
    createGraphEditorRuntime({ initialDocument: { nodes: [], edges: [] } }),
  );

  return <GraphWorkbench runtime={runtime} onRuntimeChange={setRuntime} />;
}
```

### Advanced Workbench Integration

`GraphWorkbench` can stay generic while host applications provide domain behavior at the edges.
Use `createEdge` when a connection only needs custom edge data:

```tsx
<GraphWorkbench
  document={document}
  createEdge={(connection) => ({
    id: `${connection.sourceNodeId}-${connection.targetNodeId}`,
    ...connection,
    data: { label: "domain edge" },
  })}
/>
```

Use `connectDocument` when the host owns the full connection transaction, including validation
side effects, edge replacement, or related document updates:

```tsx
<GraphWorkbench
  document={document}
  connectDocument={(currentDocument, connection, validity) => {
    if (!validity.valid) {
      return { document: currentDocument, connected: false };
    }

    return {
      document: connectGraphEditorNodes(currentDocument, connection),
      connected: true,
    };
  }}
/>
```

Import/export and clipboard formats can also be host-owned:

```tsx
<GraphWorkbench
  document={document}
  onImportDocument={async (file) => loadGraphFromFile(file)}
  onExportDocument={(currentDocument) => saveGraph(currentDocument)}
  copySelection={(currentDocument, selection) => toDomainClipboard(currentDocument, selection)}
  pasteClipboardPayload={(currentDocument, payload) =>
    pasteDomainClipboard(currentDocument, payload)
  }
/>
```

Customize inspector fields with `inspectorSchema`, and replace workbench regions with render
overrides when the default UI is too generic:

```tsx
<GraphWorkbench
  document={document}
  inspectorSchema={{
    getNodeSections: (node) => getDomainNodeSections(node),
    applyNodeValues: (node, values) => applyDomainNodeValues(node, values),
  }}
  renderToolbar={(controller) => <DomainToolbar controller={controller} />}
  renderPalette={(controller) => <DomainPalette controller={controller} />}
  renderInspector={(controller) => <DomainInspector controller={controller} />}
  renderContextPad={(controller) => <DomainContextPad controller={controller} />}
  renderCanvasOverlay={(controller, { containerRef }) => (
    <DomainOverlay controller={controller} containerRef={containerRef} />
  )}
/>
```

Built-in import, copy, paste, and command failures are exposed through
`controller.status.actionError` and `onActionError`. The default toolbar renders a dismissible
`role="alert"` message.

```tsx
<GraphWorkbench
  document={document}
  onActionError={(error) => {
    console.warn(error.code, error.detail ?? error.message);
  }}
/>
```

Keyboard editing is available in the canvas by default. Arrow keys move selection between visible
nodes. `Shift+Arrow` nudges selected nodes by 10 graph units, and `Alt+Shift+Arrow` nudges by 1
graph unit. Keyboard movement is disabled in `readOnly` mode.

## Document Invariants

- Node IDs, edge IDs, and group IDs must be non-empty strings and unique within their collection.
- Edges must reference existing source and target nodes.
- If a source node declares `outputs`, the edge `sourcePortId` must exist in those outputs.
- If a target node declares `inputs`, the edge `targetPortId` must exist in those inputs.
- Nodes without declared port arrays remain valid for loose graph models.
- Self edges and cycles are invalid by default; use `allowSelfEdges` or `allowCycles` when the
  host graph model intentionally permits them.
- Groups may only contain existing node IDs, and each node may appear at most once in a group.
- `normalizeGraphEditorDocument(document, { mode: "repair" })` drops recoverably invalid edges and
  groups while preserving valid nodes.
- Clipboard payloads use `@moritzbrantner/graph-editor/clipboard` with version `1`; consumers should
  treat other formats or versions as unsupported.

This package intentionally does not include workflow templates, typed workflow semantics,
persistence backends, sharing UI, collaboration, or a document-library editor shell. Persistence
and sharing should be supplied by consumers through adapter-level integration.
