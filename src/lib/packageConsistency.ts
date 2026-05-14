/**
 * Package Consistency Utilities
 * 
 * Problem: stores table has both package_id (UUID ref) and package_slug (text denormalization).
 * These can diverge, causing feature access bugs.
 * 
 * Solution: Always use package_id as source of truth, join with store_packages.slug for display.
 */

import { supabase } from "@/integrations/supabase/client";

export interface PackageInfo {
  id: string;
  name: string;
  slug: string;
  product_limit: number;
  accessory_limit: number;
  staff_limit: number;
  exchange_enabled: boolean;
  repair_enabled: boolean;
  custom_seo_enabled: boolean;
  analytics_level: string;
  featured_enabled: boolean;
  verified_badge_enabled: boolean;
  homepage_promotion_enabled: boolean;
  [key: string]: any;
}

/**
 * Get the canonical package slug for a store using package_id as source of truth.
 * Falls back to package_slug if package_id not set (for backward compatibility).
 */
export async function getStorePackageSlug(storeId: string): Promise<string | null> {
  try {
    const { data: store, error } = await supabase
      .from("stores")
      .select("package_id, package_slug")
      .eq("id", storeId)
      .single();

    if (error || !store) return null;

    // If package_id is set, use it to get the canonical slug
    if (store.package_id) {
      const { data: pkg, error: pkgError } = await supabase
        .from("store_packages")
        .select("slug")
        .eq("id", store.package_id)
        .single();

      if (!pkgError && pkg) return pkg.slug;
    }

    // Fallback to denormalized package_slug
    return store.package_slug || "free";
  } catch (error) {
    console.error("Error getting store package slug:", error);
    return null;
  }
}

/**
 * Get full package info for a store using package_id as source of truth.
 */
export async function getStorePackage(storeId: string): Promise<PackageInfo | null> {
  try {
    const { data: store, error } = await supabase
      .from("stores")
      .select("package_id")
      .eq("id", storeId)
      .single();

    if (error || !store?.package_id) {
      // Return default free package
      return getDefaultPackage();
    }

    const { data: pkg, error: pkgError } = await supabase
      .from("store_packages")
      .select("*")
      .eq("id", store.package_id)
      .single();

    if (pkgError || !pkg) {
      return getDefaultPackage();
    }

    return pkg as PackageInfo;
  } catch (error) {
    console.error("Error getting store package:", error);
    return getDefaultPackage();
  }
}

/**
 * Get package using either package_id (preferred) or package_slug (fallback).
 * This is for queries that need to fetch with join.
 */
export function buildPackageSelectClause() {
  return `
    *,
    package:store_packages(
      id,
      name,
      slug,
      product_limit,
      accessory_limit,
      staff_limit,
      exchange_enabled,
      repair_enabled,
      custom_seo_enabled,
      analytics_level,
      featured_enabled,
      verified_badge_enabled,
      homepage_promotion_enabled
    )
  `;
}

/**
 * Extract the canonical package slug from a store record that includes package join.
 */
export function extractPackageSlug(store: any): string {
  // If we have the joined package data, use its slug
  if (store.package?.slug) {
    return store.package.slug;
  }
  // Fallback to denormalized package_slug
  return store.package_slug || "free";
}

/**
 * Default free package for stores without a paid package.
 */
function getDefaultPackage(): PackageInfo {
  return {
    id: "free-default",
    name: "Free",
    slug: "free",
    product_limit: 10,
    accessory_limit: 5,
    staff_limit: 1,
    exchange_enabled: false,
    repair_enabled: false,
    custom_seo_enabled: false,
    analytics_level: "none",
    featured_enabled: false,
    verified_badge_enabled: false,
    homepage_promotion_enabled: false,
  };
}

/**
 * Check if a feature is enabled for a store based on its package.
 */
export async function isFeatureEnabledForStore(
  storeId: string,
  feature: "exchange" | "repair" | "custom_seo" | "featured" | "verified_badge" | "homepage_promotion"
): Promise<boolean> {
  try {
    const pkg = await getStorePackage(storeId);
    if (!pkg) return false;

    const featureMap: Record<string, keyof PackageInfo> = {
      exchange: "exchange_enabled",
      repair: "repair_enabled",
      custom_seo: "custom_seo_enabled",
      featured: "featured_enabled",
      verified_badge: "verified_badge_enabled",
      homepage_promotion: "homepage_promotion_enabled",
    };

    return Boolean(pkg[featureMap[feature]]);
  } catch (error) {
    console.error(`Error checking feature ${feature}:`, error);
    return false;
  }
}

/**
 * Sync package_slug with package_id for a store.
 * Call this after updating a store's package_id.
 */
export async function syncPackageSlug(storeId: string): Promise<void> {
  try {
    const slug = await getStorePackageSlug(storeId);
    if (!slug) return;

    const { error } = await supabase
      .from("stores")
      .update({ package_slug: slug })
      .eq("id", storeId);

    if (error) {
      console.error("Error syncing package_slug:", error);
    }
  } catch (error) {
    console.error("Error in syncPackageSlug:", error);
  }
}
