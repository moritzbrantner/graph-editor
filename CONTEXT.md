# Graph Editor

Graph Editor is the language context for reusable graph document utilities and React primitives for node graph editors. It specializes Editor Core's host-owned document, selection, operation, adapter, and runtime foundation for editable node graphs.

## Language

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
