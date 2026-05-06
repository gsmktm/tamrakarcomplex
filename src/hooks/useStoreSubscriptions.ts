import { useCrudResource } from "@/hooks/useCrudResource";

export type StoreSubscriptionRecord = {
  id: string;
  store_id: string;
  package_id: string;
  status: string;
  started_at: string | null;
  expires_at: string | null;
  payment_status: string;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
};

export function useStoreSubscriptions() {
  const resource = useCrudResource<StoreSubscriptionRecord>({
    table: "store_subscriptions",
    queryKey: "store-subscriptions",
    orderBy: "created_at",
  });

  return {
    data: resource.data,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
    assignPackageToStore: resource.create,
    upgradeStorePackage: resource.update,
    downgradeStorePackage: resource.update,
    expireSubscription: (id: string) => resource.update({ id, payload: { status: "expired" } }),
    renewSubscription: (id: string, expires_at: string) => resource.update({ id, payload: { status: "active", expires_at } }),
  };
}
