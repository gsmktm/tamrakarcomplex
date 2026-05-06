/**
 * Store Management Types
 * 
 * Complete type definitions for all store-related data structures
 */

import type { Json } from "@/integrations/supabase/types";

export type StorePackageSlug = "free" | "silver" | "gold" | "diamond";
export type SubscriptionStatus = "active" | "inactive" | "pending" | "expired";
export type StoreStatus = "active" | "suspended" | "maintenance";
export type ComplexZone = "inside" | "outside";

/**
 * Basic store record from database
 */
export interface Store {
  id: string;
  name: string;
  slug: string | null;
  shop_no: string | null;
  
  // Location info
  location: string;
  address: string | null;
  complex_zone: ComplexZone;
  floor: string | null;
  
  // Contact info
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  
  // Visual
  logo_url: string | null;
  cover_image_url: string | null;
  description: string | null;
  
  // Services
  services: string[] | null;
  services_json: Json;
  social_links_json: Json;
  
  // Package & subscription
  package_slug: StorePackageSlug;
  subscription_status: SubscriptionStatus;
  subscription_end_date: string | null;
  
  // Verification & trust
  is_verified: boolean;
  is_featured: boolean;
  
  // Marketplace
  is_marketplace_enabled: boolean;
  marketplace_commission: number;
  
  // Admin
  theme_slug: string;
  status: StoreStatus;
  payout_settings: Json;
  
  // Ownership
  owner_id: string | null;
  
  // Metadata
  map_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Store display item for directory/listing
 */
export interface StoreDirectoryItem {
  id: string;
  name: string;
  shop_no: string | null;
  location: string;
  address: string | null;
  complex_zone: ComplexZone;
  floor: string | null;
  
  // Contact (visibility controlled by package)
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  
  // Visual
  logo_url: string | null;
  cover_image_url: string | null;
  description: string | null;
  services: string[] | null;
  
  // Package info
  package_slug: StorePackageSlug;
  is_verified: boolean;
  is_featured: boolean;
  is_marketplace_enabled: boolean;
  
  // For sorting/filtering
  subscription_tier?: string;
  tier_order?: number;
}

/**
 * Store admin view (with sensitive data)
 */
export interface StoreAdminView extends Store {
  adminCount?: number;
  productCount?: number;
  serviceCount?: number;
  staffCount?: number;
}

/**
 * Store create/update payload
 */
export interface StoreCreateInput {
  name: string;
  slug?: string;
  shop_no?: string;
  location: string;
  address?: string;
  complex_zone?: ComplexZone;
  floor?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  cover_image_url?: string;
  description?: string;
  services?: string[];
  services_json?: Json;
  social_links_json?: Json;
  package_slug?: StorePackageSlug;
  owner_id?: string;
  is_verified?: boolean;
}

/**
 * Store update payload (all fields optional)
 */
export interface StoreUpdateInput {
  name?: string;
  slug?: string;
  shop_no?: string;
  location?: string;
  address?: string;
  complex_zone?: ComplexZone;
  floor?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  cover_image_url?: string;
  description?: string;
  services?: string[];
  services_json?: Json;
  social_links_json?: Json;
  package_slug?: StorePackageSlug;
  is_verified?: boolean;
  is_featured?: boolean;
  is_marketplace_enabled?: boolean;
  marketplace_commission?: number;
  theme_slug?: string;
  status?: StoreStatus;
  subscription_status?: SubscriptionStatus;
  subscription_end_date?: string;
  payout_settings?: Json;
}

/**
 * Package override for super admin
 */
export interface PackageOverride {
  store_id: string;
  override_package_slug: StorePackageSlug;
  override_reason: string;
  overridden_at: string;
  overridden_by: string;
}

/**
 * Subscription info for store
 */
export interface StoreSubscription {
  store_id: string;
  package_slug: StorePackageSlug;
  subscription_status: SubscriptionStatus;
  subscription_start_date: string;
  subscription_end_date: string | null;
  auto_renew: boolean;
  payment_method?: string;
}

/**
 * Store theme configuration
 */
export interface StoreTheme {
  slug: string;
  name: string;
  description: string;
  preview_url?: string;
  is_premium: boolean;
  available_in_packages: StorePackageSlug[];
  customizable: boolean;
}

/**
 * Store's contact field with visibility rules applied
 */
export interface VisibleContactField {
  value: string | null;
  visibility: "hidden" | "public" | "login-required";
  label: string;
}

/**
 * Featured store listing
 */
export interface FeaturedStore extends StoreDirectoryItem {
  featureOrder: number;
  bannerUrl?: string;
  bannerText?: string;
}

/**
 * Store search filters
 */
export interface StoreSearchFilters {
  query?: string;
  package?: StorePackageSlug | "all";
  complex_zone?: ComplexZone | "all";
  isVerified?: boolean;
  isFeatured?: boolean;
  services?: string[];
  sort?: "name" | "featured" | "verified" | "newest";
  limit?: number;
  offset?: number;
}

/**
 * Store analytics data (for Gold/Diamond stores)
 */
export interface StoreAnalytics {
  store_id: string;
  period: string; // ISO date range
  total_views: number;
  total_clicks: number;
  total_inquiries: number;
  product_views: number;
  repair_inquiries: number;
  lead_conversions: number;
}

/**
 * Store lead (for sell-phone/repair leads)
 */
export interface StoreLead {
  id: string;
  store_id: string;
  lead_type: "sell-phone" | "repair";
  priority: number;
  customer_info: Json;
  device_info?: Json;
  status: "new" | "viewed" | "contacted" | "closed";
  created_at: string;
  responded_at?: string;
}

/**
 * Store staff member
 */
export interface StoreStaff {
  id: string;
  store_id: string;
  user_id: string;
  role: "manager" | "staff";
  name: string;
  email: string;
  permissions: string[];
  created_at: string;
}

/**
 * Store branch (for Diamond stores)
 */
export interface StoreBranch {
  id: string;
  store_id: string;
  name: string;
  location: string;
  address: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  is_primary: boolean;
  created_at: string;
}

/**
 * Form input types for store pages
 */
export interface StoreStaffFormInput {
  store_id: string;
  user_id: string;
  role: "manager" | "staff";
  name: string;
  email: string;
  permissions: string[];
}

export interface StorePackageFormInput {
  store_id: string;
  package_slug: StorePackageSlug;
  subscription_status: SubscriptionStatus;
  subscription_end_date?: string;
}

export interface StoreSubscriptionFormInput {
  store_id: string;
  package_slug: StorePackageSlug;
  subscription_status: SubscriptionStatus;
  subscription_end_date?: string;
}
