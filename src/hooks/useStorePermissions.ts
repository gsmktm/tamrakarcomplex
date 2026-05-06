import { useCrudResource } from "@/hooks/useCrudResource";

export type StorePermissionRecord = {
  id: string;
  store_id: string;
  store_admin_user_id: string;
  module_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_publish: boolean;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
};

export function useStorePermissions() {
  const resource = useCrudResource<StorePermissionRecord>({
    table: "store_permissions",
    queryKey: "store-permissions",
    orderBy: "updated_at",
  });

  return {
    data: resource.data,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
    createStorePermission: resource.create,
    updateStorePermission: resource.update,
    deleteStorePermission: resource.remove,
  };
}
