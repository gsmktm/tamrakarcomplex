import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ModelCard } from "@/components/mobile/ModelCard";
import { ProductCard } from "@/components/products/ProductCard";
import { FilterSidebar } from "@/components/products/FilterSidebar";
import { mobileMasterService } from "@/services/mobileMasterService";
import type { CategoryFilter } from "@/services/mobileMasterService";
import { useProductsQuery, useBrandsByCategory } from "@/hooks/useProducts";
import type { ProductSortKey } from "@/hooks/useProducts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search,
  ChevronRight,
  Smartphone, Laptop, Tablet, Headphones, Watch,
  Monitor, Speaker, Cpu,
  Filter, ChevronDown, ArrowUpDown, X, SlidersHorizontal,
} from "lucide-react";

// ── Device category strip ──────────────────────────────────────
const DEVICE_CATEGORIES = [
  { label: "Smartphones", icon: Smartphone, href: "/cat/mobiles", active: true },
  { label: "Laptops", icon: Laptop, href: "/laptop-price" },
  { label: "Tablets", icon: Tablet, href: "/cat/mobiles?tab=buy&category=Tablets" },
  { label: "Earbuds", icon: Headphones, href: "/cat/mobiles?tab=buy&category=Earbuds" },
  { label: "Headphones", icon: Headphones, href: "/cat/mobiles?tab=buy&category=Headphones" },
  { label: "Smartwatches", icon: Watch, href: "/cat/mobiles?tab=buy&category=Smartwatches" },
  { label: "Monitors", icon: Monitor, href: "/cat/mobiles?tab=buy&category=Monitors" },
  { label: "Speakers", icon: Speaker, href: "/cat/mobiles?tab=buy&category=Speakers" },
  { label: "PC Builds", icon: Cpu, href: "/cat/mobiles?tab=buy&category=PC+Builds" },
];

// ── Compare tab constants ──────────────────────────────────────
const FILTER_CHIPS: { label: string; filter: Partial<CategoryFilter> }[] = [
  { label: "All", filter: {} },
  { label: "Featured", filter: { is_featured: true } },
  { label: "Upcoming", filter: { is_upcoming: true } },
  { label: "Top Rated", filter: { is_top_rated: true } },
  { label: "Under Rs.80k", filter: { maxPrice: 80000 } },
  { label: "Budget", filter: { maxPrice: 30000 } },
];

const SORT_OPTIONS: { value: CategoryFilter["sort"]; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
  { value: "rating", label: "Top Rated" },
];

// ── Buy tab constants ──────────────────────────────────────────
const productCategories = ["All", "Smartphones", "Laptops", "Tablets", "Earbuds", "Smartwatches", "Gaming", "Drones"];

