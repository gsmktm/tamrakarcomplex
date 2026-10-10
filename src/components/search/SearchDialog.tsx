import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, X, Loader2, FileText, Package, Store, BookOpen, Wrench } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { autoSearchPageService, type AutoSearchBuildResult } from "@/services/autoSearchPageService";
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
  const [autoPage, setAutoPage] = useState<{ query: string; result: AutoSearchBuildResult | null } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();
  const location = useLocation();
  const loggedQueries = useRef(new Set<string>());
  const latestSearch = useRef(0);

  const searchContent = useCallback(async (searchQuery: string) => {
    const searchId = ++latestSearch.current;
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
          .or(`name.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`)
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

      const generatedResult = autoPage?.query.toLowerCase() === searchQuery.toLowerCase() ? autoPage.result : null;
      const generatedPage: SearchResult[] = generatedResult?.created && generatedResult.path
        ? [{
            id: generatedResult.page_id || generatedResult.slug || generatedResult.path,
            title: `Search page for "${searchQuery}"`,
            slug: generatedResult.slug || "",
            type: "service" as const,
            category: generatedResult.noindex ? "Generated noindex" : "Generated SEO",
            href: generatedResult.path,
            qualityScore: generatedResult.quality_score,
          }]
        : [];

      if (searchId === latestSearch.current) {
        setResults([...generatedPage, ...models, ...articles, ...products, ...guides, ...stores, ...services].slice(0, 15));
      }
    } catch (error) {
      console.error("Search error:", error);
      if (searchId === latestSearch.current) setResults([]);
    } finally {
      if (searchId === latestSearch.current) setIsLoading(false);
    }
  }, [autoPage]);

  useEffect(() => {
    if (!open) {
      latestSearch.current += 1;
      return;
    }
    void searchContent(debouncedQuery);
  }, [open, debouncedQuery, searchContent]);

  useEffect(() => {
    const clean = debouncedQuery.trim();
    if (!open || clean.length < 2 || loggedQueries.current.has(clean.toLowerCase())) return;

    loggedQueries.current.add(clean.toLowerCase());
    autoSearchPageService
      .logAndBuildPage(clean, `${location.pathname}${location.search}`)
      .then((result) => setAutoPage({ query: clean, result }))
      .catch(() => setAutoPage({ query: clean, result: null }));
  }, [open, debouncedQuery, location.pathname, location.search]);

  const handleSelect = async (result: SearchResult) => {
    onOpenChange(false);
    setQuery("");

    // Log search event
    if (result.type === "product" || result.type === "store") {
      try {
        await supabase.from("device_search_events").insert({
          user_id: null, // anonymous for now
          brand: result.type === "product" ? result.category : null,
          model: result.title,
          event_type: "click",
        });
      } catch (error) {
        console.error("Failed to log search event:", error);
      }
    }

    // Model search results use /mobile/:slug; honor explicit destinations
    // before falling back to the generic product-detail route.
    if (result.href) {
      navigate(result.href);
    } else if (result.type === "article") {
      navigate(`/stores/article/${result.slug}`);
    } else if (result.type === "product") {
      navigate(`/product/${result.slug}`);
    } else if (result.type === "guide") {
      navigate(`/guide/${result.slug}`);
    } else if (result.type === "store") {
      navigate(`/stores/${result.slug}`);
    }
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
                className="h-12 rounded-full pl-11 pr-10 bg-secondary/40 border-border/60 focus-visible:ring-2 focus-visible:ring-ring"
                autoFocus
              />
              {query ? (
                <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
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
      </DialogContent>
    </Dialog>
  );
}
