"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const source = readFileSync(path.join(__dirname, "..", "server.cjs"), "utf8");
const start = source.indexOf("function createRateLimiter(");
assert.notEqual(start, -1, "rate limiter must exist");
const end = source.indexOf("\n}\n", start);
assert.notEqual(end, -1, "rate limiter must close");
const limiterSource = source.slice(start, end + 2);

function harness({ windowMs = 1000, max = 2 } = {}) {
  const clock = { now: 0 };
  const maps = [];
  class InspectableMap extends Map {
    constructor() {
      super();
      maps.push(this);
    }
  }
  const context = {
    Date: { now: () => clock.now },
    Map: InspectableMap,
    apiError: (res, status, code) => {
      res.status = status;
      res.errorCode = code;
    },
  };
  vm.runInNewContext(limiterSource + "\nthis.makeLimiter = createRateLimiter;", context);
  const limiter = context.makeLimiter({ windowMs, max });
  function send(ip) {
    const headers = {};
    const res = { setHeader(name, value) { headers[name] = value; } };
    let nextCalls = 0;
    limiter({ ip }, res, () => { nextCalls++; });
    return { nextCalls, status: res.status, errorCode: res.errorCode, headers };
  }
  return { clock, buckets: maps[0], send };
}

test("expired IP buckets are reclaimed on the first request after the sweep interval", () => {
  const h = harness();
  for (let i = 0; i < 50; i++) assert.equal(h.send("client-" + i).nextCalls, 1);
  assert.equal(h.buckets.size, 50);
  h.clock.now = 1001;
  assert.equal(h.send("new-client").nextCalls, 1);
  assert.equal(h.buckets.size, 1);
  assert.ok(h.buckets.has("new-client"));
});

test("sweeping keeps unexpired IP buckets", () => {
  const h = harness();
  h.send("old");
  h.clock.now = 999;
  h.send("recent");
  h.clock.now = 1000;
  h.send("trigger");
  assert.equal(h.buckets.has("old"), false);
  assert.equal(h.buckets.has("recent"), true);
  assert.equal(h.buckets.has("trigger"), true);
  assert.equal(h.buckets.size, 2);
});

test("per-IP limit and Retry-After remain unchanged", () => {
  const h = harness();
  assert.equal(h.send("same").nextCalls, 1);
  assert.equal(h.send("same").nextCalls, 1);
  const blocked = h.send("same");
  assert.equal(blocked.nextCalls, 0);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.errorCode, "RATE_LIMITED");
  assert.equal(blocked.headers["Retry-After"], 1);
  assert.equal(h.send("other").nextCalls, 1);
  h.clock.now = 1000;
  assert.equal(h.send("same").nextCalls, 1);
});

test("sweeps are periodic rather than scanning on every request", () => {
  const h = harness();
  h.send("a");
  h.clock.now = 999;
  h.send("b");
  assert.equal(h.buckets.size, 2);
  h.clock.now = 1000;
  h.send("c");
  assert.equal(h.buckets.size, 2);
});
