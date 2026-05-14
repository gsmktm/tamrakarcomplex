import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { storeDirectoryService } from "@/services/storeDirectoryService";

export type StorePreview = {
  id: string;
  name: string;
  slug?: string | null;
  seo_slug?: string | null;
  location: string;
  logo_url: string;
  is_verified: boolean;
  phone: string;
  services: string[];
};

export const useStorePreview = (limit = 4) => {
  return useQuery({
    queryKey: ["store_preview", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, slug, seo_slug, location, logo_url, is_verified, phone, services")
        .eq("status", "active")
        .eq("public_status", "published")
        .order("is_verified", { ascending: false })
        .limit(limit);

      if (error) {
        const fallback = await storeDirectoryService.getStoresForDirectory({ limit });
        return fallback.data.slice(0, limit) as StorePreview[];
      }
      return (data ?? []) as StorePreview[];
    },
  });
};
