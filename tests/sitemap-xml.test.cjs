"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const source = readFileSync(path.join(__dirname, "..", "server.cjs"), "utf8");

// Exercise the actual production functions without starting Express or accessing Supabase.
function extractFunction(name) {
  const start = source.indexOf("function " + name + "(");
  assert.notEqual(start, -1, name + " must exist");
  const end = source.indexOf("\n}\n", start);
  assert.notEqual(end, -1, name + " must close");
  return source.slice(start, end + 2);
}
const context = { BASE_URL: "https://tamrakarcomplex.com" };
vm.runInNewContext(
  extractFunction("escapeXml") + "\n" + extractFunction("urlEntry") + "\nthis.urlEntry = urlEntry;",
  context,
);
const urlEntry = context.urlEntry;

test("fallback sitemap escapes dynamic URL characters without changing the URL meaning", () => {
  const entry = urlEntry("/product/phone?a=1&b=<used>", "weekly", "0.8", "2026-10-31T12:00:00Z");
  assert.ok(entry.includes("<loc>https://tamrakarcomplex.com/product/phone?a=1&amp;b=&lt;used&gt;</loc>"));
  assert.ok(entry.includes("<lastmod>2026-10-31</lastmod>"));
  assert.ok(!entry.includes("<used>"));
});

test("RPC absolute sitemap URLs are escaped and not prefixed twice", () => {
  const entry = urlEntry("https://example.org/guide?a=1&b=2", "daily", "0.5", null, true);
  assert.ok(entry.includes("<loc>https://example.org/guide?a=1&amp;b=2</loc>"));
  assert.ok(!entry.includes("tamrakarcomplex.comhttps://"));
});

test("dynamic metadata cannot inject raw XML markup", () => {
  const entry = urlEntry("/safe", "daily</changefreq><evil/>", '0.5"<evil/>', "2026<evil/>", false);
  assert.ok(entry.includes("&lt;evil/&gt;"));
  assert.ok(!entry.includes("<evil/>"));
  assert.ok(!entry.includes("</changefreq><evil/>"));
});

test("RPC path uses the shared escaping renderer", () => {
  assert.match(source, /return urlEntry\(loc, changefreq, priority, row\.lastmod, true\);/);
});
