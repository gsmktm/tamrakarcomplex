// Price List Service - handles catalog_products operations

import { supabase } from "@/integrations/supabase/client";
import { PRODUCTS } from "@/utils/productData";

export interface PriceListProduct {
  id: string;
  name: string;
  slug: string;
  brand_id: string;
  model_id: string;
  variant_id?: string;
  image_url?: string;
  specs_json: Record<string, unknown>;
  price_npr?: number;
  price_text?: string;
  source_url?: string;
  source_site?: string;
  verified: boolean;
  verified_at?: string;
  is_active: boolean;
  is_price_list_item: boolean;
  created_at: string;
  updated_at: string;
}

type PublicPriceListFilters = {
  brand_id?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  sort_by?: 'price_asc' | 'price_desc' | 'name' | 'newest';
  limit?: number;
  offset?: number;
};

type PublicPriceListProduct = PriceListProduct & {
  brand?: { id: string; name: string; slug?: string; logo_url?: string | null };
  model?: { id?: string; name: string } | null;
  variant?: { id?: string; storage?: string; ram?: string; color?: string } | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parsePrice(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return undefined;
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getFallbackProducts(): PublicPriceListProduct[] {
  return PRODUCTS
    .filter((device) => Boolean(device.retail_npr))
    .map((device) => {
      const brandSlug = slugify(device.brand);
      const productSlug = slugify(`${device.brand}-${device.model}`);
      return {
        id: `arkostore-${device.id}`,
        name: `${device.brand} ${device.model}`,
        slug: productSlug,
        brand_id: brandSlug,
        model_id: productSlug,
        image_url: device.image,
        specs_json: {},
        price_npr: device.retail_npr,
        price_text: `Rs. ${Number(device.retail_npr).toLocaleString()}`,
        source_site: "Tamrakar Nepal price fallback",
        verified: true,
        is_active: true,
        is_price_list_item: true,
        created_at: new Date(0).toISOString(),
        updated_at: new Date(0).toISOString(),
        brand: { id: brandSlug, name: device.brand, slug: brandSlug, logo_url: null },
        model: { id: productSlug, name: device.model },
        variant: null,
      };
    });
}

function applyPublicFilters(products: PublicPriceListProduct[], filters?: PublicPriceListFilters) {
  let list = products;

  if (filters?.brand_id) {
    const brandQuery = filters.brand_id.toLowerCase();
    list = list.filter((product) =>
      product.brand_id?.toLowerCase() === brandQuery ||
      product.brand?.id?.toLowerCase() === brandQuery ||
      product.brand?.slug?.toLowerCase() === brandQuery ||
      product.brand?.name?.toLowerCase() === brandQuery
    );
  }

  if (filters?.min_price !== undefined) {
    list = list.filter((product) => (product.price_npr ?? 0) >= Number(filters.min_price));
  }

  if (filters?.max_price !== undefined) {
    list = list.filter((product) => (product.price_npr ?? 0) <= Number(filters.max_price));
  }

  if (filters?.search) {
    const query = filters.search.toLowerCase();
    list = list.filter((product) =>
      product.name.toLowerCase().includes(query) ||
      product.brand?.name?.toLowerCase().includes(query) ||
      product.model?.name?.toLowerCase().includes(query)
    );
  }

  const sorted = [...list];
  if (filters?.sort_by === "price_asc") {
    sorted.sort((a, b) => (a.price_npr ?? 0) - (b.price_npr ?? 0));
  } else if (filters?.sort_by === "price_desc") {
    sorted.sort((a, b) => (b.price_npr ?? 0) - (a.price_npr ?? 0));
  } else if (filters?.sort_by === "name") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    sorted.sort((a, b) => (b.price_npr ?? 0) - (a.price_npr ?? 0));
  }

  const total = sorted.length;
  const start = filters?.offset || 0;
  const end = filters?.limit ? start + filters.limit : undefined;
  return { items: sorted.slice(start, end), total };
}

function brandsFromProducts(products: PublicPriceListProduct[]) {
  const map = new Map<string, { id: string; name: string; slug: string; logo_url: string | null; active: boolean }>();
  products.forEach((product) => {
    const name = product.brand?.name || product.brand_id;
    if (!name) return;
    const slug = product.brand?.slug || slugify(name);
    map.set(slug, {
      id: product.brand?.id || slug,
      name,
      slug,
      logo_url: product.brand?.logo_url || null,
      active: true,
    });
  });
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

async function getLegacyProductsFallback(): Promise<PublicPriceListProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) return [];

  return data.map((product: Record<string, unknown>) => {
    const brand = String(product.brand || "Mobile");
    const brandSlug = slugify(brand);
    const name = String(product.name || "Mobile Phone");
    const price = parsePrice(product.price_value) ?? parsePrice(product.price);
    return {
      id: String(product.id),
      name,
      slug: String(product.slug || slugify(name)),
      brand_id: brandSlug,
      model_id: String(product.id),
      image_url: String(product.image || product.image_url || "/default-product.svg"),
      specs_json: (product.specs as Record<string, unknown>) || {},
      price_npr: price,
      price_text: typeof product.price === "string" ? product.price : price ? `Rs. ${price.toLocaleString()}` : undefined,
      source_url: typeof product.source_url === "string" ? product.source_url : undefined,
      source_site: typeof product.source_site === "string" ? product.source_site : "Products table",
      verified: true,
      is_active: product.in_stock !== false,
      is_price_list_item: true,
      created_at: String(product.created_at || new Date(0).toISOString()),
      updated_at: String(product.updated_at || new Date(0).toISOString()),
      brand: { id: brandSlug, name: brand, slug: brandSlug, logo_url: null },
      model: { id: String(product.id), name },
      variant: null,
    };
  });
}

