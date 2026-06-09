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
    exports: ["GraphCanvas", "GraphNode", "normalizeGraphEditorDocument"],
  },
  {
    specifier: "@moritzbrantner/graph-editor/core",
    path: "../dist/core.js",
    exports: ["validateGraphEditorDocument", "normalizeGraphEditorDocument"],
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
    exports: ["createGraphEditorAddNodeOperation", "createGraphEditorUpdateNodeOperation"],
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
];

const failures = [];

await Promise.all(
  modules.map(async (moduleDefinition) => {
    let loadedModule;

    try {
      loadedModule = await import(new URL(moduleDefinition.path, import.meta.url));
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

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

async function smokePackedTarball(failures) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "graph-editor-package-smoke-"));
  try {
    const packResult = await execFileAsync(
      "npm",
      ["pack", rootDir, "--pack-destination", tempDir, "--ignore-scripts"],
      { cwd: rootDir },
    );
    const tarballName = packResult.stdout.trim().split(/\r?\n/).at(-1);
    if (!tarballName) {
      failures.push("packed tarball: npm pack did not report a tarball name");
      return;
    }
    const tarballPath = path.join(tempDir, tarballName);
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

    const installDir = path.join(tempDir, "consumer");
    await writeFile(
      path.join(tempDir, "package.json"),
      JSON.stringify({ private: true, type: "module" }, null, 2),
    );
    const localDependencyTarballs = await packLocalSmokeDependencies(tempDir);
    await execFileAsync(
      "npm",
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        ...localDependencyTarballs,
        tarballPath,
      ],
      {
        cwd: tempDir,
      },
    );
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
    await execFileAsync(process.execPath, [path.join(tempDir, "smoke.mjs")], { cwd: tempDir });
    void installDir;
  } catch (error) {
    failures.push(`packed tarball: ${formatError(error)}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function packLocalSmokeDependencies(tempDir) {
  const editorCoreDir = path.resolve(rootDir, "../editor-core");
  try {
    await access(path.join(editorCoreDir, "package.json"));
  } catch {
    return [];
  }

  const packResult = await execFileAsync(
    "npm",
    ["pack", editorCoreDir, "--pack-destination", tempDir, "--ignore-scripts"],
    { cwd: rootDir },
  );
  const tarballName = packResult.stdout.trim().split(/\r?\n/).at(-1);
  return tarballName ? [path.join(tempDir, tarballName)] : [];
}
