import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const roots = ["src", "docs", "scripts", "README.md", "RELEASE_NOTES.md", "package.json"];
const oldName = "@moritzbrantner/editor-core";
const newName = "@moenarch/editor-core";

for (const root of roots) {
  const target = path.join(rootDir, root);
  try {
    await rewritePath(target);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const packagePath = path.join(rootDir, "package.json");
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
delete packageJson.dependencies?.[oldName];
packageJson.dependencies ??= {};
packageJson.dependencies[newName] = "^0.4.1";
packageJson.dependencies = Object.fromEntries(
  Object.entries(packageJson.dependencies).sort(([left], [right]) => left.localeCompare(right)),
);
await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

const sourceDepsPath = path.join(rootDir, "scripts/source-deps.mjs");
let sourceDeps = await readFile(sourceDepsPath, "utf8");
sourceDeps = sourceDeps.replace(
  'acceptedSourceNames: ["@moenarch/editor-core", "@moenarch/editor-core"],',
  'acceptedSourceNames: ["@moenarch/editor-core"],',
);
await writeFile(sourceDepsPath, sourceDeps);

async function rewritePath(target) {
  const targetStat = await stat(target);
  if (targetStat.isDirectory()) {
    for (const entry of await readdir(target)) await rewritePath(path.join(target, entry));
    return;
  }
  if (!/\.(?:ts|tsx|js|mjs|md|json)$/.test(target)) return;
  const source = await readFile(target, "utf8");
  if (source.includes(oldName)) await writeFile(target, source.replaceAll(oldName, newName));
}
