import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Loader2, FileText, Package, Store, BookOpen, Wrench } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { getSearchResultDestination } from "@/lib/searchResultDestination";
import { getPublicStoreSlug } from "@/lib/storeRoutes";

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  type: "article" | "product" | "guide" | "store" | "service";
  image?: string;
  category?: string;
  price?: string;
  href?: string;
  qualityScore?: number;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();
  const latestSearch = useRef(0);

  const searchContent = useCallback(async (searchQuery: string) => {
    const searchId = ++latestSearch.current;
    // Bound remote filter complexity and ignore whitespace-only searches.
    searchQuery = searchQuery.trim().slice(0, 100);
    if (!searchQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [articlesRes, productsRes, guidesRes, storesRes, modelsRes] = await Promise.all([
        supabase
          .from("articles")
          .select("id, title, slug, image, category")
          .ilike("title", `%${searchQuery}%`)
          .eq("published", true)
          .limit(5),
        supabase
          .from("products")
          .select("id, name, slug, image, category, price")
          .ilike("name", `%${searchQuery}%`)
          .limit(5),
        supabase
          .from("guides")
          .select("id, title, slug, image, category")
          .ilike("title", `%${searchQuery}%`)
          .eq("published", true)
          .limit(5),
        supabase
          .from("stores")
          .select("id, name, slug, seo_slug, location")
          .ilike("name", `%${searchQuery}%`)
          .eq("status", "active")
          .eq("public_status", "published")
          .limit(5),
        supabase
          .from("phone_models")
          .select("id, name, slug, image, brands(name)")
          .ilike("name", `%${searchQuery}%`)
          .limit(5),
      ]);

      const articleRows = articlesRes.error ? [] : (articlesRes.data ?? []);
      const productRows = productsRes.error ? [] : (productsRes.data ?? []);
      const guideRows = guidesRes.error ? [] : (guidesRes.data ?? []);
      const storeRows = storesRes.error ? [] : (storesRes.data ?? []);
      const modelRows = modelsRes.error ? [] : (modelsRes.data ?? []);

      const articles: SearchResult[] = articleRows.map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        type: "article" as const,
        image: a.image || undefined,
        category: a.category,
      }));

      const products: SearchResult[] = productRows.map((p) => ({
        id: p.id,
        title: p.name,
        slug: p.slug,
        type: "product" as const,
        image: p.image || undefined,
        category: p.category,
        price: p.price,
      }));

      const models: SearchResult[] = modelRows.map((m) => ({
        id: m.id,
        title: m.name,
        slug: m.slug,
        type: "product" as const, // Using product type for UI styling
        image: m.image || undefined,
        category: (m as any).brands?.name,
        href: `/mobile/${m.slug}`,
      }));

      const guides: SearchResult[] = guideRows.map((guide) => ({
        id: guide.id,
        title: guide.title,
        slug: guide.slug,
        type: "guide" as const,
        image: guide.image || undefined,
        category: guide.category,
      }));

      const stores: SearchResult[] = storeRows.map((store) => ({
        id: store.id,
        title: store.name,
        slug: getPublicStoreSlug(store),
        type: "store" as const,
        category: store.location,
      }));

      const services: SearchResult[] = [
        { id: "service-sell", title: "Sell Your Phone", slug: "sell-your-phone", type: "service" as const, category: "Trade-in", href: "/sell-your-phone" },
        { id: "service-exchange", title: "Exchange Your Phone", slug: "exchange-your-phone", type: "service" as const, category: "Upgrade", href: "/exchange-your-phone" },
        { id: "service-repair", title: "Repair Booking", slug: "repair", type: "service" as const, category: "Service", href: "/repair" },
      ].filter((service) => `${service.title} ${service.category}`.toLowerCase().includes(searchQuery.toLowerCase()));

      if (searchId === latestSearch.current) {
        setResults([...models, ...articles, ...products, ...guides, ...stores, ...services].slice(0, 15));
      }
    } catch (error) {
      console.error("Search error:", error);
      if (searchId === latestSearch.current) setResults([]);
    } finally {
      if (searchId === latestSearch.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      latestSearch.current += 1;
      return;
    }
    void searchContent(debouncedQuery);
  }, [open, debouncedQuery, searchContent]);

  const handleSelect = (result: SearchResult) => {
    onOpenChange(false);
    setQuery("");

    // Analytics must never delay the selected destination or block navigation.
    if (result.type === "product" || result.type === "store") {
      void Promise.resolve(supabase.from("device_search_events").insert({
        user_id: null,
        brand: result.type === "product" ? result.category : null,
        model: result.title,
        event_type: "click",
      })).then(({ error }) => {
        if (error) console.warn("Search event could not be logged");
      }).catch(() => {
        console.warn("Search event could not be logged");
      });
    }

    navigate(getSearchResultDestination(result));
  };

  const browseAllResults = () => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return;
    onOpenChange(false);
    setQuery("");
    navigate("/cat/mobiles?tab=buy&q=" + encodeURIComponent(cleanQuery));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] p-0 gap-0 overflow-hidden rounded-3xl border border-border/60">
        <div className="h-1.5 hero-gradient" />
        <div className="p-4 border-b border-border/60 bg-card">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <label htmlFor="search-dialog-input" className="sr-only">Search</label>
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search-dialog-input"
                placeholder="Search products, guides, stores, and services…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && query.trim()) {
                    event.preventDefault();
                    browseAllResults();
                  }
                }}
                className="h-12 rounded-full pl-11 pr-10 bg-secondary/40 border-border/60 focus-visible:ring-2 focus-visible:ring-ring"
                maxLength={100}
                autoFocus
              />
              {query ? (
                <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              ) : null}
            </div>
            <kbd className="hidden sm:inline-flex h-8 items-center rounded-full border border-border/60 bg-background/70 px-3 text-xs text-muted-foreground">
              ESC
            </kbd>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Tip: use keywords like <span className="text-foreground">laptop</span>,{" "}
            <span className="text-foreground">review</span>, <span className="text-foreground">price</span>.
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-3 bg-background">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border/60 bg-card hover:bg-secondary/40 transition-colors text-left"
                >
                  {result.image ? (
                    <img
                      src={result.image}
                      alt={result.title}
                      className="w-12 h-12 object-cover rounded-xl border border-border/60"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-secondary/50 rounded-xl flex items-center justify-center border border-border/60">
                      {result.type === "article" ? (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      ) : result.type === "guide" ? (
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                      ) : result.type === "store" ? (
                        <Store className="h-5 w-5 text-muted-foreground" />
                      ) : result.type === "service" ? (
                        <Wrench className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{result.title}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="capitalize">{result.type}</span>
                      {result.category && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{result.category}</span>
                        </>
                      )}
                      {result.price && (
                        <>
                          <span>•</span>
                          <span className="text-primary font-medium">{result.price}</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query ? (
            <div className="text-center py-10 text-muted-foreground">
              No results found for “{query}”
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              Start typing to search...
            </div>
          )}
        </div>
        {query.trim() && (
          <div className="border-t border-border/60 bg-card p-3">
            <button
              type="button"
              onClick={browseAllResults}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Search all catalog listings
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
