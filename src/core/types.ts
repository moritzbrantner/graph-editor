import type { EditorGraphConnection } from "@moritzbrantner/editor-core/constraints";
import type {
  EditorEntityBase,
  EditorEntityId,
  EditorGraphEdge,
  EditorGraphPort,
} from "@moritzbrantner/editor-core/entities";
import type { EditorViewportState } from "@moritzbrantner/editor-core/viewport";

export type GraphEditorPort<TPortType = unknown, TPortData = Record<string, unknown>> = Omit<
  EditorGraphPort,
  "label"
> & {
  id: string;
  label: string;
  kind?: string;
  type?: TPortType;
  required?: boolean;
  description?: string;
  badge?: string;
  color?: string;
  data?: TPortData;
  metadata?: Record<string, unknown>;
};

export type GraphEditorNode<TNodeData = Record<string, unknown>, TPortType = unknown> = {
  id: EditorEntityId;
  label: string;
  type?: EditorEntityBase["type"];
  parentId?: EditorEntityBase["parentId"];
  order?: EditorEntityBase["order"];
  description?: string;
  kind?: string;
  category?: string;
  categoryPath?: readonly string[];
  eyebrow?: string;
  packageLabel?: string;
  status?: "idle" | "running" | "success" | "error" | "warning" | string;
  tone?: "neutral" | "info" | "success" | "warning" | "error" | string;
  variant?: "default" | "compact";
  minimized?: boolean;
  tags?: string[];
  x: number;
  y: number;
  inputs?: Array<GraphEditorPort<TPortType>>;
  outputs?: Array<GraphEditorPort<TPortType>>;
  data?: TNodeData;
  metadata?: Record<string, unknown>;
};

export type GraphEditorEdge<TEdgeData = Record<string, unknown>> = {
  id: EditorEntityId;
  sourceNodeId: EditorEntityId;
  sourcePortId: NonNullable<EditorGraphConnection["sourcePortId"]>;
  targetNodeId: EditorEntityId;
  targetPortId: NonNullable<EditorGraphConnection["targetPortId"]>;
  type?: EditorGraphEdge["type"];
  color?: string;
  status?: "idle" | "running" | "success" | "error" | "warning" | string;
  data?: TEdgeData;
  metadata?: Record<string, unknown>;
};

export type GraphEditorGroup<TGroupData = Record<string, unknown>> = {
  id: EditorEntityId;
  label: string;
  nodeIds: EditorEntityId[];
  type?: EditorEntityBase["type"];
  parentId?: EditorEntityBase["parentId"];
  order?: EditorEntityBase["order"];
  minimized?: boolean;
  data?: TGroupData;
};

export type GraphEditorViewport = EditorViewportState;

export type GraphEditorDocument<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  nodes: Array<GraphEditorNode<TNodeData, TPortType>>;
  edges: Array<GraphEditorEdge<TEdgeData>>;
  groups?: Array<GraphEditorGroup>;
  viewport?: GraphEditorViewport;
};

export type GraphEditorNodeTemplate<
  TNodeData = Record<string, unknown>,
  TPortType = unknown,
> = Omit<GraphEditorNode<TNodeData, TPortType>, "x" | "y">;

export type GraphEditorSelectionItem =
  | { type: "node"; id: string }
  | { type: "edge"; id: string }
  | { type: "group"; id: string };

export type GraphEditorSelectionState = {
  nodeIds: string[];
  edgeIds: string[];
  groupIds?: string[];
  primary?: GraphEditorSelectionItem;
};

export type GraphEditorSelectionMode = "replace" | "toggle" | "extend";

export type GraphEditorBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type GraphEditorSelectableBounds = GraphEditorSelectionItem & {
  bounds: GraphEditorBounds;
};

export type GraphEditorGroupBounds = {
  groupId: string;
  bounds: GraphEditorBounds;
  nodeIds: string[];
};

export type GraphEditorConnectionInput = {
  sourceNodeId: EditorGraphConnection["sourceId"];
  sourcePortId: NonNullable<EditorGraphConnection["sourcePortId"]>;
  targetNodeId: EditorGraphConnection["targetId"];
  targetPortId: NonNullable<EditorGraphConnection["targetPortId"]>;
};

export type GraphEditorConnectionInvalidReason =
  | "cycle"
  | "duplicate"
  | "input-occupied"
  | "kind-mismatch"
  | "missing-node"
  | "missing-port"
  | "self-connection"
  | "type-mismatch";

export type GraphEditorConnectionValidity = {
  valid: boolean;
  reason?: GraphEditorConnectionInvalidReason;
};

export type GraphEditorDocumentDiagnosticCode =
  | "invalid-document"
  | "invalid-node"
  | "invalid-edge"
  | "duplicate-node-id"
  | "duplicate-edge-id"
  | "duplicate-group-id"
  | "duplicate-group-node"
  | "missing-edge-node"
  | "missing-edge-port"
  | "missing-group-node"
  | "self-edge"
  | "cycle"
  | "invalid-group";

export type GraphEditorDocumentDiagnostic = {
  code: GraphEditorDocumentDiagnosticCode;
  message: string;
  path: string;
  nodeId?: string;
  groupId?: string;
  edgeId?: string;
  sourcePortId?: string;
  targetPortId?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
};

export type GraphEditorDocumentValidationOptions = {
  allowCycles?: boolean;
  allowMissingDeclaredPorts?: boolean;
  allowSelfEdges?: boolean;
};

export type GraphEditorDocumentNormalizationMode = "strict" | "repair";

export type GraphEditorDocumentNormalizationOptions = GraphEditorDocumentValidationOptions & {
  mode?: GraphEditorDocumentNormalizationMode;
};

export type GraphEditorConnectionValidationOptions<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  allowCycles?: boolean;
  allowDuplicateEdges?: boolean;
  allowOccupiedInputs?: boolean;
  allowSelfConnections?: boolean;
  ignoreEdgeId?: string;
  arePortsCompatible?: (
    sourcePort: GraphEditorPort<TPortType>,
    targetPort: GraphEditorPort<TPortType>,
    context: GraphEditorDocumentContext<TNodeData, TEdgeData, TPortType>,
  ) => GraphEditorConnectionValidity | boolean;
};

export type GraphEditorDocumentContext<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  nodeById: ReadonlyMap<EditorEntityId, GraphEditorNode<TNodeData, TPortType>>;
  edgeById: ReadonlyMap<EditorEntityId, GraphEditorEdge<TEdgeData>>;
  adjacencyByNodeId: ReadonlyMap<EditorEntityId, readonly EditorEntityId[]>;
  incomingEdgesByNodeId: ReadonlyMap<EditorEntityId, readonly GraphEditorEdge<TEdgeData>[]>;
  outgoingEdgesByNodeId: ReadonlyMap<EditorEntityId, readonly GraphEditorEdge<TEdgeData>[]>;
  getInputPort(nodeId: string, portId: string): GraphEditorPort<TPortType> | null;
  getOutputPort(nodeId: string, portId: string): GraphEditorPort<TPortType> | null;
  getIncomingEdgeToPort(nodeId: string, portId: string): GraphEditorEdge<TEdgeData> | null;
  canReach(sourceNodeId: string, targetNodeId: string): boolean;
};

export type GraphEditorDuplicateNodeOptions = {
  offsetX?: number;
  offsetY?: number;
  createId?: (baseId: string, existingIds: ReadonlySet<string>) => string;
};

export type GraphEditorCreateGroupOptions = {
  id?: string;
  label?: string;
  nodeIds: readonly string[];
};
