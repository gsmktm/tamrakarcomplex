import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  computeHasActiveSubscription,
  fetchStoreTierOverrides,
  resolveTierForStore,
} from "@/lib/storeTier";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SubscriptionTier = "diamond" | "gold" | "silver" | "free" | null;

export interface StoreDirectoryItem {
  id: string;
  name: string;
  shop_no: string | null;
  location: string;
  address: string | null;
  is_verified: boolean;
  logo_url: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  map_url: string | null;
  services: string[] | null;
  owner_id: string | null;
  subscription_tier: SubscriptionTier;
  subscription_tier_name: string;
  has_active_subscription: boolean;
  subscription_end_date: string | null;
  tier_order: number;
}

function normalizeDirectoryItem(store: StoreDirectoryItem): StoreDirectoryItem {
  const row = store as StoreDirectoryItem & {
    package_slug?: string | null;
    subscription_status?: string | null;
  };
  const subscriptionStatus = row.subscription_status ?? (store.has_active_subscription ? "active" : "inactive");
  const tier = resolveTierForStore({
    ...row,
    package_slug: row.package_slug ?? store.subscription_tier,
    subscription_status: subscriptionStatus,
    subscription_end_date: store.subscription_end_date,
  });
  const tierOrder = tier === "diamond" ? 1 : tier === "gold" ? 2 : tier === "silver" ? 3 : 4;

  return {
    ...store,
    subscription_tier: tier,
    subscription_tier_name: tier === "free" ? "Basic" : tier.charAt(0).toUpperCase() + tier.slice(1),
    has_active_subscription: tier !== "free",
    tier_order: tierOrder,
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useStoresDirectory() {
  return useQuery<StoreDirectoryItem[]>({
    queryKey: ["stores-directory"],
    staleTime: 5 * 60 * 1000, // 5 min — store list is slow-changing
    placeholderData: (prev) => prev, // keep previous list visible during background refresh
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_stores_directory");

      if (!error && data) {
        return data as StoreDirectoryItem[];
      }

      console.error("Error fetching stores directory via RPC:", error);

      // Fallback: direct table query
      const { data: fallback, error: fallbackErr } = await supabase
        .from("stores")
        .select("*")
        .order("is_verified", { ascending: false });

      if (fallbackErr) throw fallbackErr;

      return (fallback || []).map((s) => ({
        id: String(s.id),
        name: String(s.name),
        shop_no: (s.shop_no ?? null) as string | null,
        location: String(s.location),
        address: (s.address ?? null) as string | null,
        is_verified: !!s.is_verified,
        logo_url: (s.logo_url ?? null) as string | null,
        description: (s.description ?? null) as string | null,
        phone: (s.phone ?? null) as string | null,
        email: (s.email ?? null) as string | null,
        website: (s.website ?? null) as string | null,
        map_url: (s.map_url ?? null) as string | null,
        services: (s.services ?? null) as string[] | null,
        owner_id: (s.owner_id ?? null) as string | null,
        subscription_tier: (s.subscription_status === "active" ? s.package_slug : "free") as SubscriptionTier,
        subscription_tier_name: s.plan_name || (s.subscription_status === "active" ? "Active" : "Basic"),
        has_active_subscription: s.subscription_status === "active",
        subscription_end_date: s.subscription_end_date ?? null,
        tier_order: s.package_slug === "diamond" ? 1 : s.package_slug === "gold" ? 2 : s.package_slug === "silver" ? 3 : 4,
      } satisfies StoreDirectoryItem));
    },
  });
}

// ─── Tier metadata ─────────────────────────────────────────────────────────────

export const TIER_META = {
  diamond: {
    label: "Diamond",
    color: "from-cyan-400 to-blue-500",
    bgLight: "bg-cyan-500/10",
    border: "border-cyan-400/40",
    badge: "bg-gradient-to-r from-cyan-400 to-blue-500 text-white",
    text: "text-cyan-400",
    glow: "shadow-[0_0_24px_rgba(34,211,238,0.18)]",
    order: 1,
  },
  gold: {
    label: "Gold",
    color: "from-amber-400 to-yellow-500",
    bgLight: "bg-amber-500/10",
    border: "border-amber-400/40",
    badge: "bg-gradient-to-r from-amber-400 to-yellow-500 text-black",
    text: "text-amber-400",
    glow: "shadow-[0_0_24px_rgba(251,191,36,0.15)]",
    order: 2,
  },
  silver: {
    label: "Silver",
    color: "from-slate-300 to-slate-400",
    bgLight: "bg-slate-400/10",
    border: "border-slate-400/40",
    badge: "bg-gradient-to-r from-slate-300 to-slate-400 text-black",
    text: "text-slate-400",
    glow: "shadow-[0_0_16px_rgba(148,163,184,0.12)]",
    order: 3,
  },
  free: {
    label: "Basic",
    color: "from-gray-300 to-gray-400",
    bgLight: "bg-gray-400/10",
    border: "border-gray-400/20",
    badge: "bg-gray-100 text-gray-600",
    text: "text-gray-400",
    glow: "",
    order: 4,
  },
} as const;
