"use client";

import * as React from "react";
import { CopyIcon, GroupIcon, PlusIcon, Rows3Icon, Trash2Icon } from "lucide-react";

import { updateGraphEditorNode } from "../../../core";
import { getGraphEditorNodeSize } from "../../../node-metrics";
import { clampGraphOverlayPosition } from "../../overlay-position";

import type { GraphWorkbenchController } from "../index-core";
import {
  getGraphWorkbenchContextPadPosition,
  getInitialGraphWorkbenchContextPadContainerSize,
  graphWorkbenchContextPadFallbackSize,
  updateGraphWorkbenchMeasuredSize,
} from "../index-core";
import { GraphWorkbenchCommandButton } from "./GraphWorkbenchCommandButton";
import { GraphWorkbenchIconButton } from "./GraphWorkbenchIconButton";

export function GraphWorkbenchContextPad<
  TNodeData = Record<string, unknown>,
  TEdgeData = Record<string, unknown>,
  TPortType = unknown,
>({ controller }: { controller: GraphWorkbenchController<TNodeData, TEdgeData, TPortType> }) {
  const padRef = React.useRef<HTMLDivElement>(null);
  const [padSize, setPadSize] = React.useState(graphWorkbenchContextPadFallbackSize);
  const [containerSize, setContainerSize] = React.useState(() =>
    getInitialGraphWorkbenchContextPadContainerSize(),
  );
  const node = controller.selectedNode;

  React.useLayoutEffect(() => {
    const pad = padRef.current;
    if (!pad) {
      return;
    }

    const container = pad.offsetParent instanceof HTMLElement ? pad.offsetParent : null;
    const measure = () => {
      const padRect = pad.getBoundingClientRect();
      const containerRect = container?.getBoundingClientRect();
      setPadSize((current) =>
        updateGraphWorkbenchMeasuredSize(current, {
          width: padRect.width || graphWorkbenchContextPadFallbackSize.width,
          height: padRect.height || graphWorkbenchContextPadFallbackSize.height,
        }),
      );
      if (containerRect) {
        setContainerSize((current) =>
          updateGraphWorkbenchMeasuredSize(current, {
            width: containerRect.width,
            height: containerRect.height,
          }),
        );
      }
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(pad);
    if (container) {
      resizeObserver.observe(container);
    }

    return () => resizeObserver.disconnect();
  }, [node?.id]);

  if (!node) {
    return null;
  }

  const viewport = controller.document.viewport ?? { x: 0, y: 0, zoom: 1 };
  const nodeSize = getGraphEditorNodeSize(node);
  const parent = padRef.current?.offsetParent;
  const position = getGraphWorkbenchContextPadPosition({
    node: { x: node.x, y: node.y },
    nodeSize,
    viewport,
    padSize,
    containerSize,
  });
  const clampedPosition = clampGraphOverlayPosition(
    { x: position.left, y: position.top },
    parent instanceof HTMLElement ? parent : null,
    padRef.current,
    padSize,
  );
  const style: React.CSSProperties = { left: clampedPosition.x, top: clampedPosition.y };

  return (
    <div
      ref={padRef}
      data-slot="graph-workbench-context-pad"
      className="absolute z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1 rounded-md border bg-background p-1 shadow-sm"
      style={style}
    >
      <GraphWorkbenchIconButton
        label="Append node"
        disabled={controller.readOnly || controller.palette.filteredItems.length === 0}
        onClick={() => controller.actions.appendTemplateNode(undefined, node.id)}
      >
        <PlusIcon />
      </GraphWorkbenchIconButton>
      <GraphWorkbenchCommandButton controller={controller} commandId="duplicate">
        <CopyIcon />
      </GraphWorkbenchCommandButton>
      <GraphWorkbenchIconButton
        label={node.minimized ? "Expand node" : "Minimize node"}
        disabled={controller.readOnly}
        onClick={() =>
          controller.actions.updateDocument(
            updateGraphEditorNode(controller.document, node.id, { minimized: !node.minimized }),
          )
        }
      >
        <Rows3Icon />
      </GraphWorkbenchIconButton>
      <GraphWorkbenchCommandButton controller={controller} commandId="group-selection">
        <GroupIcon />
      </GraphWorkbenchCommandButton>
      <GraphWorkbenchCommandButton controller={controller} commandId="delete">
        <Trash2Icon />
      </GraphWorkbenchCommandButton>
    </div>
  );
}
