import { useCrudResource } from "@/hooks/useCrudResource";

export type StaffPermissionRecord = {
  id: string;
  staff_user_id: string;
  module_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_export: boolean;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
};

export function useStaffPermissions() {
  const resource = useCrudResource<StaffPermissionRecord>({
    table: "staff_permissions",
    queryKey: "staff-permissions-v2",
    orderBy: "updated_at",
  });

  return {
    data: resource.data,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
    assignStaffPermissions: resource.create,
    updateStaffPermission: resource.update,
    deleteStaffPermission: resource.remove,
  };
}
