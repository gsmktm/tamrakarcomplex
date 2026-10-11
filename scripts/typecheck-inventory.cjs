#!/usr/bin/env node
"use strict";

// Reports the existing TypeScript error inventory without masking the main CI gate.
// Usage:
//   node scripts/typecheck-inventory.cjs
//   node scripts/typecheck-inventory.cjs --report-only
// A failing type-check remains a failing exit status without --report-only.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const reportOnly = process.argv.includes("--report-only");
const subprocess = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsc", "-p", "tsconfig.app.json", "--noEmit", "--pretty", "false"],
  { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
);

const raw = [subprocess.stdout, subprocess.stderr].filter(Boolean).join("\n");
const errors = [];
for (const line of raw.split(/\r?\n/)) {
  const match = line.match(/^(.+?\.(?:ts|tsx|mts|cts))\((\d+),(\d+)\): error (TS\d+): (.*)$/);
  if (!match) continue;
  errors.push({
    file: match[1].replaceAll("\\", "/"),
    line: Number(match[2]),
    column: Number(match[3]),
    code: match[4],
    message: match[5],
  });
}

const byFile = new Map();
const byCode = new Map();
const causes = new Map();
for (const error of errors) {
  byFile.set(error.file, (byFile.get(error.file) || 0) + 1);
  byCode.set(error.code, (byCode.get(error.code) || 0) + 1);
  const group = /SelectQueryError|does not exist on|never.*\b|postgrest/i.test(error.message)
    ? "Supabase schema / inferred query types"
    : /AppRole|staffadmin|storeadmin|StaffPermissions|allowedRoles/.test(error.message)
      ? "Role or permission typing"
      : /Cannot find name|Cannot find module/.test(error.message)
        ? "Missing imports / declarations"
        : /Type '.*' is not assignable|No overload matches/.test(error.message)
          ? "Contract / assignability mismatch"
          : "Other";
  causes.set(group, (causes.get(group) || 0) + 1);
}

const top = (m, count = 20) => [...m].sort((a, b) => b[1] - a[1]).slice(0, count);
const markdown = [
  "# Tamrakar Complex TypeScript Inventory",
  "",
  `Exit status: **${subprocess.status ?? "unknown"}** (mandatory CI must stay failing until corrected).`,
  "",
  `Total errors: **${errors.length}** across **${byFile.size}** files.`,
  "",
  "## Root-cause heuristics (not a verified schema audit)",
  ...top(causes).map(([name, count]) => `- ${name}: ${count}`),
  "",
  "## Error codes",
  ...top(byCode, 12).map(([name, count]) => `- ${name}: ${count}`),
  "",
  "## Highest-impact files",
  ...top(byFile).map(([name, count]) => `- \`${name}\`: ${count}`),
  "",
  "Do not suppress errors or regenerate Supabase types from a different project.",
  "",
].join("\n");

const outDir = path.resolve(process.cwd(), "artifacts");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "typescript-inventory.md"), markdown);
fs.writeFileSync(path.join(outDir, "typescript-inventory.json"), JSON.stringify({
  result: subprocess.status,
  count: errors.length,
  files: byFile.size,
  byFile: Object.fromEntries(top(byFile, byFile.size)),
  byCode: Object.fromEntries(top(byCode, byCode.size)),
  byCauseHeuristic: Object.fromEntries(causes),
  errors: errors.slice(0, 250),
}, null, 2) + "\n");

process.stdout.write(markdown);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
}

if (subprocess.error) {
  console.error(subprocess.error.message);
  process.exitCode = reportOnly ? 0 : 1;
} else if (!reportOnly && subprocess.status !== 0) {
  process.exitCode = subprocess.status || 1;
}
