import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProductSearchFilters = {
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  category?: string;
  limit?: number;
};

export const useProductSearch = (filters: ProductSearchFilters) => {
  return useQuery({
    queryKey: ["product_search", filters],
    queryFn: async () => {
      let query = supabase.from("products").select("*");

      if (filters.brand && filters.brand !== "All Brands") {
        query = query.ilike("brand", `%${filters.brand}%`);
      }

      if (filters.category && filters.category !== "All Categories") {
        query = query.ilike("category", `%${filters.category}%`);
      }

      if (filters.minPrice !== undefined) {
        query = query.gte("price_value", filters.minPrice);
      }

      if (filters.maxPrice !== undefined) {
        query = query.lte("price_value", filters.maxPrice);
      }

      const { data, error } = await query
        .order("price_value", { ascending: true })
        .limit(filters.limit || 4);

      if (error) throw error;
      return data;
    },
  });
};
