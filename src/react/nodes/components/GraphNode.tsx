"use client";

import * as React from "react";

import {
  graphNodeUsesCompactVariant,
  type GraphNodeProps,
} from "../index-core";
import { GraphNodeFrame } from "./GraphNodeFrame";
import { GraphNodeHeader } from "./GraphNodeHeader";
import { GraphNodeInline } from "./GraphNodeInline";
import { GraphNodeMinimizedPorts } from "./GraphNodeMinimizedPorts";
import { GraphNodePorts } from "./GraphNodePorts";

export function GraphNode({
  node,
  selected,
  readOnly = false,
  inputDisabled = false,
  outputDisabled = false,
  showPortColumnHeaders = true,
  menuItems = [],
  menuLabel = "Actions",
  onNodeSelect,
  onMinimizedChange,
  onMenuItemSelect,
  onInputClick,
  onOutputClick,
  onInputPointerUp,
  onOutputPointerDown,
  onOutputPointerUp,
  getInputAriaLabel,
  getOutputAriaLabel,
  className,
  style,
  ...props
}: GraphNodeProps) {
  const [uncontrolledMinimized, setUncontrolledMinimized] = React.useState(node.minimized ?? false);

  React.useEffect(() => {
    setUncontrolledMinimized(node.minimized ?? false);
  }, [node.id, node.minimized]);

  const minimized = node.minimized ?? uncontrolledMinimized;
  const resolvedNode = React.useMemo(
    () => (node.minimized === minimized ? node : { ...node, minimized }),
    [minimized, node],
  );
  const layoutOptions = React.useMemo(() => ({ showPortColumnHeaders }), [showPortColumnHeaders]);
  const compact = graphNodeUsesCompactVariant(resolvedNode);

  const changeMinimized = (nextMinimized: boolean) => {
    if (node.minimized === undefined) {
      setUncontrolledMinimized(nextMinimized);
    }
    onMinimizedChange?.(resolvedNode, nextMinimized);
  };

  if (compact) {
    return (
      <GraphNodeFrame
        node={resolvedNode}
        selected={selected}
        layoutOptions={layoutOptions}
        className={className}
        style={style}
        {...props}
      >
        <GraphNodeInline
          node={resolvedNode}
          readOnly={readOnly}
          inputDisabled={inputDisabled}
          outputDisabled={outputDisabled}
          onNodeSelect={onNodeSelect}
          onInputClick={onInputClick}
          onOutputClick={onOutputClick}
          onInputPointerUp={onInputPointerUp}
          onOutputPointerDown={onOutputPointerDown}
          onOutputPointerUp={onOutputPointerUp}
          getInputAriaLabel={getInputAriaLabel}
          getOutputAriaLabel={getOutputAriaLabel}
        />
      </GraphNodeFrame>
    );
  }

  return (
    <GraphNodeFrame
      node={resolvedNode}
      selected={selected}
      minimized={minimized}
      layoutOptions={layoutOptions}
      className={className}
      style={style}
      {...props}
    >
      <GraphNodeHeader
        node={resolvedNode}
        minimized={minimized}
        menuItems={menuItems}
        menuLabel={menuLabel}
        onNodeSelect={onNodeSelect}
        onMinimizedChange={changeMinimized}
        onMenuItemSelect={onMenuItemSelect}
      />
      {minimized ? (
        <GraphNodeMinimizedPorts
          node={resolvedNode}
          inputDisabled={inputDisabled}
          outputDisabled={outputDisabled || readOnly}
          onInputClick={onInputClick}
          onOutputClick={onOutputClick}
          onInputPointerUp={onInputPointerUp}
          onOutputPointerDown={onOutputPointerDown}
          onOutputPointerUp={onOutputPointerUp}
          getInputAriaLabel={getInputAriaLabel}
          getOutputAriaLabel={getOutputAriaLabel}
        />
      ) : (
        <GraphNodePorts
          node={resolvedNode}
          readOnly={readOnly}
          inputDisabled={inputDisabled}
          outputDisabled={outputDisabled}
          showPortColumnHeaders={showPortColumnHeaders}
          onInputClick={onInputClick}
          onOutputClick={onOutputClick}
          onInputPointerUp={onInputPointerUp}
          onOutputPointerDown={onOutputPointerDown}
          onOutputPointerUp={onOutputPointerUp}
          getInputAriaLabel={getInputAriaLabel}
          getOutputAriaLabel={getOutputAriaLabel}
        />
      )}
    </GraphNodeFrame>
  );
}
