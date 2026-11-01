"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const source = readFileSync(
  path.join(__dirname, "../src/components/admin/console/StoreCreditsModule.tsx"),
  "utf8",
);
const start = source.indexOf('queryKey: ["console-store-credit-recent"]');
const end = source.indexOf("const userById", start);
assert.ok(start >= 0 && end > start, "Recent-history query must remain present");
const recentQuery = source.slice(start, end);

test("recent-history query uses the imported Supabase client", () => {
  assert.match(source, /import\s*\{\s*supabase\s*\}\s*from\s*["']@\/integrations\/supabase\/client["']/);
  assert.match(recentQuery, /await\s+supabase\s*\.from\(["']store_credit_transactions["']\)/);
  assert.doesNotMatch(recentQuery, /\b(?:await\s+)?sb\s*\.from\s*\(/);
});

test("recent-history query remains read-only and bounded", () => {
  assert.match(recentQuery, /\.select\(["']id, user_id, store_id, amount, reason, created_at, created_by["']\)/);
  assert.match(recentQuery, /\.order\(["']created_at["'],\s*\{\s*ascending:\s*false\s*\}\)/);
  assert.match(recentQuery, /\.limit\(50\)/);
  assert.doesNotMatch(recentQuery, /\.(?:insert|update|upsert|delete|rpc)\s*\(/);
});

test("recent-history read remains admin gated and propagates errors", () => {
  assert.match(recentQuery, /enabled:\s*isAdmin/);
  assert.match(recentQuery, /if\s*\(error\)\s*throw error/);
});

test("recent-history failure remains visible to administrators", () => {
  assert.match(source, /recentError\s*\?\s*\(/);
  assert.match(source, /getErrorMessage\(recentError\)/);
});
