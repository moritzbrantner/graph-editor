import { describe, expect, test } from "vitest";

import {
  getGraphCanvasConnectionValidity,
  validateGraphEditorConnection,
  type GraphCanvasConnectionValidityInput,
  type GraphCanvasEdge,
  type GraphCanvasNodeData,
  type GraphEditorDocument,
} from "@moritzbrantner/graph-editor";

type Scenario = {
  name: string;
  input: GraphCanvasConnectionValidityInput;
  expected: ReturnType<typeof getGraphCanvasConnectionValidity>;
};

function makeNode(
  id: string,
  options: {
    inputKind?: string;
    inputType?: string;
    outputKind?: string;
    outputType?: string;
  } = {},
): GraphCanvasNodeData {
  return {
    id,
    label: id.toUpperCase(),
    x: 0,
    y: 0,
    inputs: [
      {
        id: "in",
        label: "In",
        ...(options.inputKind === undefined ? {} : { kind: options.inputKind }),
        ...(options.inputType === undefined ? {} : { type: options.inputType }),
      },
    ],
    outputs: [
      {
        id: "out",
        label: "Out",
        ...(options.outputKind === undefined ? {} : { kind: options.outputKind }),
        ...(options.outputType === undefined ? {} : { type: options.outputType }),
      },
    ],
  };
}

function edge(id: string, sourceNodeId: string, targetNodeId: string): GraphCanvasEdge {
  return {
    id,
    sourceNodeId,
    sourcePortId: "out",
    targetNodeId,
    targetPortId: "in",
  };
}

function validateThroughCore(input: GraphCanvasConnectionValidityInput) {
  const {
    nodes,
    edges,
    ignoreEdgeId,
    sourceNodeId,
    sourcePortId,
    targetNodeId,
    targetPortId,
  } = input;

  return validateGraphEditorConnection(
    { nodes, edges } as unknown as GraphEditorDocument,
    { sourceNodeId, sourcePortId, targetNodeId, targetPortId },
    {
      ...(ignoreEdgeId === undefined ? {} : { ignoreEdgeId }),
      arePortsCompatible(sourcePort, targetPort) {
        const sourceType = portTypeSource(sourcePort.type);
        const targetType = portTypeSource(targetPort.type);
        return !sourceType || !targetType || sourceType === targetType;
      },
    },
  );
}

function portTypeSource(type: unknown) {
  if (!type) {
    return undefined;
  }
  if (typeof type === "string") {
    return type.trim();
  }
  if (typeof type !== "object") {
    return undefined;
  }

  const candidate = type as { source?: unknown; kind?: unknown };
  const source = candidate.source ?? candidate.kind;
  return typeof source === "string" ? source.trim() : undefined;
}

