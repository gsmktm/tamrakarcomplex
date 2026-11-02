const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const source = readFileSync(
  resolve(__dirname, "../../src/pages/BookingSuccess.tsx"),
  "utf8",
);
const steps = [...source.matchAll(/<Step\s+icon=\{[^}]+\}\s+text="([^"]+)"/g)]
  .map((match) => match[1]);

test("repair confirmation copy avoids unverified service-level guarantees", () => {
  assert.equal(steps.length, 3, "expected three visible next-step messages");
  assert.doesNotMatch(source, /within\s+24\s+hours/i);
  assert.doesNotMatch(source, /90-day\s+service\s+warranty/i);
  assert.ok(steps.every((step) => !/guaranteed|always|within \d+ (hours|days)/i.test(step)));
});

test("repair confirmation directs users to tracking and written warranty terms", () => {
  assert.ok(steps.some((step) => step.includes("tracking ID") && step.includes("check for updates")));
  assert.ok(steps.some((step) => step.includes("Contact support")));
  assert.ok(steps.some((step) => step.includes("confirm any warranty terms in writing")));
});

test("repair confirmation still discloses provisional pricing and no payment taken", () => {
  assert.match(source, /No payment was taken/);
  assert.match(source, /Provisional estimate/);
});
