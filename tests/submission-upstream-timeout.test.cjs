"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../server.cjs"), "utf8");

const contactData = {
  name: "Test Customer", email: "customer@example.invalid",
  subject: null, message: "Please contact me",
};
const repairData = {
  name: "Test Customer", phone: "9800000000", email: null,
  device_brand: "Test", device_model: "Test model",
  issue_type: "Screen", description: null, preferred_date: null,
};

function exercise(route, fetchImpl) {
  const handlers = {};
  const timeoutCalls = [];
  const testSignal = { fromTest: true };
  const context = {
    app: { post(name, limiter, handler) { handlers[name] = handler; } },
    createRateLimiter() { return (_req, _res, next) => next(); },
    contactSchema: { safeParse() { return { success: true, data: contactData }; } },
    repairRequestSchema: { safeParse() { return { success: true, data: repairData }; } },
    SUPABASE_URL: "https://supabase.example.invalid",
    SUPABASE_KEY: "public-test-placeholder",
    SUPABASE_SUBMISSION_TIMEOUT_MS: 10000,
    AbortSignal: {
      timeout(milliseconds) {
        timeoutCalls.push(milliseconds);
        return testSignal;
      },
    },
    fetch: fetchImpl,
    apiError(res, status, code, message) {
      return res.status(status).json({ error: { code, message } });
    },
  };

  const start = source.indexOf('app.post("/api/' + route + '"');
  assert.ok(start >= 0, route + " route must exist");
  const marker = route === "contact" ? "// API: Order creation" : "// API: Wishlist toggle";
  const end = source.indexOf(marker, start);
  assert.ok(end > start, route + " route must end before next section");
  vm.runInNewContext(source.slice(start, end), context, {
    filename: route + "-route-isolation.cjs",
  });
  const handler = handlers["/api/" + route];
  assert.equal(typeof handler, "function");

  const result = { status: 200, body: null };
  const res = {
    status(status) { result.status = status; return this; },
    json(body) { result.body = body; return this; },
  };
  return handler({ body: {} }, res).then(() => ({
    ...result, timeoutCalls, testSignal,
  }));
}

for (const [route, table] of [
  ["contact", "contact_messages"],
  ["repair-requests", "repair_requests"],
]) {
  test(route + " submits with a 10-second abort signal", async () => {
    let captured;
    const result = await exercise(route, async (url, options) => {
      captured = { url, options };
      return { ok: true };
    });
    assert.equal(result.status, 201);
    assert.equal(result.body.data.success, true);
    assert.deepEqual(result.timeoutCalls, [10000]);
    assert.equal(captured.options.signal, result.testSignal);
    assert.equal(captured.options.method, "POST");
    assert.equal(captured.url, "https://supabase.example.invalid/rest/v1/" + table);
  });

  for (const name of ["TimeoutError", "AbortError"]) {
    test(route + " returns 503 on " + name, async () => {
      const result = await exercise(route, async () => {
        const error = new Error("upstream deadline");
        error.name = name;
        throw error;
      });
      assert.equal(result.status, 503);
      assert.equal(result.body.error.code, "UPSTREAM_TIMEOUT");
    });
  }

  test(route + " returns 502 for network failure", async () => {
    const result = await exercise(route, async () => {
      throw new TypeError("network unavailable");
    });
    assert.equal(result.status, 502);
    assert.equal(result.body.error.code, "UPSTREAM_UNAVAILABLE");
  });

  test(route + " rejects non-2xx upstream response", async () => {
    const result = await exercise(route, async () => ({ ok: false }));
    assert.equal(result.status, 502);
    assert.match(result.body.error.code, /_SUBMISSION_FAILED$/);
  });
}
