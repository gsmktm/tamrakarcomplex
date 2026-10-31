"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const swSource = fs.readFileSync(path.join(__dirname, "../public/sw.js"), "utf8");

function response(id, ok = true) {
  return { id, ok, clone() { return response(id, ok); } };
}

function setup({ cached, network, destination = "manifest", method = "GET", url = "https://tamrakarcomplex.com/manifest.webmanifest" }) {
  const handlers = {};
  const store = new Map();
  if (cached) store.set(url, cached);
  const pending = [];
  let fetches = 0;
  const caches = {
    match: async (key) => store.get(typeof key === "string" ? key : key.url),
    open: async () => ({ put: async (key, value) => { store.set(typeof key === "string" ? key : key.url, value); } }),
  };
  const self = {
    location: { origin: "https://tamrakarcomplex.com" },
    addEventListener(name, handler) { handlers[name] = handler; },
  };
  vm.runInNewContext(swSource, { self, caches, URL, Set, fetch: async () => {
    fetches++;
    if (network instanceof Error) throw network;
    return network;
  } }, { filename: "public/sw.js" });
  const event = {
    request: { method, url, destination, mode: "cors" },
    respondWith(promise) { this.reply = Promise.resolve(promise); },
    waitUntil(promise) { pending.push(Promise.resolve(promise)); },
  };
  handlers.fetch(event);
  return { event, store, pending, fetches: () => fetches };
}

test("online manifest returns fresh network response instead of stale SW cache", async () => {
  const t = setup({ cached: response("old"), network: response("new") });
  assert.equal((await t.event.reply).id, "new");
  await Promise.all(t.pending);
  assert.equal(t.store.get("https://tamrakarcomplex.com/manifest.webmanifest").id, "new");
  assert.equal(t.fetches(), 1);
});

test("offline manifest uses previously cached copy", async () => {
  const t = setup({ cached: response("offline-copy"), network: new Error("offline") });
  assert.equal((await t.event.reply).id, "offline-copy");
});

test("unsuccessful manifest response is not cached over a good copy", async () => {
  const t = setup({ cached: response("old"), network: response("unavailable", false) });
  assert.equal((await t.event.reply).id, "unavailable");
  await Promise.all(t.pending);
  assert.equal(t.store.get("https://tamrakarcomplex.com/manifest.webmanifest").id, "old");
});

test("content-hashed script retains cache-first behavior", async () => {
  const url = "https://tamrakarcomplex.com/assets/app-a1b2c3.js";
  const t = setup({ url, destination: "script", cached: response("cached-script"), network: response("fresh-script") });
  assert.equal((await t.event.reply).id, "cached-script");
});

test("cross-origin and non-GET requests are not intercepted", () => {
  const cross = setup({ url: "https://cdn.example.com/manifest.webmanifest", network: response("network") });
  const post = setup({ method: "POST", network: response("network") });
  assert.equal(cross.event.reply, undefined);
  assert.equal(post.event.reply, undefined);
});
