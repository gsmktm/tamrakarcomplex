import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Guide {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  image: string | null;
  category: string;
  guide_type: string;
  source_url?: string | null;
  source_site?: string | null;
  author: string;
  read_time: string | null;
  published: boolean | null;
  featured: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface GuidesListOptions {
  category?: string;
  limit?: number;
}

export function useGuidesList(options: GuidesListOptions = {}) {
  const { category, limit } = options;

  return useQuery({
    queryKey: ["guides", "list", { category, limit }],
    queryFn: async () => {
      let query = supabase
        .from("guides")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (category && category.trim()) {
        query = query.eq("category", category.trim());
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as Guide[];
    },
  });
}

export function useGuide(slug: string) {
  return useQuery({
    queryKey: ["guides", "detail", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("guides").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;

      return data as Guide | null;
    },
    enabled: !!slug,
  });
}

export function useGuideCategories() {
  return useQuery({
    queryKey: ["guides", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("guides").select("category").eq("published", true);
      if (error) throw error;

      const categories = (data ?? [])
        .map((row) => row.category)
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

      return Array.from(new Set(categories)).sort((a, b) => a.localeCompare(b));
    },
    staleTime: 60_000,
  });
}
