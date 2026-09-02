import { describe, it, expect } from "vitest";
import { normalizeRole, isAdminRole, isSuperAdminRole, isStoreAdminRole, getRoleLabel, getRoleBadgeVariant } from "@/lib/roles";
import { canAccessModule, canSeeMenuItem } from "@/lib/permissions";
import type { AppRole } from "@/types/app";

describe("Role normalization", () => {
  it("normalizes suadmin", () => {
    expect(normalizeRole("suadmin")).toBe("suadmin");
    expect(normalizeRole("admin")).toBe("suadmin");
  });

  it("normalizes staffadmin", () => {
    expect(normalizeRole("staffadmin")).toBe("staffadmin");
  });

  it("normalizes storeadmin", () => {
    expect(normalizeRole("storeadmin")).toBe("storeadmin");
    expect(normalizeRole("store_owner")).toBe("storeadmin");
    expect(normalizeRole("moderator")).toBe("storeadmin");
  });

  it("normalizes storestaff", () => {
    expect(normalizeRole("storestaff")).toBe("storestaff");
    expect(normalizeRole("store_staff")).toBe("storestaff");
    expect(normalizeRole("staff")).toBe("storestaff");
  });

  it("normalizes user", () => {
    expect(normalizeRole("user")).toBe("user");
    expect(normalizeRole("public_user")).toBe("user");
    expect(normalizeRole("customer")).toBe("user");
  });

  it("defaults to user for unknown roles", () => {
    expect(normalizeRole("unknown")).toBe("user");
    expect(normalizeRole("")).toBe("user");
    expect(normalizeRole(null)).toBe("user");
    expect(normalizeRole(undefined)).toBe("user");
  });

  it("is case-insensitive", () => {
    expect(normalizeRole("SUADMIN")).toBe("suadmin");
    expect(normalizeRole("StaffAdmin")).toBe("staffadmin");
  });
});

describe("Role checks", () => {
  it("isSuperAdminRole returns true for suadmin only", () => {
    expect(isSuperAdminRole("suadmin")).toBe(true);
    expect(isSuperAdminRole("staffadmin")).toBe(false);
    expect(isSuperAdminRole("storeadmin")).toBe(false);
    expect(isSuperAdminRole("user")).toBe(false);
  });

  it("isAdminRole returns true for suadmin and staffadmin", () => {
    expect(isAdminRole("suadmin")).toBe(true);
    expect(isAdminRole("staffadmin")).toBe(true);
    expect(isAdminRole("storeadmin")).toBe(false);
    expect(isAdminRole("user")).toBe(false);
  });

  it("isStoreAdminRole returns true for storeadmin, suadmin, and staffadmin", () => {
    expect(isStoreAdminRole("storeadmin")).toBe(true);
    expect(isStoreAdminRole("suadmin")).toBe(true);
    expect(isStoreAdminRole("staffadmin")).toBe(true);
    expect(isStoreAdminRole("user")).toBe(false);
  });

  it("getRoleLabel returns correct labels", () => {
    expect(getRoleLabel("suadmin")).toBe("Super Admin");
    expect(getRoleLabel("staffadmin")).toBe("Staff Admin");
    expect(getRoleLabel("storeadmin")).toBe("Store Admin");
    expect(getRoleLabel("storestaff")).toBe("Store Staff");
    expect(getRoleLabel("user")).toBe("User");
    expect(getRoleLabel("unknown")).toBe("User");
  });

  it("getRoleBadgeVariant returns correct variants", () => {
    expect(getRoleBadgeVariant("suadmin")).toBe("destructive");
    expect(getRoleBadgeVariant("staffadmin")).toBe("default");
    expect(getRoleBadgeVariant("storeadmin")).toBe("outline");
    expect(getRoleBadgeVariant("user")).toBe("secondary");
    expect(getRoleBadgeVariant("unknown")).toBe("secondary");
  });
});

