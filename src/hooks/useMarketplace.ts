/**
 * Marketplace Hooks
 * 
 * React hooks for marketplace operations with entitlements enforcement
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { checkPackageLimit, getStoreEntitlements, resolveEffectiveStorePackage } from "@/lib/storeEntitlements";
import type {
  Listing,
  MarketplaceListing,
  ListingSearchFilters,
  CreateListingInput,
  UpdateListingInput,
  ListingInquiry,
  CreateInquiryInput,
  UpdateInquiryInput,
  StoreMarketplaceStats,
} from "@/types/marketplace";

const STORE_PACKAGE_PRIORITY: Record<string, number> = {
  diamond: 1,
  gold: 2,
  silver: 3,
  free: 4,
};

function getPackagePriority(packageSlug: string | null | undefined) {
  return STORE_PACKAGE_PRIORITY[packageSlug ?? "free"] ?? 4;
}

/**
 * Fetch marketplace listings with sorting and filtering
 */
export function useMarketplaceListings(filters?: ListingSearchFilters) {
  return useQuery<MarketplaceListing[]>({
    queryKey: ["marketplace-listings", filters],
    queryFn: async () => {
      let query = supabase
        .from("sell_listings")
        .select("*")
        .eq("status", "active");

      // Apply filters
      if (filters?.brand) {
        query = query.ilike("brand", `%${filters.brand}%`);
      }

      if (filters?.condition) {
        query = query.eq("condition", filters.condition);
      }

      if (filters?.listing_type) {
        query = query.eq("listing_type", filters.listing_type);
      }

      if (filters?.price_min !== undefined) {
        query = query.gte("price", filters.price_min);
      }

      if (filters?.price_max !== undefined) {
        query = query.lte("price", filters.price_max);
      }

      if (filters?.store_id) {
        query = query.eq("store_id", filters.store_id);
      }

      if (filters?.location) {
        query = query.ilike("location", `%${filters.location}%`);
      }

      if (filters?.query) {
        const q = `%${filters.query}%`;
        query = query.or(`title.ilike.${q},description.ilike.${q},brand.ilike.${q},model.ilike.${q}`);
      }

      // Apply sorting
      switch (filters?.sort) {
        case "price_low":
          query = query.order("price", { ascending: true });
          break;
        case "price_high":
          query = query.order("price", { ascending: false });
          break;
        case "featured":
          query = query.order("created_at", { ascending: false });
          break;
        case "newest":
        default:
          query = query.order("created_at", { ascending: false });
      }

      const limit = filters?.limit ?? 20;
      const offset = filters?.offset ?? 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;
      if (error) throw error;

      return (data || [])
        .map((listing: Listing) => ({
          ...listing,
          storeName: null,
          storePackage: null,
          storeLocation: null,
          storeLogoUrl: null,
          storeVerified: false,
          is_featured: false,
        })) as MarketplaceListing[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch featured listings (Diamond, then Gold)
 */
export function useFeaturedListings() {
  return useQuery<MarketplaceListing[]>({
    queryKey: ["featured-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sell_listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Sort by store package priority
      return (data || []).map((listing: Listing) => ({
          ...listing,
          storeName: null,
          storePackage: null,
          storeLocation: null,
          storeLogoUrl: null,
          storeVerified: false,
        })) as MarketplaceListing[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch single listing detail
 */
export function useListingDetail(listingId: string | null | undefined) {
  const { user } = useAuth();

  return useQuery<MarketplaceListing | null>({
    queryKey: ["listing-detail", listingId],
    queryFn: async () => {
      if (!listingId) return null;

      const { data, error } = await supabase
        .from("sell_listings")
        .select("*")
        .eq("id", listingId)
        .eq("status", "active")
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }

      if (!data) return null;

      return {
        ...data,
        storeName: data.stores?.name,
        storePackage: data.stores?.package_slug,
        storeLocation: data.stores?.location,
        storeLogoUrl: data.stores?.logo_url,
        storeVerified: data.stores?.is_verified,
      } as MarketplaceListing;
    },
    enabled: !!listingId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch store's listings (for store admin)
 */
export function useStoreListings(storeId: string | null | undefined) {
  const { user } = useAuth();

  return useQuery<Listing[]>({
    queryKey: ["store-listings", storeId],
    queryFn: async () => {
      if (!storeId) return [];

      const { data, error } = await supabase
        .from("sell_listings")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!storeId,
  });
}

/**
 * Create listing mutation
 */
export function useCreateListing() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateListingInput) => {
      if (!user) throw new Error("Not authenticated");

      // If store listing, verify ownership and package
      if (input.store_id) {
        const { data: store } = await supabase
          .from("stores")
          .select("owner_id, package_slug, subscription_status, subscription_end_date")
          .eq("id", input.store_id)
          .single();

        if (!store) throw new Error("Store not found");
        if (store.owner_id !== user.id) throw new Error("Not store owner");

        const packageSlug = resolveEffectiveStorePackage(store);
        const entitlements = getStoreEntitlements(packageSlug);
        if (!entitlements.canListProducts) {
          throw new Error("Your package does not allow product listings");
        }

        const { count } = await supabase
          .from("sell_listings")
          .select("id", { count: "exact", head: true })
          .eq("store_id", input.store_id);
        const limit = checkPackageLimit(packageSlug, "product", count ?? 0);
        if (!limit.allowed) {
          throw new Error(limit.reason || "package_limit");
        }
      }

      const { data, error } = await supabase
        .from("sell_listings")
        .insert({
          title: input.title,
          brand: input.brand,
          model: input.model,
          description: input.description,
          condition: input.condition,
          listing_type: input.listing_type || "sell",
          price: input.price,
          currency: input.currency || "NPR",
          category: input.category,
          images: input.images,
          location: input.location,
          contact_info: input.contact_info,
          store_id: input.store_id || null,
          user_id: input.store_id ? null : user.id,
          catalog_product_id: input.catalog_product_id || null,
          status: "pending", // Requires admin approval
        })
        .select()
        .single();

      if (error) throw error;
      return data as Listing;
    },
  });
}

/**
 * Update listing mutation
 */
export function useUpdateListing() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateListingInput }) => {
      const { data: updated, error } = await supabase
        .from("sell_listings")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return updated as Listing;
    },
  });
}

/**
 * Delete listing mutation
 */
export function useDeleteListing() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sell_listings")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
  });
}

/**
 * Feature listing mutation (admin)
 */
export function useFeatureListing() {
  return useMutation({
    mutationFn: async ({ id, isFeatured: _isFeatured }: { id: string; isFeatured: boolean }) => {
      // is_featured column does not exist on sell_listings — no-op
      const { data, error } = await supabase
        .from("sell_listings")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Listing;
    },
  });
}

/**
 * Fetch listing inquiries
 */
export function useListingInquiries(listingId: string | null | undefined) {
  return useQuery<ListingInquiry[]>({
    queryKey: ["listing-inquiries", listingId],
    queryFn: async () => {
      if (!listingId) return [];

      const { data, error } = await supabase
        .from("listing_inquiries")
        .select("*")
        .eq("listing_id", listingId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!listingId,
  });
}

/**
 * Create inquiry mutation
 */
export function useCreateInquiry() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateInquiryInput) => {
      const { data, error } = await supabase
        .from("listing_inquiries")
        .insert({
          listing_id: input.listing_id,
          user_id: user?.id || null,
          name: input.name,
          phone: input.phone,
          email: input.email,
          message: input.message || null,
          status: "new",
        })
        .select()
        .single();

      if (error) throw error;
      return data as ListingInquiry;
    },
  });
}

