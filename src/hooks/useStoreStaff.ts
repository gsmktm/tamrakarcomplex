import { useCrudResource } from "@/hooks/useCrudResource";

export type StoreStaffRecord = {
  id: string;
  store_id: string;
  user_id: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  position: string | null;
  status: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export function useStoreStaff() {
  const resource = useCrudResource<StoreStaffRecord>({
    table: "store_staff",
    queryKey: "store-staff",
    orderBy: "created_at",
  });

  return {
    data: resource.data,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
    createStoreStaff: resource.create,
    updateStoreStaff: resource.update,
    deleteStoreStaff: resource.remove,
  };
}
