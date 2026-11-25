#!/usr/bin/env node
"use strict";

const fs = require("node:fs");

function summarizeTypeScriptErrors(log) {
  const errors = [];
  const fileCounts = new Map();
  const codeCounts = new Map();
  for (const rawLine of log.split(/\r?\n/)) {
    const line = rawLine.replace(/^.*?##\[error\]/, "");
    const match = line.match(/^(.+?)\((\d+),(\d+)\): error TS(\d+): (.+)$/);
    if (!match) continue;
    const [, file, lineNumber, column, code, message] = match;
    const row = { file, line: Number(lineNumber), column: Number(column), code: `TS${code}`, message };
    errors.push(row);
    fileCounts.set(file, (fileCounts.get(file) ?? 0) + 1);
    codeCounts.set(row.code, (codeCounts.get(row.code) ?? 0) + 1);
  }
  const top = (counts, limit = 12) =>
    [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
  return { total: errors.length, files: fileCounts.size, topFiles: top(fileCounts), topCodes: top(codeCounts), sample: errors.slice(0, 8) };
}

function markdownSummary(info) {
  const lines = [
    "## TypeScript diagnostic summary",
    "",
    `**${info.total} errors across ${info.files} files**. A successful build does not override this quality gate.`,
    "",
    "### Most affected files",
    "",
    "| File | Errors |", "| --- | ---: |",
    ...info.topFiles.map(([name, count]) => `| \`${name.replace(/\|/g, "")}\` | ${count} |`),
    "",
    "### Most frequent error codes",
    "",
    "| Code | Count |", "| --- | ---: |",
    ...info.topCodes.map(([name, count]) => `| ${name} | ${count} |`),
    "",
    "### First diagnostics",
    "",
    ...info.sample.map(x => `- \`${x.file}:${x.line}:${x.column}\` ${x.code} — ${x.message.replace(/[|<>]/g, "")}`),
    "",
  ];
  return lines.join("\n");
}

module.exports = { summarizeTypeScriptErrors, markdownSummary };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node scripts/summarize-ts-errors.cjs <compiler-log>");
    process.exit(2);
  }
  try {
    process.stdout.write(markdownSummary(summarizeTypeScriptErrors(fs.readFileSync(file, "utf8"))) + "\n");
  } catch (error) {
    console.error("Could not summarize TypeScript errors:", error.message);
    process.exit(1);
  }
}