export const priceListService = {
  // Get all products with filters
  async getProducts(filters?: {
    brand_id?: string;
    verified?: boolean;
    is_active?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from("catalog_products")
      .select(`
        *,
        brand:brands(id, name, logo_url),
        model:device_models(id, name),
        variant:device_variants(id, storage, ram, color)
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    if (filters?.brand_id) {
      query = query.eq("brand_id", filters.brand_id);
    }
    if (filters?.verified !== undefined) {
      query = query.eq("verified", filters.verified);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq("is_active", filters.is_active);
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
    if (error) throw error;
    return { items: data || [], total: count || 0 };
  },

  // Update product
  async updateProduct(id: string, updates: Partial<PriceListProduct>) {
    const { data, error } = await supabase
      .from("catalog_products")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Bulk update
  async bulkUpdate(ids: string[], updates: Partial<PriceListProduct>) {
    const { data, error } = await supabase
      .from("catalog_products")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .in("id", ids);

    if (error) throw error;
    return data;
  },

  // Import from CSV
  async importCSV(csvData: Array<Record<string, unknown>>) {
    const { data, error } = await supabase
      .from("catalog_products")
      .insert(csvData)
      .select();

    if (error) throw error;
    return data;
  },

  // Detect duplicates
  async findDuplicates() {
    const { data, error } = await supabase
      .rpc("find_duplicate_catalog_products");

    if (error) throw error;
    return data;
  },

  // Merge duplicates
  async mergeDuplicates(primaryId: string, duplicateIds: string[]) {
    // This would need a custom RPC function
    const { data, error } = await supabase
      .rpc("merge_catalog_products", {
        primary_id: primaryId,
        duplicate_ids: duplicateIds
      });

    if (error) throw error;
    return data;
  },

  // Get brands for filter
  async getBrands() {
    const { data, error } = await supabase
      .from("brands")
      .select("id, name, slug, logo_url")
      .eq("active", true)
      .order("name");

    if (!error && data && data.length > 0) return data;

    const legacyProducts = await getLegacyProductsFallback();
    return brandsFromProducts(legacyProducts.length > 0 ? legacyProducts : getFallbackProducts());
  },

  // Get public price list (active, verified items)
  async getPublicPriceList(filters?: PublicPriceListFilters) {
    let query = supabase
      .from("catalog_products")
      .select(`
        *,
        brand:brands(id, name, logo_url),
        model:device_models(id, name),
        variant:device_variants(id, storage, ram, color)
      `, { count: "exact" })
      .eq("is_active", true)
      .eq("verified", true)
      .eq("is_price_list_item", true);

    if (filters?.brand_id) {
      query = query.eq("brand_id", filters.brand_id);
    }
    if (filters?.min_price !== undefined) {
      query = query.gte("price_npr", filters.min_price);
    }
    if (filters?.max_price !== undefined) {
      query = query.lte("price_npr", filters.max_price);
    }
    if (filters?.search) {
      query = query.ilike("name", `%${filters.search}%`);
    }

    // Sort by numeric price
    let orderBy = "created_at";
    let ascending = false;
    if (filters?.sort_by === 'price_asc') {
      orderBy = "price_npr";
      ascending = true;
    } else if (filters?.sort_by === 'price_desc') {
      orderBy = "price_npr";
      ascending = false;
    } else if (filters?.sort_by === 'name') {
      orderBy = "name";
      ascending = true;
    }

    query = query.order(orderBy, { ascending });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error, count } = await query;
    if (error) {
      const legacyProducts = await getLegacyProductsFallback();
      const fallback = applyPublicFilters(legacyProducts.length > 0 ? legacyProducts : getFallbackProducts(), filters);
      return { data: fallback.items, items: fallback.items, total: fallback.total };
    }
    const items = data || [];
    if (items.length === 0) {
      const legacyProducts = await getLegacyProductsFallback();
      const fallback = applyPublicFilters(legacyProducts.length > 0 ? legacyProducts : getFallbackProducts(), filters);
      return { data: fallback.items, items: fallback.items, total: fallback.total };
    }
    return { data: items, items, total: count || items.length };
  },

  // Sync from old products table (one-time migration)
  async syncFromOldProducts() {
    // This would be a one-time operation to migrate old data
    const { data: oldProducts, error: fetchError } = await supabase
      .from("products")
      .select("*");

    if (fetchError) throw fetchError;

    // Transform and insert into catalog_products
    const catalogData = oldProducts?.map(product => ({
      name: product.name,
      slug: product.slug,
      image_url: product.image,
      specs_json: product.specs || {},
      price_npr: parseFloat(product.price.replace(/[^\d.]/g, "")) || null,
      price_text: product.price,
      source_url: product.source_url,
      source_site: product.source_site,
      verified: false,
      is_active: true,
      is_price_list_item: true,
      // Would need to map brand/model IDs
    })) || [];

    const { data, error } = await supabase
      .from("catalog_products")
      .insert(catalogData)
      .select();

    if (error) throw error;
    return data;
  }
};
