import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Keep the production audit a blocking security gate. See issue #32.
const workflow = readFileSync(
  new URL("../../.github/workflows/security.yml", import.meta.url),
  "utf8",
);

const auditStep = workflow.match(
  /^ {6}- name: Audit production dependencies\r?\n((?:^ {8,}.*\r?\n?)*)/m,
)?.[1];

describe("production dependency audit security gate", () => {
  it("keeps the audit step present and runs a production-only high-severity audit", () => {
    expect(auditStep).toBeDefined();
    const command = auditStep?.match(/^ {8}run: (.+)$/m)?.[1]?.trim();
    expect(command).toBe("npm audit --omit=dev --audit-level=high");
  });

  it("does not tolerate audit failures or disable the step", () => {
    expect(auditStep).toBeDefined();
    expect(auditStep).not.toMatch(/^ {8}continue-on-error:\s*true\s*$/m);
    expect(auditStep).not.toMatch(/^ {8}if:/m);
  });
});
