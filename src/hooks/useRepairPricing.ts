import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RepairPricingRow {
  id: string;
  device_id: string;
  service_key: string;
  quality: string;
  base_price: number;
  total_cache: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UseRepairPricingFilters {
  device_id?: string;
  service_key?: string;
  quality?: string;
  is_active?: boolean;
}

export function useRepairPricing(filters?: UseRepairPricingFilters) {
  return useQuery({
    queryKey: ["repair-pricing", filters],
    queryFn: async () => {
      let query = supabase
        .from("repair_pricing")
        .select("*")
        .order("base_price", { ascending: true });

      if (filters?.device_id) query = query.eq("device_id", filters.device_id);
      if (filters?.service_key) query = query.eq("service_key", filters.service_key);
      if (filters?.quality) query = query.eq("quality", filters.quality);
      if (filters?.is_active !== undefined) query = query.eq("is_active", filters.is_active);

      const { data, error } = await query;
      if (error) {
        const code = (error as { code?: string })?.code ?? "";
        const msg = (error as { message?: string })?.message?.toLowerCase() ?? "";
        if (code === "PGRST205" || code === "PGRST200" || msg.includes("schema cache") || msg.includes("could not find the table")) return [];
        throw error;
      }
      return (data ?? []) as RepairPricingRow[];
    },
  });
}

export function useRepairPricingByDevice(deviceId: string) {
  return useRepairPricing({ device_id: deviceId, is_active: true });
}

export function useCreateRepairPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (row: Omit<RepairPricingRow, "id" | "created_at" | "updated_at" | "total_cache">) => {
      const { data, error } = await supabase
        .from("repair_pricing")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data as RepairPricingRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repair-pricing"] });
    },
  });
}

export function useUpdateRepairPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RepairPricingRow> & { id: string }) => {
      const { data, error } = await supabase
        .from("repair_pricing")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as RepairPricingRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repair-pricing"] });
    },
  });
}

export function useDeleteRepairPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("repair_pricing")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repair-pricing"] });
    },
  });
}
