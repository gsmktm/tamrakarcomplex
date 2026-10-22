import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CAMPAIGN_PLACEMENTS = [
  { value: "home_hero", label: "Homepage · after categories" },
  { value: "home_mid", label: "Homepage · after products" },
  { value: "home_footer", label: "Homepage · before footer" },
  { value: "marketplace_top", label: "Marketplace · above listings" },
  { value: "category_top", label: "Device categories · above products" },
  { value: "store_directory", label: "Stores · above directory" },
  { value: "repair_top", label: "Repair · after introduction" },
  { value: "product_inline", label: "Product details · recommended area" },
  { value: "sidebar_ad", label: "Legacy sidebar placement" },
] as const;

export type CampaignPlacement = (typeof CAMPAIGN_PLACEMENTS)[number]["value"];

export type MarketingCampaign = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  button_text: string | null;
  placement: CampaignPlacement;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  festival_key?: string | null;
  disclosure?: string | null;
  is_sponsored?: boolean | null;
};

export function isCampaignRunning(campaign: MarketingCampaign, now = Date.now()) {
  const begins = campaign.starts_at ? new Date(campaign.starts_at).getTime() : -Infinity;
  const ends = campaign.ends_at ? new Date(campaign.ends_at).getTime() : Infinity;
  return campaign.is_active &&
    Number.isFinite(begins) === Boolean(campaign.starts_at) &&
    Number.isFinite(ends) === Boolean(campaign.ends_at) &&
    begins <= now && ends > now;
}

/** Block protocol-relative, javascript:, and external destinations from campaign CTAs. */
export function safeCampaignPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || /[\u0000-\u001F\\]/.test(trimmed)) return null;
  return trimmed;
}

export function safeCampaignImage(path: string | null | undefined): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (safeCampaignPath(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:") return url.href;
  } catch { /* Missing/invalid image is allowed; visual CSS fallback. */ }
  return null;
}

export function useCampaignPlacement(placement: CampaignPlacement) {
  return useQuery({
    queryKey: ["campaigns", "placement", placement],
    queryFn: async () => {
      // Public RLS also checks the publication window. Client filters as defense in depth.
      const { data, error } = await supabase
        .from("marketing_banners")
        .select("id,title,subtitle,image_url,link_url,button_text,placement,is_active,starts_at,ends_at,sort_order,festival_key,disclosure,is_sponsored")
        .eq("placement", placement)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(6);
      if (error) {
        // An unapplied migration must never break the shopping journey.
        return [] as MarketingCampaign[];
      }
      return (data || []) as unknown as MarketingCampaign[];
    },
    staleTime: 45_000,
    refetchInterval: 60_000,
    retry: false,
  });
}
