import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HomeOffer = {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  discount_text: string;
  target_url: string;
  active: boolean;
  sort_order: number;
  starts_at: string;
  ends_at: string;
};

const FALLBACK_OFFERS: HomeOffer[] = [
  {
    id: "1",
    title: "iPhone 16 Pro Max — Now Available",
    subtitle: "Trade in your old iPhone and save up to NPR 20,000",
    image_url: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&q=80",
    discount_text: "Save NPR 20K",
    target_url: "/buy?brand=Apple",
    active: true,
    sort_order: 1,
    starts_at: "",
    ends_at: "",
  },
  {
    id: "2",
    title: "Samsung Galaxy S25 Ultra",
    subtitle: "Nepal's best price — free screen protector included",
    image_url: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80",
    discount_text: "Free Gift",
    target_url: "/buy?brand=Samsung",
    active: true,
    sort_order: 2,
    starts_at: "",
    ends_at: "",
  },
  {
    id: "3",
    title: "Free Diagnosis with Every Repair",
    subtitle: "Book a certified repair and get a free diagnostic check",
    image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    discount_text: "Free Diagnosis",
    target_url: "/repair",
    active: true,
    sort_order: 3,
    starts_at: "",
    ends_at: "",
  },
];

export const useHomeOffers = () => {
  return useQuery({
    queryKey: ["home_offers"],
    queryFn: async () => {
      try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from("home_offers")
          .select("*")
          .eq("active", true)
          .or(`starts_at.is.null,starts_at.lte.${now}`)
          .or(`ends_at.is.null,ends_at.gte.${now}`)
          .order("sort_order", { ascending: true });

        if (error) return FALLBACK_OFFERS;
        return (data?.length ? data : FALLBACK_OFFERS) as HomeOffer[];
      } catch {
        return FALLBACK_OFFERS;
      }
    },
  });
};