describe("GraphCanvas connection validation authority", () => {
  const basicNodes = [makeNode("a"), makeNode("b"), makeNode("c")];

  const scenarios: Scenario[] = [
    {
      name: "accepts a valid connection",
      input: {
        nodes: basicNodes,
        edges: [],
        sourceNodeId: "a",
        sourcePortId: "out",
        targetNodeId: "b",
        targetPortId: "in",
      },
      expected: { valid: true },
    },
    {
      name: "reports a missing node",
      input: {
        nodes: basicNodes,
        edges: [],
        sourceNodeId: "a",
        sourcePortId: "out",
        targetNodeId: "missing",
        targetPortId: "in",
      },
      expected: { valid: false, reason: "missing-node" },
    },
    {
      name: "reports a missing port",
      input: {
        nodes: basicNodes,
        edges: [],
        sourceNodeId: "a",
        sourcePortId: "out",
        targetNodeId: "b",
        targetPortId: "missing",
      },
      expected: { valid: false, reason: "missing-port" },
    },
    {
      name: "rejects self connections",
      input: {
        nodes: basicNodes,
        edges: [],
        sourceNodeId: "a",
        sourcePortId: "out",
        targetNodeId: "a",
        targetPortId: "in",
      },
      expected: { valid: false, reason: "self-connection" },
    },
    {
      name: "rejects duplicate edges",
      input: {
        nodes: basicNodes,
        edges: [edge("a-b", "a", "b")],
        sourceNodeId: "a",
        sourcePortId: "out",
        targetNodeId: "b",
        targetPortId: "in",
      },
      expected: { valid: false, reason: "duplicate" },
    },
    {
      name: "rejects occupied inputs",
      input: {
        nodes: basicNodes,
        edges: [edge("c-b", "c", "b")],
        sourceNodeId: "a",
        sourcePortId: "out",
        targetNodeId: "b",
        targetPortId: "in",
      },
      expected: { valid: false, reason: "input-occupied" },
    },
    {
      name: "rejects kind mismatches",
      input: {
        nodes: [
          makeNode("a", { outputKind: "event", outputType: "shared" }),
          makeNode("b", { inputKind: "payload", inputType: "shared" }),
        ],
        edges: [],
        sourceNodeId: "a",
        sourcePortId: "out",
        targetNodeId: "b",
        targetPortId: "in",
      },
      expected: { valid: false, reason: "kind-mismatch" },
    },
    {
      name: "rejects type mismatches",
      input: {
        nodes: [
          makeNode("a", { outputType: "event" }),
          makeNode("b", { inputType: "payload" }),
        ],
        edges: [],
        sourceNodeId: "a",
        sourcePortId: "out",
        targetNodeId: "b",
        targetPortId: "in",
      },
      expected: { valid: false, reason: "type-mismatch" },
    },
    {
      name: "rejects cycles",
      input: {
        nodes: basicNodes,
        edges: [edge("a-b", "a", "b")],
        sourceNodeId: "b",
        sourcePortId: "out",
        targetNodeId: "a",
        targetPortId: "in",
      },
      expected: { valid: false, reason: "cycle" },
    },
    {
      name: "ignores the rewired edge when requested",
      input: {
        nodes: basicNodes,
        edges: [edge("a-b", "a", "b")],
        sourceNodeId: "a",
        sourcePortId: "out",
        targetNodeId: "b",
        targetPortId: "in",
        ignoreEdgeId: "a-b",
      },
      expected: { valid: true },
    },
  ];

  for (const scenario of scenarios) {
    test(scenario.name, () => {
      expect(getGraphCanvasConnectionValidity(scenario.input)).toEqual(scenario.expected);
      expect(getGraphCanvasConnectionValidity(scenario.input)).toEqual(
        validateThroughCore(scenario.input),
      );
    });
  }

  test("does not add extra full-collection scans around core validation", () => {
    const nodeCount = 1_000;
    const nodes = Array.from({ length: nodeCount }, (_, index) => makeNode(`node-${index}`));
    const edges = Array.from({ length: nodeCount - 1 }, (_, index) =>
      edge(`edge-${index}`, `node-${index}`, `node-${index + 1}`),
    );
    const countedNodes = countIndexedReads(nodes);
    const countedEdges = countIndexedReads(edges);

    expect(
      getGraphCanvasConnectionValidity({
        nodes: countedNodes.values,
        edges: countedEdges.values,
        sourceNodeId: `node-${nodeCount - 1}`,
        sourcePortId: "out",
        targetNodeId: "node-0",
        targetPortId: "in",
      }),
    ).toEqual({ valid: false, reason: "cycle" });

    expect(countedNodes.reads()).toBeLessThanOrEqual(nodeCount + 1);
    expect(countedEdges.reads()).toBeLessThanOrEqual(edges.length + 1);
  });
});

function countIndexedReads<T>(values: T[]) {
  let reads = 0;
  const proxied = new Proxy(values, {
    get(target, property, receiver) {
      if (typeof property === "string" && /^\\d+$/.test(property)) {
        reads += 1;
      }
      return Reflect.get(target, property, receiver);
    },
  });

  return {
    values: proxied,
    reads: () => reads,
  };
}

