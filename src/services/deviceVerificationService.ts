// Device Verification Service - handles catalog_products verification operations

import { supabase } from "@/integrations/supabase/client";

export interface VerificationProduct {
  id: string;
  name: string;
  slug: string;
  brand: { name: string; logo_url?: string };
  model: { name: string };
  variant: { storage?: string; ram?: string; color?: string };
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
}

export const deviceVerificationService = {
  // Get products for verification with filters
  async getProductsForVerification(filters?: {
    verified?: boolean;
    is_active?: boolean;
    has_image?: boolean;
    has_specs?: boolean;
    has_price?: boolean;
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
      `)
      .order("created_at", { ascending: false });

    if (filters?.verified !== undefined) {
      query = query.eq("verified", filters.verified);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq("is_active", filters.is_active);
    }
    if (filters?.has_image !== undefined) {
      if (filters.has_image) {
        query = query.not("image_url", "is", null);
      } else {
        query = query.is("image_url", null);
      }
    }
    if (filters?.has_specs !== undefined) {
      if (filters.has_specs) {
        query = query.not("specs_json", "is", null);
      } else {
        query = query.is("specs_json", null);
      }
    }
    if (filters?.has_price !== undefined) {
      if (filters.has_price) {
        query = query.not("price_npr", "is", null);
      } else {
        query = query.is("price_npr", null);
      }
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
    return { data, count };
  },

  // Update product verification status
  async updateVerification(id: string, verified: boolean) {
    const { data, error } = await supabase
      .from("catalog_products")
      .update({
        verified,
        verified_at: verified ? new Date().toISOString() : null
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mark product as needs review
  async markNeedsReview(id: string) {
    const { data, error } = await supabase
      .from("catalog_products")
      .update({
        verified: false,
        verified_at: null
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Edit product specs
  async updateSpecs(id: string, specs_json: Record<string, unknown>) {
    const { data, error } = await supabase
      .from("catalog_products")
      .update({ specs_json })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Edit product price
  async updatePrice(id: string, price_npr: number) {
    const price_text = `Rs. ${price_npr.toLocaleString('en-IN')}`;
    const { data, error } = await supabase
      .from("catalog_products")
      .update({ price_npr, price_text })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Replace product image
  async updateImage(id: string, image_url: string) {
    const { data, error } = await supabase
      .from("catalog_products")
      .update({ image_url })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Find potential duplicates
  async findDuplicates() {
    const { data, error } = await supabase
      .rpc("find_duplicate_catalog_products");

    if (error) throw error;
    return data;
  },

  // Merge duplicate products
  async mergeDuplicates(primaryId: string, duplicateIds: string[]) {
    const { data, error } = await supabase
      .rpc("merge_catalog_products", {
        primary_id: primaryId,
        duplicate_ids: duplicateIds
      });

    if (error) throw error;
    return data;
  },

  // Get verification stats
  async getVerificationStats() {
    const { data, error } = await supabase
      .rpc("get_catalog_verification_stats");

    if (error) throw error;
    return data;
  },

  // Bulk update verification
  async bulkUpdateVerification(ids: string[], verified: boolean) {
    const { data, error } = await supabase
      .from("catalog_products")
      .update({
        verified,
        verified_at: verified ? new Date().toISOString() : null
      })
      .in("id", ids);

    if (error) throw error;
    return data;
  }
};