/**
 * Update inquiry mutation
 */
export function useUpdateInquiry() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInquiryInput }) => {
      const { data: updated, error } = await supabase
        .from("listing_inquiries")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return updated as ListingInquiry;
    },
  });
}

/**
 * Fetch store marketplace statistics
 */
export function useStoreMarketplaceStats(storeId: string | null | undefined) {
  return useQuery<StoreMarketplaceStats | null>({
    queryKey: ["store-marketplace-stats", storeId],
    queryFn: async () => {
      if (!storeId) return null;

      // Get store info
      const { data: store } = await supabase
        .from("stores")
        .select("package_slug, subscription_status, subscription_end_date")
        .eq("id", storeId)
        .single();

      if (!store) return null;

      const entitlements = getStoreEntitlements(resolveEffectiveStorePackage(store));

      // Get listing stats
      const { data: listings } = await supabase
        .from("sell_listings")
        .select("id, status")
        .eq("store_id", storeId);

      const total = listings?.length || 0;
      const active = listings?.filter((l) => l.status === "active").length || 0;
      const sold = listings?.filter((l) => l.status === "sold").length || 0;
      const featured = 0;

      // Get inquiries
      const { data: inquiries } = await supabase
        .from("listing_inquiries")
        .select("status")
        .in(
          "listing_id",
          listings?.map((l) => l.id) || []
        );

      const new_inquiries = inquiries?.filter((i) => i.status === "new").length || 0;

      return {
        store_id: storeId,
        total,
        active,
        sold,
        featured,
        total_views: 0, // Would come from analytics table
        avg_inquiry_response_time: 0, // Would be calculated
        listings_limit: entitlements.productListingLimit,
        listings_available: entitlements.productListingLimit - active,
        total_inquiries: inquiries?.length || 0,
        new_inquiries,
      };
    },
    enabled: !!storeId,
  });
}
