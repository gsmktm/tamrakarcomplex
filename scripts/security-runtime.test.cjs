const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const workflow = fs.readFileSync(
  path.join(root, ".github", "workflows", "security.yml"),
  "utf8",
);
const lock = JSON.parse(
  fs.readFileSync(path.join(root, "package-lock.json"), "utf8"),
);
const auditJob = workflow
  .split(/\r?\n(?=  [a-z][\w-]*:\s*\r?\n)/)
  .find((section) => section.startsWith("  dependency-audit:\n"));
const declaredMajor = Number(
  auditJob?.match(/^ {10}node-version:\s*["']?(\d+)(?:\.\d+)*["']?\s*$/m)?.[1],
);

test("security dependency audit declares a supported Node.js runtime", () => {
  assert.ok(auditJob, "Missing dependency-audit job");
  assert.ok(Number.isInteger(declaredMajor) && declaredMajor >= 22,
    "Dependency audit must pin Node.js 22 or newer");
});

for (const name of ["@supabase/supabase-js", "@supabase/auth-js"]) {
  test(`security audit runtime satisfies locked ${name} engine`, () => {
    const engine = lock.packages[`node_modules/${name}`]?.engines?.node;
    const match = /^>=\s*(\d+)(?:\.\d+){0,2}$/.exec(engine ?? "");
    assert.ok(match, `Unexpected locked Node.js engine for ${name}: ${engine}`);
    const minimum = Number(match[1]);
    assert.ok(declaredMajor >= minimum,
      `Security workflow Node.js ${declaredMajor} is below ${name} requirement ${engine}`);
    const runningMajor = Number(process.versions.node.split(".")[0]);
    assert.ok(runningMajor >= minimum,
      `Executing Node.js ${process.version} is below ${name} requirement ${engine}`);
  });
}
