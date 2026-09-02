import { describe, expect, test } from "vitest";

import { getGraphEditorNodeSize } from "@moritzbrantner/graph-editor/layout";
import type { GraphEditorPort } from "@moritzbrantner/graph-editor/core";

function ports(count: number): GraphEditorPort[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `port-${index}`,
    label: `Port ${index}`,
  }));
}

describe("graph editor node metrics", () => {
  test("caps description growth after four measured rows", () => {
    expect(getGraphEditorNodeSize({ description: undefined })).toEqual({ width: 310, height: 181 });
    expect(getGraphEditorNodeSize({ description: "x" })).toEqual({ width: 310, height: 201 });
    expect(getGraphEditorNodeSize({ description: "x".repeat(58) })).toEqual({
      width: 310,
      height: 201,
    });
    expect(getGraphEditorNodeSize({ description: "x".repeat(59) })).toEqual({
      width: 310,
      height: 221,
    });
    expect(getGraphEditorNodeSize({ description: "x".repeat(232) })).toEqual({
      width: 310,
      height: 261,
    });
    expect(getGraphEditorNodeSize({ description: "x".repeat(233) })).toEqual({
      width: 310,
      height: 261,
    });
  });

  test("uses the larger port column and applies row gaps deterministically", () => {
    expect(getGraphEditorNodeSize({ inputs: ports(1), outputs: ports(3) })).toEqual({
      width: 310,
      height: 325,
    });
    expect(getGraphEditorNodeSize({ inputs: ports(3), outputs: ports(1) })).toEqual({
      width: 310,
      height: 325,
    });
    expect(
      getGraphEditorNodeSize(
        { inputs: ports(1), outputs: ports(3) },
        { showPortColumnHeaders: false },
      ),
    ).toEqual({ width: 310, height: 304 });
  });

  test("keeps compact and minimized sizing independent from normal content growth", () => {
    expect(
      getGraphEditorNodeSize({
        variant: "compact",
        description: "x".repeat(500),
        inputs: ports(5),
        outputs: ports(5),
      }),
    ).toEqual({ width: 240, height: 48 });

    expect(getGraphEditorNodeSize({ minimized: true })).toEqual({ width: 230, height: 94 });
    expect(
      getGraphEditorNodeSize({ minimized: true, variant: "compact", inputs: ports(4) }),
    ).toEqual({ width: 230, height: 134 });
  });
});
