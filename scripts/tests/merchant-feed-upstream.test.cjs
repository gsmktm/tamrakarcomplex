"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { EventEmitter } = require("node:events");

const source = fs.readFileSync(path.join(__dirname, "../../server.cjs"), "utf8");
const helperStart = source.indexOf("async function supabaseFetch(");
const helperEnd = source.indexOf("async function supabaseRpcPage(", helperStart);
const routeStart = source.indexOf('app.get("/merchant-center.xml"');
const routeEnd = source.indexOf("// 4. API Routes", routeStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart && routeStart >= 0 && routeEnd > routeStart);
const isolatedCode = source.slice(helperStart, helperEnd) + "\n" + source.slice(routeStart, routeEnd);

function setup(upstream) {
  let handler;
  const https = {
    get(_url, _options, callback) {
      const req = new EventEmitter();
      req.setTimeout = (_milliseconds, onTimeout) => {
        if (upstream.timeout) process.nextTick(onTimeout);
        return req;
      };
      req.destroy = (error) => process.nextTick(() => req.emit("error", error));
      if (upstream.networkError) {
        process.nextTick(() => req.emit("error", new Error("network failure")));
      } else if (!upstream.timeout) {
        process.nextTick(() => {
          const response = new EventEmitter();
          response.statusCode = upstream.statusCode;
          callback(response);
          process.nextTick(() => {
            response.emit("data", upstream.body);
            response.emit("end");
          });
        });
      }
      return req;
    },
  };
  const context = {
    require(name) {
      assert.equal(name, "https");
      return https;
    },
    SUPABASE_URL: "https://example.invalid",
    SUPABASE_KEY: "isolated-test-placeholder",
    SUPABASE_REQUEST_TIMEOUT_MS: 10,
    BASE_URL: "https://example.invalid",
    escapeXml(value) {
      return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
    },
    app: {
      get(route, callback) {
        assert.equal(route, "/merchant-center.xml");
        handler = callback;
      },
    },
  };
  vm.runInNewContext(isolatedCode, context, { filename: "isolated-merchant-feed.cjs" });
  assert.equal(typeof handler, "function");
  return { handler, supabaseFetch: context.supabaseFetch };
}

async function request(upstream) {
  const { handler } = setup(upstream);
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = String(value); },
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
  };
  await handler({}, res);
  return res;
}

async function assertUnavailable(upstream) {
  const res = await request(upstream);
  assert.equal(res.statusCode, 503);
  assert.equal(res.headers["cache-control"], "no-store");
  assert.equal(res.headers["retry-after"], "60");
  assert.doesNotMatch(res.body, /<rss|<item|apikey|Bearer/i);
}

test("upstream HTTP 503 cannot become a cached empty feed", async () => {
  await assertUnavailable({ statusCode: 503, body: "unavailable" });
});

test("malformed upstream JSON cannot become a cached empty feed", async () => {
  await assertUnavailable({ statusCode: 200, body: "{bad-json" });
});

test("upstream timeout returns 503 and no-store", async () => {
  await assertUnavailable({ timeout: true });
});

test("upstream network error returns 503 and no-store", async () => {
  await assertUnavailable({ networkError: true });
});

test("non-array upstream JSON returns 503 and no-store", async () => {
  await assertUnavailable({ statusCode: 200, body: '{"error":"unexpected"}' });
});

test("legitimate empty catalog still returns normal empty XML", async () => {
  const res = await request({ statusCode: 200, body: "[]" });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["cache-control"], "public, max-age=900");
  assert.match(res.body, /<rss/);
  assert.doesNotMatch(res.body, /<item>/);
});

test("valid products remain in the normal XML feed", async () => {
  const product = [{ id: "p1", slug: "test-model", name: "A & B", image: "https://example.invalid/p.jpg", price_value: 100, in_stock: true }];
  const res = await request({ statusCode: 200, body: JSON.stringify(product) });
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /<g:title>A &amp; B<\/g:title>/);
  assert.match(res.body, /<g:price>100.00 NPR<\/g:price>/);
});

test("existing non-strict callers still get an empty array on upstream failure", async () => {
  const { supabaseFetch } = setup({ statusCode: 503, body: "unavailable" });
  const result = await supabaseFetch("products", "id", "");
  assert.equal(JSON.stringify(result), "[]");
});
