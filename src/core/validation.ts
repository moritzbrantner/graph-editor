import { detectGraphEditorCycles } from "./graph";
import type {
  GraphEditorDocument,
  GraphEditorDocumentDiagnostic,
  GraphEditorDocumentValidationOptions,
} from "./types";
import { isRecord } from "./utils";

export function validateGraphEditorDocument(
  value: unknown,
  options: GraphEditorDocumentValidationOptions = {},
): GraphEditorDocumentDiagnostic[] {
  const diagnostics: GraphEditorDocumentDiagnostic[] = [];
  if (!isRecord(value)) {
    return [
      {
        code: "invalid-document",
        message: "Graph document must be an object",
        path: "$",
      },
    ];
  }

  if (!Array.isArray(value.nodes)) {
    diagnostics.push({
      code: "invalid-document",
      message: "Graph document nodes must be an array",
      path: "$.nodes",
    });
  }
  if (!Array.isArray(value.edges)) {
    diagnostics.push({
      code: "invalid-document",
      message: "Graph document edges must be an array",
      path: "$.edges",
    });
  }
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    return diagnostics;
  }

  const nodeIds = new Set<string>();
  const validInputPortIdsByNodeId = new Map<string, Set<string>>();
  const validOutputPortIdsByNodeId = new Map<string, Set<string>>();
  value.nodes.forEach((node, index) => {
    const path = `$.nodes[${index}]`;
    if (!isRecord(node)) {
      diagnostics.push({ code: "invalid-node", message: "Graph node must be an object", path });
      return;
    }
    const nodeId = typeof node.id === "string" ? node.id : undefined;
    if (!nodeId?.trim()) {
      diagnostics.push({
        code: "invalid-node",
        message: "Graph node id must be a non-empty string",
        path: `${path}.id`,
      });
    } else if (nodeIds.has(nodeId)) {
      diagnostics.push({
        code: "duplicate-node-id",
        message: `Duplicate graph node id: ${nodeId}`,
        path: `${path}.id`,
        nodeId,
      });
    } else {
      nodeIds.add(nodeId);
    }
    if (nodeId) {
      if (Array.isArray(node.inputs)) {
        validInputPortIdsByNodeId.set(
          nodeId,
          new Set(
            node.inputs.flatMap((port) =>
              isRecord(port) && typeof port.id === "string" ? [port.id] : [],
            ),
          ),
        );
      }
      if (Array.isArray(node.outputs)) {
        validOutputPortIdsByNodeId.set(
          nodeId,
          new Set(
            node.outputs.flatMap((port) =>
              isRecord(port) && typeof port.id === "string" ? [port.id] : [],
            ),
          ),
        );
      }
    }
    if (typeof node.label !== "string") {
      diagnostics.push({
        code: "invalid-node",
        message: "Graph node label must be a string",
        path: `${path}.label`,
        nodeId,
      });
    }
    if (!Number.isFinite(node.x)) {
      diagnostics.push({
        code: "invalid-node",
        message: "Graph node x must be a finite number",
        path: `${path}.x`,
        nodeId,
      });
    }
    if (!Number.isFinite(node.y)) {
      diagnostics.push({
        code: "invalid-node",
        message: "Graph node y must be a finite number",
        path: `${path}.y`,
        nodeId,
      });
    }
  });

  const edgeIds = new Set<string>();
  value.edges.forEach((edge, index) => {
    const path = `$.edges[${index}]`;
    if (!isRecord(edge)) {
      diagnostics.push({ code: "invalid-edge", message: "Graph edge must be an object", path });
      return;
    }
    const edgeId = typeof edge.id === "string" ? edge.id : undefined;
    const sourceNodeId = typeof edge.sourceNodeId === "string" ? edge.sourceNodeId : undefined;
    const targetNodeId = typeof edge.targetNodeId === "string" ? edge.targetNodeId : undefined;
    const sourcePortId = typeof edge.sourcePortId === "string" ? edge.sourcePortId : undefined;
    const targetPortId = typeof edge.targetPortId === "string" ? edge.targetPortId : undefined;
    if (!edgeId?.trim()) {
      diagnostics.push({
        code: "invalid-edge",
        message: "Graph edge id must be a non-empty string",
        path: `${path}.id`,
      });
    } else if (edgeIds.has(edgeId)) {
      diagnostics.push({
        code: "duplicate-edge-id",
        message: `Duplicate graph edge id: ${edgeId}`,
        path: `${path}.id`,
        edgeId,
      });
    } else {
      edgeIds.add(edgeId);
    }
    if (!sourceNodeId || !nodeIds.has(sourceNodeId)) {
      diagnostics.push({
        code: "missing-edge-node",
        message: `Graph edge source node is missing: ${sourceNodeId ?? ""}`,
        path: `${path}.sourceNodeId`,
        edgeId,
        sourceNodeId,
      });
    }
    if (!targetNodeId || !nodeIds.has(targetNodeId)) {
      diagnostics.push({
        code: "missing-edge-node",
        message: `Graph edge target node is missing: ${targetNodeId ?? ""}`,
        path: `${path}.targetNodeId`,
        edgeId,
        targetNodeId,
      });
    }
    if (!options.allowMissingDeclaredPorts && sourceNodeId && nodeIds.has(sourceNodeId)) {
      const validOutputPortIds = validOutputPortIdsByNodeId.get(sourceNodeId);
      if (validOutputPortIds && (!sourcePortId || !validOutputPortIds.has(sourcePortId))) {
        diagnostics.push({
          code: "missing-edge-port",
          message: `Graph edge source port is missing: ${sourcePortId ?? ""}`,
          path: `${path}.sourcePortId`,
          edgeId,
          sourceNodeId,
          sourcePortId,
        });
      }
    }
    if (!options.allowMissingDeclaredPorts && targetNodeId && nodeIds.has(targetNodeId)) {
      const validInputPortIds = validInputPortIdsByNodeId.get(targetNodeId);
      if (validInputPortIds && (!targetPortId || !validInputPortIds.has(targetPortId))) {
        diagnostics.push({
          code: "missing-edge-port",
          message: `Graph edge target port is missing: ${targetPortId ?? ""}`,
          path: `${path}.targetPortId`,
          edgeId,
          targetNodeId,
          targetPortId,
        });
      }
    }
    if (!options.allowSelfEdges && sourceNodeId && targetNodeId && sourceNodeId === targetNodeId) {
      diagnostics.push({
        code: "self-edge",
        message: `Graph edge cannot connect node to itself: ${sourceNodeId}`,
        path,
        edgeId,
        sourceNodeId,
        targetNodeId,
      });
    }
  });

  const groupIds = new Set<string>();
  (Array.isArray(value.groups) ? value.groups : []).forEach((group, index) => {
    const path = `$.groups[${index}]`;
    if (!isRecord(group)) {
      diagnostics.push({ code: "invalid-group", message: "Graph group must be an object", path });
      return;
    }
    const groupId = typeof group.id === "string" ? group.id : undefined;
    if (!groupId?.trim()) {
      diagnostics.push({
        code: "invalid-group",
        message: "Graph group id must be a non-empty string",
        path: `${path}.id`,
      });
    } else if (groupIds.has(groupId)) {
      diagnostics.push({
        code: "duplicate-group-id",
        message: `Duplicate graph group id: ${groupId}`,
        path: `${path}.id`,
        groupId,
      });
    } else {
      groupIds.add(groupId);
    }
    if (typeof group.label !== "string") {
      diagnostics.push({
        code: "invalid-group",
        message: "Graph group label must be a string",
        path: `${path}.label`,
      });
    }
    if (!Array.isArray(group.nodeIds)) {
      diagnostics.push({
        code: "invalid-group",
        message: "Graph group nodeIds must be an array",
        path: `${path}.nodeIds`,
      });
      return;
    }
    const groupNodeIds = new Set<string>();
    group.nodeIds.forEach((nodeId, nodeIndex) => {
      if (typeof nodeId !== "string" || !nodeIds.has(nodeId)) {
        diagnostics.push({
          code: "missing-group-node",
          message: `Graph group node is missing: ${String(nodeId)}`,
          path: `${path}.nodeIds[${nodeIndex}]`,
          groupId,
          nodeId: typeof nodeId === "string" ? nodeId : undefined,
        });
        return;
      }
      if (groupNodeIds.has(nodeId)) {
        diagnostics.push({
          code: "duplicate-group-node",
          message: `Graph group contains duplicate node: ${nodeId}`,
          path: `${path}.nodeIds[${nodeIndex}]`,
          groupId,
          nodeId,
        });
        return;
      }
      groupNodeIds.add(nodeId);
    });
  });

  if (!options.allowCycles && Array.isArray(value.nodes) && Array.isArray(value.edges)) {
    for (const cycle of detectGraphEditorCycles(value as GraphEditorDocument)) {
      diagnostics.push({
        code: "cycle",
        message: `Graph contains a cycle: ${cycle.join(" -> ")}`,
        path: "$.edges",
        nodeId: cycle[0],
      });
    }
  }

  return diagnostics;
}
