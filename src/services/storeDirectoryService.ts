// Store Directory Service - handles stores with package entitlements

import { supabase } from "@/integrations/supabase/client";
import { STORES } from "@/data/storeData";
import { getStoreEntitlements, getStoreSortOrder, validateStoreAgainstPackage } from "@/lib/storePackages";
import { resolveEffectiveStorePackage } from "@/lib/storeEntitlements";
import { slugify } from "@/lib/utils";

export interface StoreDirectoryItem {
  id: string;
  name: string;
  slug?: string;
  shop_no?: string;
  complex_zone?: string;
  floor?: string;
  location: string;
  address?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  map_url?: string;
  logo_url?: string;
  cover_image_url?: string;
  is_verified: boolean;
  is_featured: boolean;
  package_slug: string;
  subscription_status: string;
  subscription_tier?: "diamond" | "gold" | "silver" | "free" | null;
  subscription_tier_name?: string;
  has_active_subscription?: boolean;
  subscription_end_date?: string | null;
  services?: string[];
  services_json: unknown[];
  opening_hours: unknown;
  social_links_json: unknown;
  theme_slug: string;
  status: string;
  entitlements: Record<string, unknown>; // From getStoreEntitlements
}

function normalizeServices(store: Partial<StoreDirectoryItem> & { services?: unknown; services_json?: unknown }) {
  if (Array.isArray(store.services)) return store.services.map(String);
  if (Array.isArray(store.services_json)) return store.services_json.map(String);
  return [];
}

function normalizeStore(store: Partial<StoreDirectoryItem>): StoreDirectoryItem & { sort_order: number } {
  const legacyStore = store as Partial<StoreDirectoryItem> & {
    plan_slug?: string;
    subscription_tier?: string;
    subscription_status?: string;
  };
  const rawPackageSlug = store.package_slug || legacyStore.plan_slug || legacyStore.subscription_tier;
  const packageSlug = resolveEffectiveStorePackage({
    package_slug: rawPackageSlug,
    subscription_status: store.subscription_status,
    subscription_end_date: store.subscription_end_date,
  });
  const hasActivePackage = packageSlug !== "free";
  const normalizedName = String(store.name ?? "store").trim();
  const fallbackSlug = slugify(normalizedName) || String(store.id ?? "");

  return {
    id: String(store.id),
    name: normalizedName,
    slug: store.slug || fallbackSlug,
    shop_no: store.shop_no || undefined,
    complex_zone: store.complex_zone || "inside",
    floor: store.floor || undefined,
    location: store.location || "New Road, Kathmandu",
    address: store.address,
    description: store.description,
    phone: store.phone,
    whatsapp: store.whatsapp,
    email: store.email,
    website: store.website,
    map_url: store.map_url,
    logo_url: store.logo_url,
    cover_image_url: store.cover_image_url,
    is_verified: Boolean(store.is_verified),
    is_featured: Boolean(store.is_featured),
    package_slug: packageSlug,
    subscription_status: store.subscription_status || "inactive",
    subscription_tier: packageSlug,
    subscription_tier_name: packageSlug === "free" ? "Basic" : packageSlug.charAt(0).toUpperCase() + packageSlug.slice(1),
    has_active_subscription: hasActivePackage,
    subscription_end_date: store.subscription_end_date || null,
    services: normalizeServices(store),
    services_json: Array.isArray(store.services_json) ? store.services_json : normalizeServices(store),
    opening_hours: store.opening_hours || {},
    social_links_json: store.social_links_json || {},
    theme_slug: store.theme_slug || "basic",
    status: store.status || "active",
    entitlements: getStoreEntitlements(packageSlug),
    sort_order: getStoreSortOrder(packageSlug),
  };
}

