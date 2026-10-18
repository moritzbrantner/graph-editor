# @moritzbrantner/graph-editor

Generic graph document utilities and React primitives for node graph editors.

Built on `@moenarch/editor-core` for shared document serialization, history, hotkeys,
viewport math, graph adapters, indexing, and entity selection primitives.

## Graph vocabulary

**Graph Document**:
A Graph Editor specialization of an Editor Core Document: portable persisted graph content containing nodes, edges, optional groups, and optional persisted viewport state.
_Avoid_: Runtime state, canvas state, core document schema

**Node**:
An addressable graph entity with a stable identity, label, position, and optional ports.
_Avoid_: Vertex, block

**Port**:
A named input or output endpoint on a node that an edge may attach to. Ports may carry kind or type constraints.
_Avoid_: Socket, handle

**Edge**:
A persistent directed graph entity from a source node port to a target node port.
_Avoid_: Link, wire, connection

**Connection**:
A proposed or transient endpoint pair used while validating, creating, or rewiring an edge.
_Avoid_: Edge, link

**Group**:
A lightweight visual and organizational graph entity that contains nodes in a graph document. A group is flat and does not contain its own graph document.
_Avoid_: Folder, nested graph

**Graph Selection**:
A graph-specific selection projection containing selected nodes, edges, and optional groups.
_Avoid_: Highlight, focus, core selection model

**Primary Graph Selection**:
The selected graph entity treated as the anchor for inspection or follow-up actions when multiple graph entities are selected.
_Avoid_: Active item, focused item

**Viewport**:
Optional persisted view state for the visible graph coordinate space, including pan position and zoom.
_Avoid_: Camera, runtime state, screen state

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
- `serializeGraphEditorDocument(...)`, patch helpers, plugin registries, interaction sessions, and
  deterministic operation-log helpers for headless integrations.
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
- `@moritzbrantner/graph-editor/serialization`: graph document envelopes, JSON parsing, and
  migration-aware reads.
- `@moritzbrantner/graph-editor/persistence`: adapter-level runtime load/save helpers plus browser
  local storage and memory storage adapters.
- `@moritzbrantner/graph-editor/patches`: graph document diff/apply/invert helpers.
- `@moritzbrantner/graph-editor/plugins`: plugin registry, validator, preflight, and command
  composition helpers.
- `@moritzbrantner/graph-editor/interaction`: headless preview/cancel/commit interaction sessions.
- `@moritzbrantner/graph-editor/operation-log`: deterministic serialized operation-log helpers.
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

### Serialization

```ts
import {
  parseGraphEditorDocumentJson,
  readSerializedGraphEditorDocument,
  serializeGraphEditorDocument,
} from "@moritzbrantner/graph-editor/serialization";

const serialized = serializeGraphEditorDocument(document, {
  exportedAt: false,
  metadata: { source: "importer" },
});

const fromEnvelope = readSerializedGraphEditorDocument(serialized);
const fromJson = parseGraphEditorDocumentJson(JSON.stringify(serialized));
```

### Persistence

```ts
import { createGraphEditorRuntime } from "@moritzbrantner/graph-editor/runtime";
import {
  createGraphEditorLocalStorage,
  loadGraphEditorRuntimePersistence,
  saveGraphEditorRuntimePersistence,
} from "@moritzbrantner/graph-editor/persistence";

const storage = createGraphEditorLocalStorage({ key: "graph-editor:document" });

let runtime = createGraphEditorRuntime({ initialDocument: { nodes: [], edges: [] } });
runtime = (await loadGraphEditorRuntimePersistence(runtime, storage)).runtime;
runtime = (await saveGraphEditorRuntimePersistence(runtime, storage, { force: true })).runtime;
```

`loadGraphEditorRuntimePersistence` clears operation history after replacing the committed document
snapshot. `createGraphEditorMemoryStorage(document)` is available for tests and examples without a
browser storage dependency.

### Patches

```ts
import {
  applyGraphEditorDocumentPatch,
  diffGraphEditorDocuments,
} from "@moritzbrantner/graph-editor/patches";

const patch = diffGraphEditorDocuments(beforeDocument, afterDocument);
const nextDocument = applyGraphEditorDocumentPatch(beforeDocument, patch);
```

### Plugins

