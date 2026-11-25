const { test } = require("node:test");
const assert = require("node:assert/strict");
const { summarizeTypeScriptErrors, markdownSummary } = require("./summarize-ts-errors.cjs");

test("groups compiler diagnostics by file and code", () => {
  const log = [
    "src/App.tsx(105,20): error TS2322: Invalid prop",
    "src/App.tsx(106,20): error TS2322: Invalid prop",
    "src/hooks/useAuth.tsx(5,2): error TS2304: Unknown name",
    "non-compiler output",
  ].join("\n");
  const summary = summarizeTypeScriptErrors(log);
  assert.equal(summary.total, 3);
  assert.equal(summary.files, 2);
  assert.deepEqual(summary.topFiles[0], ["src/App.tsx", 2]);
  assert.deepEqual(summary.topCodes[0], ["TS2322", 2]);
  assert.match(markdownSummary(summary), /3 errors across 2 files/);
});

test("handles clean output without misreporting errors", () => {
  const summary = summarizeTypeScriptErrors("Done in 12 seconds.");
  assert.equal(summary.total, 0);
  assert.equal(summary.files, 0);
});
