// Brand Service — thin wrapper matching real `brands` table schema
// Real schema: id, name, slug, logo (not logo_url), status (string), country, founded_year, website

import { supabase } from "@/integrations/supabase/client";
import { mobileMasterService, Brand } from "@/services/mobileMasterService";

export type { Brand };

type BrandFilters = {
  status?: string;
  active?: boolean;
  search?: string;
};

type BrandListResult = {
  data: Brand[];
  error: null;
};

export const brandService = {
  async getBrands(filters?: BrandFilters): Promise<BrandListResult> {
    let query = (supabase as any).from("brands").select("*");
    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters?.active === true) {
      query = query.eq("status", "active");
    }
    if (filters?.search) {
      query = query.ilike("name", `%${filters.search}%`);
    }
    const orderedQuery = query.order("name", { ascending: true }) ?? query;
    const { data, error } = await orderedQuery;
    if (error) throw error;
    return { data: (data ?? []) as Brand[], error: null };
  },

  async getBrandById(id: string): Promise<Brand | null> {
    return mobileMasterService.getBrandBySlug(id);
  },

  async createBrand(brand: Partial<Brand>): Promise<Brand> {
    return mobileMasterService.createBrand(brand) as Promise<Brand>;
  },

  async updateBrand(id: string, brand: Partial<Brand>): Promise<Brand> {
    return mobileMasterService.updateBrand(id, brand) as Promise<Brand>;
  },

  async deleteBrand(id: string): Promise<void> {
    return mobileMasterService.deleteBrand(id);
  },
};
