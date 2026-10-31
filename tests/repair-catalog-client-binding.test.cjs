"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const source = readFileSync(
  path.join(__dirname, "..", "src/components/admin/repair/RepairCatalogManager.tsx"),
  "utf8",
);

function hasUnboundSupabaseAlias(text) {
  return /\bawait\s+sb\s*\.from\s*\(/.test(text);
}

test("repair catalog imports and uses the bound Supabase client", () => {
  assert.match(source, /import\s*\{\s*supabase\s*\}\s*from\s*["']@\/integrations\/supabase\/client["']/);
  assert.equal(hasUnboundSupabaseAlias(source), false);
});

test("repair device and guide reads use the imported client", () => {
  const reads = [...source.matchAll(/\bawait\s+supabase\s*\.from\s*\(\s*["'](repair_guides|repair_devices)["']\s*\)/g)]
    .map((match) => match[1]);
  assert.ok(reads.filter((table) => table === "repair_guides").length >= 2);
  assert.ok(reads.includes("repair_devices"));
});

test("regression guard detects the original unbound alias", () => {
  assert.equal(hasUnboundSupabaseAlias("const result = await sb\n  .from('repair_guides')"), true);
});
