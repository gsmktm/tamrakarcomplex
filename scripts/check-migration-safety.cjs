const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function gitLines(args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const changed = gitLines([
  "diff", "--name-only", "--diff-filter=ACMRT", "HEAD", "--", "supabase/migrations/*.sql",
]);
const untracked = gitLines([
  "ls-files", "--others", "--exclude-standard", "supabase/migrations/*.sql",
]);
const files = [...new Set([...changed, ...untracked])].sort();

const destructivePatterns = [
  { label: "DROP TABLE", pattern: /^\s*drop\s+table\b/im },
  { label: "DROP COLUMN", pattern: /\bdrop\s+column\b/im },
  { label: "TRUNCATE TABLE", pattern: /^\s*truncate(?:\s+table)?\b/im },
];

const violations = [];
for (const relative of files) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) continue;
  const sql = fs.readFileSync(absolute, "utf8");
  if (/migration-safety:\s*allow-destructive/i.test(sql)) continue;
  for (const check of destructivePatterns) {
    if (check.pattern.test(sql)) violations.push(`${relative}: ${check.label}`);
  }
}

if (violations.length) {
  console.error("[migration-safety] Destructive SQL found in changed migrations:");
  for (const violation of violations) console.error(`  - ${violation}`);
  console.error("Use an additive migration. Exceptional destructive changes require an explicit migration-safety review marker.");
  process.exit(1);
}

console.log(`[migration-safety] ${files.length} changed migration(s) passed.`);
