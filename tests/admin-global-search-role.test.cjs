"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const search = readFileSync(path.join(root, "src/components/admin/AdminGlobalSearch.tsx"), "utf8");
const roles = readFileSync(path.join(root, "src/lib/roles.ts"), "utf8");
const types = readFileSync(path.join(root, "src/types/app.ts"), "utf8");

test("store search quick actions use the normalized AppRole, not a legacy raw role", () => {
  assert.match(search, /const\s+isStoreAdmin\s*=\s*role\s*===\s*["']storeadmin["']/);
  assert.doesNotMatch(search, /role\s*===\s*["']store_owner["']/);
  assert.match(types, /\|\s*["']storeadmin["']/);
});

test("legacy store_owner role is normalized before the search UI consumes it", () => {
  assert.match(roles, /case\s+["']store_owner["']\s*:/);
  assert.match(roles, /case\s+["']storeadmin["']\s*:/);
  assert.match(roles, /return\s+["']storeadmin["']/);
});

test("store-only quick actions remain behind the store-admin guard", () => {
  assert.match(search, /\{isStoreAdmin\s*&&\s*\(/);
  assert.match(search, /handleSelect\(["']\/storeadmin["']\)/);
  assert.match(search, /handleSelect\(["']\/storeadmin\/products["']\)/);
  assert.match(search, /const\s+isSuAdmin\s*=\s*role\s*===\s*["']suadmin["']/);
});
