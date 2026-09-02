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
        .select("id, package_slug, subscription_status, subscription_end_date, package:store_packages(slug)");
      storeQuery = membership?.store_id
        ? storeQuery.eq("id", membership.store_id)
        : storeQuery.or(`owner_id.eq.${user!.id},owner_user_id.eq.${user!.id}`).limit(1);
      const { data: store } = await storeQuery.maybeSingle();

      if (!store) return null;

      const packageSlug = resolveStorePackageContext(store).effectivePackageSlug;

      return {
        storeId: store.id,
        packageSlug,
        rawPackageSlug: store.package_slug ?? null,
        subscriptionStatus: store.subscription_status ?? null,
        subscriptionEndDate: store.subscription_end_date ?? null,
      };
    },
  });

  const packageSlug = subscription?.packageSlug ?? "free";
  const entitlements = getStoreEntitlements(packageSlug);

  const checkLimit = (feature: Feature, currentUsage = 0): FeatureAccessResult => {
    const access = checkFeatureAccess(packageSlug, feature);
    if (!access.allowed) return access;
    return checkPackageLimit(packageSlug, feature, currentUsage);
  };

  const getLimitFor = (feature: Feature): number => getPackageLimit(packageSlug, feature as PackageLimitKey);

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
