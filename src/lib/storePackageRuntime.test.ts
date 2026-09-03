import { describe, expect, it } from "vitest";
import { resolveStorePackageContext } from "./storePackageRuntime";

describe("resolveStorePackageContext", () => {
  it("prefers the canonical joined package over a stale package_slug", () => {
    const result = resolveStorePackageContext({
      package_slug: "silver",
      package: { slug: "gold" },
      subscription_status: "active",
    });
    expect(result.effectivePackageSlug).toBe("gold");
    expect(result.entitlements.canShowPhonePublic).toBe(true);
  });

  it("downgrades expired and disabled paid subscriptions to free", () => {
    expect(resolveStorePackageContext({ package: { slug: "diamond" }, subscription_status: "expired" }).effectivePackageSlug).toBe("free");
    expect(resolveStorePackageContext({ package: { slug: "gold" }, store_subscriptions: { status: "active", is_enabled: false } }).effectivePackageSlug).toBe("free");
  });

  it("keeps the free package usable without a paid subscription record", () => {
    const result = resolveStorePackageContext({ package_slug: "free" });
    expect(result.effectivePackageSlug).toBe("free");
    expect(result.entitlements.canListProducts).toBe(true);
  });

  it("exposes the Silver theme set from the shared theme policy", () => {
    const result = resolveStorePackageContext({ package: { slug: "silver" }, subscription_status: "active" });
    expect(result.entitlements.availableThemes).toEqual(["default", "basic", "modern", "editorial", "premium"]);
  });

  it("does not let a legacy disabled row override canonical active status", () => {
    const result = resolveStorePackageContext({
      package: { slug: "silver" },
      subscription_status: "active",
      store_subscriptions: { status: "inactive", is_enabled: false },
    });
    expect(result.effectivePackageSlug).toBe("silver");
  });

  it("applies live package limits and treats a negative catalog limit as unlimited", () => {
    const result = resolveStorePackageContext({
      package: { slug: "gold", product_limit: 42, accessory_limit: 17, staff_limit: -1 },
      subscription_status: "active",
    });
    expect(result.entitlements.productListingLimit).toBe(42);
    expect(result.entitlements.accessoryListingLimit).toBe(17);
    expect(result.entitlements.staffMemberLimit).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("fails closed when a paid subscription has an invalid expiry", () => {
    expect(resolveStorePackageContext({
      package: { slug: "diamond" },
      subscription_status: "active",
      subscription_end_date: "not-a-date",
    }).effectivePackageSlug).toBe("free");
  });
});
