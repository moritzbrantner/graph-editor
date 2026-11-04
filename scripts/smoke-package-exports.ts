import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const rootDir = fileURLToPath(new URL("../", import.meta.url));

const modules = [
  {
    specifier: "@moritzbrantner/graph-editor",
    path: "../dist/index.js",
    exports: [
      "GraphCanvas",
      "GraphNode",
      "GraphWorkbenchHotkeySettings",
      "connectGraphEditorNodes",
      "createGraphEditorDocumentContext",
      "createGraphEditorGraphAdapter",
      "createGraphEditorGraphIndex",
      "normalizeGraphEditorDocument",
      "resolveGraphEditorHotkeys",
      "validateGraphEditorConnection",
    ],
  },
  {
    specifier: "@moritzbrantner/graph-editor/core",
    path: "../dist/core.js",
    exports: [
      "connectGraphEditorNodes",
      "createGraphEditorDocumentContext",
      "createGraphEditorGraphAdapter",
      "createGraphEditorGraphIndex",
      "createGraphEditorSpatialIndex",
      "findGraphEditorNodeInDirection",
      "getGraphEditorSelectionFromSpatialIndex",
      "normalizeGraphEditorDocument",
      "queryGraphEditorNodesNearBounds",
      "validateGraphEditorConnection",
      "validateGraphEditorDocument",
    ],
  },
  {
    specifier: "@moritzbrantner/graph-editor/react",
    path: "../dist/react.js",
    exports: [
      "GraphCanvas",
      "GraphCanvasToolbar",
      "GraphNode",
      "GraphWorkbench",
      "GraphWorkbenchContextPad",
      "GraphWorkbenchHotkeySettings",
      "InspectorPanel",
    ],
  },
  {
    specifier: "@moritzbrantner/graph-editor/layout",
    path: "../dist/layout.js",
    exports: ["layoutGraphEditorDocument", "getGraphEditorNodeSize"],
  },
  {
    specifier: "@moritzbrantner/graph-editor/operations",
    path: "../dist/operations.js",
    exports: [
      "createGraphEditorAddNodeOperation",
      "createGraphEditorReplaceDocumentOperation",
      "createGraphEditorUpdateNodeOperation",
    ],
  },
  {
    specifier: "@moritzbrantner/graph-editor/runtime",
    path: "../dist/runtime.js",
    exports: ["createGraphEditorRuntime", "applyGraphEditorOperation"],
  },
  {
    specifier: "@moritzbrantner/graph-editor/commands",
    path: "../dist/commands.js",
    exports: ["createGraphEditorCommands", "getGraphEditorCommandFromKeyboardEvent"],
  },
  {
    specifier: "@moritzbrantner/graph-editor/hotkeys",
    path: "../dist/hotkeys.js",
    exports: [
      "getGraphEditorHotkeyConflicts",
      "graphEditorDefaultHotkeys",
      "graphEditorHotkeyDefinitions",
      "resolveGraphEditorHotkeys",
    ],
  },
  {
    specifier: "@moritzbrantner/graph-editor/serialization",
    path: "../dist/serialization.js",
    exports: [
      "parseGraphEditorDocumentJson",
      "readSerializedGraphEditorDocument",
      "serializeGraphEditorDocument",
    ],
  },
  {
    specifier: "@moritzbrantner/graph-editor/persistence",
    path: "../dist/persistence.js",
    exports: [
      "createGraphEditorLocalStorage",
      "createGraphEditorMemoryStorage",
      "loadGraphEditorRuntimePersistence",
      "saveGraphEditorRuntimePersistence",
    ],
  },
  {
    specifier: "@moritzbrantner/graph-editor/patches",
    path: "../dist/patches.js",
    exports: [
      "applyGraphEditorDocumentPatch",
      "diffGraphEditorDocuments",
      "invertGraphEditorDocumentPatch",
      "isGraphEditorDocumentPatchEmpty",
    ],
  },
  {
    specifier: "@moritzbrantner/graph-editor/plugins",
    path: "../dist/plugins.js",
    exports: [
      "createGraphEditorPluginRegistry",
      "getGraphEditorPluginDiagnostics",
      "resolveGraphEditorPluginCommands",
      "resolveGraphEditorPluginRuntimeOptions",
    ],
  },
  {
    specifier: "@moritzbrantner/graph-editor/interaction",
    path: "../dist/interaction.js",
    exports: [
      "beginGraphEditorMoveInteraction",
      "cancelGraphEditorInteraction",
      "commitGraphEditorInteraction",
      "commitGraphEditorInteractionOperation",
      "createGraphEditorInteractionSession",
      "previewGraphEditorMoveInteraction",
    ],
  },
  {
    specifier: "@moritzbrantner/graph-editor/operation-log",
    path: "../dist/operation-log.js",
    exports: [
      "graphEditorOperationFromSerializedOperation",
      "graphEditorOperationLogAdapter",
      "readGraphEditorOperationLog",
      "serializeGraphEditorOperation",
      "serializeGraphEditorOperationLog",
    ],
  },
];

const failures: string[] = [];

await Promise.all(
  modules.map(async (moduleDefinition) => {
    let loadedModule;

    try {
      loadedModule = await import(new URL(moduleDefinition.path, import.meta.url).href);
    } catch (error) {
      failures.push(`${moduleDefinition.path}: failed to import (${formatError(error)})`);
      return;
    }

    for (const exportName of moduleDefinition.exports) {
      if (!(exportName in loadedModule)) {
        failures.push(`${moduleDefinition.path}: missing export ${exportName}`);
      }
    }
  }),
);

