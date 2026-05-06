import { supabase } from "@/integrations/supabase/client";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  status: string;
}

export interface PhoneSeries {
  id: string;
  brand_id: string;
  name: string;
  slug: string;
  status: string;
}

export interface PhoneModel {
  id: string;
  brand_id: string;
  series_id?: string;
  name: string;
  slug: string;
  model_number?: string;
  release_year?: number;
  image?: string;
  status: string;
  search_keywords?: string;
}

export interface PhoneVariant {
  id: string;
  model_id: string;
  ram?: string;
  storage?: string;
  color?: string;
  region?: string;
  condition_type: string;
  status: string;
}

export interface PhoneSpec {
  id: string;
  model_id: string;
  display?: string;
  processor?: string;
  camera?: string;
  battery?: string;
  charging?: string;
  os?: string;
  network?: string;
  body?: string;
  pros?: string[];
  cons?: string[];
  verdict?: string;
  highlights?: any;
  full_specs_json?: any;
}

export const mobileMasterService = {
  // Brands
  async getBrands() {
    const { data, error } = await supabase.from("brands").select("*").order("name");
    if (error) throw error;
    return data;
  },
  async createBrand(brand: Partial<Brand>) {
    const { data, error } = await supabase.from("brands").insert(brand).select().single();
    if (error) throw error;
    return data;
  },

  // Series
  async getSeriesByBrand(brandId: string) {
    const { data, error } = await supabase.from("phone_series").select("*").eq("brand_id", brandId).order("name");
    if (error) throw error;
    return data;
  },
  async createSeries(series: Partial<PhoneSeries>) {
    const { data, error } = await supabase.from("phone_series").insert(series).select().single();
    if (error) throw error;
    return data;
  },

  // Models
  async getModels(brandId?: string, seriesId?: string) {
    let query = supabase.from("phone_models").select("*, brands(name), phone_series(name)");
    if (brandId) query = query.eq("brand_id", brandId);
    if (seriesId) query = query.eq("series_id", seriesId);
    const { data, error } = await query.order("name");
    if (error) throw error;
    return data;
  },
  async searchModels(searchTerm: string) {
    const { data, error } = await supabase
      .from("phone_models")
      .select("*, brands(name)")
      .ilike("name", `%${searchTerm}%`)
      .limit(10);
    if (error) throw error;
    return data;
  },
  async createModel(model: Partial<PhoneModel>) {
    const { data, error } = await supabase.from("phone_models").insert(model).select().single();
    if (error) throw error;
    return data;
  },

  // Variants
  async getVariants(modelId: string) {
    const { data, error } = await supabase.from("phone_variants").select("*").eq("model_id", modelId);
    if (error) throw error;
    return data;
  },
  async createVariant(variant: Partial<PhoneVariant>) {
    const { data, error } = await supabase.from("phone_variants").insert(variant).select().single();
    if (error) throw error;
    return data;
  },

  // Specs
  async getSpecs(modelId: string) {
    const { data, error } = await supabase.from("phone_specs").select("*").eq("model_id", modelId).maybeSingle();
    if (error) throw error;
    return data;
  },
  async upsertSpecs(specs: Partial<PhoneSpec>) {
    const { data, error } = await supabase.from("phone_specs").upsert(specs).select().single();
    if (error) throw error;
    return data;
  },

  // Modules (Connect to model_id)
  async updateInventory(item: any) {
    const { data, error } = await supabase.from("inventory_items").upsert(item).select().single();
    if (error) throw error;
    return data;
  },
  async updateExchangeValue(value: any) {
    const { data, error } = await supabase.from("exchange_values").upsert(value).select().single();
    if (error) throw error;
    return data;
  },
  async updateRepairService(service: any) {
    const { data, error } = await supabase.from("repair_services").upsert(service).select().single();
    if (error) throw error;
    return data;
  },
  async updateUnlockingService(service: any) {
    const { data, error } = await supabase.from("unlocking_services").upsert(service).select().single();
    if (error) throw error;
    return data;
  }
};
