"use client";

import type * as React from "react";

import type { GraphWorkbenchController } from "../index-core";
import type { GraphWorkbenchCommandId } from "../../workbench-commands";
import { GraphWorkbenchIconButton } from "./GraphWorkbenchIconButton";

export function GraphWorkbenchCommandButton<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>({
  controller,
  commandId,
  children,
}: {
  controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType>;
  commandId: GraphWorkbenchCommandId;
  children: React.ReactNode;
}) {
  const command = controller.commands.find((candidate) => candidate.id === commandId);

  return (
    <GraphWorkbenchIconButton
      label={String(command?.label ?? commandId)}
      disabled={command?.disabled}
      onClick={() => void command?.run()}
    >
      {children}
    </GraphWorkbenchIconButton>
  );
}
