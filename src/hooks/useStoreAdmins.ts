import { useCrudResource } from "@/hooks/useCrudResource";

export type StoreAdminRecord = {
  id: string;
  user_id: string;
  store_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
};

export function useStoreAdmins() {
  const resource = useCrudResource<StoreAdminRecord>({
    table: "store_admins",
    queryKey: "store-admins",
    orderBy: "created_at",
  });

  return {
    data: resource.data,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
    listStoreAdmins: resource.refetch,
    createStoreAdmin: resource.create,
    assignStoreAdminToStore: resource.update,
    updateStoreAdmin: resource.update,
    deactivateStoreAdmin: (id: string) => resource.update({ id, payload: { status: "inactive" } }),
    removeStoreAdmin: resource.remove,
  };
}
