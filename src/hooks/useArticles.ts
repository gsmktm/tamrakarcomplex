import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  image: string | null;
  category: string;
  category_label: string | null;
  source_url?: string | null;
  source_site?: string | null;
  author: string;
  read_time: string | null;
  featured: boolean | null;
  published: boolean | null;
  views: number | null;
  created_at: string;
  updated_at: string;
  meta_title?: string | null;
  meta_description?: string | null;
  og_image?: string | null;
}

export interface ArticlesListOptions {
  limit?: number;
  category?: string;
}

export function useArticlesList(options: ArticlesListOptions = {}) {
  const { limit, category } = options;

  return useQuery({
    queryKey: ["articles", "list", { limit, category }],
    queryFn: async () => {
      let query = supabase.from("articles").select("*").eq("published", true).order("created_at", { ascending: false });

      if (category && category.trim()) {
        query = query.eq(
          "category",
          category.trim() as
            | "mobile"
            | "laptop"
            | "tablet"
            | "audio"
            | "watch"
            | "gaming"
            | "news"
            | "review"
            | "comparison"
            | "guide"
            | "price",
        );
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as Article[];
    },
  });
}

export function useArticles(limit?: number) {
  return useQuery({
    queryKey: ["articles", limit],
    queryFn: async () => {
      let query = supabase.from("articles").select("*").eq("published", true).order("created_at", { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as Article[];
    },
  });
}

export function useFeaturedArticles() {
  return useQuery({
    queryKey: ["articles", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("published", true)
        .eq("featured", true)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;

      return data as Article[];
    },
  });
}

export function useArticle(slug: string) {
  return useQuery({
    queryKey: ["article", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("*").eq("slug", slug).eq("published", true).maybeSingle();

      if (error) throw error;

      return data as Article | null;
    },
    enabled: !!slug,
  });
}

export function useArticlesByCategory(category: string) {
  return useQuery({
    queryKey: ["articles", "category", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("published", true)
        .eq(
          "category",
          category as "mobile" | "laptop" | "tablet" | "audio" | "watch" | "gaming" | "news" | "review" | "comparison" | "guide" | "price",
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data as Article[];
    },
    enabled: !!category,
  });
}

export function useArticleProducts(articleId: string | null | undefined) {
  return useQuery({
    queryKey: ["articleProducts", articleId],
    queryFn: async () => {
      if (!articleId) return [];
      
      const { data, error } = await supabase
        .from("article_products")
        .select("product_id, products(*)")
        .eq("article_id", articleId);

      if (error) throw error;
      
      return data?.map(item => item.products).filter(Boolean) || [];
    },
    enabled: !!articleId,
  });
}
