import { useCrudResource } from "@/hooks/useCrudResource";

export type StaffAdminRecord = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
  status: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
};

export function useStaffAdmins() {
  const resource = useCrudResource<StaffAdminRecord>({
    table: "staff_admins",
    queryKey: "staff-admins",
    orderBy: "created_at",
  });

  return {
    data: resource.data,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
    listStaffAdmins: resource.refetch,
    createStaffAdmin: resource.create,
    updateStaffAdmin: resource.update,
    deactivateStaffAdmin: (id: string) => resource.update({ id, payload: { status: "inactive" } }),
    deleteStaffAdmin: resource.remove,
  };
}
