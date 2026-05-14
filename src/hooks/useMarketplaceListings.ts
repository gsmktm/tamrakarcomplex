import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCrudResource } from "@/hooks/useCrudResource";
import { getFallbackMarketplaceListings } from "@/services/publicFallbackData";

export type MarketplaceListingRecord = {
  id: string;
  source_type?: "store_product" | "user_listing";
  user_id?: string | null;
  owner_user_id: string | null;
  store_id: string | null;
  store_name?: string | null;
  catalog_product_id?: string | null;
  stock?: number | null;
  created_by?: string | null;
  listing_type: string | null;
  title: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  condition: string | null;
  price: number | null;
  description: string | null;
  images: string[] | null;
  location: string | null;
  status: string | null;
  verified: boolean | null;
  featured: boolean | null;
  is_featured?: boolean | null;
  contact_info?: string | null;
  created_at: string;
  updated_at: string;
  store?: {
    id: string;
    name: string;
    slug?: string | null;
    seo_slug?: string | null;
    location?: string | null;
    logo_url?: string | null;
    is_verified?: boolean | null;
    subscription_status?: string | null;
  } | null;
};

export type MarketplaceListingsParams = {
  category?: string;
  condition?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  store_id?: string;
  brands?: string[];
  conditions?: string[];
  limit?: number;
  offset?: number;
  sort_by?: string;
};

