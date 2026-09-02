const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const output = path.join(root, "cpanel-deploy-ready");
const checkOnly = process.argv.includes("--check");

execFileSync("node", [path.join(root, "scripts", "check-migration-safety.cjs")], {
  cwd: root,
  stdio: "inherit",
});

function fail(message) {
  console.error(`[deploy] ${message}`);
  process.exitCode = 1;
}

function parseEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs.readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      }),
  );
}

const productionEnv = parseEnv(path.join(root, ".env.production"));
for (const key of ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]) {
  const value = productionEnv[key];
  if (!value || /your-|replace|example|<|>/i.test(value)) {
    fail(`${key} is missing or still a placeholder in .env.production`);
  }
}

if (!fs.existsSync(path.join(dist, "index.html"))) {
  fail("dist/index.html is missing; run npm run build first");
}

if (process.exitCode || checkOnly) {
  if (!process.exitCode) console.log("[deploy] Production environment and build output are valid.");
  return;
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.cpSync(dist, path.join(output, "dist"), { recursive: true });
for (const entry of fs.readdirSync(path.join(output, "dist"), { recursive: true })) {
  if (path.basename(entry) === ".DS_Store") {
    fs.rmSync(path.join(output, "dist", entry), { force: true });
  }
}
fs.copyFileSync(path.join(root, "server.cjs"), path.join(output, "server.cjs"));

const rootPackage = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const runtimePackage = {
  name: "tamrakar-complex-cpanel",
  version: rootPackage.version,
  private: true,
  scripts: { start: "node server.cjs" },
  engines: rootPackage.engines,
  dependencies: {
    compression: rootPackage.dependencies.compression,
    express: rootPackage.dependencies.express,
    zod: rootPackage.dependencies.zod,
  },
};
fs.writeFileSync(path.join(output, "package.json"), `${JSON.stringify(runtimePackage, null, 2)}\n`);
fs.writeFileSync(
  path.join(output, "cpanel.env.example"),
  [
    "NODE_ENV=production",
    "SITE_URL=https://tamrakarcomplex.com",
    "SUPABASE_URL=https://YOUR_PROJECT.supabase.co",
    "SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY",
    "# PORT is assigned automatically by cPanel/Passenger",
    "",
  ].join("\n"),
);
fs.copyFileSync(path.join(root, "DEPLOYMENT_CPANEL.md"), path.join(output, "DEPLOYMENT_CPANEL.md"));
fs.copyFileSync(
  path.join(root, "CPANEL_DEPLOY_MIGRATION_STEPS.md"),
  path.join(output, "CPANEL_DEPLOY_MIGRATION_STEPS.md"),
);
const migrationOutput = path.join(output, "supabase", "migrations");
fs.mkdirSync(migrationOutput, { recursive: true });
for (const migration of [
  "20260701090000_seed_canonical_seo_defaults.sql",
  "20260701093000_security_advisor_current_critical.sql",
  "20260823120000_repair_pricing.sql",
  "20260826090000_atomic_idempotent_checkout.sql",
  "20260826100000_repair_state_machine_and_safe_tracking.sql",
  "20260826110000_repair_booking_price_authority.sql",
]) {
  fs.copyFileSync(
    path.join(root, "supabase", "migrations", migration),
    path.join(migrationOutput, migration),
  );
}
execFileSync("npm", ["install", "--package-lock-only", "--ignore-scripts"], {
  cwd: output,
  stdio: "inherit",
});

console.log(`[deploy] cPanel upload directory created at ${output}`);
