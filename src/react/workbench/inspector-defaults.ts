import { type GraphEditorEdge, type GraphEditorGroup, type GraphEditorNode } from "../../core";
import { type InspectorFieldValue, type InspectorPanelSectionData } from "../inspector-panel";

export function getDefaultNodeInspectorSections<
  TNodeData = Record<string, unknown>,
  TPortType = unknown,
>(node: GraphEditorNode<TNodeData, TPortType>): InspectorPanelSectionData[] {
  return [
    {
      id: "general",
      title: "General",
      defaultOpen: true,
      fields: [
        { id: "label", label: "Label", type: "text", value: node.label },
        {
          id: "description",
          label: "Description",
          type: "textarea",
          value: node.description ?? "",
        },
        { id: "kind", label: "Kind", type: "text", value: node.kind ?? "" },
        { id: "category", label: "Category", type: "text", value: node.category ?? "" },
      ],
    },
    {
      id: "presentation",
      title: "Presentation",
      fields: [
        { id: "tone", label: "Tone", type: "text", value: node.tone ?? "" },
        { id: "status", label: "Status", type: "text", value: node.status ?? "" },
        {
          id: "variant",
          label: "Variant",
          type: "select",
          value: node.variant ?? "default",
          options: [
            { label: "Default", value: "default" },
            { label: "Compact", value: "compact" },
          ],
        },
        { id: "minimized", label: "Minimized", type: "boolean", value: Boolean(node.minimized) },
      ],
    },
    {
      id: "data",
      title: "Data",
      defaultOpen: false,
      fields: [
        {
          id: "data",
          label: "Data",
          type: "code",
          readOnly: true,
          value: JSON.stringify(node.data ?? {}, null, 2),
        },
        {
          id: "metadata",
          label: "Metadata",
          type: "code",
          readOnly: true,
          value: JSON.stringify(node.metadata ?? {}, null, 2),
        },
      ],
    },
  ];
}

export function getDefaultEdgeInspectorSections<TEdgeData = Record<string, unknown>>(
  edge: GraphEditorEdge<TEdgeData>,
): InspectorPanelSectionData[] {
  return [
    {
      id: "connection",
      title: "Connection",
      defaultOpen: true,
      fields: [
        {
          id: "sourceNodeId",
          label: "Source node",
          type: "text",
          readOnly: true,
          value: edge.sourceNodeId,
        },
        {
          id: "sourcePortId",
          label: "Source port",
          type: "text",
          readOnly: true,
          value: edge.sourcePortId,
        },
        {
          id: "targetNodeId",
          label: "Target node",
          type: "text",
          readOnly: true,
          value: edge.targetNodeId,
        },
        {
          id: "targetPortId",
          label: "Target port",
          type: "text",
          readOnly: true,
          value: edge.targetPortId,
        },
      ],
    },
    {
      id: "presentation",
      title: "Presentation",
      fields: [
        { id: "status", label: "Status", type: "text", value: edge.status ?? "" },
        { id: "color", label: "Color", type: "color", value: edge.color ?? "#000000" },
      ],
    },
    {
      id: "data",
      title: "Data",
      defaultOpen: false,
      fields: [
        {
          id: "data",
          label: "Data",
          type: "code",
          readOnly: true,
          value: JSON.stringify(edge.data ?? {}, null, 2),
        },
        {
          id: "metadata",
          label: "Metadata",
          type: "code",
          readOnly: true,
          value: JSON.stringify(edge.metadata ?? {}, null, 2),
        },
      ],
    },
  ];
}

export function getDefaultGroupInspectorSections(
  group: GraphEditorGroup,
): InspectorPanelSectionData[] {
  return [
    {
      id: "general",
      title: "General",
      defaultOpen: true,
      fields: [
        { id: "label", label: "Label", type: "text", value: group.label },
        {
          id: "minimized",
          label: "Minimized",
          type: "boolean",
          value: Boolean(group.minimized),
        },
      ],
    },
    {
      id: "members",
      title: "Members",
      defaultOpen: false,
      fields: [
        {
          id: "nodeIds",
          label: "Node IDs",
          type: "code",
          readOnly: true,
          value: JSON.stringify(group.nodeIds, null, 2),
        },
      ],
    },
  ];
}

export function getDefaultNodeInspectorPatch<
  TNodeData = Record<string, unknown>,
  TPortType = unknown,
>(values: Record<string, InspectorFieldValue>): Partial<GraphEditorNode<TNodeData, TPortType>> {
  const variant: GraphEditorNode<TNodeData, TPortType>["variant"] =
    values.variant === "compact" ? "compact" : "default";

  return {
    label: String(values.label ?? ""),
    description: optionalString(values.description),
    kind: optionalString(values.kind),
    category: optionalString(values.category),
    tone: optionalString(values.tone),
    status: optionalString(values.status),
    variant,
    minimized: Boolean(values.minimized),
  };
}

export function getDefaultEdgeInspectorPatch<TEdgeData = Record<string, unknown>>(
  values: Record<string, InspectorFieldValue>,
): Partial<GraphEditorEdge<TEdgeData>> {
  return {
    status: optionalString(values.status),
    color: optionalString(values.color),
  };
}

export function getDefaultGroupInspectorPatch(
  values: Record<string, InspectorFieldValue>,
): Partial<GraphEditorGroup> {
  return {
    label: String(values.label ?? ""),
    minimized: Boolean(values.minimized),
  };
}

function optionalString(value: InspectorFieldValue) {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text : undefined;
}
