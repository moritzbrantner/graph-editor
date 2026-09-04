import { describe, expect, test } from "vitest";

import { normalizeGraphEditorBounds } from "@moritzbrantner/graph-editor";

describe("graph public conformance", () => {
  test("normalizes reverse-dragged bounds through the public API", () => {
    expect(
      normalizeGraphEditorBounds({
        x: 120,
        y: 80,
        width: -130,
        height: -90,
      }),
    ).toEqual({
      x: -10,
      y: -10,
      width: 130,
      height: 90,
    });
  });
});
