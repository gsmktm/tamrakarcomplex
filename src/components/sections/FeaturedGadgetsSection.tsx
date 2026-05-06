import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeaturedProducts } from "@/hooks/useProducts";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/products/ProductCard";
import { useArticles } from "@/hooks/useArticles";
import { ArticleCard } from "@/components/articles/ArticleCard";

const productCategories = ["All", "Smartphones", "Laptops"];

const categoryData = [
  { name: "Smartphones", icon: "📱", count: 245, href: "/mobile-price" },
  { name: "Laptops", icon: "💻", count: 128, href: "/laptop-price" },
  { name: "Tablets", icon: "📟", count: 56, href: "/buy" },
  { name: "Earbuds", icon: "🎧", count: 89, href: "/buy" },
  { name: "Smartwatches", icon: "⌚", count: 67, href: "/buy" },
  { name: "Gaming", icon: "🎮", count: 34, href: "/buy" },
  { name: "Cameras", icon: "📷", count: 42, href: "/buy" },
  { name: "Drones", icon: "🚁", count: 18, href: "/buy" },
];

export function FeaturedGadgetsSection() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [brandPages, setBrandPages] = useState<Record<string, number>>({});
  const { data: products, isLoading } = useFeaturedProducts();
  const [cfg, setCfg] = useState<{ groupByBrand: boolean; pageSize: number; showChips: boolean; splitLayout: boolean; leftCount: number; rightCount: number; rightFilterByCategory: boolean }>({
    groupByBrand: true,
    pageSize: 10,
    showChips: true,
    splitLayout: true,
    leftCount: 6,
    rightCount: 2,
    rightFilterByCategory: false,
  });
  const { data: recentArticles, isLoading: isArticlesLoading } = useArticles(cfg.rightCount);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("theme-settings");
      const parsed = raw ? JSON.parse(raw) : {};
      setCfg({
        groupByBrand: parsed.featuredGroupByBrand ?? true,
        pageSize: parsed.featuredPageSize ?? 10,
        showChips: parsed.featuredShowChips ?? true,
        splitLayout: parsed.featuredSplitLayout ?? true,
        leftCount: parsed.featuredLeftCount ?? 6,
        rightCount: parsed.featuredRightCount ?? 2,
        rightFilterByCategory: parsed.featuredRightFilterByCategory ?? false,
      });
    } catch {
      // Ignore malformed local theme settings and keep defaults.
    }
  }, []);

  const filteredProducts = useMemo(
    () =>
      (products || []).filter(
        (product) => activeCategory === "All" || product.category === activeCategory
      ),
    [products, activeCategory]
  );

  const productsByBrand = useMemo(() => {
    const groups: Record<string, typeof filteredProducts> = {};
    filteredProducts.forEach((p) => {
      const key = (p.brand || "Other").toString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return groups;
  }, [filteredProducts]);

  useEffect(() => {
    setBrandPages((prev) => {
      const nextPages: Record<string, number> = { ...prev };
      Object.keys(productsByBrand).forEach((brand) => {
        if (!nextPages[brand]) nextPages[brand] = 1;
      });
      return Object.keys(nextPages).length === Object.keys(prev).length ? prev : nextPages;
    });
  }, [productsByBrand]);

  const handleViewMore = (brand: string) => {
    setBrandPages((prev) => ({ ...prev, [brand]: (prev[brand] || 1) + 1 }));
  };
  const handlePrev = (brand: string) => {
    setBrandPages((prev) => ({ ...prev, [brand]: Math.max(1, (prev[brand] || 1) - 1) }));
  };
  const handleSetPage = (brand: string, page: number) => {
    setBrandPages((prev) => ({ ...prev, [brand]: Math.max(1, page) }));
  };

  return (
    <section className="py-10 lg:py-16 bg-secondary/25">
      <div className="container">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
              Popular Picks
            </div>
            <h2 className="font-display text-2xl lg:text-3xl font-bold flex items-center gap-2">
              <span className="w-1.5 h-9 rounded-full hero-gradient" />
              Featured Gadgets
            </h2>
          </div>
          
          <Link to="/buy">
            <Button variant="outline" className="rounded-full border-primary/20 hover:border-primary/50 text-primary transition-all">
              View All Deals
            </Button>
          </Link>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {productCategories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                activeCategory === category
                  ? "hero-gradient text-primary-foreground shadow-glow border-transparent"
                  : "bg-card hover:bg-secondary text-foreground border-border/60"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Two-Column: Left Products (6), Right Blog (2) */}
        {isLoading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, row) => (
              <div key={row}>
                <div className="h-4 w-40 bg-secondary rounded mb-3" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="article-card">
                      <Skeleton className="aspect-square" />
                      <div className="p-3 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-6 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts && filteredProducts.length > 0 ? (
          <>
          {cfg.splitLayout && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
              <div className="lg:col-span-2">
                <div className="bg-card/50 border border-border/60 rounded-2xl p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {filteredProducts.slice(0, cfg.leftCount).map((product) => (
                      <div key={product.id} className="group rounded-xl border border-border/60 overflow-hidden hover:shadow-lg transition-shadow">
                        <ProductCard product={product} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="bg-card/50 border border-border/60 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Related Blog Posts</div>
                    <Link to="/news" className="text-xs text-primary hover:underline">View all</Link>
                  </div>
                  {isArticlesLoading ? (
                    <div className="space-y-3">
                      {[...Array(cfg.rightCount)].map((_, i) => (
                        <div key={i} className="article-card">
                          <Skeleton className="aspect-video" />
                          <div className="p-3 space-y-2">
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-4 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentArticles && recentArticles.length > 0 ? (
                    <div className="space-y-3">
                      {recentArticles.map((article) => (
                        <ArticleCard key={article.id} article={article} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No related posts found.</div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Existing modes below remain for extended browsing */}
          {cfg.groupByBrand ? (
          <div className="space-y-10">
            {Object.keys(productsByBrand)
              .sort((a, b) => a.localeCompare(b))
              .map((brand) => {
                const items = productsByBrand[brand] || [];
                const page = brandPages[brand] || 1;
                const pageSize = cfg.pageSize || 10;
                const visible = items.slice(0, page * pageSize);
                const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
                return (
                  <div key={brand}>
                    <div className="mb-3">
                      <h3 className="text-lg font-semibold">{brand}</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                      {visible.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                    {cfg.showChips ? (
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full px-4"
                        onClick={() => handlePrev(brand)}
                        disabled={page <= 1}
                      >
                        Prev
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <Button
                          key={`${brand}-page-${p}`}
                          variant={p === page ? "ghost" : "outline"}
                          size="sm"
                          className={`rounded-full min-w-8 h-8 px-0 ${p === page ? "hero-gradient text-primary-foreground border-transparent" : ""}`}
                          onClick={() => handleSetPage(brand, p)}
                        >
                          {p}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full px-4"
                        onClick={() => handleViewMore(brand)}
                        disabled={page >= totalPages}
                      >
                        Next
                      </Button>
                    </div>
                    ) : (
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handlePrev(brand)} disabled={page <= 1}>Prev</Button>
                        <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => handleViewMore(brand)} disabled={page >= totalPages}>Next</Button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
          ) : (
            // Non-grouped grid with global pagination
            (() => {
              const [globalPage, setGlobalPage] = [brandPages["_global"] || 1, (p: number) => setBrandPages((prev) => ({ ...prev, _global: Math.max(1, p) }))];
              const pageSize = cfg.pageSize || 12;
              const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
              const start = (globalPage - 1) * pageSize;
              const visible = filteredProducts.slice(start, start + pageSize);
              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {visible.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm" className="rounded-full px-4" onClick={() => setGlobalPage(globalPage - 1)} disabled={globalPage <= 1}>
                      Prev
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <Button
                        key={`global-page-${p}`}
                        variant={p === globalPage ? "ghost" : "outline"}
                        size="sm"
                        className={`rounded-full min-w-8 h-8 px-0 ${p === globalPage ? "hero-gradient text-primary-foreground border-transparent" : ""}`}
                        onClick={() => setGlobalPage(p)}
                      >
                        {p}
                      </Button>
                    ))}
                    <Button variant="outline" size="sm" className="rounded-full px-4" onClick={() => setGlobalPage(globalPage + 1)} disabled={globalPage >= totalPages}>
                      Next
                    </Button>
                  </div>
                </div>
              );
            })()
          )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products found.</p>
          </div>
        )}

        {/* Category Quick Links */}
        <div className="mt-12">
          <h3 className="font-display text-lg font-semibold mb-4">Browse Categories</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {categoryData.map((category) => (
              <Link
                key={category.name}
                to={category.href}
                className="article-card p-4 text-center group border border-border/60"
              >
                <span className="text-3xl mb-2 block">{category.icon}</span>
                <span className="text-sm font-medium group-hover:text-primary transition-colors">
                  {category.name}
                </span>
                <span className="text-xs text-muted-foreground block mt-1">
                  {category.count} products
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
