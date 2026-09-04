"use client";

import * as React from "react";

import {
  type GraphNodeData,
  type GraphNodePort,
  type GraphOutputOnlyNodeProps,
} from "../index-core";
import { GraphNode } from "./GraphNode";

export function GraphOutputOnlyNode<
  Outputs extends readonly GraphNodePort[] = readonly GraphNodePort[],
>({ node, ...props }: GraphOutputOnlyNodeProps<Outputs>) {
  const resolvedNode = React.useMemo<GraphNodeData<[], Outputs>>(
    () => ({ ...node, inputs: [] }),
    [node],
  );

  return <GraphNode {...props} node={resolvedNode} inputDisabled />;
}
