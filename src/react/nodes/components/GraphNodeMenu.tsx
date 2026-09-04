"use client";

import * as React from "react";
import { MoreHorizontalIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@moritzbrantner/ui";

import {
  graphNodeControlButtonClassName,
  type GraphNodeData,
  type GraphNodeMenuItem,
} from "../index-core";

export function GraphNodeMenu({
  node,
  items,
  label,
  onItemSelect,
}: {
  node: GraphNodeData;
  items: GraphNodeMenuItem[];
  label: React.ReactNode;
  onItemSelect?: (item: GraphNodeMenuItem, node: GraphNodeData) => void;
}) {
  const menuLabel = typeof label === "string" ? label : "Actions";

  if (items.length === 0 && !onItemSelect) {
    return (
      <button
        type="button"
        data-slot="workflow-node-menu-trigger"
        aria-label={`Open ${node.label} menu`}
        className={graphNodeControlButtonClassName}
        disabled
      >
        <MoreHorizontalIcon className="size-3.5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-slot="workflow-node-menu-trigger"
          aria-label={`Open ${node.label} menu`}
          className={graphNodeControlButtonClassName}
        >
          <MoreHorizontalIcon className="size-3.5" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-slot="workflow-node-menu"
        align="end"
        sideOffset={6}
        className="min-w-40"
        aria-label={menuLabel}
      >
        {label ? <DropdownMenuLabel>{label}</DropdownMenuLabel> : null}
        {items.length > 0 ? (
          items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              disabled={item.disabled}
              variant={item.destructive ? "destructive" : "default"}
              onSelect={() => {
                item.onSelect?.(node);
                onItemSelect?.(item, node);
              }}
            >
              {item.label}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>No actions</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
