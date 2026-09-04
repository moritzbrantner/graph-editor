"use client";

import * as React from "react";

import {
  type GraphInputOnlyNodeProps,
  type GraphNodeData,
  type GraphNodePort,
} from "../index-core";
import { GraphNode } from "./GraphNode";

export function GraphInputOnlyNode<
  Inputs extends readonly GraphNodePort[] = readonly GraphNodePort[],
>({ node, ...props }: GraphInputOnlyNodeProps<Inputs>) {
  const resolvedNode = React.useMemo<GraphNodeData<Inputs, []>>(
    () => ({ ...node, outputs: [] }),
    [node],
  );

  return <GraphNode {...props} node={resolvedNode} outputDisabled />;
}