const SEEDED_FALLBACK_STORES: Partial<StoreDirectoryItem>[] = [
  { name: "Suryabinayak Mobile And IT Solutions", phone: "9861909398", address: "Suryabinayak, Bhaktapur", location: "Bhaktapur", complex_zone: "outside" },
  { name: "Mobile World Capital Naxal", phone: "9851151198", address: "Naxal-01, Kathmandu", location: "Kathmandu", complex_zone: "outside" },
  { name: "Mobile World Capital Dillibazar", phone: "9841219587", address: "Dillibazar-29, Kathmandu", location: "Kathmandu", complex_zone: "outside" },
  { name: "Mobile World Capital Boudha", address: "Boudha-09, Kathmandu", location: "Kathmandu", complex_zone: "outside" },
  { name: "OGN Traders", address: "People's Plaza Khichapokhari, Kathmandu", location: "Kathmandu", complex_zone: "outside" },
  { name: "ANEK Gadgets HUB", address: "Gongabu, Kathmandu", location: "Kathmandu", complex_zone: "outside" },
  { name: "S.K Mobile Hub", address: "Tamrakar Complex Shop No 47, Kathmandu", location: "Tamrakar Complex", complex_zone: "inside", shop_no: "47" },
  { name: "Digital Accessories Nepal - DAN", address: "Bhagwan Bahal, Kathmandu", location: "Kathmandu", complex_zone: "outside" },
  { name: "Chhetrapati Mobile Center", address: "Thamel Chhetrapati, Kathmandu", location: "Kathmandu", complex_zone: "outside" },
  { name: "D. S. Mobile Phone Service", address: "Bishal Bazar, Kathmandu", location: "Kathmandu", complex_zone: "outside" },
  { name: "Oliz Store", address: "Kathmandu, Nepal", location: "Kathmandu", complex_zone: "outside" },
  { name: "Apple World Mobile Pvt.Ltd", address: "Mercantile Plaza Durbarmarga, Kathmandu", location: "Kathmandu", complex_zone: "outside" },
  { name: "Ai Store Ktm Display Service", address: "Shop No G6, Parking Mathi, New Road, Kathmandu", location: "Kathmandu", complex_zone: "outside", shop_no: "G6" },
  { name: "Ctv Care 33", address: "New Road Tamrakar Complex, Kathmandu", location: "Tamrakar Complex", complex_zone: "inside", shop_no: "33" },
  { name: "Gadget Plus Stores Pokhara", phone: "9806770677", address: "Hallan Chowk, Lakeside, Pokhara", location: "Pokhara", complex_zone: "outside" },
  { name: "World Vision Mobile Hub", address: "Open House Complex, Chiple Dhunga Rd, Pokhara", location: "Pokhara", complex_zone: "outside" },
  { name: "Fone Decor", address: "Pokhara Trade Mall, Pokhara", location: "Pokhara", complex_zone: "outside" },
  { name: "NGT Mobiles Narayangarh", phone: "9860129290", address: "Indradev Marg, Narayangarh, Chitwan", location: "Narayangarh", complex_zone: "outside" },
  { name: "Safal Gadgets and Mobile", phone: "9816621340", address: "Jarebar, Lakeside, Pokhara", location: "Pokhara", complex_zone: "outside" },
  { name: "Best Buy Pokhara", phone: "9816100465", address: "Kharae, Lakeside, Pokhara", location: "Pokhara", complex_zone: "outside" },
  { name: "Rajmarg Chaurah Butwal Mobiles", phone: "71540842", address: "Rajmarg Chaurah, Butwal", location: "Butwal", complex_zone: "outside" },
  { name: "Nepalgunj Mobile World", phone: "9819532440", address: "Nepalgunj, Banke", location: "Nepalgunj", complex_zone: "outside" },
].map((store, index) => ({
  id: slugify(String(store.name)) || `seeded-store-${index}`,
  slug: slugify(String(store.name)) || `seeded-store-${index}`,
  description: "Verified Nepal mobile store and gadget service point.",
  is_verified: true,
  is_featured: index < 8,
  package_slug: index % 4 === 0 ? "diamond" : "gold",
  subscription_status: "active",
  services: ["Mobile Sales", "Accessories", "Exchange", "Repair"],
  services_json: ["Mobile Sales", "Accessories", "Exchange", "Repair"],
  status: "active",
  ...store,
}));

function mergeRepairPartnerStores(stores: StoreDirectoryItem[]) {
  const seen = new Set(stores.flatMap((store) => [
    store.id,
    store.slug,
    store.name.toLowerCase(),
    store.phone,
  ].filter(Boolean)));

  const localStores = [...STORES, ...SEEDED_FALLBACK_STORES];
  const additions = localStores
    .filter((store) => !seen.has(store.id) && !seen.has(store.slug) && !seen.has(store.name.toLowerCase()) && !seen.has(store.phone))
    .map((store) => normalizeStore(store));

  return [...stores, ...additions];
}

function sortStoresByPackage(stores: Array<StoreDirectoryItem & { sort_order?: number }>) {
  stores.sort((a, b) => {
    const aOrder = a.sort_order ?? getStoreSortOrder(a.package_slug);
    const bOrder = b.sort_order ?? getStoreSortOrder(b.package_slug);
    if (aOrder !== bOrder) return bOrder - aOrder;
    if (Number(a.is_featured) !== Number(b.is_featured)) return Number(b.is_featured) - Number(a.is_featured);
    if (Number(a.is_verified) !== Number(b.is_verified)) return Number(b.is_verified) - Number(a.is_verified);
    return a.name.localeCompare(b.name);
  });
  return stores;
}

