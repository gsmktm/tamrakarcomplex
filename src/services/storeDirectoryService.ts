// Store Directory Service - handles stores with package entitlements

import { supabase } from "@/integrations/supabase/client";
import { STORES } from "@/data/storeData";
import { BASIC_TAMRAKAR_STORES } from "@/data/basicStoreData";
import { getStoreSortOrder, validateStoreAgainstPackage } from "@/lib/storePackages";
import { resolveStorePackageContext, type StorePackageRecord } from "@/lib/storePackageRuntime";
import { slugify } from "@/lib/utils";

export interface StoreDirectoryItem {
  id: string;
  name: string;
  slug?: string;
  seo_slug?: string;
  seo_title?: string;
  seo_description?: string;
  meta_keywords?: string;
  canonical_url?: string;
  public_status?: string;
  shop_no?: string;
  shop_number?: string;
  complex_zone?: string;
  floor?: string;
  block?: string;
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
  banner_url?: string;
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

export type StoreDirectoryFilters = {
  package_slug?: string;
  complex_zone?: string;
  service?: string;
  floor?: string;
  block?: string;
  is_verified?: boolean;
  is_featured?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
};

function normalizeServices(store: Partial<StoreDirectoryItem> & { services?: unknown; services_json?: unknown }) {
  if (Array.isArray(store.services)) return store.services.map(String);
  if (Array.isArray(store.services_json)) return store.services_json.map(String);
  return [];
}

async function withStoreQueryTimeout<T>(promise: PromiseLike<T>, timeoutMs = 3000): Promise<T | { data: null; error: Error; count?: null }> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<{ data: null; error: Error; count: null }>((resolve) => {
      globalThis.setTimeout(() => resolve({ data: null, error: new Error("store_directory_timeout"), count: null }), timeoutMs);
    }),
  ]);
}

export function normalizeStore(store: Partial<StoreDirectoryItem> & { package?: StorePackageRecord | null; store_packages?: StorePackageRecord | null }): StoreDirectoryItem & { sort_order: number } {
  const legacyStore = store as Partial<StoreDirectoryItem> & {
    plan_slug?: string;
    subscription_tier?: string;
    subscription_status?: string;
  };
  
  // Prefer package.slug from join (source of truth), fall back to package_slug column, then subscription_tier
  const packageContext = resolveStorePackageContext({
    ...store,
    package_slug: store.package_slug || legacyStore.plan_slug || legacyStore.subscription_tier,
  });
  const packageSlug = packageContext.effectivePackageSlug;
  const hasActivePackage = packageSlug !== "free";
  const normalizedName = String(store.name ?? "store").trim();
  const fallbackSlug = slugify(normalizedName) || String(store.id ?? "");

  return {
    id: String(store.id),
    name: normalizedName,
    slug: store.seo_slug || store.slug || fallbackSlug,
    seo_slug: store.seo_slug || store.slug || fallbackSlug,
    seo_title: store.seo_title,
    seo_description: store.seo_description,
    meta_keywords: store.meta_keywords,
    canonical_url: store.canonical_url,
    public_status: store.public_status || "draft",
    shop_no: store.shop_number || store.shop_no || undefined,
    shop_number: store.shop_number || store.shop_no || undefined,
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
    cover_image_url: store.banner_url || store.cover_image_url,
    banner_url: store.banner_url || store.cover_image_url,
    is_verified: Boolean(store.is_verified) && packageContext.entitlements.canHaveVerifiedBadge,
    is_featured: Boolean(store.is_featured) && packageContext.entitlements.canBeFeatured,
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
    theme_slug: packageContext.entitlements.availableThemes.includes(store.theme_slug || "basic") ? store.theme_slug || "basic" : "basic",
    status: store.status || "active",
    entitlements: packageContext.entitlements,
    sort_order: getStoreSortOrder(packageSlug),
  };
}

