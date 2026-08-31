"use client";

import { Button } from "@moritzbrantner/ui";

import type { GraphWorkbenchController } from "../index-core";
import type { GraphWorkbenchPaletteCategoryGroup } from "../palette-model";

export function GraphWorkbenchPaletteGroup<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>({
  group,
  controller,
}: {
  group: GraphWorkbenchPaletteCategoryGroup<TNodeData>;
  controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>;
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
            draggable={!controller.readOnly}
            onDragStart={(event) => {
              event.dataTransfer.setData("application/x-graph-workbench-template", template.id);
              event.dataTransfer.effectAllowed = "copy";
            }}
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
