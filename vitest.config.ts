import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL("./", import.meta.url));
const workerCount = parseWorkerCount(
  process.env.GRAPH_EDITOR_TEST_WORKERS ?? process.env.GRAPH_EDITOR_WORKERS,
  1,
);

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@moritzbrantner/graph-editor/commands",
        replacement: path.resolve(rootDir, "src/commands.ts"),
      },
      {
        find: "@moritzbrantner/graph-editor/core",
        replacement: path.resolve(rootDir, "src/core.ts"),
      },
      {
        find: "@moritzbrantner/graph-editor/layout",
        replacement: path.resolve(rootDir, "src/layout.ts"),
      },
      {
        find: "@moritzbrantner/graph-editor/operations",
        replacement: path.resolve(rootDir, "src/operations.ts"),
      },
      {
        find: "@moritzbrantner/graph-editor/runtime",
        replacement: path.resolve(rootDir, "src/runtime.ts"),
      },
      {
        find: "@moritzbrantner/graph-editor/serialization",
        replacement: path.resolve(rootDir, "src/serialization.ts"),
      },
      {
        find: "@moritzbrantner/graph-editor/persistence",
        replacement: path.resolve(rootDir, "src/persistence.ts"),
      },
      {
        find: "@moritzbrantner/graph-editor/patches",
        replacement: path.resolve(rootDir, "src/patches.ts"),
      },
      {
        find: "@moritzbrantner/graph-editor/plugins",
        replacement: path.resolve(rootDir, "src/plugins.ts"),
      },
      {
        find: "@moritzbrantner/graph-editor/interaction",
        replacement: path.resolve(rootDir, "src/interaction.ts"),
      },
      {
        find: "@moritzbrantner/graph-editor/operation-log",
        replacement: path.resolve(rootDir, "src/operation-log.ts"),
      },
      {
        find: "@moritzbrantner/graph-editor/react",
        replacement: path.resolve(rootDir, "src/react.tsx"),
      },
      {
        find: "@moritzbrantner/graph-editor",
        replacement: path.resolve(rootDir, "src/index.ts"),
      },
    ],
  },
  test: {
    benchmark: {
      include: [
        "src/**/*.bench.{ts,tsx}",
        "src/**/*.benchmark.{ts,tsx}",
        "benchmarks/**/*.{ts,tsx}",
      ],
    },
    coverage: {
      provider: "istanbul",
      reporter: ["text", "json-summary", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.bench.{ts,tsx}",
        "src/**/*.benchmark.{ts,tsx}",
        "src/**/*.stories.{ts,tsx}",
        "src/.storybook/**",
        "src/**/*.e2e.*",
        "src/react.e2e-app/**",
        "storybook-static/**",
        "dist/**",
        "coverage/**",
        "examples/**",
      ],
    },
    environment: "jsdom",
    fileParallelism: false,
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    maxConcurrency: 1,
    maxWorkers: workerCount,
  },
});

function parseWorkerCount(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