function applyLegacyStoreFilters(stores: Array<StoreDirectoryItem & { sort_order?: number }>, filters?: {
  package_slug?: string;
  complex_zone?: string;
  is_verified?: boolean;
  is_featured?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  let list = stores;
  if (filters?.package_slug) list = list.filter((store) => store.package_slug === filters.package_slug);
  if (filters?.complex_zone) list = list.filter((store) => store.complex_zone === filters.complex_zone);
  if (filters?.is_verified !== undefined) list = list.filter((store) => store.is_verified === filters.is_verified);
  if (filters?.is_featured !== undefined) list = list.filter((store) => store.is_featured === filters.is_featured);
  if (filters?.search) {
    const query = filters.search.toLowerCase();
    list = list.filter((store) =>
      store.name.toLowerCase().includes(query) ||
      store.location.toLowerCase().includes(query) ||
      store.address?.toLowerCase().includes(query) ||
      store.shop_no?.toLowerCase().includes(query) ||
      store.services?.some((service) => service.toLowerCase().includes(query)) ||
      store.description?.toLowerCase().includes(query)
    );
  }
  if (filters?.offset || filters?.limit) {
    const start = filters.offset || 0;
    const end = start + (filters.limit || 50);
    list = list.slice(start, end);
  }
  return list;
}

export const storeDirectoryService = {
  // Get all stores for directory with entitlements
  async getStoresForDirectory(filters?: {
    package_slug?: string;
    complex_zone?: string;
    is_verified?: boolean;
    is_featured?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from("stores")
      .select("*")
      .eq("status", "active")
      .order("is_featured", { ascending: false })
      .order("is_verified", { ascending: false });

    if (filters?.package_slug) {
      query = query.eq("package_slug", filters.package_slug);
    }
    if (filters?.complex_zone) {
      query = query.eq("complex_zone", filters.complex_zone);
    }
    if (filters?.is_verified !== undefined) {
      query = query.eq("is_verified", filters.is_verified);
    }
    if (filters?.is_featured !== undefined) {
      query = query.eq("is_featured", filters.is_featured);
    }
    if (filters?.search) {
      query = query.ilike("name", `%${filters.search}%`);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error, count } = await query;
    if (error) {
      let legacyQuery = supabase
        .from("stores")
        .select("*")
        .order("is_verified", { ascending: false })
        .order("name", { ascending: true });

      if (filters?.search) {
        legacyQuery = legacyQuery.ilike("name", `%${filters.search}%`);
      }

      const legacy = await legacyQuery;
      if (!legacy.error && legacy.data && legacy.data.length > 0) {
        const normalizedLegacyStores = mergeRepairPartnerStores((legacy.data || []).map((store) => normalizeStore(store)));
        const filteredLegacyStores = applyLegacyStoreFilters(sortStoresByPackage(normalizedLegacyStores), filters);
        return { data: filteredLegacyStores, count: normalizedLegacyStores.length };
      }

      const fallbackStores = applyLegacyStoreFilters(sortStoresByPackage(mergeRepairPartnerStores([])), filters);
      return { data: fallbackStores, count: fallbackStores.length };
    }

    // Add entitlements and sort by package priority
    const storesWithEntitlements = mergeRepairPartnerStores((data || []).map((store) => normalizeStore(store)));

    // Sort by sort_order descending (diamond first), then by name
    sortStoresByPackage(storesWithEntitlements);

    return { data: storesWithEntitlements, count };
  },

  // Get store by various identifiers
  async getStoreByIdentifier(identifier: { type: 'id' | 'slug' | 'shop_no'; value: string; complex_zone?: string }) {
    let query = supabase.from("stores");

    if (identifier.type === 'shop_no') {
      query = query.eq("shop_no", identifier.value);
      if (identifier.complex_zone) {
        query = query.eq("complex_zone", identifier.complex_zone);
      }
    } else if (identifier.type === 'slug') {
      query = query.eq("slug", identifier.value);
      if (identifier.complex_zone) {
        query = query.eq("complex_zone", identifier.complex_zone);
      }
    } else {
      query = query.eq("id", identifier.value);
    }

    const { data, error } = await query
      .select(`
        *,
        store_subscriptions(
          id,
          status,
          start_date,
          end_date,
          packages(*)
        )
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      entitlements: getStoreEntitlements(resolveEffectiveStorePackage(data))
    };
  },

  // Get store products (if allowed by package)
  async getStoreProducts(storeId: string) {
    const store = await this.getStoreByIdentifier({ type: 'id', value: storeId });

    if (!store.entitlements.productListing) {
      return [];
    }

    const { data, error } = await supabase
      .from("store_inventory")
      .select(`
        *,
        catalog_product: catalog_products(*)
      `)
      .eq("store_id", storeId)
      .eq("status", "active")
      .gt("stock_qty", 0);

    if (error) throw error;
    return data || [];
  },

  // Get store listings (if marketplace enabled)
  async getStoreListings(storeId: string) {
    const store = await this.getStoreByIdentifier({ type: 'id', value: storeId });

    if (!store.entitlements.marketplaceEnabled) {
      return [];
    }

    const { data, error } = await supabase
      .from("sell_listings")
      .select("*")
      .eq("store_id", storeId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Update store (with package validation)
  async updateStore(storeId: string, updates: Partial<StoreDirectoryItem>) {
    const currentStore = await this.getStoreByIdentifier({ type: 'id', value: storeId });
    const newPackageSlug = updates.package_slug || currentStore.package_slug;

    // Validate against new package
    const { valid, violations } = validateStoreAgainstPackage(updates, newPackageSlug);
    if (!valid) {
      throw new Error(`Package validation failed: ${violations.join(', ')}`);
    }

    const { data, error } = await supabase
      .from("stores")
      .update(updates)
      .eq("id", storeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
