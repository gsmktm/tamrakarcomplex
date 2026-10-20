/**
 * Static production contract audit. Does not touch a live database or
 * claim that payments, email delivery, or RLS policies have been verified.
 */
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const failures = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
  process.stdout.write((condition ? "PASS " : "FAIL ") + message + "\n");
};
const read = (name) => {
  const full = path.join(root, name);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
};
const required = [
  "src/App.tsx",
  "src/components/home/CommerceJourney.tsx",
  "src/styles/commerce-2026.css",
  "src/lib/catalogRoutes.ts",
  "src/layouts/StoreAdminLayout.tsx",
  "src/routes/publicRoutes.tsx",
  "src/routes/RequireSuperAdmin.tsx",
  "src/routes/RequireStaffAdmin.tsx",
  "src/routes/RequireStoreAdmin.tsx",
  "src/routes/RequireStoreModule.tsx",
  "supabase/migrations",
  "supabase/functions",
];
for (const name of required) {
  ok(fs.existsSync(path.join(root, name)), "Required component: " + name);
}
const auth = read("src/hooks/useAuth.tsx");
ok(!auth.includes("getRoleFromEmail"), "No email-substring role escalation");
ok(!auth.includes("authUser.user_metadata?.role"), "No editable user metadata role escalation");
ok(auth.includes('if (!import.meta.env.DEV) throw'), "Development impersonation disabled in production");
ok(auth.includes('const finalRole = tableError ? "user"'), "Role lookup errors fail closed");
const routes = read("src/routes/publicRoutes.tsx");
ok(routes.includes("<RedirectBuyToCatalog />") &&
  routes.includes("buildBuyCatalogDestination(location.search, location.hash)"),
  "Buy redirects preserve source query and fragment");
const hero = read("src/components/sections/EcommerceHomeSection.tsx");
const app = read("src/App.tsx");
ok(hero.includes("<CommerceJourney />"), "Guided journeys mounted on homepage");
ok(app.includes('import "@/styles/commerce-2026.css";'), "Premium styles bundled in application");
const journey = read("src/components/home/CommerceJourney.tsx");
const canonicalJourneys = ["/buy", "/mobile-price", "/sell-your-phone", "/exchange-your-phone",
  "/repair", "/user/history", "/stores", "/stores/apply"];
for (const destination of canonicalJourneys) {
  ok(journey.includes('href: "' + destination + '"'), "Service action: " + destination);
}
const storeLayout = read("src/layouts/StoreAdminLayout.tsx");
ok(storeLayout.includes("function StoreNavigation(") &&
  storeLayout.indexOf("function StoreNavigation(") < storeLayout.indexOf("export default function StoreAdminLayout"),
  "Merchant navigation is stable across input changes");
ok(storeLayout.includes('aria-label="Store administration"') &&
  storeLayout.includes('aria-current={active ? "page" : undefined}'),
  "Merchant workspace has semantic navigation");
console.log("\nProduction contract audit: " + (failures.length ? failures.length + " error(s)" : "all static checks passed"));
if (failures.length) process.exitCode = 1;
