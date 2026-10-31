"use client";

import * as React from "react";

import { createUniqueEditorId } from "@moenarch/editor-core/entities";
import {
  addGraphEditorEdge,
  validateGraphEditorConnection,
  type GraphEditorConnectionInput,
  type GraphEditorConnectionValidationOptions,
  type GraphEditorConnectionValidity,
  type GraphEditorDocument,
  type GraphEditorEdge,
  type GraphEditorPort,
} from "../../core";
import { type GraphWorkbenchProps } from "./types";

export function useGraphWorkbenchConnections<TNodeData, TEdgeData, TPortType>({
  connectionValidationOptions,
  createEdge,
  connectDocument: customConnectDocument,
}: Pick<
  GraphWorkbenchProps<TNodeData, TEdgeData, TPortType>,
  "connectionValidationOptions" | "createEdge" | "connectDocument"
>) {
  const getConnectionValidity = React.useCallback(
    (
      sourceDocument: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
      connection: GraphEditorConnectionInput,
      options: Partial<
        GraphEditorConnectionValidationOptions<TNodeData, TEdgeData, TPortType>
      > = {},
    ) =>
      validateGraphEditorConnection(
        sourceDocument,
        connection,
        createGraphWorkbenchConnectionValidationOptions(connectionValidationOptions, options),
      ),
    [connectionValidationOptions],
  );

  const connectDocument = React.useCallback(
    (
      sourceDocument: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
      connection: GraphEditorConnectionInput,
      options: Partial<
        GraphEditorConnectionValidationOptions<TNodeData, TEdgeData, TPortType>
      > = {},
    ) => {
      const validity = getConnectionValidity(sourceDocument, connection, options);

      if (!validity.valid) {
        return { document: sourceDocument, connected: false };
      }

      if (customConnectDocument) {
        return customConnectDocument(sourceDocument, connection, validity);
      }

      const edge =
        createEdge?.(connection, { document: sourceDocument, validity }) ??
        ({
          id: createGraphWorkbenchEdgeId(sourceDocument, connection),
          ...connection,
        } as GraphEditorEdge<TEdgeData>);

      return {
        document: addGraphEditorEdge(sourceDocument, edge),
        connected: true,
      };
    },
    [createEdge, customConnectDocument, getConnectionValidity],
  );

  return { getConnectionValidity, connectDocument };
}

export function createGraphWorkbenchConnectionValidationOptions<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  options: GraphEditorConnectionValidationOptions<TNodeData, TEdgeData, TPortType> | undefined,
  overrides: Partial<GraphEditorConnectionValidationOptions<TNodeData, TEdgeData, TPortType>> = {},
): GraphEditorConnectionValidationOptions<TNodeData, TEdgeData, TPortType> {
  return {
    ...options,
    ...overrides,
    arePortsCompatible:
      overrides.arePortsCompatible ??
      options?.arePortsCompatible ??
      ((sourcePort, targetPort) => {
        const sourceType = getGraphWorkbenchPortTypeSource(sourcePort);
        const targetType = getGraphWorkbenchPortTypeSource(targetPort);

        return !sourceType || !targetType || sourceType === targetType;
      }),
  };
}

function getGraphWorkbenchPortTypeSource(port: GraphEditorPort) {
  if (!port.type) {
    return undefined;
  }

  if (typeof port.type === "string") {
    return port.type.trim();
  }

  if (typeof port.type === "object" && port.type !== null) {
    const candidate = port.type as { source?: unknown; kind?: unknown };
    const source = candidate.source ?? candidate.kind;
    return typeof source === "string" ? source.trim() : undefined;
  }

  return undefined;
}

export function getFirstValidGraphWorkbenchConnection<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>(
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
  sourceNodeId: string,
  targetNodeId: string,
  getConnectionValidity: (
    document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    connection: GraphEditorConnectionInput,
  ) => GraphEditorConnectionValidity,
) {
  const sourceNode = document.nodes.find((node) => node.id === sourceNodeId);
  const targetNode = document.nodes.find((node) => node.id === targetNodeId);

  for (const sourcePort of sourceNode?.outputs ?? []) {
    for (const targetPort of targetNode?.inputs ?? []) {
      const connection = {
        sourceNodeId,
        sourcePortId: sourcePort.id,
        targetNodeId,
        targetPortId: targetPort.id,
      };
      if (getConnectionValidity(document, connection).valid) {
        return connection;
      }
    }
  }

  return null;
}

function createGraphWorkbenchEdgeId(
  document: GraphEditorDocument<any, any, any>,
  connection: GraphEditorConnectionInput,
) {
  return createUniqueEditorId(
    `edge-${connection.sourceNodeId}-${connection.sourcePortId}-${connection.targetNodeId}-${connection.targetPortId}`,
    new Set(document.edges.map((edge) => edge.id)),
  );
}
