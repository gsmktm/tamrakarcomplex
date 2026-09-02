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
  specs?: Record<string, unknown> | null;
  highlights?: string[] | null;
  description?: string | null;
  in_stock?: boolean | null;
  featured?: boolean | null;
  source_url?: string | null;
  source_site?: string | null;
  video_url?: string | null;
  created_at?: string;
  updated_at?: string;
  source_type?: "product" | "store_product";
  store_product_id?: string | null;
  stock_quantity?: number | null;
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

const CATEGORY_ALIASES: Record<string, string[]> = {
  smartphones: ["smartphones", "smartphone", "mobile", "mobiles", "phones", "phone"],
  laptops: ["laptops", "laptop", "notebook", "notebooks", "macbook"],
  tablets: ["tablets", "tablet", "ipad", "ipads"],
  earbuds: ["earbuds", "earbud", "tws"],
  headphones: ["headphones", "headphone", "headset", "headsets"],
  smartwatches: ["smartwatches", "smartwatch", "watch", "watches", "wearable", "wearables"],
  monitors: ["monitors", "monitor", "display", "displays"],
  speakers: ["speakers", "speaker", "bluetooth speaker", "audio speaker"],
  "pc builds": ["pc builds", "pc build", "desktop", "desktops", "gaming pc", "gaming pcs"],
  gaming: ["gaming", "console", "consoles", "controller", "controllers"],
  drones: ["drones", "drone"],
};

function getCategoryAliases(category?: string) {
  const normalized = category?.trim().toLowerCase();
  if (!normalized || normalized === "all") return [];
  return CATEGORY_ALIASES[normalized] ?? [normalized];
}

function matchesCategory(product: Product, category?: string) {
  if (!category || category === "All") return true;
  const productCategory = product.category.toLowerCase();
  return getCategoryAliases(category).some((alias) => productCategory.includes(alias));
}

const PRODUCT_FIELDS = "id,name,slug,brand,price,price_value,image,images,rating,reviews_count,category,specs,highlights,description,in_stock,featured,source_url,source_site,created_at,updated_at";

export function useProducts(limit: number = 20) {
  return useQuery({
    queryKey: ["products", limit],
    staleTime: 5 * 60 * 1000,
    initialData: () => getFallbackProducts().slice(0, limit),
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_FIELDS)
        .eq("in_stock", true)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) return getFallbackProducts().slice(0, limit);

      const products = (data || []) as Product[];
      return products.length > 0 ? products : getFallbackProducts().slice(0, limit);
    },
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ["products", "featured"],
    staleTime: 5 * 60 * 1000,
    initialData: () => queryFallbackProducts({ pageSize: 12 }).items,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_FIELDS)
        .eq("featured", true)
        .eq("in_stock", true)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) return queryFallbackProducts({ pageSize: 12 }).items;

      const products = (data || []) as Product[];
      return products.length > 0 ? products : queryFallbackProducts({ pageSize: 12 }).items;
    },
  });
}

export function useProduct(slug: string) {
  const fallbackProduct = getFallbackProducts().find((product) => product.slug === slug);

  return useQuery({
    queryKey: ["product", slug],
    staleTime: 10 * 60 * 1000, // 10 min — individual product pages
    // Do not seed a missing fallback as `null`: React Query treats initial data
    // as a successful, fresh result and would skip the live lookup for 10 minutes.
    initialData: fallbackProduct,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("slug", slug).maybeSingle();

      if (error) return fallbackProduct ?? null;

      return (data as Product | null) ?? fallbackProduct ?? null;
    },
    enabled: !!slug,
  });
}

export function useProductsByCategory(category: string) {
  return useQuery({
    queryKey: ["products", "category", category],
    initialData: () => queryFallbackProducts({ category, pageSize: 100 }).items,
    retry: false,
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
    initialData: () => queryFallbackProducts({ category, search, brand, sort, order, page, pageSize, minPrice, maxPrice }),
    retry: false,
    queryFn: async () => {
      const from = Math.max(0, (page - 1) * pageSize);
      const to = from + pageSize - 1;

      let query = supabase.from("products").select("*", { count: "exact" });

      if (category && category !== "All") {
        const aliases = getCategoryAliases(category);
        if (aliases.length === 1) {
          query = query.ilike("category", `%${aliases[0]}%`);
        } else {
          query = query.or(aliases.map((alias) => `category.ilike.%${alias}%`).join(","));
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
    initialData: () => getFallbackBrands(category),
    retry: false,
    queryFn: async () => {
      let query = supabase.from("products").select("brand").not("brand", "is", null);

      if (category && category !== "All") {
        const aliases = getCategoryAliases(category);
        if (aliases.length === 1) {
          query = query.ilike("category", `%${aliases[0]}%`);
        } else {
          query = query.or(aliases.map((alias) => `category.ilike.%${alias}%`).join(","));
        }
      }

      const { data, error } = await query;
      if (error) return getFallbackBrands(category);

      const brands = (data ?? [])
        .map((row: { brand: unknown }) => row.brand)
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

      const uniqueBrands = Array.from(new Set(brands)).sort((a: string, b: string) => a.localeCompare(b));
      return uniqueBrands.length > 0 ? uniqueBrands : getFallbackBrands(category);
    },
    enabled: !!category,
    staleTime: 60_000,
  });
}
