"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../server.cjs"), "utf8");
const start = source.indexOf('app.get("*", (req, res) => {');
const end = source.indexOf("// 6. Listen", start);
assert.ok(start >= 0 && end > start, "SPA fallback must exist");

let handler;
vm.runInNewContext(source.slice(start, end), {
  app: { get(route, callback) { assert.equal(route, "*"); handler = callback; } },
  INDEX: "/dist/index.html",
}, { filename: "spa-fallback-isolation.cjs" });

function request(pathname) {
  const headers = {};
  const result = { headers, status: 200, contentType: null, body: null, sentFile: null };
  const res = {
    setHeader(name, value) { headers[name.toLowerCase()] = value; return this; },
    status(code) { result.status = code; return this; },
    type(value) { result.contentType = value; return this; },
    send(body) { result.body = body; return this; },
    sendFile(file) { result.sentFile = file; return this; },
  };
  handler({ path: pathname }, res);
  return result;
}

test("missing Vite JavaScript returns uncached 404, not HTML 200", () => {
  const r = request("/assets/index-deadbeef.js");
  assert.equal(r.status, 404);
  assert.equal(r.contentType, "text/plain");
  assert.equal(r.headers["cache-control"], "no-store");
  assert.equal(r.sentFile, null);
});

test("missing Vite stylesheet also returns uncached 404", () => {
  const r = request("/assets/index-deadbeef.css");
  assert.equal(r.status, 404);
  assert.equal(r.sentFile, null);
});

test("normal client-side navigation still serves SPA entry", () => {
  const r = request("/stores/example-store");
  assert.equal(r.status, 200);
  assert.equal(r.sentFile, "/dist/index.html");
});
