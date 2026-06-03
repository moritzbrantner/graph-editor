import type { CSSProperties } from "react";

export const graphWorkbenchOverlayMargin = 12;

export type GraphWorkbenchPanelPlacement =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type GraphWorkbenchOverlayPosition = { x: number; y: number } | null;

export type GraphWorkbenchPanelState = {
  minimized?: boolean;
  placement?: GraphWorkbenchPanelPlacement;
  position?: GraphWorkbenchOverlayPosition;
};

export type GraphWorkbenchPanelBehavior = {
  mode?: "overlay" | "inline" | "external";
  defaultPlacement?: GraphWorkbenchPanelPlacement;
  draggable?: boolean;
  minimizable?: boolean;
  controlledState?: GraphWorkbenchPanelState;
  onStateChange?: (state: GraphWorkbenchPanelState) => void;
};

export function clampGraphOverlayPosition(
  position: NonNullable<GraphWorkbenchOverlayPosition>,
  container: HTMLElement | null,
  overlay: HTMLElement | null,
  size?: { width: number; height: number },
) {
  const containerRect = container?.getBoundingClientRect();
  const overlayRect = overlay?.getBoundingClientRect();
  const width = size?.width ?? overlayRect?.width ?? 0;
  const height = size?.height ?? overlayRect?.height ?? 0;

  if (!containerRect || width <= 0 || height <= 0) {
    return position;
  }

  const minX = graphWorkbenchOverlayMargin;
  const minY = graphWorkbenchOverlayMargin;
  const maxX = Math.max(minX, containerRect.width - width - graphWorkbenchOverlayMargin);
  const maxY = Math.max(minY, containerRect.height - height - graphWorkbenchOverlayMargin);

  return {
    x: Math.min(Math.max(position.x, minX), maxX),
    y: Math.min(Math.max(position.y, minY), maxY),
  };
}

export function getGraphOverlayMaxHeight(top: number) {
  return `calc(100% - ${Math.max(top, 0) + graphWorkbenchOverlayMargin}px)`;
}

export function getGraphPalettePinnedStyle(placement: GraphWorkbenchPanelPlacement): CSSProperties {
  const offset = "0.75rem";

  switch (placement) {
    case "top-right":
      return { right: offset, top: offset };
    case "bottom-left":
      return { bottom: offset, left: offset };
    case "bottom-right":
      return { bottom: offset, right: offset };
    case "top-left":
    default:
      return { left: offset, top: offset };
  }
}
