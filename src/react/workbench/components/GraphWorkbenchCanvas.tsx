"use client";

import * as React from "react";

import {
  createGraphEditorAddEdgeOperation,
  createGraphEditorRemoveSelectionOperation,
  createGraphEditorUpdateEdgeOperation,
} from "../../../operations";
import {
  validateGraphEditorConnection,
  type GraphEditorConnectionInput,
  type GraphEditorConnectionValidationOptions,
  type GraphEditorConnectionValidity,
  type GraphEditorDocument,
  type GraphEditorEdge,
  type GraphEditorViewport,
} from "../../../core";
import {
  GraphCanvas,
  type GraphCanvasConnection,
  type GraphCanvasEdge,
  type GraphCanvasNodeData,
} from "../../graph-canvas";
import type { GraphWorkbenchCommitOptions, GraphWorkbenchController } from "../index-core";
import { createGraphWorkbenchConnectionValidationOptions } from "../index-core";
import { GraphWorkbenchContextPad } from "./GraphWorkbenchContextPad";

export function GraphWorkbenchCanvas<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>({
  controller,
  showMiniMap = true,
  onViewportChange,
  connectionValidationOptions,
  createEdge,
  connectDocument,
  renderContextPad,
  renderCanvasOverlay,
  onCanvasContextMenuCapture,
  onCanvasDoubleClickCapture,
}: {
  controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>;
  showMiniMap?: boolean;
  onViewportChange?: (viewport: GraphEditorViewport) => void;
  connectionValidationOptions?: GraphEditorConnectionValidationOptions<
    TNodeData,
    TEdgeData,
    TPortType
  >;
  createEdge?: (
    connection: GraphEditorConnectionInput,
    context: {
      document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
      validity: GraphEditorConnectionValidity;
    },
  ) => GraphEditorEdge<TEdgeData>;
  connectDocument?: (
    document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>,
    connection: GraphEditorConnectionInput,
    validity: GraphEditorConnectionValidity,
  ) => {
    document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
    edge?: GraphEditorEdge<TEdgeData>;
    connected: boolean;
  };
  renderContextPad?: (
    controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>,
  ) => React.ReactNode;
  renderCanvasOverlay?: (
    controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>,
    context: { containerRef: React.RefObject<HTMLDivElement | null> },
  ) => React.ReactNode;
  onCanvasContextMenuCapture?: (
    event: React.MouseEvent<HTMLDivElement>,
    controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>,
  ) => void;
  onCanvasDoubleClickCapture?: (
    event: React.MouseEvent<HTMLDivElement>,
    controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>,
  ) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasNodes = controller.document.nodes as unknown as GraphCanvasNodeData[];
  const canvasEdges = controller.document.edges as unknown as GraphCanvasEdge[];
  const canvasGroups = (controller.document.groups ?? []) as unknown as React.ComponentProps<
    typeof GraphCanvas
  >["groups"];

  const updateCanvasNodes = (
    nodes: GraphCanvasNodeData[],
    options: GraphWorkbenchCommitOptions,
  ) => {
    controller.actions.updateDocument(
      {
        ...controller.document,
        nodes: nodes as unknown as GraphEditorDocument<TNodeData, TEdgeData, TPortType>["nodes"],
      },
      options,
    );
  };
  const updateCanvasEdges = (edges: GraphCanvasEdge[]) => {
    controller.actions.updateDocument({
      ...controller.document,
      edges: edges as unknown as GraphEditorDocument<TNodeData, TEdgeData, TPortType>["edges"],
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative min-h-0"
      onContextMenuCapture={(event) => onCanvasContextMenuCapture?.(event, controller)}
      onDoubleClickCapture={(event) => onCanvasDoubleClickCapture?.(event, controller)}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("application/x-graph-workbench-template")) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(event) => {
        const templateId = event.dataTransfer.getData("application/x-graph-workbench-template");
        const template = controller.palette.items.find((item) => item.id === templateId);
        if (!template) {
          return;
        }

        event.preventDefault();
        const surface = (event.target as HTMLElement | null)?.closest<HTMLElement>(
          "[data-slot='workflow-builder-surface']",
        );
        const surfaceRect = surface?.getBoundingClientRect();
        const viewport = controller.document.viewport ?? { x: 0, y: 0, zoom: 1 };
        const fallback = { x: 80, y: 80 };
        const position = surfaceRect
          ? {
              x: Math.round((event.clientX - surfaceRect.left - viewport.x) / viewport.zoom),
              y: Math.round((event.clientY - surfaceRect.top - viewport.y) / viewport.zoom),
            }
          : fallback;

        controller.actions.addTemplateNode(template, position);
      }}
    >
      <GraphCanvas
        nodes={canvasNodes}
        edges={canvasEdges}
        groups={canvasGroups}
        readOnly={controller.readOnly}
        selectedNodeIds={controller.selection.nodeIds}
        selectedEdgeIds={controller.selection.edgeIds}
        selectedGroupIds={controller.selection.groupIds ?? []}
        getNodeDragGroupIds={(nodeId) => {
          const group = (controller.document.groups ?? []).find((candidate) =>
            candidate.nodeIds.includes(nodeId),
          );
          return group?.nodeIds ?? [nodeId];
        }}
        onNodePointerSelect={(nodeId) => {
          const group = (controller.document.groups ?? []).find((candidate) =>
            candidate.nodeIds.includes(nodeId),
          );
          return group ? { type: "group", id: group.id } : undefined;
        }}
        showMiniMap={showMiniMap}
        showToolbar={false}
        showPortColumnHeaders={false}
        viewport={controller.document.viewport}
        onViewportChange={(viewport) => {
          controller.actions.updateDocument(
            { ...controller.document, viewport },
            { history: false },
          );
          onViewportChange?.(viewport);
        }}
        onNodesChange={(nodes) => updateCanvasNodes(nodes, { history: false, drag: "move" })}
        onNodesChangeEnd={(nodes) => updateCanvasNodes(nodes, { drag: "end" })}
        onEdgesChange={updateCanvasEdges}
        isConnectionValid={(connection) =>
          validateGraphEditorConnection(
            controller.document,
            connection,
            createGraphWorkbenchConnectionValidationOptions(connectionValidationOptions, {
              ignoreEdgeId: connection.ignoreEdgeId,
            }),
          )
        }
        onConnectionCreate={(connection: GraphCanvasConnection) => {
          if (connectDocument) {
            const validity = validateGraphEditorConnection(
              controller.document,
              connection,
              createGraphWorkbenchConnectionValidationOptions(connectionValidationOptions),
            );
            const result = connectDocument(controller.document, connection, validity);
            if (!result.connected) {
              return false;
            }
            controller.actions.updateDocument(result.document, {
              selectionAfter: result.edge
                ? {
                    nodeIds: [],
                    edgeIds: [result.edge.id],
                    primary: { type: "edge", id: result.edge.id },
                  }
                : { nodeIds: [], edgeIds: [] },
            });
            return true;
          }

          controller.dispatch(
            createGraphEditorAddEdgeOperation<TNodeData, TEdgeData, TPortType>({
              connection,
              validationOptions: createGraphWorkbenchConnectionValidationOptions(
                connectionValidationOptions,
              ),
              createEdge: createEdge
                ? (nextConnection, context) =>
                    createEdge(nextConnection, {
                      document: context.document,
                      validity: context.validity,
                    })
                : undefined,
              selectionAfter: { nodeIds: [], edgeIds: [] },
            }),
          );
          return true;
        }}
        onConnectionRewire={(edge, connection) => {
          controller.dispatch(
            createGraphEditorUpdateEdgeOperation<TNodeData, TEdgeData, TPortType>(
              edge.id,
              connection,
              {
                selectionAfter: {
                  nodeIds: [],
                  edgeIds: [edge.id],
                  primary: { type: "edge", id: edge.id },
                },
              },
            ),
          );
          return true;
        }}
        onConnectionDelete={(edge) => {
          controller.dispatch(
            createGraphEditorRemoveSelectionOperation<TNodeData, TEdgeData, TPortType>({
              nodeIds: [],
              edgeIds: [edge.id],
              primary: { type: "edge", id: edge.id },
            }),
          );
        }}
        onSelectionStateChange={controller.actions.setSelection}
      />
      {renderContextPad ? (
        renderContextPad(controller)
      ) : (
        <GraphWorkbenchContextPad controller={controller} />
      )}
      {renderCanvasOverlay?.(controller, { containerRef })}
    </div>
  );
}
