import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/pages/storeadmin/StoreAnalytics.tsx", import.meta.url), "utf8");

test("store analytics never advertises a fabricated growth percentage", () => {
  assert.doesNotMatch(source, /title:\s*["']Growth Score["'][^\n]*value:\s*["']\d+(?:\.\d+)?%["']/);
  assert.match(source, /title:\s*["']Growth Score["'][^\n]*value:\s*["']Not available["']/);
  assert.match(source, /Month-over-month growth is not yet calculated/);
});
