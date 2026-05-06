/**
 * Store Directory Hook with Entitlements Support
 * Adapted to the actual stores table schema:
 * id, name, location, description, phone, email, website, map_url, logo_url,
 * services, owner_id, is_verified, created_at, updated_at, shop_no,
 * subscription_status, subscription_end_date
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { getStoreEntitlements, getContactFieldVisibility, resolveEffectiveStorePackage } from "@/lib/storeEntitlements";
import type { StoreDirectoryItem } from "@/types/store";

export function useStoresWithEntitlements() {
  const { user } = useAuth();
  const isAuthenticated = !!user;

  return useQuery<StoreDirectoryItem[]>({
    queryKey: ["stores-with-entitlements", isAuthenticated],
    queryFn: async () => {
      const { data: stores, error } = await supabase
        .from("stores")
        .select("id, name, shop_no, location, description, phone, email, website, logo_url, services, is_verified, package_slug, subscription_status, subscription_end_date")
        .order("is_verified", { ascending: false });

      if (error) {
        console.error("Error fetching stores:", error);
        return [];
      }

      if (!stores) return [];

      return stores.map((store) => {
        const packageSlug = resolveEffectiveStorePackage(store);
        const entitlements = getStoreEntitlements(packageSlug);
        const phoneVisibility = getContactFieldVisibility(packageSlug, "phone", isAuthenticated);
        const emailVisibility = getContactFieldVisibility(packageSlug, "email", isAuthenticated);

        return {
          id: store.id,
          name: store.name,
          shop_no: store.shop_no ?? null,
          location: store.location ?? "",
          address: store.location ?? "",
          complex_zone: "inside" as const,
          floor: null,
          phone: phoneVisibility !== "hidden" ? store.phone : null,
          whatsapp: null,
          email: emailVisibility !== "hidden" ? store.email : null,
          website: store.website ?? null,
          logo_url: store.logo_url ?? null,
          cover_image_url: null,
          description: store.description ?? null,
          services: store.services ?? null,
          package_slug: packageSlug,
          is_verified: Boolean(store.is_verified) && entitlements.canHaveVerifiedBadge,
          is_featured: Boolean(store.is_verified) && entitlements.canBeFeatured,
          is_marketplace_enabled: entitlements.canEnableMarketplace,
          subscription_tier: packageSlug,
          tier_order: getTierOrder(packageSlug),
        } as StoreDirectoryItem;
      });
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useFeaturedStores() {
  const query = useStoresWithEntitlements();
  return {
    ...query,
    data: (query.data || [])
      .filter((s) => s.is_verified)
      .slice(0, 12),
  };
}

export function useStoresByZone(zone: "inside" | "outside" = "inside") {
  const query = useStoresWithEntitlements();
  return {
    ...query,
    data: (query.data || []).filter((s) => (s.complex_zone ?? "inside") === zone),
  };
}

export function useSearchStores(query: string) {
  const stores = useStoresWithEntitlements();
  return {
    ...stores,
    data: (stores.data || []).filter((store) => {
      const q = query.toLowerCase();
      return (
        store.name.toLowerCase().includes(q) ||
        (store.location ?? "").toLowerCase().includes(q) ||
        (store.shop_no ?? "").toLowerCase().includes(q) ||
        (store.services ?? []).some((s) => s.toLowerCase().includes(q))
      );
    }),
  };
}

export function useStoreDetail(storeId: string | null | undefined) {
  const { user } = useAuth();
  const isAuthenticated = !!user;

  return useQuery<StoreDirectoryItem | null>({
    queryKey: ["store-detail", storeId, isAuthenticated],
    queryFn: async () => {
      if (!storeId) return null;

      const { data: store, error } = await supabase
        .from("stores")
        .select("id, name, shop_no, location, description, phone, email, website, logo_url, services, is_verified, package_slug, subscription_status, subscription_end_date")
        .eq("id", storeId)
        .maybeSingle();

      if (error || !store) return null;

      const packageSlug = resolveEffectiveStorePackage(store);
      const entitlements = getStoreEntitlements(packageSlug);
      const phoneVisibility = getContactFieldVisibility(packageSlug, "phone", isAuthenticated);
      const emailVisibility = getContactFieldVisibility(packageSlug, "email", isAuthenticated);

      return {
        id: store.id,
        name: store.name,
        shop_no: store.shop_no ?? null,
        location: store.location ?? "",
        address: store.location ?? "",
        complex_zone: "inside" as const,
        floor: null,
        phone: phoneVisibility !== "hidden" ? store.phone : null,
        whatsapp: null,
        email: emailVisibility !== "hidden" ? store.email : null,
        website: store.website ?? null,
        logo_url: store.logo_url ?? null,
        cover_image_url: null,
        description: store.description ?? null,
        services: store.services ?? null,
        package_slug: packageSlug,
        is_verified: Boolean(store.is_verified) && entitlements.canHaveVerifiedBadge,
        is_featured: Boolean(store.is_verified) && entitlements.canBeFeatured,
        is_marketplace_enabled: entitlements.canEnableMarketplace,
        subscription_tier: packageSlug,
        tier_order: getTierOrder(packageSlug),
      } as StoreDirectoryItem;
    },
    enabled: !!storeId,
    staleTime: 1000 * 60 * 5,
  });
}

function getTierOrder(packageSlug: string | null | undefined): number {
  switch (packageSlug) {
    case "diamond": return 1;
    case "gold": return 2;
    case "silver": return 3;
    default: return 4;
  }
}

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

export type SubscriptionTier = "diamond" | "gold" | "silver" | "free" | null;
