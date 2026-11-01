"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = readFileSync(path.join(root, "src/App.tsx"), "utf8");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

test("React Router v7 is the installed router API target", () => {
  assert.match(pkg.dependencies["react-router-dom"], /^\^?7\./);
});

test("BrowserRouter has no obsolete v6 future flags rejected by v7 typings", () => {
  assert.match(app, /<BrowserRouter\s*>/);
  assert.doesNotMatch(app, /<BrowserRouter\s+future=/);
  assert.doesNotMatch(app, /v7_startTransition|v7_relativeSplatPath/);
});

test("Router still wraps public/admin routes and closes exactly once", () => {
  assert.equal((app.match(/<BrowserRouter\s*>/g) || []).length, 1);
  assert.equal((app.match(/<\/BrowserRouter>/g) || []).length, 1);
  assert.ok(app.indexOf("<BrowserRouter>") < app.indexOf("<Routes>"));
  assert.ok(app.indexOf("</Routes>") < app.indexOf("</BrowserRouter>"));
});
