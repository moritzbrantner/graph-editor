"use client";

import {
  updateGraphEditorEdge,
  updateGraphEditorGroup,
  updateGraphEditorNode,
} from "../../../core";
import { InspectorPanel } from "../../inspector-panel";

import type { GraphWorkbenchController, GraphWorkbenchInspectorSchema } from "../index-core";
import {
  getDefaultEdgeInspectorPatch,
  getDefaultEdgeInspectorSections,
  getDefaultGroupInspectorPatch,
  getDefaultGroupInspectorSections,
  getDefaultNodeInspectorPatch,
  getDefaultNodeInspectorSections,
} from "../index-core";

export function GraphWorkbenchInspector<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>({
  controller,
  inspectorSchema,
}: {
  controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>;
  inspectorSchema?: GraphWorkbenchInspectorSchema<TNodeData, TEdgeData, TPortType>;
}) {
  const node = controller.selectedNode;
  const edge = controller.selectedEdge;
  const group = controller.selectedGroup;
  const selection = node ?? edge ?? group;
  const title = node ? node.label : edge ? edge.id : group ? group.label : "No selection";
  const description = node
    ? (node.kind ?? "Node")
    : edge
      ? `${edge.sourceNodeId}.${edge.sourcePortId} -> ${edge.targetNodeId}.${edge.targetPortId}`
      : group
        ? `${group.nodeIds.length} nodes`
        : "Select a node, group, or connection to edit its properties.";
  const sections = node
    ? (inspectorSchema?.getNodeSections?.(node) ?? getDefaultNodeInspectorSections(node))
    : edge
      ? (inspectorSchema?.getEdgeSections?.(edge) ?? getDefaultEdgeInspectorSections(edge))
      : group
        ? (inspectorSchema?.getGroupSections?.(group) ?? getDefaultGroupInspectorSections(group))
        : [];

  return (
    <aside className="min-h-0 overflow-auto border-l pl-3 max-xl:border-l-0 max-xl:border-t max-xl:pt-3">
      <InspectorPanel
        key={selection ? `${node ? "node" : edge ? "edge" : "group"}:${selection.id}` : "empty"}
        title={title}
        description={description}
        sections={sections}
        readOnly={controller.readOnly || !selection}
        validationMessages={Object.fromEntries(
          controller.selectedDiagnostics.map((diagnostic, index) => [
            index === 0 ? "label" : `diagnostic-${index}`,
            diagnostic.message,
          ]),
        )}
        onApply={(values) => {
          if (node) {
            const patch =
              inspectorSchema?.applyNodeValues?.(node, values) ??
              getDefaultNodeInspectorPatch(values);
            controller.actions.updateDocument(
              updateGraphEditorNode(controller.document, node.id, patch),
            );
          }
          if (edge) {
            const patch =
              inspectorSchema?.applyEdgeValues?.(edge, values) ??
              getDefaultEdgeInspectorPatch(values);
            controller.actions.updateDocument(
              updateGraphEditorEdge(controller.document, edge.id, patch),
            );
          }
          if (group) {
            const patch =
              inspectorSchema?.applyGroupValues?.(group, values) ??
              getDefaultGroupInspectorPatch(values);
            controller.actions.updateDocument(
              updateGraphEditorGroup(controller.document, group.id, patch),
            );
          }
        }}
      />
    </aside>
  );
}