await smokePackedTarball(failures);

if (failures.length > 0) {
  process.stderr.write(
    `Package export smoke test failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`,
  );
  process.stderr.write("\n");
  process.exit(1);
}

process.stdout.write("Package export smoke test passed.\n");

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function smokePackedTarball(failures: string[]) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "graph-editor-package-smoke-"));
  try {
    const tarballPath = path.join(tempDir, "graph-editor.tgz");
    await execFileAsync("bun", ["pm", "pack", "--filename", tarballPath, "--ignore-scripts"], {
      cwd: rootDir,
    });
    const extractDir = path.join(tempDir, "extract");
    await execFileAsync("tar", ["-xzf", tarballPath, "-C", tempDir]);
    const packedPackageJson = JSON.parse(
      await readFile(path.join(extractDir, "..", "package", "package.json"), "utf8"),
    );
    for (const dependencySetName of [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ]) {
      const dependencySet = packedPackageJson[dependencySetName] ?? {};
      for (const [name, range] of Object.entries(dependencySet)) {
        if (typeof range === "string" && range.startsWith("file:")) {
          failures.push(`packed package.json: ${dependencySetName}.${name} uses ${range}`);
        }
      }
    }

    // Bun 1.4.4 requires non-registry lifecycle dependencies in the consumer manifest.
    const gitDependencies = Object.fromEntries(
      Object.entries(packedPackageJson.dependencies ?? {}).filter(
        ([, range]) => typeof range === "string" && range.startsWith("git+"),
      ),
    );
    const gitDependencyNames = Object.keys(gitDependencies);
    const localDependencies = await packLocalSmokeDependencies(tempDir);
    const localDependencyTarballs = localDependencies.map((dependency) => dependency.tarballPath);
    // Local tarballs also replace the packed package's own git pins.
    const localOverrides = Object.fromEntries(
      localDependencies.map((dependency) => [dependency.name, `file:${dependency.tarballPath}`]),
    );
    await writeFile(
      path.join(tempDir, "package.json"),
      JSON.stringify(
        {
          private: true,
          type: "module",
          dependencies: { ...gitDependencies, ...localOverrides },
          trustedDependencies: gitDependencyNames,
          ...(localDependencies.length > 0 ? { overrides: localOverrides } : {}),
        },
        null,
        2,
      ),
    );
    await execFileAsync(
      "bun",
      ["add", "--linker", "hoisted", ...localDependencyTarballs, tarballPath],
      {
        cwd: tempDir,
      },
    );
    // Bun can initially block a transitive git prepare even when the consumer lists it.
    const untrusted = await execFileAsync("bun", ["pm", "untrusted"], { cwd: tempDir });
    for (const name of gitDependencyNames) {
      if (localDependencies.some((dependency) => dependency.name === name)) {
        continue;
      }
      if (untrusted.stdout.includes(`${name} @`)) {
        // Trust runs one Bun process per dependency, in order.
        // oxlint-disable-next-line no-await-in-loop
        await execFileAsync("bun", ["pm", "trust", name], { cwd: tempDir });
      }
    }
    await writeFile(
      path.join(tempDir, "smoke.mjs"),
      modules
        .map(
          (moduleDefinition) => `
            {
              const loadedModule = await import(${JSON.stringify(moduleDefinition.specifier)});
              for (const exportName of ${JSON.stringify(moduleDefinition.exports)}) {
                if (!(exportName in loadedModule)) {
                  throw new Error(${JSON.stringify(moduleDefinition.specifier)} + " missing " + exportName);
                }
              }
            }
          `,
        )
        .join("\n"),
    );
    await execFileAsync("node", [path.join(tempDir, "smoke.mjs")], { cwd: tempDir });
  } catch (error) {
    failures.push(`packed tarball: ${formatError(error)}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

/**
 * Opt-in sibling checkouts replace git-pinned dependencies whose `prepare` build cannot run (for
 * example without access to their private build tooling): `GRAPH_EDITOR_SMOKE_LOCAL_EDITOR_CORE=1`
 * packs the sibling editor-core checkout, and `GRAPH_EDITOR_SMOKE_LOCAL_UI=1` a built sibling ui.
 */
async function packLocalSmokeDependencies(tempDir: string) {
  const candidates = [
    ["GRAPH_EDITOR_SMOKE_LOCAL_EDITOR_CORE", "editor-core", "@moenarch/editor-core"],
    ["GRAPH_EDITOR_SMOKE_LOCAL_UI", "ui", "@moritzbrantner/ui"],
  ] as const;
  const packed = await Promise.all(
    candidates.map(async ([flag, directoryName, name]) => {
      if (process.env[flag] !== "1") {
        return null;
      }
      const dependencyDir = path.resolve(rootDir, "..", directoryName);
      try {
        await access(path.join(dependencyDir, "package.json"));
      } catch {
        return null;
      }
      const tarballPath = path.join(tempDir, `${directoryName}.tgz`);
      await execFileAsync("bun", ["pm", "pack", "--filename", tarballPath, "--ignore-scripts"], {
        cwd: dependencyDir,
      });
      return { name, tarballPath };
    }),
  );
  return packed.filter((dependency) => dependency !== null);
}
