"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { EventEmitter } = require("node:events");

// Run the real sitemap route and Supabase helpers without Express, credentials or network.
const source = fs.readFileSync(path.join(__dirname, "..", "server.cjs"), "utf8");
const start = source.indexOf("async function supabaseFetch(");
const end = source.indexOf('app.get("/merchant-center.xml"', start);
assert.ok(start >= 0 && end > start, "sitemap source must be extractable");
const isolatedCode = source.slice(start, end);

const ok = (rows = []) => ({ status: 200, body: JSON.stringify(rows) });
const fail = (status = 503) => ({ status, body: '{"error":"unavailable"}' });
const emptyFallback = () => Array.from({ length: 5 }, () => ok());

function harness(initialSteps) {
  const steps = [...initialSteps];
  let handler;
  let calls = 0;
  function issue(method, url, callback) {
    const step = steps.shift();
    assert.ok(step, "unexpected upstream " + method + " " + url);
    calls++;
    const req = new EventEmitter();
    req.setTimeout = (_ms, onTimeout) => {
      if (step.timeout) process.nextTick(onTimeout);
      return req;
    };
    req.destroy = (error) => process.nextTick(() => req.emit("error", error));
    req.write = () => {};
    req.end = () => deliver();
    if (method === "GET") process.nextTick(deliver);
    function deliver() {
      if (step.timeout) return;
      if (step.networkError) {
        process.nextTick(() => req.emit("error", new Error("simulated network failure")));
        return;
      }
      const response = new EventEmitter();
      response.statusCode = step.status;
      callback(response);
      process.nextTick(() => {
        response.emit("data", step.body);
        response.emit("end");
      });
    }
    return req;
  }
  const https = {
    get(url, _opts, callback) { return issue("GET", url, callback); },
    request(url, _opts, callback) { return issue("POST", url, callback); },
  };
  const context = {
    require(name) { assert.equal(name, "https"); return https; },
    SUPABASE_URL: "https://example.invalid",
    SUPABASE_KEY: "offline-test-only",
    SUPABASE_REQUEST_TIMEOUT_MS: 10,
    BASE_URL: "https://example.invalid",
    STATIC_URLS: [{ loc: "/", changefreq: "weekly", priority: "1.0" }],
    escapeXml(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;"); },
    console: { error() {} },
    app: {
      get(route, callback) {
        assert.equal(route, "/sitemap.xml");
        handler = callback;
      },
    },
  };
  vm.runInNewContext(isolatedCode, context, { filename: "isolated-sitemap.cjs" });
  assert.equal(typeof handler, "function");
  return {
    add(...next) { steps.push(...next); },
    calls() { return calls; },
    remaining() { return steps.length; },
    async request() {
      const res = {
        statusCode: 200,
        headers: {},
        setHeader(name, value) { this.headers[name.toLowerCase()] = String(value); },
        status(code) { this.statusCode = code; return this; },
        send(body) { this.body = body; return this; },
      };
      await handler({}, res);
      return res;
    },
  };
}

function assertUnavailable(res) {
  assert.equal(res.statusCode, 503);
  assert.equal(res.headers["cache-control"], "no-store");
  assert.equal(res.headers["retry-after"], "60");
  assert.doesNotMatch(res.body, /<urlset|<loc>|apikey|Bearer/i);
}

test("valid RPC sitemap is cached without fallback reads", async () => {
  const h = harness([ok([{ loc: "/product/test", priority: 0.8 }])]);
  const first = await h.request();
  assert.equal(first.statusCode, 200);
  assert.match(first.body, /product\/test/);
  assert.equal(first.headers["cache-control"], "public, max-age=3600");
  assert.equal((await h.request()).body, first.body);
  assert.equal(h.calls(), 1);
});

test("legitimate empty RPC and empty fallback produce valid XML", async () => {
  const h = harness([ok(), ...emptyFallback()]);
  const res = await h.request();
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /<urlset/);
  assert.equal(res.headers["cache-control"], "public, max-age=3600");
  assert.equal(h.calls(), 6);
});

test("RPC HTTP failure may recover through five successful fallback reads", async () => {
  const h = harness([fail(), ok([{ slug: "working", updated_at: "2026-10-31" }]), ...emptyFallback().slice(1)]);
  const res = await h.request();
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /product\/working/);
  assert.equal(h.calls(), 6);
});

test("single failed fallback table returns uncached 503, then recovers", async () => {
  const h = harness([ok(), ok(), fail(), ok(), ok(), ok()]);
  assertUnavailable(await h.request());
  h.add(ok([{ loc: "/recovered" }]));
  const recovered = await h.request();
  assert.equal(recovered.statusCode, 200);
  assert.match(recovered.body, /recovered/);
  assert.equal(h.calls(), 7);
});

test("RPC malformed JSON and total fallback outage return 503", async () => {
  const h = harness([{ status: 200, body: "not json" }, ...Array.from({ length: 5 }, () => fail())]);
  assertUnavailable(await h.request());
  assert.equal(h.calls(), 6);
});

test("fallback non-array JSON fails closed rather than caching partial XML", async () => {
  const h = harness([ok(), ok(), { status: 200, body: '{"message":"not a list"}' }, ok(), ok(), ok()]);
  assertUnavailable(await h.request());
});

test("RPC timeout and fallback network failure cannot create a healthy sitemap", async () => {
  const h = harness([{ timeout: true }, { networkError: true }, ...emptyFallback().slice(1)]);
  assertUnavailable(await h.request());
});

test("failed second RPC page is not silently accepted as complete", async () => {
  const page = Array.from({ length: 1000 }, (_, i) => ({ loc: "/p/" + i }));
  const h = harness([ok(page), fail(), ...Array.from({ length: 5 }, () => fail())]);
  assertUnavailable(await h.request());
  assert.equal(h.calls(), 7);
});
