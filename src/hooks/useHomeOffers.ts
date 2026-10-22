import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HomeOffer = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  discount_text: string | null;
  target_url: string | null;
  active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
};

/** Legacy read only. Never synthesize price cuts, gifts or inventory on outage. */
export const useHomeOffers = () => useQuery({
  queryKey: ["home_offers"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("home_offers")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error) return [] as HomeOffer[];
    const now = Date.now();
    return ((data || []) as HomeOffer[]).filter((offer) => {
      const start = offer.starts_at ? new Date(offer.starts_at).getTime() : -Infinity;
      const end = offer.ends_at ? new Date(offer.ends_at).getTime() : Infinity;
      return start <= now && end > now;
    });
  },
  staleTime: 60_000,
  retry: false,
});
