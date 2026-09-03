import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  checkFeatureAccess,
  checkPackageLimit,
  getStoreEntitlements,
  type FeatureAccessResult,
} from "@/lib/storeEntitlements";
import { resolveStorePackageContext } from "@/lib/storePackageRuntime";
import { getPackageLimit, type PackageLimitKey, type StorePackageSlug } from "@/lib/storePackages";

type Feature = PackageLimitKey | "product" | "admin" | "branch" | "promo";

interface StoreSubscriptionContext {
  storeId: string;
  packageSlug: StorePackageSlug;
  rawPackageSlug: string | null;
  subscriptionStatus: string | null;
  subscriptionEndDate: string | null;
  entitlements: ReturnType<typeof getStoreEntitlements>;
}

export function useSubscriptionLimits() {
  const { user } = useAuth();

  const { data: subscription, isLoading } = useQuery<StoreSubscriptionContext | null>({
    queryKey: ["store-subscription-context", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: membership } = await supabase
        .from("store_admins")
        .select("store_id")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      let storeQuery = supabase
        .from("stores")
        .select("id, package_slug, subscription_status, subscription_end_date, package:store_packages(slug, product_limit, accessory_limit, staff_limit)");
      storeQuery = membership?.store_id
        ? storeQuery.eq("id", membership.store_id)
        : storeQuery.or(`owner_id.eq.${user!.id},owner_user_id.eq.${user!.id}`).limit(1);
      const { data: store } = await storeQuery.maybeSingle();

      if (!store) return null;

      const packageContext = resolveStorePackageContext(store);
      const packageSlug = packageContext.effectivePackageSlug;

      return {
        storeId: store.id,
        packageSlug,
        rawPackageSlug: store.package_slug ?? null,
        subscriptionStatus: store.subscription_status ?? null,
        subscriptionEndDate: store.subscription_end_date ?? null,
        entitlements: packageContext.entitlements,
      };
    },
  });

  const packageSlug = subscription?.packageSlug ?? "free";
  const entitlements = subscription?.entitlements ?? getStoreEntitlements(packageSlug);

  const checkLimit = (feature: Feature, currentUsage = 0): FeatureAccessResult => {
    const access = checkFeatureAccess(packageSlug, feature);
    if (!access.allowed) return access;
    if (feature === "product" || feature === "accessory" || feature === "staff") {
      const limit = feature === "product"
        ? entitlements.productListingLimit
        : feature === "accessory"
          ? entitlements.accessoryListingLimit
          : entitlements.staffMemberLimit;
      return currentUsage < limit
        ? { allowed: true, limit, currentUsage, packageSlug }
        : { allowed: false, reason: packageSlug === "free" ? "free_limit" : "package_limit", limit, currentUsage, packageSlug };
    }
    return checkPackageLimit(packageSlug, feature, currentUsage);
  };

  const getLimitFor = (feature: Feature): number => {
    if (feature === "product") return entitlements.productListingLimit;
    if (feature === "accessory") return entitlements.accessoryListingLimit;
    if (feature === "staff") return entitlements.staffMemberLimit;
    return getPackageLimit(packageSlug, feature as PackageLimitKey);
  };

  return {
    checkLimit,
    getLimitFor,
    checkFeature: (feature: string) => checkFeatureAccess(packageSlug, feature),
    subscription,
    packageSlug,
    entitlements,
    isLoading,
  };
}
