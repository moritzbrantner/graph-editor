"use client";

import { Input } from "@moritzbrantner/ui";

import type { GraphWorkbenchController } from "../index-core";
import { GraphWorkbenchPaletteGroup } from "./GraphWorkbenchPaletteGroup";

export function GraphWorkbenchPalette<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>({ controller }: { controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType> }) {
  return (
    <div data-slot="graph-workbench-palette" className="min-h-0">
      <Input
        value={controller.palette.searchValue}
        aria-label="Search nodes"
        placeholder="Search nodes"
        onChange={(event) => controller.palette.setSearchValue(event.target.value)}
      />
      <div className="mt-3 grid gap-3" onDragOver={(event) => event.preventDefault()}>
        {controller.palette.groups.length > 0 ? (
          controller.palette.groups.map((group) => (
            <GraphWorkbenchPaletteGroup key={group.id} group={group} controller={controller} />
          ))
        ) : (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No nodes match the current search.
          </div>
        )}
      </div>
    </div>
  );
}
