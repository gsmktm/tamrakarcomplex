"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../server.cjs"), "utf8");
const start = source.indexOf("app.use(\n  express.static(DIST, {");
const end = source.indexOf("// 5. SPA fallback", start);
assert.ok(start !== -1 && end > start, "Express static middleware must be present");

let options;
const sandbox = {
  DIST: "/test/dist",
  path,
  app: { use(middleware) { assert.equal(middleware, "captured-static"); } },
  express: {
    static(_directory, config) {
      options = config;
      return "captured-static";
    },
  },
};
vm.runInNewContext(source.slice(start, end), sandbox, { filename: "static-cache-isolation.cjs" });
assert.equal(typeof options?.setHeaders, "function");

function headersFor(filename) {
  const headers = {};
  options.setHeaders({
    setHeader(name, value) { headers[name.toLowerCase()] = value; },
  }, path.join("/test/dist", filename));
  return headers;
}

test("robots.txt revalidates rather than inheriting immutable caching", () => {
  assert.equal(headersFor("robots.txt")["cache-control"], "no-cache, must-revalidate");
});

test("PWA manifest revalidates rather than inheriting immutable caching", () => {
  assert.equal(headersFor("manifest.webmanifest")["cache-control"], "no-cache, must-revalidate");
});

test("index.html retains the stronger no-store policy", () => {
  const headers = headersFor("index.html");
  assert.equal(headers["cache-control"], "no-cache, no-store, must-revalidate");
  assert.equal(headers.pragma, "no-cache");
  assert.equal(headers.expires, "0");
});

test("hashed Vite assets retain default long-lived static caching", () => {
  assert.equal(options.maxAge, "1y");
  assert.equal(options.immutable, true);
  assert.equal(options.etag, true);
  assert.equal(headersFor("assets/app-1234abcd.js")["cache-control"], undefined);
});
