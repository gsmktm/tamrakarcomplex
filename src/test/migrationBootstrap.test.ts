import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = "supabase/migrations";
const ordered = readdirSync(root).filter(name => name.endsWith(".sql")).sort();
const baseline = "20240522000000_bootstrap_role_dependencies.sql";
const settings = "20240523100000_create_app_settings.sql";
const roles = "20260203024257_9c14e123-21ba-46cc-9121-9e6cf2f058e5.sql";
const read = (file: string) => readFileSync(join(root, file), "utf8");

describe("historical Supabase migration replay", () => {
  it("bootstraps roles before app settings policies and legacy role migrations", () => {
    expect(ordered.indexOf(baseline)).toBeGreaterThanOrEqual(0);
    expect(ordered.indexOf(baseline)).toBeLessThan(ordered.indexOf(settings));
    expect(ordered.indexOf(settings)).toBeLessThan(ordered.indexOf(roles));
  });
  it("keeps role security enabled before any permissive grants", () => {
    const content = read(baseline);
    expect(content).toMatch(/CREATE TABLE IF NOT EXISTS public\.user_roles/i);
    expect(content).toMatch(/ALTER TABLE public\.user_roles ENABLE ROW LEVEL SECURITY/i);
    expect(content).not.toMatch(/CREATE POLICY.+USING\s*\(\s*true\s*\)/i);
    expect(content).not.toMatch(/INSERT INTO public\.user_roles/i);
    expect(read(settings)).toMatch(/public\.user_roles/);
  });
  it("never provisions a known-password administrator during a fresh replay", () => {
    const historical = read("20260210171000_manual_create_gskmtm.sql");
    expect(historical).not.toMatch(/INSERT\s+INTO\s+auth\.users/i);
    expect(historical).not.toMatch(/UPDATE\s+auth\.users/i);
    expect(historical).not.toMatch(/INSERT\s+INTO\s+auth\.identities/i);
  });
  it("creates the orders ownership key before the earliest orders index", () => {
    const march = read("20260305050000_create_ecommerce_tables.sql");
    const normalize = march.indexOf("ADD COLUMN IF NOT EXISTS user_id");
    const createIndex = march.indexOf("CREATE INDEX IF NOT EXISTS idx_orders_user_id");
    expect(normalize).toBeGreaterThanOrEqual(0);
    expect(createIndex).toBeGreaterThan(normalize);
    expect(ordered.indexOf("20260305050000_create_ecommerce_tables.sql"))
      .toBeLessThan(ordered.indexOf("20260425121200_payment_commission_payout_system.sql"));
  });
  it("reconciles legacy order columns before creating ownership indexes", () => {
    const paymentMigration = read("20260425121200_payment_commission_payout_system.sql");
    const addUser = paymentMigration.indexOf("ADD COLUMN IF NOT EXISTS user_id");
    const indexUser = paymentMigration.indexOf("idx_orders_user_id");
    expect(addUser).toBeGreaterThanOrEqual(0);
    expect(indexUser).toBeGreaterThan(addUser);
    expect(paymentMigration).toMatch(/ADD COLUMN IF NOT EXISTS store_id/);
  });
  it("does not recreate the type or table unconditionally later", () => {
    const content = read(roles);
    expect(content).toMatch(/IF NOT EXISTS[\s\S]*?CREATE TYPE public\.app_role/i);
    expect(content).toMatch(/CREATE TABLE IF NOT EXISTS public\.user_roles/i);
  });
});
