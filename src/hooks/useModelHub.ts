import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useModelHub(modelIdOrSlug: string) {
  return useQuery({
    queryKey: ["model_hub", modelIdOrSlug],
    queryFn: async () => {
      // 1. Get Model Basic Data
      const isUuid = modelIdOrSlug.length === 36;
      let modelQuery = supabase.from("phone_models").select("*, brands(name), phone_series(name)");
      
      if (isUuid) {
        modelQuery = modelQuery.eq("id", modelIdOrSlug);
      } else {
        modelQuery = modelQuery.eq("slug", modelIdOrSlug);
      }
      
      const { data: model, error: modelError } = await modelQuery.single();
      if (modelError) throw modelError;

      const modelId = model.id;

      // 2. Fetch all related module data in parallel
      const [
        variants,
        specs,
        inventory,
        usedListings,
        exchangeValues,
        repairServices,
        unlockingServices,
        accessories
      ] = await Promise.all([
        supabase.from("phone_variants").select("*").eq("model_id", modelId),
        supabase.from("phone_specs").select("*").eq("model_id", modelId).maybeSingle(),
        supabase.from("store_products").select("*, stores(name, slug)").eq("model_id", modelId).eq("status", "active"),
        supabase.from("used_phone_listings").select("*").eq("model_id", modelId).eq("status", "approved"),
        supabase.from("exchange_values").select("*").eq("model_id", modelId),
        supabase.from("repair_services").select("*").eq("model_id", modelId),
        supabase.from("unlocking_services").select("*").eq("model_id", modelId),
        supabase.from("accessory_compatibility").select("*, accessories(*)").eq("model_id", modelId)
      ]);

      return {
        model,
        variants: variants.data || [],
        specs: specs.data,
        inventory: inventory.data || [],
        usedListings: usedListings.data || [],
        exchangeValues: exchangeValues.data || [],
        repairServices: repairServices.data || [],
        unlockingServices: unlockingServices.data || [],
        accessories: (accessories.data || []).map(a => a.accessories)
      };
    }
  });
}
