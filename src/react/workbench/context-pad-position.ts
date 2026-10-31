import { type GraphEditorViewport } from "../../core";
import { graphWorkbenchOverlayMargin } from "../overlay-position";

export const graphWorkbenchContextPadFallbackSize = { width: 226, height: 50 };

export function getInitialGraphWorkbenchContextPadContainerSize() {
  if (typeof window === "undefined") {
    return { width: 0, height: 0 };
  }

  return {
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight,
  };
}

export function updateGraphWorkbenchMeasuredSize(
  current: { width: number; height: number },
  next: { width: number; height: number },
) {
  if (Math.abs(current.width - next.width) < 0.5 && Math.abs(current.height - next.height) < 0.5) {
    return current;
  }

  return next;
}

export function getGraphWorkbenchContextPadPosition({
  node,
  nodeSize,
  viewport,
  padSize,
  containerSize,
}: {
  node: { x: number; y: number };
  nodeSize: { width: number; height: number };
  viewport: GraphEditorViewport;
  padSize: { width: number; height: number };
  containerSize: { width: number; height: number };
}) {
  const gap = graphWorkbenchOverlayMargin;
  const nodeLeft = viewport.x + node.x * viewport.zoom;
  const nodeTop = viewport.y + node.y * viewport.zoom;
  const nodeRight = viewport.x + (node.x + nodeSize.width) * viewport.zoom;
  const nodeBottom = viewport.y + (node.y + nodeSize.height) * viewport.zoom;
  const right = { left: nodeRight + gap, top: nodeTop };

  if (fitsGraphWorkbenchContextPadHorizontally(right.left, padSize.width, containerSize.width)) {
    return clampGraphWorkbenchContextPadToContainer(right, padSize, containerSize);
  }

  const left = { left: nodeLeft - padSize.width - gap, top: nodeTop };
  if (fitsGraphWorkbenchContextPadHorizontally(left.left, padSize.width, containerSize.width)) {
    return clampGraphWorkbenchContextPadToContainer(left, padSize, containerSize);
  }

  const below = { left: nodeLeft, top: nodeBottom + gap };
  if (fitsGraphWorkbenchContextPadVertically(below.top, padSize.height, containerSize.height)) {
    return clampGraphWorkbenchContextPadToContainer(below, padSize, containerSize);
  }

  return clampGraphWorkbenchContextPadToContainer(
    { left: nodeLeft, top: nodeTop - padSize.height - gap },
    padSize,
    containerSize,
  );
}

function fitsGraphWorkbenchContextPadHorizontally(
  left: number,
  width: number,
  containerWidth: number,
) {
  if (containerWidth <= 0) {
    return true;
  }

  return (
    left >= graphWorkbenchOverlayMargin &&
    left + width <= containerWidth - graphWorkbenchOverlayMargin
  );
}

function fitsGraphWorkbenchContextPadVertically(
  top: number,
  height: number,
  containerHeight: number,
) {
  if (containerHeight <= 0) {
    return true;
  }

  return (
    top >= graphWorkbenchOverlayMargin &&
    top + height <= containerHeight - graphWorkbenchOverlayMargin
  );
}

function clampGraphWorkbenchContextPadToContainer(
  position: { left: number; top: number },
  padSize: { width: number; height: number },
  containerSize: { width: number; height: number },
) {
  if (containerSize.width <= 0 || containerSize.height <= 0) {
    return position;
  }

  const minLeft = graphWorkbenchOverlayMargin;
  const minTop = graphWorkbenchOverlayMargin;
  const maxLeft = Math.max(
    minLeft,
    containerSize.width - padSize.width - graphWorkbenchOverlayMargin,
  );
  const maxTop = Math.max(
    minTop,
    containerSize.height - padSize.height - graphWorkbenchOverlayMargin,
  );

  return {
    left: Math.min(Math.max(position.left, minLeft), maxLeft),
    top: Math.min(Math.max(position.top, minTop), maxTop),
  };
}