export const SEEDED_FALLBACK_STORES: Partial<StoreDirectoryItem>[] = [
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

  const localStores = [...STORES, ...SEEDED_FALLBACK_STORES, ...BASIC_TAMRAKAR_STORES];
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

function applyLegacyStoreFilters(stores: Array<StoreDirectoryItem & { sort_order?: number }>, filters?: StoreDirectoryFilters) {
  let list = stores;
  if (filters?.package_slug) list = list.filter((store) => store.package_slug === filters.package_slug);
  if (filters?.complex_zone) list = list.filter((store) => store.complex_zone === filters.complex_zone);
  if (filters?.floor) list = list.filter((store) => store.floor === filters.floor);
  if (filters?.block) list = list.filter((store) => store.block === filters.block);
  if (filters?.service) {
    const requested = filters.service.toLowerCase();
    list = list.filter((store) => store.services?.some((service) => service.toLowerCase().includes(requested)));
  }
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

function findLocalStoreFallback(identifier: { type: 'id' | 'slug' | 'shop_no'; value: string; complex_zone?: string }) {
  const value = identifier.value.toLowerCase();
  const compactValue = value.replace(/[^a-z0-9]/g, "");
  return [...STORES, ...SEEDED_FALLBACK_STORES, ...BASIC_TAMRAKAR_STORES].find((store) => {
    const normalized = normalizeStore(store);
    if (identifier.complex_zone && normalized.complex_zone !== identifier.complex_zone) return false;
    if (identifier.type === "shop_no") return String(normalized.shop_no || "").toLowerCase() === value;
    return (
      normalized.id.toLowerCase() === value ||
      String(normalized.slug || "").toLowerCase() === value ||
      String(normalized.seo_slug || "").toLowerCase() === value ||
      slugify(normalized.name) === value ||
      normalized.name.toLowerCase().replace(/[^a-z0-9]/g, "") === compactValue
    );
  });
}

export const storeDirectoryService = {
  // Get all stores for directory with entitlements
  async getStoresForDirectory(filters?: StoreDirectoryFilters) {
    let query = supabase
      .from("stores")
      .select(`
        *,
        package:store_packages(slug, product_limit, accessory_limit, staff_limit)
      `)
      .eq("status", "active")
      .eq("public_status", "published")
      .order("is_featured", { ascending: false })
      .order("is_verified", { ascending: false });

    if (filters?.package_slug) {
      query = query.eq("package_slug", filters.package_slug);
    }
    if (filters?.complex_zone) {
      query = query.eq("complex_zone", filters.complex_zone);
    }
    if (filters?.floor) {
      query = query.eq("floor", filters.floor);
    }
    if (filters?.block) {
      query = query.eq("block", filters.block);
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

    const { data, error, count } = await withStoreQueryTimeout(query);
    if (error) {
      let legacyQuery = supabase
        .from("stores")
        .select("*")
        .order("is_verified", { ascending: false })
        .order("name", { ascending: true });

      if (filters?.search) {
        legacyQuery = legacyQuery.ilike("name", `%${filters.search}%`);
      }

      const legacy = await withStoreQueryTimeout(legacyQuery);
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

  async getStoresList(filters?: StoreDirectoryFilters) {
    return this.getStoresForDirectory(filters);
  },

  async getPublicStoreBySlug(slug: string) {
    const { data, error } = await supabase
      .from("stores")
      .select(`
        *,
        store_packages(*),
        store_accessories(*),
        store_repair_services(*),
        store_reviews(*)
      `)
      .or(`seo_slug.eq.${slug},slug.eq.${slug}`)
      .eq("status", "active")
      .eq("public_status", "published")
      .single();

    if (error && !String(error.message || "").includes("Could not find a relationship")) throw error;
    if (data) return normalizeStore({ ...data, package: (data as any).store_packages });

    const local = findLocalStoreFallback({ type: "slug", value: slug });
    if (local) return normalizeStore(local);

    return this.getStoreByIdentifier({ type: "slug", value: slug });
  },

  // Get store by various identifiers
  async getStoreByIdentifier(identifier: { type: 'id' | 'slug' | 'shop_no'; value: string; complex_zone?: string }) {
    // Build one flat filter string — reassigning the builder from .eq() breaks
    // the chain in current supabase-js (filters like .or() no longer resolve
    // on the narrowed type), so compose filters as text instead.
    // NOTE: complex_zone is only a local-seed concept — the stores table has
    // no such column, so it must never be applied to DB queries.
    const filters: string[] = [];
    if (identifier.type === 'shop_no') {
      filters.push(`shop_no.eq.${identifier.value}`);
    } else if (identifier.type === 'slug') {
      filters.push(`or=(seo_slug.eq.${identifier.value},slug.eq.${identifier.value})`);
    } else {
      filters.push(`id.eq.${identifier.value}`);
    }

    // Apply filters in order: the or-group first, remaining eq() filters after.
    // Note: .or() adds its own parens around the expression.
    const orFilter = filters.find((f) => f.startsWith('or=('));
    const eqFilters = filters.filter((f) => !f.startsWith('or=('));

    let builder = supabase
      .from("stores")
      .select(`*, package:store_packages(*)`);
    if (orFilter) {
      // orFilter = "or=(expr)" — skip the 4-char "or=(" prefix and drop the
      // trailing ")" so .or() receives the bare expression (it re-wraps it).
      builder = builder.or(orFilter.slice(4, -1));
    }
    for (const f of eqFilters) {
      const [col, val] = f.split('.eq.');
      builder = builder.eq(col, val);
    }
    const { data, error } = await builder.maybeSingle();

    if (error) {
      const local = findLocalStoreFallback(identifier);
      if (local) return normalizeStore(local);
      throw error;
    }

    if (!data) {
      const local = findLocalStoreFallback(identifier);
      return local ? normalizeStore(local) : null;
    }

    return normalizeStore(data);
  },

  // Get store products (if allowed by package)
  async getStoreProducts(storeId: string) {
    const store = await this.getStoreByIdentifier({ type: 'id', value: storeId });

    if (!store?.entitlements.canListProducts) {
      return [];
    }

    const { data, error } = await supabase
      .from("store_products")
      .select("*")
      .eq("store_id", storeId)
      .eq("status", "active")
      .gt("stock_quantity", 0)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get store listings (if marketplace enabled)
  async getStoreListings(storeId: string) {
    const store = await this.getStoreByIdentifier({ type: 'id', value: storeId });

    if (!store?.entitlements.canEnableMarketplace) {
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
  },

  async getStoreAdminProfile(userId: string) {
    const { data: memberships, error: membershipError } = await supabase
      .from("store_admins")
      .select("store_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1);
    if (membershipError) throw membershipError;

    let query = supabase.from("stores").select("*, package:store_packages(*)");
    query = memberships?.[0]?.store_id
      ? query.eq("id", memberships[0].store_id)
      : query.or(`owner_user_id.eq.${userId},owner_id.eq.${userId}`);
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw error;
    return data;
  },

  async updateStoreProfile(storeId: string, payload: Record<string, unknown>) {
    return this.updateStore(storeId, payload as Partial<StoreDirectoryItem>);
  },

  async createStoreProduct(storeId: string, payload: Record<string, unknown>) {
    const slug = String(payload.slug || slugify(String(payload.title || "product")));
    const { data, error } = await supabase
      .from("store_products")
      .insert({ ...payload, store_id: storeId, slug })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createStoreAccessory(storeId: string, payload: Record<string, unknown>) {
    const slug = String(payload.slug || slugify(String(payload.title || "accessory")));
    const { data, error } = await supabase
      .from("store_accessories")
      .insert({ ...payload, store_id: storeId, slug })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createRepairService(storeId: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase.from("store_repair_services").insert({ ...payload, store_id: storeId }).select().single();
    if (error) throw error;
    return data;
  },

  async createExchangeRequest(storeId: string, payload: Record<string, unknown>) {
    // Use consolidated exchange_requests table with store_id
    const { error, status } = await supabase.from("exchange_requests").insert({ ...payload, store_id: storeId });
    if (error) throw error;
    return { submitted: status >= 200 && status < 300 };
  },

  async createRepairRequest(storeId: string, payload: Record<string, unknown>) {
    const { error, status } = await supabase.from("store_repair_requests").insert({ ...payload, store_id: storeId });
    if (error) throw error;
    return { submitted: status >= 200 && status < 300 };
  },

  async createStoreLead(storeId: string, payload: Record<string, unknown>) {
    const { error, status } = await supabase.from("store_leads").insert({ ...payload, store_id: storeId });
    if (error) throw error;
    return { submitted: status >= 200 && status < 300 };
  },

  async assignStorePackage(storeId: string, packageId: string) {
    const { data, error } = await supabase.from("stores").update({ package_id: packageId }).eq("id", storeId).select().single();
    if (error) throw error;
    return data;
  },

  async enforcePackageLimit(storeId: string, featureName: string) {
    const { data, error } = await supabase.rpc("enforcePackageLimit", { store_id: storeId, featurename: featureName });
    if (error) throw error;
    return Boolean(data);
  }
};
