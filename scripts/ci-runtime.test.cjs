const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const lock = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "package-lock.json"), "utf8"),
);

for (const name of ["@supabase/supabase-js", "@supabase/auth-js"]) {
  test(`CI Node.js satisfies the locked ${name} engine requirement`, () => {
    const engine = lock.packages[`node_modules/${name}`]?.engines?.node;
    const minimum = /^>=\s*(\d+)(?:\.\d+){0,2}$/.exec(engine ?? "");
    assert.ok(minimum, `Expected a simple minimum Node.js engine for ${name}: ${engine}`);

    const runningMajor = Number(process.versions.node.split(".")[0]);
    assert.ok(
      runningMajor >= Number(minimum[1]),
      `Node.js ${process.version} is below ${name}'s locked requirement ${engine}`,
    );
  });
}