export default function MobileCategoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Which main tab
  const tabParam = searchParams.get("tab") ?? "compare";
  const [activeTab, setActiveTab] = useState(tabParam === "buy" ? "buy" : "compare");

  const handleTabChange = (t: string) => {
    setActiveTab(t);
    const p = new URLSearchParams(searchParams);
    if (t === "buy") p.set("tab", "buy"); else p.delete("tab");
    setSearchParams(p);
  };

  // ── Compare tab state ──────────────────────────────────────
  const [compareSearch, setCompareSearch] = useState("");
  const [activeChip, setActiveChip] = useState(0);
  const [sort, setSort] = useState<CategoryFilter["sort"]>("latest");
  const [activeBrand, setActiveBrand] = useState<string | null>(null);

  const { data: brands = [] } = useQuery({
    queryKey: ["brands-active"],
    queryFn: () => mobileMasterService.getBrands(),
    staleTime: 10 * 60 * 1000,
  });

  const compareFilter: CategoryFilter = useMemo(() => ({
    ...FILTER_CHIPS[activeChip].filter,
    sort,
    brand_id: activeBrand ?? undefined,
    search: compareSearch || undefined,
  }), [activeChip, sort, activeBrand, compareSearch]);

  const { data: modelData, isLoading: loadingModels } = useQuery({
    queryKey: ["model-list", compareFilter],
    queryFn: () => mobileMasterService.getModelList(compareFilter),
    staleTime: 5 * 60 * 1000,
  });

  const models = modelData?.items ?? [];
  const total = modelData?.total ?? 0;

  // ── Buy tab state ──────────────────────────────────────────
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const categoryParam = searchParams.get("category") || "All";
  const page = Number(searchParams.get("page")) || 1;
  const sortKey = (searchParams.get("sort") as ProductSortKey | null) || "created_at";
  const order = (searchParams.get("order") as "asc" | "desc") || "desc";
  const brandParam = searchParams.get("brand");
  const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
  const buySearch = searchParams.get("q") || "";
  const [priceRange, setPriceRange] = useState<[number, number]>([minPrice || 0, maxPrice || 300000]);
  const [buySearchQuery, setBuySearchQuery] = useState(buySearch);

  const updateParam = (key: string, value: string | null) => {
    const p = new URLSearchParams(searchParams);
    if (value === null) p.delete(key); else p.set(key, value);
    p.set("page", "1");
    setSearchParams(p);
  };

  const { data: productsData, isLoading: loadingProducts } = useProductsQuery({
    category: categoryParam,
    page,
    pageSize: 20,
    sort: sortKey,
    order,
    brand: brandParam || undefined,
    minPrice,
    maxPrice,
    search: buySearchQuery,
  });

  const { data: storeBrands } = useBrandsByCategory(categoryParam);

  return (
    <>
      <Helmet>
        <title>Mobile Price in Nepal 2026 | Buy Phones | Tamrakar Complex</title>
        <meta name="description" content="Latest mobile phone prices in Nepal. Compare iPhone, Samsung, Xiaomi, OnePlus. Buy from verified stores in Tamrakar Complex." />
      </Helmet>

      <Header />

      <div className="min-h-screen bg-background">
        {/* Device category strip */}
        <div className="border-b bg-card">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto scrollbar-none py-2">
              {DEVICE_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.label}
                    to={cat.href}
                    className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg shrink-0 transition-colors text-xs font-medium whitespace-nowrap ${
                      cat.active
                        ? "text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {cat.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">Mobile Phones</span>
          </nav>

          {/* Page header */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Mobile Price in Nepal</h1>
            <p className="text-muted-foreground mt-1">Compare prices, specs &amp; buy from verified stores.</p>
          </div>

          {/* Main tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-2">
              <TabsTrigger value="compare">Compare Phones</TabsTrigger>
              <TabsTrigger value="buy">Buy Now</TabsTrigger>
            </TabsList>

            {/* ── COMPARE TAB ─────────────────────────────────── */}
            <TabsContent value="compare" className="space-y-5 mt-4">
              {/* Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search iPhone, Samsung, Xiaomi…"
                  className="pl-9"
                  value={compareSearch}
                  onChange={(e) => setCompareSearch(e.target.value)}
                />
              </div>

              {/* Filter chips + sort */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {FILTER_CHIPS.map((chip, i) => (
                    <Button
                      key={chip.label}
                      variant={activeChip === i ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveChip(i)}
                      className="h-8 px-3 text-xs"
                    >
                      {chip.label}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {SORT_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={sort === opt.value ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSort(opt.value)}
                      className="h-8 px-3 text-xs"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Brand filter row */}
              {brands.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={activeBrand === null ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => setActiveBrand(null)}
                  >
                    All Brands
                  </Button>
                  {brands.map((b) => (
                    <Button
                      key={b.id}
                      variant={activeBrand === b.id ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 px-3 text-xs"
                      onClick={() => setActiveBrand(b.id === activeBrand ? null : b.id)}
                    >
                      {b.name}
                    </Button>
                  ))}
                </div>
              )}

              {/* Results count */}
              {!loadingModels && (
                <p className="text-sm text-muted-foreground">
                  {models.length} of {total} phones
                </p>
              )}

              {/* Grid */}
              {loadingModels ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-72 rounded-xl" />
                  ))}
                </div>
              ) : models.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  No phones found. Try changing filters.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {models.map((m) => (
                    <ModelCard key={m.id} model={m} />
                  ))}
                </div>
              )}

              {/* Brand quick links */}
              {brands.length > 0 && (
                <div className="border-t pt-6">
                  <h2 className="text-base font-semibold mb-3">Browse by Brand</h2>
                  <div className="flex flex-wrap gap-2">
                    {brands.map((b) => (
                      <Link
                        key={b.id}
                        to={`/cat/mobiles/${b.slug}`}
                        className="text-sm px-3 py-1.5 border rounded-full hover:bg-muted/50 hover:border-primary/40 transition-colors"
                      >
                        {b.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* SEO content */}
              <div className="prose prose-sm dark:prose-invert max-w-none border-t pt-6 text-muted-foreground">
                <h2>Mobile Phone Price in Nepal</h2>
                <p>Tamrakar Complex provides the most up-to-date mobile phone prices in Nepal, covering all major brands including Apple, Samsung, Xiaomi, OnePlus, Realme, and more. Our prices are verified with authorized dealers in Kathmandu.</p>
              </div>
            </TabsContent>

            {/* ── BUY TAB ─────────────────────────────────────── */}
            <TabsContent value="buy" className="mt-4">
              {/* Category pills */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-5">
                {productCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => updateParam("category", cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                      categoryParam === cat
                        ? "bg-primary text-primary-foreground shadow border-transparent"
                        : "bg-card hover:bg-secondary text-foreground border-border/60"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex flex-col lg:flex-row gap-8">
                {/* Desktop sidebar */}
                <aside className="hidden lg:block w-64 shrink-0">
                  <FilterSidebar
                    brands={storeBrands || []}
                    selectedBrand={brandParam}
                    onBrandChange={(b) => updateParam("brand", b === brandParam ? null : b)}
                    priceRange={priceRange}
                    setPriceRange={setPriceRange}
                    onPriceApply={() => {
                      const p = new URLSearchParams(searchParams);
                      p.set("minPrice", priceRange[0].toString());
                      p.set("maxPrice", priceRange[1].toString());
                      p.set("page", "1");
                      setSearchParams(p);
                    }}
                  />
                </aside>

                <div className="flex-1 space-y-5">
                  {/* Toolbar */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                    {/* Search */}
                    <form
                      onSubmit={(e) => { e.preventDefault(); updateParam("q", buySearchQuery); }}
                      className="relative max-w-xs w-full"
                    >
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        className="pl-9 h-9"
                        value={buySearchQuery}
                        onChange={(e) => setBuySearchQuery(e.target.value)}
                      />
                    </form>

                    <div className="flex items-center gap-2">
                      {/* Mobile filter */}
                      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="sm" className="lg:hidden gap-2">
                            <Filter className="h-4 w-4" /> Filters
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[300px] overflow-y-auto">
                          <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                          <div className="mt-6">
                            <FilterSidebar
                              brands={storeBrands || []}
                              selectedBrand={brandParam}
                              onBrandChange={(b) => updateParam("brand", b === brandParam ? null : b)}
                              priceRange={priceRange}
                              setPriceRange={setPriceRange}
                              onPriceApply={() => {
                                const p = new URLSearchParams(searchParams);
                                p.set("minPrice", priceRange[0].toString());
                                p.set("maxPrice", priceRange[1].toString());
                                p.set("page", "1");
                                setSearchParams(p);
                              }}
                            />
                          </div>
                        </SheetContent>
                      </Sheet>

                      {/* Sort */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2 h-9">
                            <ArrowUpDown className="h-3.5 w-3.5" />
                            Sort
                            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { updateParam("sort", "created_at"); updateParam("order", "desc"); }}>Newest</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { updateParam("sort", "price_value"); updateParam("order", "asc"); }}>Price: Low → High</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { updateParam("sort", "price_value"); updateParam("order", "desc"); }}>Price: High → Low</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { updateParam("sort", "name"); updateParam("order", "asc"); }}>Name A → Z</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Active filter tags */}
                  {(brandParam || minPrice || maxPrice || buySearch) && (
                    <div className="flex flex-wrap gap-2">
                      {brandParam && (
                        <Badge variant="secondary" className="gap-1 px-3 py-1">
                          Brand: {brandParam}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => updateParam("brand", null)} />
                        </Badge>
                      )}
                      {(minPrice || maxPrice) && (
                        <Badge variant="secondary" className="gap-1 px-3 py-1">
                          Rs.{minPrice || 0} – Rs.{maxPrice || 'Max'}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => {
                            const p = new URLSearchParams(searchParams);
                            p.delete("minPrice"); p.delete("maxPrice");
                            setSearchParams(p);
                          }} />
                        </Badge>
                      )}
                      {buySearch && (
                        <Badge variant="secondary" className="gap-1 px-3 py-1">
                          "{buySearch}"
                          <X className="h-3 w-3 cursor-pointer" onClick={() => updateParam("q", null)} />
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Count */}
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{productsData?.items.length ?? 0}</span> of{" "}
                    <span className="font-medium text-foreground">{productsData?.total ?? 0}</span> products
                  </p>

                  {/* Product grid */}
                  {loadingProducts ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <Skeleton key={i} className="h-64 rounded-xl" />
                      ))}
                    </div>
                  ) : productsData && productsData.items.length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {productsData.items.map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>

                      {/* Pagination */}
                      {productsData.total > 20 && (
                        <div className="flex justify-center gap-2 pt-4">
                          <Button
                            variant="outline"
                            disabled={page <= 1}
                            onClick={() => { updateParam("page", (page - 1).toString()); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                          >
                            Previous
                          </Button>
                          <div className="flex items-center px-4 font-medium text-sm border rounded-md">
                            {page} / {Math.ceil(productsData.total / 20)}
                          </div>
                          <Button
                            variant="outline"
                            disabled={page >= Math.ceil(productsData.total / 20)}
                            onClick={() => { updateParam("page", (page + 1).toString()); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No products found.
                      <Button variant="link" onClick={() => { const p = new URLSearchParams(); p.set("tab", "buy"); setSearchParams(p); }}>Reset</Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </>
  );
}
