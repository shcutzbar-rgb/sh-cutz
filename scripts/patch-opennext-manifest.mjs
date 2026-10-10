import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function patchManifestGlob(source) {
  const original = "**/{*-manifest,required-server-files,prefetch-hints}.json";
  const patched = "**/{*-manifest,required-server-files,prefetch-hints,preview-props}.json";
  if (source.includes(patched)) return source;
  if (!source.includes(original)) {
    throw new Error("OpenNext manifest patch changed: review preview-props.json compatibility before deploying.");
  }
  return source.replace(original, patched);
}

export function patchInstalledOpenNext() {
  const require = createRequire(import.meta.url);
  const entryPath = require.resolve("@opennextjs/cloudflare");
  const pluginPath = join(dirname(entryPath), "../cli/build/patches/plugins/load-manifest.js");
  const source = readFileSync(pluginPath, "utf8");
  const patched = patchManifestGlob(source);
  if (patched !== source) writeFileSync(pluginPath, patched, "utf8");
  console.log("OpenNext: preview-props.json manifest compatibility verified.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  patchInstalledOpenNext();
}