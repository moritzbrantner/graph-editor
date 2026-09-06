import { createEditorViewportState } from "@moritzbrantner/editor-core/viewport";

import { GraphEditorDocumentValidationError } from "./document-io";
import { validateGraphEditorDocument } from "./validation";
import type {
  GraphEditorDocument,
  GraphEditorDocumentNormalizationOptions,
  GraphEditorEdge,
  GraphEditorGroup,
  GraphEditorNode,
  GraphEditorPort,
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

  const seenNodeIds = new Set<string>();
  const nodes = Array.isArray(document.nodes)
    ? document.nodes.flatMap((node) => {
        if (!isRecord(node)) {
          return [];
        }
        const id = String(node.id ?? "").trim();
        if (!id || seenNodeIds.has(id)) {
          return [];
        }
        seenNodeIds.add(id);
        const normalizedNode = {
          ...node,
          id,
          label: typeof node.label === "string" ? node.label : "",
          x: Number.isFinite(node.x) ? Number(node.x) : 0,
          y: Number.isFinite(node.y) ? Number(node.y) : 0,
        } as GraphEditorNode<TNodeData, TPortType>;
        if (node.inputs !== undefined) {
          normalizedNode.inputs = normalizeGraphEditorPorts<TPortType>(node.inputs);
        } else {
          delete normalizedNode.inputs;
        }
        if (node.outputs !== undefined) {
          normalizedNode.outputs = normalizeGraphEditorPorts<TPortType>(node.outputs);
        } else {
          delete normalizedNode.outputs;
        }
        return [normalizedNode];
      })
    : [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const seenEdgeIds = new Set<string>();
  const edges = (Array.isArray(document.edges) ? document.edges : []).flatMap((edge) => {
    if (!isRecord(edge) || typeof edge.id !== "string") {
      return [];
    }
    const id = edge.id.trim();
    const sourceNodeId = typeof edge.sourceNodeId === "string" ? edge.sourceNodeId.trim() : "";
    const targetNodeId = typeof edge.targetNodeId === "string" ? edge.targetNodeId.trim() : "";
    const sourcePortId = typeof edge.sourcePortId === "string" ? edge.sourcePortId.trim() : "";
    const targetPortId = typeof edge.targetPortId === "string" ? edge.targetPortId.trim() : "";
    if (!id || seenEdgeIds.has(id)) {
      return [];
    }
    if (
      !sourceNodeId ||
      !targetNodeId ||
      !sourcePortId ||
      !targetPortId ||
      !nodeIds.has(sourceNodeId) ||
      !nodeIds.has(targetNodeId) ||
      (!options.allowSelfEdges && sourceNodeId === targetNodeId)
    ) {
      return [];
    }
    const normalizedEdge = {
      ...edge,
      id,
      sourceNodeId,
      sourcePortId,
      targetNodeId,
      targetPortId,
    } as GraphEditorEdge<TEdgeData>;
    if (
      !options.allowMissingDeclaredPorts &&
      !graphEditorEdgeReferencesDeclaredPorts(normalizedEdge, nodeById)
    ) {
      return [];
    }
    seenEdgeIds.add(id);
    return [normalizedEdge];
  });
  const groups = normalizeGraphEditorGroups(document.groups, nodeIds);
  const normalizedDocument = {
    ...document,
    nodes,
    edges,
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

  if (groups.length > 0) {
    normalizedDocument.groups = groups;
  } else {
    delete normalizedDocument.groups;
  }
  return normalizedDocument;
}

function normalizeGraphEditorPorts<TPortType>(ports: unknown): Array<GraphEditorPort<TPortType>> {
  const seenPortIds = new Set<string>();
  return (Array.isArray(ports) ? ports : []).flatMap((port) => {
    if (!isRecord(port) || typeof port.id !== "string") {
      return [];
    }
    const id = port.id.trim();
    if (!id || seenPortIds.has(id)) {
      return [];
    }
    seenPortIds.add(id);
    return [
      {
        ...port,
        id,
        label: typeof port.label === "string" ? port.label : "",
      } as GraphEditorPort<TPortType>,
    ];
  });
}

function normalizeGraphEditorGroups(
  groups: GraphEditorDocument["groups"],
  nodeIds: ReadonlySet<string>,
) {
  const seenGroupIds = new Set<string>();
  const seenNodeIds = new Set<string>();
  return (Array.isArray(groups) ? groups : []).flatMap((group) => {
    if (!isRecord(group) || typeof group.id !== "string") {
      return [];
    }
    const id = group.id.trim();
    if (!id || seenGroupIds.has(id)) {
      return [];
    }
    const requestedNodeIds = Array.isArray(group.nodeIds)
      ? group.nodeIds.flatMap((nodeId) =>
          typeof nodeId === "string" && nodeId.trim() ? [nodeId.trim()] : [],
        )
      : [];
    const groupNodeIds = orderedUnique([...nodeIds], requestedNodeIds).filter(
      (nodeId) => !seenNodeIds.has(nodeId),
    );
    for (const nodeId of groupNodeIds) {
      seenNodeIds.add(nodeId);
    }
    if (groupNodeIds.length === 0) {
      return [];
    }
    seenGroupIds.add(id);
    return [
      {
        ...group,
        id,
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
