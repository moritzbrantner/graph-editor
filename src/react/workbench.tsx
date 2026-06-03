"use client";

import * as React from "react";

import { Button, Input, cn } from "@moritzbrantner/ui";
import {
  addGraphEditorNode,
  connectGraphEditorNodes,
  normalizeGraphEditorSelection,
  removeGraphEditorSelection,
  type GraphEditorDocument,
  type GraphEditorEdge,
  type GraphEditorNode,
  type GraphEditorNodeTemplate,
  type GraphEditorSelectionState,
  type GraphEditorViewport,
} from "../core";
import { GraphCanvas, type GraphCanvasConnection, type GraphCanvasSelection } from "./graph-canvas";
import {
  createGraphWorkbenchPaletteCategoryGroups,
  filterGraphWorkbenchPaletteTemplates,
  type GraphWorkbenchPaletteCategoryGroup,
  type GraphWorkbenchPaletteItem,
} from "./palette-model";

export type GraphWorkbenchController<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  readOnly: boolean;
  selection: GraphEditorSelectionState;
  selectedNode?: GraphEditorNode<TNodeData, TPortType>;
  selectedEdge?: GraphEditorEdge<TEdgeData>;
  palette: {
    groups: Array<GraphWorkbenchPaletteCategoryGroup<TNodeData>>;
    items: ReadonlyArray<GraphWorkbenchPaletteItem<TNodeData>>;
    filteredItems: ReadonlyArray<GraphWorkbenchPaletteItem<TNodeData>>;
    searchValue: string;
    setSearchValue: (value: string) => void;
  };
  actions: {
    addTemplateNode: (
      template: GraphWorkbenchPaletteItem<TNodeData>,
      position?: { x: number; y: number },
    ) => void;
    deleteSelection: () => void;
    setSelection: (selection: GraphEditorSelectionState) => void;
    updateDocument: (document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>) => void;
  };
};

export type GraphWorkbenchProps<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
> = {
  document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>;
  nodeTemplates?: ReadonlyArray<GraphEditorNodeTemplate<TNodeData, TPortType>>;
  selectedNodeIds?: readonly string[] | null;
  selectedEdgeIds?: readonly string[] | null;
  selectedGroupIds?: readonly string[] | null;
  readOnly?: boolean;
  className?: string;
  showMiniMap?: boolean;
  onDocumentChange?: (document: GraphEditorDocument<TNodeData, TEdgeData, TPortType>) => void;
  onSelectionStateChange?: (selection: GraphEditorSelectionState) => void;
  onViewportChange?: (viewport: GraphEditorViewport) => void;
  renderToolbar?: (
    controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>,
  ) => React.ReactNode;
  renderPalette?: (
    controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>,
  ) => React.ReactNode;
  renderInspector?: (
    controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>,
  ) => React.ReactNode;
};

const emptySelection: GraphEditorSelectionState = { nodeIds: [], edgeIds: [] };

export function GraphWorkbench<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>({
  document,
  nodeTemplates = [],
  selectedNodeIds,
  selectedEdgeIds,
  selectedGroupIds,
  readOnly = false,
  className,
  showMiniMap = true,
  onDocumentChange,
  onSelectionStateChange,
  onViewportChange,
  renderToolbar,
  renderPalette,
  renderInspector,
}: GraphWorkbenchProps<TNodeData, TEdgeData, TPortType>) {
  const [internalSelection, setInternalSelection] =
    React.useState<GraphEditorSelectionState>(emptySelection);
  const [searchValue, setSearchValue] = React.useState("");
  const externalSelectionProvided =
    selectedNodeIds !== undefined ||
    selectedEdgeIds !== undefined ||
    selectedGroupIds !== undefined;
  const rawSelection = externalSelectionProvided
    ? {
        nodeIds: [...(selectedNodeIds ?? [])],
        edgeIds: [...(selectedEdgeIds ?? [])],
        ...(selectedGroupIds?.length ? { groupIds: [...selectedGroupIds] } : {}),
      }
    : internalSelection;
  const selection = React.useMemo(
    () => normalizeGraphEditorSelection(document, rawSelection),
    [document, rawSelection],
  );
  const selectedNode = document.nodes.find((node) => node.id === selection.nodeIds.at(-1));
  const selectedEdge = document.edges.find((edge) => edge.id === selection.edgeIds.at(-1));
  const filteredItems = React.useMemo(
    () => filterGraphWorkbenchPaletteTemplates(nodeTemplates, searchValue),
    [nodeTemplates, searchValue],
  );
  const groups = React.useMemo(
    () => createGraphWorkbenchPaletteCategoryGroups(filteredItems),
    [filteredItems],
  );

  const commitSelection = (nextSelection: GraphEditorSelectionState) => {
    const normalized = normalizeGraphEditorSelection(document, nextSelection);
    if (!externalSelectionProvided) {
      setInternalSelection(normalized);
    }
    onSelectionStateChange?.(normalized);
  };
  const updateDocument = (nextDocument: GraphEditorDocument<TNodeData, TEdgeData, TPortType>) => {
    onDocumentChange?.(nextDocument);
  };
  const controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType> = {
    document,
    readOnly,
    selection,
    selectedNode,
    selectedEdge,
    palette: {
      groups,
      items: nodeTemplates,
      filteredItems,
      searchValue,
      setSearchValue,
    },
    actions: {
      addTemplateNode(template, position = { x: 80, y: 80 }) {
        const existingIds = new Set(document.nodes.map((node) => node.id));
        let id = template.id;
        let index = 2;
        while (existingIds.has(id)) {
          id = `${template.id}-${index}`;
          index += 1;
        }
        updateDocument(
          addGraphEditorNode(document, {
            ...template,
            id,
            x: position.x,
            y: position.y,
          } as GraphEditorNode<TNodeData, TPortType>),
        );
      },
      deleteSelection() {
        updateDocument(removeGraphEditorSelection(document, selection));
        commitSelection(emptySelection);
      },
      setSelection: commitSelection,
      updateDocument,
    },
  };

  const canvasSelection = selectedNode
    ? ({ type: "node", id: selectedNode.id, node: selectedNode } as GraphCanvasSelection)
    : selectedEdge
      ? ({ type: "edge", id: selectedEdge.id, edge: selectedEdge } as GraphCanvasSelection)
      : null;

  return (
    <div className={cn("grid min-h-0 grid-cols-[16rem_minmax(0,1fr)_20rem] gap-3", className)}>
      {renderPalette ? (
        renderPalette(controller)
      ) : (
        <GraphWorkbenchPalette controller={controller as any} />
      )}
      <div className="min-h-0">
        {renderToolbar ? (
          renderToolbar(controller)
        ) : (
          <GraphWorkbenchToolbar controller={controller as any} />
        )}
        <GraphWorkbenchCanvas
          controller={controller}
          canvasSelection={canvasSelection}
          showMiniMap={showMiniMap}
          onViewportChange={onViewportChange}
        />
      </div>
      {renderInspector ? (
        renderInspector(controller)
      ) : (
        <GraphWorkbenchInspector controller={controller as any} />
      )}
    </div>
  );
}

