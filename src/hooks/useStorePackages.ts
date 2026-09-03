import { useCrudResource } from "@/hooks/useCrudResource";
import { useQueryClient } from "@tanstack/react-query";

export type StorePackageRecord = {
  id: string;
  name: string;
  slug: string;
  price: number;
  billing_cycle: string;
  product_limit: number;
  accessory_limit: number;
  staff_limit: number;
  exchange_enabled: boolean;
  repair_enabled: boolean;
  custom_seo_enabled: boolean;
  analytics_level: string;
  featured_enabled: boolean;
  verified_badge_enabled: boolean;
  homepage_promotion_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export function useStorePackages() {
  const queryClient = useQueryClient();
  const resource = useCrudResource<StorePackageRecord>({
    table: "store_packages",
    queryKey: "store-packages",
    orderBy: "created_at",
  });

  const refreshStoreRuntime = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["store-subscription-context"] }),
      queryClient.invalidateQueries({ queryKey: ["stores-with-entitlements"] }),
      queryClient.invalidateQueries({ queryKey: ["store-detail"] }),
    ]);
  };

  const createPackage = async (payload: Partial<StorePackageRecord>) => {
    const result = await resource.create(payload);
    await refreshStoreRuntime();
    return result;
  };

  const updatePackage = async (args: { id: string; payload: Partial<StorePackageRecord> }) => {
    const result = await resource.update(args);
    await refreshStoreRuntime();
    return result;
  };

  const deletePackage = async (id: string) => {
    await resource.remove(id);
    await refreshStoreRuntime();
  };

  return {
    data: resource.data,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
    createPackage,
    updatePackage,
    deletePackage,
  };
}
