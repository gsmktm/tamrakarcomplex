import { supabase } from "@/integrations/supabase/client";

export type AutoSearchIntent = "product" | "price" | "repair" | "used" | "exchange" | "sell" | "store" | "general";

export type AutoSearchSections = {
  products?: Array<Record<string, unknown>>;
  stores?: Array<Record<string, unknown>>;
  repairs?: Array<Record<string, unknown>>;
  listings?: Array<Record<string, unknown>>;
};

export type AutoSearchFaq = {
  question: string;
  answer: string;
};

export type AutoSearchPage = {
  id: string;
  slug: string;
  path: string;
  primary_query: string;
  normalized_query: string;
  normalized_parts: Record<string, unknown>;
  intent: AutoSearchIntent;
  quality_score: number;
  title: string;
  meta_description: string;
  h1: string;
  intro: string;
  sections: AutoSearchSections;
  faqs: AutoSearchFaq[];
  structured_data: Array<Record<string, unknown>>;
  social_share: Record<string, unknown>;
  og_image: string;
  canonical_url?: string | null;
  robots_noindex: boolean;
  sitemap_enabled: boolean;
  needs_refresh: boolean;
  refresh_reason?: string | null;
  impressions: number;
  clicks: number;
  conversions: number;
  call_clicks: number;
  whatsapp_clicks: number;
  bookings: number;
  updated_at: string;
  content_refreshed_at: string;
};

export type AutoSearchBuildResult = {
  created: boolean;
  path?: string;
  slug?: string;
  page_id?: string;
  quality_score?: number;
  noindex?: boolean;
  sitemap_enabled?: boolean;
  reason?: string;
  matched_counts?: {
    products?: number;
    stores?: number;
    repairs?: number;
    listings?: number;
  };
};

export type AutoSearchMetricEvent = "impression" | "click" | "conversion" | "call" | "whatsapp" | "booking";

const SESSION_KEY = "tamrakar_auto_search_session";

function getSessionId() {
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return "anonymous";
  }
}

export function normalizeSearchQuery(query: string) {
  const normalized = query
    .toLowerCase()
    .replace(/[^\w\s.+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const brand = /\b(iphone|apple|macbook|ipad|airpods)\b/.test(normalized)
    ? "Apple"
    : /\b(samsung|galaxy)\b/.test(normalized)
      ? "Samsung"
      : /\b(xiaomi|redmi|poco)\b/.test(normalized)
        ? "Xiaomi"
        : /\boneplus\b/.test(normalized)
          ? "OnePlus"
          : /\boppo\b/.test(normalized)
            ? "Oppo"
            : /\bvivo\b/.test(normalized)
              ? "Vivo"
              : /\brealme\b/.test(normalized)
                ? "Realme"
                : undefined;

  const intent: AutoSearchIntent = /\b(repair|screen|display|battery|charging|camera|speaker|unlock|frp|mdm|icloud)\b/.test(normalized)
    ? "repair"
    : /\b(used|second hand|pre owned|old)\b/.test(normalized)
      ? "used"
      : /\b(exchange|swap|trade)\b/.test(normalized)
        ? "exchange"
        : /\b(sell|valuation|value|estimate)\b/.test(normalized)
          ? "sell"
          : /\b(price|rate|cost|rs|budget|under|below)\b/.test(normalized)
            ? "price"
            : /\b(store|shop|dealer|tamrakar|new road|newroad)\b/.test(normalized)
              ? "store"
              : "product";

  const storageMatch = normalized.match(/([0-9]{2,4})\s?(gb|tb)/i);
  const budgetMatch = normalized.match(/(?:under|below|budget|rs\.?)\s*([0-9,]{4,9})/i);
  const condition = /\b(new|brand new)\b/.test(normalized)
    ? "new"
    : /\b(used|second hand|pre owned|old)\b/.test(normalized)
      ? "used"
      : /\b(refurbished|open box)\b/.test(normalized)
        ? "refurbished"
        : undefined;

  return {
    normalized,
    brand,
    intent,
    condition,
    storage: storageMatch ? `${storageMatch[1]}${storageMatch[2].toUpperCase()}` : undefined,
    budget: budgetMatch ? Number(budgetMatch[1].replace(/[^\d]/g, "")) : undefined,
  };
}

export const autoSearchPageService = {
  async logAndBuildPage(query: string, sourcePath = window.location.pathname): Promise<AutoSearchBuildResult | null> {
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) return null;

    const { data, error } = await supabase.rpc("log_search_and_build_auto_page", {
      p_query: cleanQuery,
      p_source_path: sourcePath,
      p_session_id: getSessionId(),
    });

    if (error) {
      console.warn("Auto search page engine unavailable:", error.message);
      try {
        const normalized = normalizeSearchQuery(cleanQuery);
        await supabase.from("search_logs").insert({
          raw_query: cleanQuery,
          normalized_query: normalized.normalized,
          normalized_parts: normalized,
          intent: normalized.intent,
          source_path: sourcePath,
          session_id: getSessionId(),
        });
      } catch {
        // Older deployments may not have search_logs yet. Search should keep working.
      }
      return null;
    }

    return data as AutoSearchBuildResult;
  },

  async getPageBySlug(slug: string): Promise<AutoSearchPage | null> {
    const { data, error } = await supabase
      .from("auto_search_pages")
      .select("*")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    if (error || !data) return null;
    return data as AutoSearchPage;
  },

  async trackEvent(pageId: string, eventType: AutoSearchMetricEvent, metadata: Record<string, unknown> = {}) {
    try {
      await supabase.rpc("track_auto_search_page_event", {
        p_page_id: pageId,
        p_event_type: eventType,
        p_metadata: metadata,
      });
    } catch (error) {
      console.warn("Auto search metric failed:", error);
    }
  },
};
