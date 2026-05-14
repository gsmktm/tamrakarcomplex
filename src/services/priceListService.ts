// Price List Service - handles catalog_products operations

import { supabase } from "@/integrations/supabase/client";

export interface PriceListProduct {
  id: string;
  name: string;
  slug: string;
  brand_id: string;
  model_id: string;
  variant_id?: string;
  image_url?: string;
  specs_json: Record<string, unknown>;
  official_price?: number;
  market_price?: number;
  price_npr?: number;
  price_text?: string;
  source_url?: string;
  source_site?: string;
  updated_by?: string;
  approved_by?: string;
  verified: boolean;
  verified_at?: string;
  price_source?: string;
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

    if (error) throw error;
    return data || [];
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
      query = query.gte("official_price", filters.min_price);
    }
    if (filters?.max_price !== undefined) {
      query = query.lte("official_price", filters.max_price);
    }
    if (filters?.search) {
      query = query.ilike("name", `%${filters.search}%`);
    }

    // Sort by numeric price
    let orderBy = "created_at";
    let ascending = false;
    if (filters?.sort_by === 'price_asc') {
      orderBy = "official_price";
      ascending = true;
    } else if (filters?.sort_by === 'price_desc') {
      orderBy = "official_price";
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
    if (error) throw error;
    const items = data || [];
    return { data: items, items, total: count || items.length };
  },

  // Disabled by design: official price list must come from catalog_products only.
  async syncFromOldProducts() {
    throw new Error("Legacy products sync is disabled. Manage official prices in catalog_products.");
  }
};
