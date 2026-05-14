import { supabase } from "@/integrations/supabase/client";

export interface MasterBrand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

export interface MasterModel {
  id: string;
  brand_id: string;
  series_id: string | null;
  name: string;
  slug: string;
  model_number: string | null;
  release_year: number | null;
  image: string | null;
  brand?: MasterBrand;
}

export interface MasterVariant {
  id: string;
  model_id: string;
  ram: string | null;
  storage: string | null;
  color: string | null;
  model?: MasterModel;
}

export const masterCatalogService = {
  async getBrands() {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('status', 'active')
      .order('name');
    if (error) throw error;
    return data as MasterBrand[];
  },

  async searchModels(query: string, brandId?: string) {
    let sQuery = supabase
      .from('phone_models')
      .select('*, brand:brands(*)')
      .eq('status', 'active');
    
    if (brandId) {
      sQuery = sQuery.eq('brand_id', brandId);
    }
    
    if (query) {
      sQuery = sQuery.ilike('name', `%${query}%`);
    }

    const { data, error } = await sQuery.order('name').limit(20);
    if (error) throw error;
    return data as MasterModel[];
  },

  async getModelVariants(modelId: string) {
    const { data, error } = await supabase
      .from('phone_variants')
      .select('*')
      .eq('model_id', modelId)
      .eq('status', 'active');
    if (error) throw error;
    return data as MasterVariant[];
  },

  async getModelDetails(slug: string) {
    const { data, error } = await supabase
      .from('phone_models')
      .select('*, brand:brands(*), variants:phone_variants(*), specs:phone_specs(*)')
      .eq('slug', slug)
      .single();
    if (error) throw error;
    return data;
  }
};
