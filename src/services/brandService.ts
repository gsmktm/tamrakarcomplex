// Brand Service - handles brands table operations

import { supabase } from "@/integrations/supabase/client";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  aliases: string[]; // stored as jsonb but we'll treat as string array
  active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export const brandService = {
  // Get all brands
  async getBrands(filters?: { active?: boolean; search?: string }) {
    let query = supabase.from("brands").select("*");
    if (filters?.active !== undefined) {
      query = query.eq("active", filters.active);
    }
    if (filters?.search) {
      query = query.ilike("name", `%${filters.search}%`);
    }
    const { data, error, count } = await query.order("sort_order", { ascending: true });
    if (error) throw error;
    return { data, count };
  },

  // Get brand by id
  async getBrandById(id: string) {
    const { data, error } = await supabase.from("brands").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },

  // Create brand
  async createBrand(brand: Omit<Brand, "id" | "created_at" | "updated_at">) {
    const { data, error } = await supabase
      .from("brands")
      .insert([brand])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Update brand
  async updateBrand(id: string, brand: Partial<Brand>) {
    const { data, error } = await supabase
      .from("brands")
      .update(brand)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Delete brand
  async deleteBrand(id: string) {
    const { error } = await supabase.from("brands").delete().eq("id", id);
    if (error) throw error;
  },

  // Fix products using wrong brand names (legacy products table)
  async fixLegacyProducts() {
    // This would be a one-time operation to update old products table
    // We'll leave it as a stub for now
    return { success: true };
  }
};