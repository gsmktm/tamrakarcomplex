import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getFallbackBrands, getFallbackProducts, queryFallbackProducts } from "@/services/publicFallbackData";

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  price: string;
  price_value?: number | null;
  store_id?: string | null;
  image: string | null;
  images?: string[] | null;
  rating: number | null;
  reviews_count?: number | null;
  category: string;
  specs?: Record<string, string | number | boolean> | null;
  highlights?: string[] | null;
  description?: string | null;
  in_stock?: boolean | null;
  featured?: boolean | null;
  source_url?: string | null;
  source_site?: string | null;
  video_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ProductSortKey = "created_at" | "price_value" | "name";

export interface ProductsQueryOptions {
  search?: string;
  brand?: string;
  sort?: ProductSortKey;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  inStockOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  category?: string;
}

export interface ProductsQueryResult {
  items: Product[];
  total: number;
}

function matchesCategory(product: Product, category?: string) {
  if (!category || category === "All") return true;
  if (category === "Audio" || category === "Earbuds") return product.category.toLowerCase() === "earbuds";
  if (category === "Watch" || category === "Smartwatches") return product.category.toLowerCase() === "smartwatches";
  return product.category.toLowerCase().includes(category.toLowerCase());
}

export function useProducts(limit?: number) {
  return useQuery({
    queryKey: ["products", limit],
    queryFn: async () => {
      let query = supabase.from("products").select("*").order("created_at", { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) return getFallbackProducts().slice(0, limit);

      const products = (data || []) as Product[];
      return products.length > 0 ? products : getFallbackProducts().slice(0, limit);
    },
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("featured", true)
        .order("created_at", { ascending: false });

      if (error) return queryFallbackProducts({ pageSize: 12 }).items;

      const products = (data || []) as Product[];
      return products.length > 0 ? products : queryFallbackProducts({ pageSize: 12 }).items;
    },
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("slug", slug).maybeSingle();

      if (error) return getFallbackProducts().find((product) => product.slug === slug) ?? null;

      return (data as Product | null) ?? getFallbackProducts().find((product) => product.slug === slug) ?? null;
    },
    enabled: !!slug,
  });
}

export function useProductsByCategory(category: string) {
  return useQuery({
    queryKey: ["products", "category", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("category", category)
        .order("created_at", { ascending: false });

      if (error) return queryFallbackProducts({ category, pageSize: 100 }).items;

      const products = (data || []) as Product[];
      return products.length > 0 ? products : queryFallbackProducts({ category, pageSize: 100 }).items;
    },
    enabled: !!category,
  });
}

export function useProductsQuery(options: ProductsQueryOptions = {}) {
  const {
    category,
    search,
    brand,
    sort = "created_at",
    order = "desc",
    page = 1,
    pageSize = 20,
    inStockOnly = false,
    minPrice,
    maxPrice,
  } = options;

  return useQuery<ProductsQueryResult, Error>({
    queryKey: ["products", "query", { category, search, brand, sort, order, page, pageSize, inStockOnly, minPrice, maxPrice }],
    queryFn: async () => {
      const from = Math.max(0, (page - 1) * pageSize);
      const to = from + pageSize - 1;

      let query = supabase.from("products").select("*", { count: "exact" });

      if (category && category !== "All") {
        if (category === "Audio" || category === "Earbuds") {
          query = query.eq("category", "earbuds");
        } else if (category === "Watch" || category === "Smartwatches") {
          query = query.eq("category", "smartwatches");
        } else {
          query = query.ilike("category", category);
        }
      }

      if (inStockOnly) {
        query = query.eq("in_stock", true);
      }

      if (minPrice !== undefined) {
        query = query.gte("price_value", minPrice);
      }

      if (maxPrice !== undefined) {
        query = query.lte("price_value", maxPrice);
      }

      if (brand && brand !== "all") {
        query = query.eq("brand", brand);
      }

      if (search && search.trim()) {
        query = query.ilike("name", `%${search.trim()}%`);
      }

      query = query.order(sort, { ascending: order === "asc", nullsFirst: false }).range(from, to);

      const { data, error, count } = await query;
      if (error) {
        return queryFallbackProducts({ category, search, brand, sort, order, page, pageSize, minPrice, maxPrice });
      }

      if (!data?.length) {
        return queryFallbackProducts({ category, search, brand, sort, order, page, pageSize, minPrice, maxPrice });
      }

      return {
        items: (data ?? []) as Product[],
        total: count ?? 0,
      } satisfies ProductsQueryResult;
    },
  });
}

export function useProductsByCategoryQuery(category: string, options: ProductsQueryOptions = {}) {
  return useProductsQuery({ ...options, category });
}

export function useBrandsByCategory(category: string) {
  return useQuery<string[], Error>({
    queryKey: ["products", "brands", category],
    queryFn: async () => {
      let query = supabase.from("products").select("brand").not("brand", "is", null);

      if (category && category !== "All") {
        if (category === "Audio" || category === "Earbuds") {
          query = query.eq("category", "earbuds");
        } else if (category === "Watch" || category === "Smartwatches") {
          query = query.eq("category", "smartwatches");
        } else {
          query = query.ilike("category", category);
        }
      }

      const { data, error } = await query;
      if (error) return getFallbackBrands(category);

      const brands = (data ?? [])
        .map((row) => row.brand)
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

      const uniqueBrands = Array.from(new Set(brands)).sort((a, b) => a.localeCompare(b));
      return uniqueBrands.length > 0 ? uniqueBrands : getFallbackBrands(category);
    },
    enabled: !!category,
    staleTime: 60_000,
  });
}
