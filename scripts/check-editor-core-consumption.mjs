import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const failures = [];

const packageJson = await readJson("package.json");
const editorCorePackageJson = await readJson(
  "node_modules/@moritzbrantner/editor-core/package.json",
);
const smokeScript = await readText("scripts/smoke-package-exports.mjs");
const siblingEditorCorePattern = ["..", "editor-core"].join("/");

checkDependencyRanges(packageJson);
await checkSourceImports(editorCorePackageJson);
checkSmokeCoverage(packageJson, smokeScript);

if (failures.length > 0) {
  process.stderr.write(
    `editor-core consumption check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}\n`,
  );
  process.exit(1);
}

process.stdout.write("editor-core consumption check passed.\n");

function checkDependencyRanges(manifest) {
  for (const dependencySetName of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    const dependencySet = manifest[dependencySetName] ?? {};
    for (const [name, range] of Object.entries(dependencySet)) {
      if (typeof range !== "string") {
        continue;
      }
      if (
        range.startsWith("file:") ||
        range.startsWith("workspace:") ||
        range.includes(siblingEditorCorePattern)
      ) {
        failures.push(
          `package.json ${dependencySetName}.${name} uses non-published range ${range}`,
        );
      }
    }
  }
}

async function checkSourceImports(editorCoreManifest) {
  const declaredEditorCoreSpecifiers = new Set(
    Object.keys(editorCoreManifest.exports ?? {}).map((specifier) =>
      specifier === "."
        ? "@moritzbrantner/editor-core"
        : `@moritzbrantner/editor-core/${specifier.slice(2)}`,
    ),
  );
  const sourceFiles = await listFiles(["src", "scripts"], [".ts", ".tsx", ".mjs"]);

  await Promise.all(sourceFiles.map(checkSourceFile));

  async function checkSourceFile(filePath) {
    const text = await readText(filePath);
    if (text.includes(siblingEditorCorePattern)) {
      failures.push(`${filePath} references ${siblingEditorCorePattern}`);
    }

    for (const match of text.matchAll(
      /from\s+["'](@moritzbrantner\/editor-core(?:\/[^"']+)?)["']/g,
    )) {
      const specifier = match[1];
      if (specifier === "@moritzbrantner/editor-core") {
        failures.push(`${filePath} imports the editor-core root entrypoint; use explicit subpaths`);
      } else if (!declaredEditorCoreSpecifiers.has(specifier)) {
        failures.push(`${filePath} imports undeclared editor-core subpath ${specifier}`);
      }
    }
  }
}

function checkSmokeCoverage(manifest, smokeScriptText) {
  for (const specifier of Object.keys(manifest.exports ?? {})) {
    const packageSpecifier =
      specifier === "." ? manifest.name : `${manifest.name}/${specifier.slice(2)}`;
    if (!smokeScriptText.includes(`specifier: "${packageSpecifier}"`)) {
      failures.push(`scripts/smoke-package-exports.mjs does not cover ${packageSpecifier}`);
    }
  }
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath));
}

async function readText(relativePath) {
  return readFile(path.join(rootDir, relativePath), "utf8");
}

async function listFiles(directories, extensions) {
  const { readdir } = await import("node:fs/promises");
  const files = [];

  async function walk(relativeDirectory) {
    const entries = await readdir(path.join(rootDir, relativeDirectory), { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const relativePath = path.join(relativeDirectory, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "coverage") {
            return;
          }
          await walk(relativePath);
        } else if (extensions.includes(path.extname(entry.name))) {
          files.push(relativePath);
        }
      }),
    );
  }

  await Promise.all(directories.map((directory) => walk(directory)));
  return files;
}
