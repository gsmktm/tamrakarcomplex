import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MarketplaceListing = {
  id: string;
  title: string;
  price: number;
  condition: string;
  location: string;
  images: string[] | null;
  created_at: string;
  brand: string | null;
  model: string | null;
  status: string;
};

export const useMarketplacePreview = (limit = 4) => {
  return useQuery({
    queryKey: ["marketplace_preview", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sell_listings")
        .select("id, title, price, condition, location, images, created_at, brand, model, status")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as MarketplaceListing[];
    },
  });
};
