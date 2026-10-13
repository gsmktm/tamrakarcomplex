#!/usr/bin/env node
"use strict";

// Read-only static inventory: discover literal Supabase table/RPC names used in
// application code but absent from the checked-in generated Database types.
// This does NOT certify the local SQL schema or the inaccessible live project.
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const typePath = path.join(root, "src/integrations/supabase/types.ts");
const file = fs.readFileSync(typePath, "utf8");

function sectionNames(section, nextSection) {
  const start = file.indexOf("    " + section + ": {");
  if (start < 0) throw Error("Missing generated Database section: " + section);
  const end = file.indexOf("    " + nextSection + ": {", start + 1);
  if (end < 0) throw Error("Missing generated Database section: " + nextSection);
  const part = file.slice(start, end);
  return new Set([...part.matchAll(/^      ([A-Za-z0-9_]+): \{/gm)].map(m => m[1]));
}

const tables = sectionNames("Tables", "Views");
const functions = sectionNames("Functions", "Enums");

function* sources(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const filename = path.join(dir, item.name);
    if (item.isDirectory()) {
      yield* sources(filename);
    } else if (/\.tsx?$/.test(item.name) && !item.name.endsWith(".d.ts")
      && filename !== typePath) {
      yield filename;
    }
  }
}
const seenTables = new Map(), seenRPCs = new Map();
function capture(text, re, output, relative) {
  for (const match of text.matchAll(re)) {
    const name = match[1];
    if (!output.has(name)) output.set(name, new Set());
    output.get(name).add(relative);
  }
}
for (const source of sources(path.join(root, "src"))) {
  const rel = path.relative(root, source).replaceAll(path.sep, "/");
  const contents = fs.readFileSync(source, "utf8");
  capture(contents, /\.from\(\s*["']([a-zA-Z0-9_]+)["']\s*\)/g, seenTables, rel);
  capture(contents, /\.rpc\(\s*["']([a-zA-Z0-9_]+)["']/g, seenRPCs, rel);
}
const missing = (seen, present) => [...seen.entries()]
  .filter(([name]) => !present.has(name))
  .map(([name, paths]) => ({ name, files: [...paths].sort() }))
  .sort((a, b) => b.files.length - a.files.length || a.name.localeCompare(b.name));
const report = {
  caution: "Static inventory of literal calls only; not a database verification or authoritative migration inventory.",
  generatedTableCount: tables.size,
  generatedFunctionCount: functions.size,
  usedLiteralTables: seenTables.size,
  usedLiteralFunctions: seenRPCs.size,
  missingTables: missing(seenTables, tables),
  missingFunctions: missing(seenRPCs, functions),
};
const markdown = [
  "# Supabase-generated type drift (diagnostic only)",
  "",
  "Comparing literal \`.from(...)\` / \`.rpc(...)\` references against checked-in generated types.",
  "Cannot infer whether a missing type exists in the real database.",
  "",
  `Generated types: ${tables.size} tables, ${functions.size} functions.`,
  `Source references: ${seenTables.size} tables, ${seenRPCs.size} functions.`,
  `Missing names: ${report.missingTables.length} tables, ${report.missingFunctions.length} RPCs.`,
  "",
  "## Table names absent from checked-in types",
  ...report.missingTables.map(x => `- \`${x.name}\`: ${x.files.length} referencing file(s)\`),
  "",
  "## RPC names absent from checked-in types",
  ...report.missingFunctions.map(x => `- \`${x.name}\`: ${x.files.length} referencing file(s)\`),
  "",
  "Do not insert guessed tables or disable strict TypeScript just to pass CI.",
].join("\n");
fs.mkdirSync(path.join(root, "artifacts"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts/schema-type-drift.json"), JSON.stringify(report, null, 2) + "\n");
fs.writeFileSync(path.join(root, "artifacts/schema-type-drift.md"), markdown + "\n");
process.stdout.write(markdown + "\n");
