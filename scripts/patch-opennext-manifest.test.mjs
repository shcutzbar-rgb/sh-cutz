import assert from "node:assert/strict";
import { test } from "node:test";
import { patchManifestGlob } from "./patch-opennext-manifest.mjs";

test("includes Next.js preview props in the OpenNext manifest glob", () => {
  const original = 'glob("**/{*-manifest,required-server-files,prefetch-hints}.json")';
  const patched = patchManifestGlob(original);
  assert.equal(patched, 'glob("**/{*-manifest,required-server-files,prefetch-hints,preview-props}.json")');
  assert.equal(patchManifestGlob(patched), patched);
});

test("fails explicitly when the upstream patch no longer matches", () => {
  assert.throws(() => patchManifestGlob("unknown implementation"), /review preview-props/);
});