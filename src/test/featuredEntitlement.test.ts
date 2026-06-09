import { describe, it, expect } from "vitest";
import { 
  canBeFeaturedThisCycle, 
  resolveEffectiveStorePackageWithYearly,
} from "../lib/storeEntitlements";
import { canStoreBeFeaturedWithYearly } from "../lib/storePackages";

describe("Featured Entitlement with Yearly Billing", () => {
  describe("canBeFeaturedThisCycle", () => {
    it("allows featured on yearly subscription regardless of package tier", () => {
      expect(canBeFeaturedThisCycle({
        packageSlug: "free",
        isYearly: true,
      })).toBe(true);

      expect(canBeFeaturedThisCycle({
        packageSlug: "silver",
        isYearly: true,
      })).toBe(true);

      expect(canBeFeaturedThisCycle({
        packageSlug: "gold",
        isYearly: true,
      })).toBe(true);

      expect(canBeFeaturedThisCycle({
        packageSlug: "diamond",
        isYearly: true,
      })).toBe(true);
    });

    it("denies featured on free package with monthly billing", () => {
      expect(canBeFeaturedThisCycle({
        packageSlug: "free",
        isYearly: false,
      })).toBe(false);
    });

    it("allows featured on paid packages (silver/gold/diamond) with monthly billing", () => {
      expect(canBeFeaturedThisCycle({
        packageSlug: "silver",
        isYearly: false,
      })).toBe(true);

      expect(canBeFeaturedThisCycle({
        packageSlug: "gold",
        isYearly: false,
      })).toBe(true);

      expect(canBeFeaturedThisCycle({
        packageSlug: "diamond",
        isYearly: false,
      })).toBe(true);
    });

    it("defaults to false when isYearly is false and package is free", () => {
      const result = canBeFeaturedThisCycle({
        packageSlug: "free",
        isYearly: false,
        subscriptionStatus: "active",
        subscriptionEndDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // tomorrow
      });
      expect(result).toBe(false);
    });
  });

  describe("resolveEffectiveStorePackageWithYearly", () => {
    it("resolves to free on expired subscription", () => {
      const result = resolveEffectiveStorePackageWithYearly({
        package_slug: "silver",
        subscription_status: "active",
        subscription_end_date: new Date(Date.now() - 1000 * 60).toISOString(), // 1 minute ago
        billing_cycle: "monthly",
      });
      expect(result.packageSlug).toBe("free");
      expect(result.isYearly).toBe(false);
    });

    it("resolves to paid package on active subscription", () => {
      const result = resolveEffectiveStorePackageWithYearly({
        package_slug: "gold",
        subscription_status: "active",
        subscription_end_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // tomorrow
        billing_cycle: "yearly",
      });
      expect(result.packageSlug).toBe("gold");
      expect(result.isYearly).toBe(true);
    });

    it("defaults billing_cycle to false when not provided", () => {
      const result = resolveEffectiveStorePackageWithYearly({
        package_slug: "silver",
        subscription_status: "active",
        subscription_end_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        billing_cycle: undefined,
      });
      expect(result.isYearly).toBe(false);
    });

    it("defaults billing_cycle to false when empty string", () => {
      const result = resolveEffectiveStorePackageWithYearly({
        package_slug: "diamond",
        subscription_status: "active",
        subscription_end_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        billing_cycle: "",
      });
      expect(result.isYearly).toBe(false);
    });
  });

  describe("canStoreBeFeaturedWithYearly", () => {
    it("allows yearly free package to be featured", () => {
      expect(canStoreBeFeaturedWithYearly("free", true)).toBe(true);
    });

    it("denies monthly free package from being featured", () => {
      expect(canStoreBeFeaturedWithYearly("free", false)).toBe(false);
    });

    it("allows gold/diamond to be featured on monthly billing (have featuredListing enabled)", () => {
      expect(canStoreBeFeaturedWithYearly("gold", false)).toBe(true);
      expect(canStoreBeFeaturedWithYearly("diamond", false)).toBe(true);
    });

    it("allows all packages to be featured on yearly billing", () => {
      expect(canStoreBeFeaturedWithYearly("free", true)).toBe(true);
      expect(canStoreBeFeaturedWithYearly("silver", true)).toBe(true);
      expect(canStoreBeFeaturedWithYearly("gold", true)).toBe(true);
      expect(canStoreBeFeaturedWithYearly("diamond", true)).toBe(true);
    });

    it("handles null/undefined package as free", () => {
      expect(canStoreBeFeaturedWithYearly(null, false)).toBe(false);
      expect(canStoreBeFeaturedWithYearly(undefined, false)).toBe(false);
      expect(canStoreBeFeaturedWithYearly(null, true)).toBe(true);
      expect(canStoreBeFeaturedWithYearly(undefined, true)).toBe(true);
    });
  });

  describe("Business Rules", () => {
    it("yearly subscription unlocks featured placement for all tiers", () => {
      // Spec requirement: yearly billing unlocks featured regardless of package tier
      const yearlyFree = canBeFeaturedThisCycle({
        packageSlug: "free",
        isYearly: true,
      });
      
      const monthlyFree = canBeFeaturedThisCycle({
        packageSlug: "free",
        isYearly: false,
      });

      expect(yearlyFree).toBe(true);
      expect(monthlyFree).toBe(false);
      expect(yearlyFree).not.toBe(monthlyFree);
    });

    it("free package without yearly cannot access featured", () => {
      expect(canBeFeaturedThisCycle({
        packageSlug: "free",
        isYearly: false,
      })).toBe(false);
    });

    it("paid packages with yearly are featured-eligible regardless of featuredListing flag", () => {
      // Yearly unlocks featured for all tiers, including silver which doesn't have featuredListing
      const silveryearly = canBeFeaturedThisCycle({
        packageSlug: "silver",
        isYearly: true,
      });
      
      const goldYearly = canBeFeaturedThisCycle({
        packageSlug: "gold",
        isYearly: true,
      });
      
      const diamondYearly = canBeFeaturedThisCycle({
        packageSlug: "diamond",
        isYearly: true,
      });

      expect(silveryearly).toBe(true);
      expect(goldYearly).toBe(true);
      expect(diamondYearly).toBe(true);
    });
  });
});