describe("Permission checks", () => {
  const staffPerms = {
    dashboard: { view: true, create: false, edit: false, delete: false, approve: false, assign: false, export: false },
    products: { view: true, create: true, edit: true, delete: false, approve: false, assign: false, export: false },
  } as const;

  it("suadmin can access any module", () => {
    expect(canAccessModule("suadmin", "products", null, "view")).toBe(true);
    expect(canAccessModule("suadmin", "products", null, "delete")).toBe(true);
  });

  it("staffadmin can access permitted modules", () => {
    expect(canAccessModule("staffadmin", "products", staffPerms, "view")).toBe(true);
    expect(canAccessModule("staffadmin", "products", staffPerms, "create")).toBe(true);
    expect(canAccessModule("staffadmin", "products", staffPerms, "delete")).toBe(false);
  });

  it("staffadmin cannot access unpermitted modules", () => {
    expect(canAccessModule("staffadmin", "settings", staffPerms, "view")).toBe(false);
  });

  it("storeadmin cannot access staff modules without loaded grants", () => {
    // Grants absent (e.g. treated as loaded-and-empty by callers that pass [])
    expect(canAccessModule("storeadmin", "products", null, "view", [])).toBe(false);
  });

  it("storeadmin can access granted store modules", () => {
    expect(canAccessModule("storeadmin", "products", null, "view", ["products", "orders"])).toBe(true);
    expect(canAccessModule("storeadmin", "orders", null, "view", ["products", "orders"])).toBe(true);
  });

  it("storeadmin cannot access ungranted store modules", () => {
    expect(canAccessModule("storeadmin", "payouts", null, "view", ["products", "orders"])).toBe(false);
    expect(canAccessModule("storeadmin", "staff", null, "view", ["products", "orders"])).toBe(false);
  });

  it("storeadmin grants undefined (loading) allow, empty (loaded) deny", () => {
    // undefined = still loading -> allow so menu does not flash hidden
    expect(canAccessModule("storeadmin", "products", null, "view", undefined)).toBe(true);
    // [] = loaded with no grants -> deny
    expect(canAccessModule("storeadmin", "products", null, "view", [])).toBe(false);
  });

  it("canSeeMenuItem gates storeadmin items by granted modules", () => {
    const item = { href: "/storeadmin/products", requiredRole: "storeadmin" as const, requiredModule: "products", enabled: true };
    expect(canSeeMenuItem("storeadmin", item, null, ["products"])).toBe(true);
    expect(canSeeMenuItem("storeadmin", item, null, ["orders"])).toBe(false);
    // loading (undefined) keeps the item visible
    expect(canSeeMenuItem("storeadmin", item, null, undefined)).toBe(true);
  });

  it("canSeeMenuItem shows unpermissioned storeadmin items regardless of grants", () => {
    const item = { href: "/storeadmin", requiredRole: "storeadmin" as const, enabled: true };
    expect(canSeeMenuItem("storeadmin", item, null, [])).toBe(true);
  });

  it("user cannot access staff modules", () => {
    expect(canAccessModule("user", "products", null, "view")).toBe(false);
  });

  it("canSeeMenuItem hides disabled items", () => {
    expect(canSeeMenuItem("staffadmin", { href: "/test", enabled: false }, staffPerms)).toBe(false);
  });

  it("canSeeMenuItem shows enabled items for suadmin", () => {
    expect(canSeeMenuItem("suadmin", { href: "/test", enabled: true }, null)).toBe(true);
  });

  it("canSeeMenuItem checks module permission for staffadmin", () => {
    expect(
      canSeeMenuItem("staffadmin", { href: "/test", requiredModule: "products", enabled: true }, staffPerms)
    ).toBe(true);
    expect(
      canSeeMenuItem("staffadmin", { href: "/test", requiredModule: "settings", enabled: true }, staffPerms)
    ).toBe(false);
  });
});