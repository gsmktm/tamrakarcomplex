import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  checkFeatureAccess,
  checkPackageLimit,
  getStoreEntitlements,
  resolveEffectiveStorePackage,
  type FeatureAccessResult,
} from "@/lib/storeEntitlements";
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
      const { data: store } = await supabase
        .from("stores")
        .select("id, package_slug, subscription_status, subscription_end_date")
        .eq("owner_id", user!.id)
        .maybeSingle();

      if (!store) return null;

      const packageSlug = resolveEffectiveStorePackage({
        package_slug: store.package_slug,
        subscription_status: store.subscription_status,
        subscription_end_date: store.subscription_end_date,
      });

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
