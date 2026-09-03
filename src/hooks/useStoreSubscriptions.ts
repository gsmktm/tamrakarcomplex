import { useCrudResource } from "@/hooks/useCrudResource";
import { useQueryClient } from "@tanstack/react-query";

export type StoreSubscriptionRecord = {
  id: string;
  store_id: string;
  package_id: string;
  status: string;
  is_enabled: boolean | null;
  start_date: string;
  end_date: string;
  next_billing_date: string | null;
  auto_renew: boolean | null;
  scheduled_package_id: string | null;
  scheduled_change_date: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export function useStoreSubscriptions() {
  const queryClient = useQueryClient();
  const resource = useCrudResource<StoreSubscriptionRecord>({
    table: "store_subscriptions",
    queryKey: "store-subscriptions",
    orderBy: "created_at",
  });

  const refreshStoreRuntime = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["store-subscription-context"] }),
      queryClient.invalidateQueries({ queryKey: ["stores-with-entitlements"] }),
      queryClient.invalidateQueries({ queryKey: ["store-detail"] }),
    ]);
  };

  const create = async (payload: Partial<StoreSubscriptionRecord>) => {
    const result = await resource.create(payload);
    await refreshStoreRuntime();
    return result;
  };

  const update = async (args: { id: string; payload: Partial<StoreSubscriptionRecord> }) => {
    const result = await resource.update(args);
    await refreshStoreRuntime();
    return result;
  };

  return {
    data: resource.data,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
    assignPackageToStore: create,
    upgradeStorePackage: update,
    downgradeStorePackage: update,
    expireSubscription: (id: string) => update({ id, payload: { status: "expired", is_enabled: false } }),
    renewSubscription: (id: string, end_date: string) => update({ id, payload: { status: "active", is_enabled: true, end_date } }),
  };
}
