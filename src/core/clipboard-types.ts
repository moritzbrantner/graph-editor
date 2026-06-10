import type {
  GraphEditorDocument,
  GraphEditorEdge,
  GraphEditorGroup,
  GraphEditorNode,
} from "./types";
import type { graphEditorClipboardFormat, graphEditorClipboardVersion } from "./constants";

export type GraphEditorClipboardPayload<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  format: typeof graphEditorClipboardFormat;
  version: typeof graphEditorClipboardVersion;
  copiedAt: string;
  sourceDocumentId?: string;
  nodes: Array<GraphEditorNode<TNodeData, TPortType>>;
  edges: Array<GraphEditorEdge<TEdgeData>>;
  groups?: Array<GraphEditorGroup>;
};

export type GraphEditorPasteOptions = {
  offsetX?: number;
  offsetY?: number;
  createNodeId?: (baseId: string, existingIds: ReadonlySet<string>) => string;
  createEdgeId?: (baseId: string, existingIds: ReadonlySet<string>) => string;
};

export type GraphEditorPasteResult<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  nodeIds: string[];
  edgeIds: string[];
  groupIds?: string[];
};