```ts
import { applyGraphEditorOperation, createGraphEditorRuntime } from "@moritzbrantner/graph-editor";
import { createGraphEditorAddNodeOperation } from "@moritzbrantner/graph-editor/operations";
import { createGraphEditorPluginRegistry } from "@moritzbrantner/graph-editor/plugins";

const qualityPlugin = {
  id: "quality",
  validators: [
    (document) =>
      document.nodes.some((node) => node.label === "Blocked")
        ? [{ path: "$.nodes", message: "Blocked label" }]
        : [],
  ],
  commands: [{ id: "quality.inspect", label: "Inspect" }],
};

createGraphEditorPluginRegistry([qualityPlugin]);

let runtime = createGraphEditorRuntime({
  initialDocument: { nodes: [], edges: [] },
  plugins: [qualityPlugin],
});
runtime = applyGraphEditorOperation(
  runtime,
  createGraphEditorAddNodeOperation({
    node: { id: "node-1", label: "Node 1", x: 0, y: 0 },
  }),
);
```

### Operation Logs

```ts
import { applyGraphEditorOperation, createGraphEditorRuntime } from "@moritzbrantner/graph-editor";
import {
  graphEditorOperationFromSerializedOperation,
  readGraphEditorOperationLog,
  serializeGraphEditorOperation,
  serializeGraphEditorOperationLog,
} from "@moritzbrantner/graph-editor/operation-log";

const addNode = serializeGraphEditorOperation("graph.add-node", {
  type: "graph.add-node",
  node: { id: "node-1", label: "Node 1", x: 0, y: 0 },
});
const log = serializeGraphEditorOperationLog([addNode], { exportedAt: false });

const runtime = readGraphEditorOperationLog(log).reduce(
  (currentRuntime, operation) =>
    applyGraphEditorOperation(
      currentRuntime,
      graphEditorOperationFromSerializedOperation(operation),
    ),
  createGraphEditorRuntime({ initialDocument: { nodes: [], edges: [] } }),
);
```

Operation logs intentionally reject `graph.paste` and `graph.duplicate-selection` payloads unless a
consumer materializes their generated ids into deterministic patches or replacement documents.

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

#### Composing node content

Domain editors put their own controls inside nodes through `renderNodeBody`. They don't need
portals, DOM queries or CSS overrides. GraphCanvas keeps owning selection, dragging, connections
and geometry:

```tsx
<GraphCanvas
  nodes={nodes}
  edges={edges}
  getNodeBodyHeight={(node) => (node.kind === "threshold" ? 48 : 0)}
  renderNodeBody={({ node, readOnly, height }) => (
    <ThresholdField nodeId={node.id} disabled={readOnly} />
  )}
/>
```

- The body sits between the header and the ports of expanded nodes. Minimized and compact nodes
  have none.
- `getNodeBodyHeight` feeds the one geometry model (`GraphNodeLayoutOptions.nodeBodyHeight`), so
  port anchors, edges, snapping, bounds and `alignGraphEditorNodes` / `distributeGraphEditorNodes`
  (via their `layoutOptions` argument) stay consistent.
- Pointer interaction inside the body never starts a node drag. Graph shortcuts ignore editable
  targets.
- `renderMinimizedNodeContent` shows compact content, such as one value field, inline in a
  minimized node's header. It fits the fixed minimized geometry and also never starts a drag.
  `GraphNode` takes it as `minimizedContent`.
- `renderPortContent({ node, port, direction })` puts compact content, such as an inline port
  name editor, on an expanded node's port card, on the line where the type badge sits. The port
  row keeps its fixed height, the port button keeps its role and label, and the content never
  starts a drag.
- `getNodeMenuItems(node)` fills the node's action menu (the "⋯" trigger), so a consumer does
  not need its own action overlay. `nodeMenuLabel` names the menu.
- `renderNodeTitle({ node, selected, readOnly })` replaces the header's select button and label,
  for example with an inline rename field. Return `undefined` to keep the default title. The
  title area never starts a drag. `GraphNode` takes it as `titleContent`.
- `GraphNode` accepts the same content as `body` + `nodeBodyHeight`. `GraphNodeBody` is the
  exported slot component, alongside `GraphNodeMenu`, `GraphNodeMinimizeButton`,
  `GraphNodePortColumn` and `GraphNodeMinimizedPorts`.

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
persistence backends or persistence UI, sharing UI, collaboration transport, sync, presence, or a
document-library editor shell. It does provide headless adapter-level persistence helpers over
`editor-core`; consumers still own storage backends, sharing flows, and product-specific document
management.
