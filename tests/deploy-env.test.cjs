"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { resolveBuildEnvironment } = require("../scripts/deploy-env.cjs");

const valid = {
  VITE_SUPABASE_URL: "https://project.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test-only",
};

test("accepts complete step-scoped build config without local env file", () => {
  assert.deepEqual(resolveBuildEnvironment(valid, {}), {
    source: "environment",
    missing: [],
  });
});

test("accepts local env file when no step-scoped build config is present", () => {
  assert.deepEqual(resolveBuildEnvironment({}, valid), {
    source: "file",
    missing: [],
  });
});

test("fails closed on partial step-scoped env rather than mixing sources", () => {
  const result = resolveBuildEnvironment(
    { VITE_SUPABASE_URL: valid.VITE_SUPABASE_URL },
    valid,
  );
  assert.equal(result.source, "environment");
  assert.deepEqual(result.missing, ["VITE_SUPABASE_PUBLISHABLE_KEY"]);
});

test("rejects placeholder step-scoped env even if local file is valid", () => {
  const result = resolveBuildEnvironment(
    { ...valid, VITE_SUPABASE_URL: "https://YOUR_PROJECT.supabase.co" },
    valid,
  );
  assert.deepEqual(result.missing, ["VITE_SUPABASE_URL"]);
});

test("rejects blank and missing values in the local fallback", () => {
  const result = resolveBuildEnvironment({}, {
    VITE_SUPABASE_URL: "  ",
  });
  assert.deepEqual(result.missing, [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  ]);
});

test("rejects missing configuration rather than creating a bundle", () => {
  assert.equal(resolveBuildEnvironment({}, {}).missing.length, 2);
});

test("deploy workflow passes both public build variables to bundle preparation", () => {
  const root = path.resolve(__dirname, "..");
  const workflow = fs.readFileSync(
    path.join(root, ".github/workflows/deploy.yml"), "utf8",
  );
  const prepare = workflow.split("      - name: Prepare cPanel bundle\n")[1]
    ?.split("\n      - name:")[0];
  assert.ok(prepare, "Prepare cPanel bundle step must exist");
  assert.match(prepare, /VITE_SUPABASE_URL:.*secrets\.VITE_SUPABASE_URL/);
  assert.match(prepare, /VITE_SUPABASE_PUBLISHABLE_KEY:.*secrets\.VITE_SUPABASE_PUBLISHABLE_KEY/);
});
