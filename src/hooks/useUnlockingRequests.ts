import { useCrudResource } from "@/hooks/useCrudResource";

export type UnlockingRequestRecord = {
  id: string;
  user_id: string | null;
  store_id: string | null;
  device_brand: string | null;
  device_model: string | null;
  service_type: string | null;
  imei: string | null;
  phone: string | null;
  status: string | null;
  price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function useUnlockingRequests() {
  const resource = useCrudResource<UnlockingRequestRecord>({
    table: "unlocking_requests",
    queryKey: "unlocking-requests",
    orderBy: "created_at",
  });

  return {
    data: resource.data,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
    createUnlockingRequest: resource.create,
    updateUnlockingRequest: resource.update,
    deleteUnlockingRequest: resource.remove,
  };
}