export function GraphWorkbenchCanvas<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>({
  controller,
  canvasSelection,
  showMiniMap = true,
  onViewportChange,
}: {
  controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>;
  canvasSelection?: GraphCanvasSelection;
  showMiniMap?: boolean;
  onViewportChange?: (viewport: GraphEditorViewport) => void;
}) {
  return (
    <GraphCanvas
      nodes={controller.document.nodes as any}
      edges={controller.document.edges as any}
      readOnly={controller.readOnly}
      selectedNodeId={canvasSelection?.type === "node" ? canvasSelection.id : null}
      selectedEdgeId={canvasSelection?.type === "edge" ? canvasSelection.id : null}
      showMiniMap={showMiniMap}
      viewport={controller.document.viewport}
      onViewportChange={onViewportChange}
      onNodesChange={(nodes) =>
        controller.actions.updateDocument({ ...controller.document, nodes: nodes as any })
      }
      onEdgesChange={(edges) =>
        controller.actions.updateDocument({ ...controller.document, edges: edges as any })
      }
      onConnectionComplete={(connection: GraphCanvasConnection) => {
        controller.actions.updateDocument(connectGraphEditorNodes(controller.document, connection));
      }}
      onSelectionChange={(selection) => {
        controller.actions.setSelection(
          selection?.type === "node"
            ? { nodeIds: [selection.id], edgeIds: [], primary: { type: "node", id: selection.id } }
            : selection?.type === "edge"
              ? {
                  nodeIds: [],
                  edgeIds: [selection.id],
                  primary: { type: "edge", id: selection.id },
                }
              : emptySelection,
        );
      }}
    />
  );
}

export function GraphWorkbenchToolbar({ controller }: { controller: GraphWorkbenchController }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <div className="text-sm font-medium">Graph</div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={controller.readOnly}
        onClick={() => controller.actions.deleteSelection()}
      >
        Delete
      </Button>
    </div>
  );
}

export function GraphWorkbenchPalette({ controller }: { controller: GraphWorkbenchController }) {
  return (
    <aside className="min-h-0 overflow-auto border-r pr-3">
      <Input
        value={controller.palette.searchValue}
        placeholder="Search nodes"
        onChange={(event) => controller.palette.setSearchValue(event.target.value)}
      />
      <div className="mt-3 grid gap-3">
        {controller.palette.groups.map((group) => (
          <GraphWorkbenchPaletteGroup key={group.id} group={group} controller={controller} />
        ))}
      </div>
    </aside>
  );
}

function GraphWorkbenchPaletteGroup({
  group,
  controller,
}: {
  group: GraphWorkbenchPaletteCategoryGroup;
  controller: GraphWorkbenchController;
}) {
  return (
    <section>
      <div className="mb-1 text-xs font-semibold uppercase text-zinc-500">{group.label}</div>
      <div className="grid gap-1">
        {group.templates.map((template) => (
          <Button
            key={template.id}
            type="button"
            variant="outline"
            disabled={controller.readOnly}
            onClick={() => controller.actions.addTemplateNode(template)}
          >
            {template.label}
          </Button>
        ))}
      </div>
      {group.children.map((child) => (
        <GraphWorkbenchPaletteGroup key={child.id} group={child} controller={controller} />
      ))}
    </section>
  );
}

export function GraphWorkbenchInspector({ controller }: { controller: GraphWorkbenchController }) {
  const selection = controller.selectedNode ?? controller.selectedEdge;
  const label =
    selection && "label" in selection ? (selection as { label: string }).label : undefined;
  return (
    <aside className="min-h-0 overflow-auto border-l pl-3">
      <div className="text-sm font-medium">{label ?? selection?.id ?? "No selection"}</div>
    </aside>
  );
}

export function GraphWorkbenchOverlayPanel({ children, className }: React.ComponentProps<"div">) {
  return (
    <div className={cn("rounded-md border bg-white p-3 shadow-sm", className)}>{children}</div>
  );
}
