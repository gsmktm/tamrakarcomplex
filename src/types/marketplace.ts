/**
 * Marketplace Types
 * 
 * Types for multi-vendor marketplace listings and inquiries
 */

import type { Json } from "@/integrations/supabase/types";

export type ListingType = "sell" | "buy" | "exchange" | "store_product";
export type ListingStatus = "draft" | "pending" | "active" | "sold" | "rejected" | "expired";
export type ListingCondition = "new" | "like_new" | "used" | "fair";
export type InquiryStatus = "new" | "viewed" | "contacted" | "closed";

/**
 * Marketplace listing from database
 */
export interface Listing {
  id: string;
  store_id: string | null;
  user_id: string | null;
  catalog_product_id: string | null;
  
  title: string;
  brand: string | null;
  model: string | null;
  description: string | null;
  
  condition: ListingCondition;
  listing_type: ListingType;
  status: ListingStatus;
  
  price: number;
  currency: string;
  category: string;
  
  images: string[] | null;
  location: string | null;
  contact_info: string | null;
  
  is_featured: boolean;
  rejected_reason: string | null;
  
  created_at: string;
  updated_at: string;
}

/**
 * Listing for marketplace display
 */
export interface MarketplaceListing extends Listing {
  // Populated during display
  storeName?: string;
  storePackage?: string;
  storeLocation?: string;
  storeLogoUrl?: string | null;
  storeVerified?: boolean;
  sellerName?: string; // For user listings
  sortPriority?: number;
}

/**
 * Create listing payload
 */
export interface CreateListingInput {
  title: string;
  brand?: string;
  model?: string;
  description?: string;
  condition: ListingCondition;
  listing_type?: ListingType;
  price: number;
  currency?: string;
  category: string;
  images?: string[];
  location?: string;
  contact_info?: string;
  
  // For store listings
  store_id?: string;
  catalog_product_id?: string;
}

/**
 * Update listing payload
 */
export interface UpdateListingInput {
  title?: string;
  brand?: string;
  model?: string;
  description?: string;
  condition?: ListingCondition;
  price?: number;
  category?: string;
  images?: string[];
  location?: string;
  contact_info?: string;
  status?: ListingStatus;
  is_featured?: boolean;
  rejected_reason?: string;
}

/**
 * Listing inquiry from database
 */
export interface ListingInquiry {
  id: string;
  listing_id: string;
  user_id: string | null;
  name: string;
  phone: string;
  email: string;
  message: string | null;
  status: InquiryStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Create inquiry payload
 */
export interface CreateInquiryInput {
  listing_id: string;
  name: string;
  phone: string;
  email: string;
  message?: string;
}

/**
 * Update inquiry payload
 */
export interface UpdateInquiryInput {
  status?: InquiryStatus;
  message?: string;
}

/**
 * Listing with seller info
 */
export interface ListingWithSeller extends MarketplaceListing {
  seller: {
    type: "store" | "user";
    name: string;
    phone?: string;
    email?: string;
    image?: string;
    verified?: boolean;
    location?: string;
  };
}

/**
 * Marketplace search filters
 */
export interface ListingSearchFilters {
  query?: string;
  brand?: string;
  condition?: ListingCondition;
  listing_type?: ListingType;
  price_min?: number;
  price_max?: number;
  store_id?: string;
  location?: string;
  sort?: "newest" | "price_low" | "price_high" | "featured" | "popular";
  limit?: number;
  offset?: number;
}

/**
 * Listing statistics
 */
export interface ListingStats {
  total: number;
  active: number;
  sold: number;
  featured: number;
  total_views: number;
  avg_inquiry_response_time: number;
}

/**
 * Store marketplace stats
 */
export interface StoreMarketplaceStats extends ListingStats {
  store_id: string;
  listings_limit: number;
  listings_available: number;
  total_inquiries: number;
  new_inquiries: number;
}

/**
 * Marketplace order (future)
 */
export interface MarketplaceOrder {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_store_id?: string;
  seller_user_id?: string;
  
  quantity: number;
  total_price: number;
  commission: number;
  seller_payout: number;
  
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  
  created_at: string;
  updated_at: string;
}

/**
 * Category for marketplace filtering
 */
export interface ListingCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
}

/**
 * Featured listing with promotional data
 */
export interface FeaturedListing extends MarketplaceListing {
  featured_until: string;
  promotion_type: "store_featured" | "platform_featured";
  promotion_price?: number;
  promo_views: number;
}

/**
 * Form input types for marketplace pages
 */
export interface MarketplaceApprovalInput {
  status: ListingStatus;
  rejected_reason?: string;
}
