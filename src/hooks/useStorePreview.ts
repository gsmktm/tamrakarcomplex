import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StorePreview = {
  id: string;
  name: string;
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
        .select("id, name, location, logo_url, is_verified, phone, services")
        .order("is_verified", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as StorePreview[];
    },
  });
};
