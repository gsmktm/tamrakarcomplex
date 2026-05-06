import { useCrudResource } from "@/hooks/useCrudResource";

export type RepairRequestRecord = {
  id: string;
  user_id: string | null;
  store_id: string | null;
  device_brand: string | null;
  device_model: string | null;
  problem_type: string | null;
  description: string | null;
  phone: string | null;
  location: string | null;
  status: string | null;
  tracking_code: string | null;
  assigned_to: string | null;
  estimated_cost: number | null;
  final_cost: number | null;
  created_at: string;
  updated_at: string;
};

export function useRepairRequests() {
  const resource = useCrudResource<RepairRequestRecord>({
    table: "repair_requests",
    queryKey: "repair-requests",
    orderBy: "created_at",
  });

  return {
    data: resource.data,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
    createRepairRequest: resource.create,
    updateRepairRequest: resource.update,
    deleteRepairRequest: resource.remove,
  };
}
