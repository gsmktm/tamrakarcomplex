import { useCrudResource } from "@/hooks/useCrudResource";

export type StorePackageRecord = {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number;
  product_limit: number;
  listing_limit: number;
  staff_limit: number;
  featured_allowed: boolean;
  analytics_allowed: boolean;
  repair_leads_allowed: boolean;
  priority_support: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export function useStorePackages() {
  const resource = useCrudResource<StorePackageRecord>({
    table: "store_packages",
    queryKey: "store-packages",
    orderBy: "created_at",
  });

  return {
    data: resource.data,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
    createPackage: resource.create,
    updatePackage: resource.update,
    deletePackage: resource.remove,
  };
}
