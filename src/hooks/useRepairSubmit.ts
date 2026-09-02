import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { createRepairRequest } from "@/services/repairService";

export type RepairRequestInput = {
  device_brand: string;
  device_model: string;
  issue_type: string;
  phone: string;
  location: string;
  name?: string;
  email?: string | null;
  description?: string | null;
  estimated_cost?: number | null;
  preferred_date?: string | null;
  device_id?: string | null;
  repair_pricing_id?: string | null;
  part_quality?: string | null;
};

export const useRepairSubmit = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: RepairRequestInput) => {
      return createRepairRequest({
        user_id: user?.id ?? null,
        name: input.name || user?.user_metadata?.full_name || user?.email || "Guest",
        phone: input.phone,
        email: input.email ?? user?.email ?? null,
        device_brand: input.device_brand,
        device_model: input.device_model,
        issue_type: input.issue_type,
        description: [input.location ? `Customer location: ${input.location}` : "", input.description ?? ""]
          .filter(Boolean)
          .join("\n") || null,
        estimated_cost: input.estimated_cost ?? null,
        preferred_date: input.preferred_date ?? null,
        device_id: input.device_id ?? null,
        repair_pricing_id: input.repair_pricing_id ?? null,
        part_quality: input.part_quality ?? null,
      });
    },
  });
};