export function useMarketplaceListings(params: MarketplaceListingsParams = {}) {
  const query = useQuery({
    queryKey: ["marketplace-listings", params],
    queryFn: async () => {
      let request = (supabase as any)
        .from("public_marketplace_items")
        .select("*", { count: "exact" })
        .eq("status", "active");

      if (params.store_id) {
        request = request.eq("store_id", params.store_id);
      }
      if (params.category && params.category !== "all") {
        request = request.ilike("category", `%${params.category}%`);
      }
      if (params.condition && params.condition !== "all") {
        request = request.eq("condition", params.condition);
      }
      if (params.brands && params.brands.length > 0) {
        request = request.in("brand", params.brands);
      }
      if (params.conditions && params.conditions.length > 0) {
        request = request.in("condition", params.conditions);
      }
      if (params.min_price !== undefined) {
        request = request.gte("price", params.min_price);
      }
      if (params.max_price !== undefined) {
        request = request.lte("price", params.max_price);
      }
      if (params.search) {
        request = request.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%,brand.ilike.%${params.search}%,model.ilike.%${params.search}%,store_name.ilike.%${params.search}%`);
      }

      if (params.sort_by === "price_asc") {
        request = request.order("price", { ascending: true });
      } else if (params.sort_by === "price_desc") {
        request = request.order("price", { ascending: false });
      } else if (params.sort_by === "oldest") {
        request = request.order("created_at", { ascending: true });
      } else {
        request = request.order("created_at", { ascending: false });
      }

      if (params.limit) {
        const from = params.offset || 0;
        const to = from + params.limit - 1;
        request = request.range(from, to);
      }

      const { data, error, count } = await request;
      
      if (error) {
        return getManualUnifiedMarketplace(params);
      }

      if (!data?.length && (count ?? 0) === 0) {
        return getManualUnifiedMarketplace(params);
      }

      return {
        listings: ((data as MarketplaceListingRecord[]) ?? []).map(normalizeListing),
        total: count || 0,
      };
    },
  });

  const resource = useCrudResource<MarketplaceListingRecord>({
    table: "sell_listings",
    queryKey: "marketplace-listings",
    orderBy: "created_at",
  });

  return {
    data: query.data,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createListing: resource.create,
    updateListing: resource.update,
    deleteListing: resource.remove,
    approveListing: (id: string) => resource.update({ id, payload: { status: "active" } }),
    rejectListing: (id: string) => resource.update({ id, payload: { status: "rejected" } }),
  };
}

function normalizeListing(listing: MarketplaceListingRecord): MarketplaceListingRecord {
  const images = Array.isArray(listing.images)
    ? listing.images
    : listing.images
      ? Object.values(listing.images as unknown as Record<string, string>).filter(Boolean)
      : [];

  return {
    ...listing,
    owner_user_id: listing.owner_user_id ?? listing.user_id ?? listing.created_by ?? null,
    user_id: listing.user_id ?? listing.owner_user_id ?? listing.created_by ?? null,
    listing_type: listing.listing_type ?? listing.source_type ?? "sell",
    stock: listing.source_type === "user_listing" ? 1 : listing.stock ?? null,
    images,
    verified: listing.verified ?? false,
    featured: listing.featured ?? listing.is_featured ?? false,
    store: listing.store ?? (listing.store_id
      ? {
          id: listing.store_id,
          name: listing.store_name ?? "Store",
          slug: null,
          seo_slug: null,
          location: listing.location ?? "Nepal",
          logo_url: null,
          is_verified: null,
          subscription_status: null,
        }
      : null),
  };
}

async function getManualUnifiedMarketplace(params: MarketplaceListingsParams) {
  const [storeProductsResult, userListingsResult] = await Promise.all([
    (supabase as any)
      .from("store_products")
      .select("*, store:stores(id, name, slug, seo_slug, location, logo_url, is_verified, subscription_status)")
      .eq("status", "active")
      .gt("stock_quantity", 0),
    supabase
      .from("sell_listings")
      .select("*, store:stores(id, name, slug, seo_slug, location, logo_url, is_verified, subscription_status)")
      .eq("status", "active"),
  ]);

  if (storeProductsResult.error && userListingsResult.error) {
    const fallback = filterFallbackListings(params);
    const from = params.offset ?? 0;
    return { listings: fallback.slice(from, from + (params.limit ?? fallback.length)), total: fallback.length };
  }

  const storeProducts = (storeProductsResult.data || []).map((item: any) => normalizeListing({
    id: item.id,
    source_type: "store_product",
    owner_user_id: item.created_by ?? null,
    user_id: item.created_by ?? null,
    store_id: item.store_id ?? null,
    store_name: item.store?.name ?? null,
    catalog_product_id: item.catalog_product_id ?? null,
    stock: item.stock_quantity ?? item.stock ?? 0,
    created_by: item.created_by ?? null,
    listing_type: "store_product",
    title: item.title ?? "Store product",
    brand: item.brand ?? null,
    model: item.model ?? null,
    category: ["new_phone", "used_phone", "phone"].includes(item.product_type) ? "mobile" : item.product_type ?? "mobile",
    condition: item.condition ?? "new",
    price: item.discount_price ?? item.price_sale ?? item.price ?? null,
    description: item.description ?? null,
    images: item.images ?? [],
    location: item.store?.location ?? null,
    status: item.status ?? "active",
    verified: item.store?.is_verified ?? false,
    featured: false,
    is_featured: false,
    created_at: item.created_at ?? new Date().toISOString(),
    updated_at: item.updated_at ?? item.created_at ?? new Date().toISOString(),
    store: item.store ?? null,
  } as MarketplaceListingRecord));

  const userListings = (userListingsResult.data || []).map((item: any) => normalizeListing({
    ...item,
    source_type: "user_listing",
    owner_user_id: item.owner_user_id ?? item.user_id ?? null,
    created_by: item.user_id ?? item.owner_user_id ?? null,
    stock: 1,
    store_name: item.store?.name ?? null,
    store: item.store ?? null,
  }));

  let listings = [...storeProducts, ...userListings];

  listings = applyUnifiedFilters(listings, params);

  const total = listings.length;
  const from = params.offset ?? 0;
  return { listings: listings.slice(from, from + (params.limit ?? listings.length)), total };
}

function applyUnifiedFilters(listings: MarketplaceListingRecord[], params: MarketplaceListingsParams) {
  const query = params.search?.toLowerCase().trim();
  let filtered = listings;

  if (params.store_id) filtered = filtered.filter((listing) => listing.store_id === params.store_id);
  if (params.category && params.category !== "all") filtered = filtered.filter((listing) => String(listing.category ?? "").toLowerCase().includes(params.category!.toLowerCase()));
  if (params.condition && params.condition !== "all") filtered = filtered.filter((listing) => listing.condition === params.condition);
  if (params.brands?.length) filtered = filtered.filter((listing) => !!listing.brand && params.brands!.includes(listing.brand));
  if (params.conditions?.length) filtered = filtered.filter((listing) => !!listing.condition && params.conditions!.includes(listing.condition));
  if (params.min_price !== undefined) filtered = filtered.filter((listing) => Number(listing.price ?? 0) >= params.min_price!);
  if (params.max_price !== undefined) filtered = filtered.filter((listing) => Number(listing.price ?? 0) <= params.max_price!);
  if (query) {
    filtered = filtered.filter((listing) =>
      [listing.title, listing.description, listing.brand, listing.model, listing.store_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }

  switch (params.sort_by) {
    case "price_asc":
      return filtered.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
    case "price_desc":
      return filtered.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
    case "oldest":
      return filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    default:
      return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}

function filterFallbackListings(params: MarketplaceListingsParams): MarketplaceListingRecord[] {
  const query = params.search?.toLowerCase().trim();
  let listings = getFallbackMarketplaceListings().map((listing) =>
    normalizeListing({
      ...(listing as MarketplaceListingRecord),
      owner_user_id: (listing as MarketplaceListingRecord).owner_user_id ?? listing.user_id ?? null,
      verified: false,
      featured: Boolean((listing as MarketplaceListingRecord).featured ?? (listing as MarketplaceListingRecord).is_featured),
    })
  );

  if (params.store_id) listings = listings.filter((listing) => listing.store_id === params.store_id);
  if (params.category && params.category !== "all") listings = listings.filter((listing) => String(listing.category ?? "").toLowerCase().includes(params.category!.toLowerCase()));
  if (params.condition && params.condition !== "all") listings = listings.filter((listing) => listing.condition === params.condition);
  if (params.brands?.length) listings = listings.filter((listing) => !!listing.brand && params.brands!.includes(listing.brand));
  if (params.conditions?.length) listings = listings.filter((listing) => !!listing.condition && params.conditions!.includes(listing.condition));
  if (params.min_price !== undefined) listings = listings.filter((listing) => Number(listing.price ?? 0) >= params.min_price!);
  if (params.max_price !== undefined) listings = listings.filter((listing) => Number(listing.price ?? 0) <= params.max_price!);
  if (query) {
    listings = listings.filter((listing) =>
      [listing.title, listing.description, listing.brand, listing.model]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }

  switch (params.sort_by) {
    case "price_asc":
      return listings.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
    case "price_desc":
      return listings.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
    case "oldest":
      return listings.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    default:
      return listings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}
