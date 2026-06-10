import { createEditorViewportState } from "@moritzbrantner/editor-core/viewport";

import { GraphEditorDocumentValidationError } from "./document-io";
import { validateGraphEditorDocument } from "./validation";
import type {
  GraphEditorDocument,
  GraphEditorDocumentNormalizationOptions,
  GraphEditorEdge,
  GraphEditorGroup,
  GraphEditorNode,
} from "./types";
import { clamp, isRecord, orderedUnique } from "./utils";

export function normalizeGraphEditorDocument<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  options: GraphEditorDocumentNormalizationOptions = {},
): GraphEditorDocument<TNodeData, TEdgeData, TPortType> {
  const mode = options.mode ?? "strict";
  const diagnostics = validateGraphEditorDocument(document, options);
  if (mode === "strict" && diagnostics.length > 0) {
    throw new GraphEditorDocumentValidationError(diagnostics);
  }

  const nodes = Array.isArray(document.nodes)
    ? document.nodes.flatMap((node) =>
        isRecord(node)
          ? [
              {
                ...node,
                id: String(node.id ?? "").trim(),
                label: typeof node.label === "string" ? node.label : "",
                x: Number.isFinite(node.x) ? Number(node.x) : 0,
                y: Number.isFinite(node.y) ? Number(node.y) : 0,
              } as GraphEditorNode<TNodeData, TPortType>,
            ]
          : [],
      )
    : [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const seenEdgeIds = new Set<string>();
  const edges = (Array.isArray(document.edges) ? document.edges : []).flatMap((edge) => {
    if (!isRecord(edge) || typeof edge.id !== "string" || seenEdgeIds.has(edge.id)) {
      return [];
    }
    if (
      typeof edge.sourceNodeId !== "string" ||
      typeof edge.targetNodeId !== "string" ||
      !nodeIds.has(edge.sourceNodeId) ||
      !nodeIds.has(edge.targetNodeId) ||
      (!options.allowSelfEdges && edge.sourceNodeId === edge.targetNodeId)
    ) {
      return [];
    }
    if (
      !options.allowMissingDeclaredPorts &&
      !graphEditorEdgeReferencesDeclaredPorts(edge as GraphEditorEdge<TEdgeData>, nodeById)
    ) {
      return [];
    }
    seenEdgeIds.add(edge.id);
    return [edge as GraphEditorEdge<TEdgeData>];
  });
  const groups = normalizeGraphEditorGroups(document.groups, nodeIds);

  return {
    ...document,
    nodes,
    edges,
    ...(groups.length > 0 ? { groups } : {}),
    viewport: document.viewport
      ? {
          ...createEditorViewportState({
            x: Number.isFinite(document.viewport.x) ? document.viewport.x : 0,
            y: Number.isFinite(document.viewport.y) ? document.viewport.y : 0,
            zoom: document.viewport.zoom,
          }),
          zoom: clamp(document.viewport.zoom, 0.1, 4, 1),
        }
      : undefined,
  };
}

function normalizeGraphEditorGroups(
  groups: GraphEditorDocument["groups"],
  nodeIds: ReadonlySet<string>,
) {
  const seenGroupIds = new Set<string>();
  const seenNodeIds = new Set<string>();
  return (Array.isArray(groups) ? groups : []).flatMap((group) => {
    if (!isRecord(group) || typeof group.id !== "string" || seenGroupIds.has(group.id)) {
      return [];
    }
    const groupNodeIds = orderedUnique(
      [...nodeIds],
      Array.isArray(group.nodeIds) ? group.nodeIds : [],
    ).filter((nodeId) => !seenNodeIds.has(nodeId));
    for (const nodeId of groupNodeIds) {
      seenNodeIds.add(nodeId);
    }
    if (groupNodeIds.length === 0) {
      return [];
    }
    seenGroupIds.add(group.id);
    return [
      {
        ...group,
        label: typeof group.label === "string" ? group.label : "Group",
        nodeIds: groupNodeIds,
      } as GraphEditorGroup,
    ];
  });
}

function graphEditorEdgeReferencesDeclaredPorts<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  edge: GraphEditorEdge<TEdgeData>,
  nodeById: ReadonlyMap<string, GraphEditorNode<TNodeData, TPortType>>,
) {
  const sourceNode = nodeById.get(edge.sourceNodeId);
  const targetNode = nodeById.get(edge.targetNodeId);
  if (!sourceNode || !targetNode) {
    return false;
  }
  const sourcePortIds = Array.isArray(sourceNode.outputs)
    ? new Set(sourceNode.outputs.map((port) => port.id))
    : null;
  const targetPortIds = Array.isArray(targetNode.inputs)
    ? new Set(targetNode.inputs.map((port) => port.id))
    : null;

  return (
    (!sourcePortIds || sourcePortIds.has(edge.sourcePortId)) &&
    (!targetPortIds || targetPortIds.has(edge.targetPortId))
  );
}
