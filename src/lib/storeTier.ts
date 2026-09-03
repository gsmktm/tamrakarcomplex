import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/integrations/supabase/types";

export type SubscriptionTier = "diamond" | "gold" | "silver" | "free" | null;
export type StoreTierOverrides = Record<string, Exclude<SubscriptionTier, null>>;
export const STORE_LAUNCH_OFFER_STARTED_AT = "2026-05-04T00:00:00+05:45";
export const STORE_LAUNCH_OFFER_EXPIRES_AT = "2026-08-02T00:00:00+05:45";

export function normalizeSubscriptionTier(value: unknown): Exclude<SubscriptionTier, null> | null {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (v === "diamond" || v === "gold" || v === "silver" || v === "free") return v;
  return null;
}

export function computeHasActiveSubscription(
  subscriptionStatus: unknown,
  subscriptionEndDate: unknown,
): boolean {
  const status = typeof subscriptionStatus === "string" ? subscriptionStatus.toLowerCase() : "";
  if (status !== "active") return false;
  if (!subscriptionEndDate) return true; // no expiry = active
  const date = new Date(String(subscriptionEndDate));
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() > Date.now();
}

function hashStoreKey(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function isStoreLaunchOfferActive(now = Date.now()): boolean {
  const start = new Date(STORE_LAUNCH_OFFER_STARTED_AT).getTime();
  const expiry = new Date(STORE_LAUNCH_OFFER_EXPIRES_AT).getTime();
  return now >= start && now < expiry;
}

export function getStoreLaunchOfferTier(
  store: { id?: unknown; name?: unknown; shop_no?: unknown; slug?: unknown } & Record<string, unknown>,
): Exclude<SubscriptionTier, null> {
  if (!isStoreLaunchOfferActive()) return "free";
  const key = String(store.id || store.slug || store.name || store.shop_no || "store").toLowerCase();
  const bucket = hashStoreKey(key) % 100;

  if (bucket < 8) return "diamond";
  if (bucket < 33) return "gold";
  if (bucket < 78) return "silver";
  return "free";
}

export function resolveTierForStore(
  store: { id?: unknown; subscription_status?: unknown; subscription_end_date?: unknown } & Record<string, unknown>,
  overrides?: StoreTierOverrides | null,
): Exclude<SubscriptionTier, null> {
  const storeId = typeof store?.id === "string" ? store.id : "";
  const direct =
    normalizeSubscriptionTier(store.package_slug) ??
    normalizeSubscriptionTier(store.subscription_tier) ??
    normalizeSubscriptionTier(store.plan_slug) ??
    normalizeSubscriptionTier(store.subscription_plan) ??
    null;

  if (direct === "free") return "free";

  const hasActive = computeHasActiveSubscription(store.subscription_status, store.subscription_end_date);
  if (direct && hasActive) return direct;

  const override = storeId && overrides ? overrides[storeId] : undefined;
  const overrideTier = normalizeSubscriptionTier(override);
  if (overrideTier && overrideTier !== "free" && hasActive) return overrideTier;

  return "free";
}

export function tierLabel(tier: Exclude<SubscriptionTier, null>): string {
  if (tier === "diamond") return "Diamond";
  if (tier === "gold") return "Gold";
  if (tier === "silver") return "Silver";
  return "Basic";
}

function parseOverrides(value: Json | null | undefined): StoreTierOverrides | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: StoreTierOverrides = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    const t = normalizeSubscriptionTier(v);
    if (t) out[key] = t;
  }
  return out;
}

export async function fetchStoreTierOverrides(supabase: SupabaseClient): Promise<StoreTierOverrides | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "store_package_overrides")
    .maybeSingle();

  if (error) return null;
  return parseOverrides(data?.value as Json | null);
}
