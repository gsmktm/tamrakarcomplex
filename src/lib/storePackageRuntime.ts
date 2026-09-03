import { buildEntitlements, resolveEffectiveStorePackage } from "@/lib/storeEntitlements";
import { normalizeStorePackageSlug, type StorePackageSlug } from "@/lib/storePackages";

export type StorePackageRecord = {
  slug?: string | null;
  name?: string | null;
  price?: number | null;
  billing_cycle?: string | null;
  product_limit?: number | null;
  accessory_limit?: number | null;
  staff_limit?: number | null;
};

function runtimeLimit(value: number | null | undefined, fallback: number): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  return value < 0 ? Number.MAX_SAFE_INTEGER : Math.floor(value);
}

export type StoreSubscriptionRecord = {
  status?: string | null;
  is_enabled?: boolean | null;
  end_date?: string | null;
  billing_cycle?: string | null;
};

export type StorePackageSource = {
  package_slug?: string | null;
  subscription_status?: string | null;
  subscription_end_date?: string | null;
  package?: StorePackageRecord | null;
  store_packages?: StorePackageRecord | null;
  store_subscriptions?: StoreSubscriptionRecord | StoreSubscriptionRecord[] | null;
};

function firstSubscription(value: StorePackageSource["store_subscriptions"]) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

/**
 * Canonical runtime package resolution.
 * The package FK join owns the tier identity; store status fields own whether
 * that paid tier is currently effective. Legacy subscription rows are only a
 * compatibility fallback when denormalized status fields are absent.
 */
export function resolveStorePackageContext(store: StorePackageSource) {
  const joinedPackage = store.package ?? store.store_packages ?? null;
  const legacySubscription = firstSubscription(store.store_subscriptions);
  const rawPackageSlug = normalizeStorePackageSlug(joinedPackage?.slug ?? store.package_slug);
  const subscriptionStatus = store.subscription_status ?? legacySubscription?.status ?? (rawPackageSlug === "free" ? "active" : "inactive");
  const subscriptionEndDate = store.subscription_end_date ?? legacySubscription?.end_date ?? null;
  const isEnabled = store.subscription_status != null || legacySubscription?.is_enabled !== false;
  const effectivePackageSlug: StorePackageSlug = isEnabled
    ? resolveEffectiveStorePackage({
        package_slug: rawPackageSlug,
        subscription_status: subscriptionStatus,
        subscription_end_date: subscriptionEndDate,
      })
    : "free";

  const entitlements = buildEntitlements(effectivePackageSlug);
  if (joinedPackage && effectivePackageSlug !== "free") {
    entitlements.productListingLimit = runtimeLimit(joinedPackage.product_limit, entitlements.productListingLimit);
    entitlements.accessoryListingLimit = runtimeLimit(joinedPackage.accessory_limit, entitlements.accessoryListingLimit);
    entitlements.staffMemberLimit = runtimeLimit(joinedPackage.staff_limit, entitlements.staffMemberLimit);
  }

  return {
    rawPackageSlug,
    effectivePackageSlug,
    package: joinedPackage,
    subscriptionStatus,
    subscriptionEndDate,
    billingCycle: legacySubscription?.billing_cycle ?? joinedPackage?.billing_cycle ?? "monthly",
    entitlements,
    isActivePaid: effectivePackageSlug !== "free",
  };
}
