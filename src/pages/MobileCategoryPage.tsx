import { useEffect, useState, useMemo } from "react";
import { SEO } from "@/components/common/SEO";
import { breadcrumbSchema, absoluteUrl, faqSchema } from "@/lib/seo";
import { mobilePriceFaqs } from "@/data/seoKeywordStrategy";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { CampaignBanner } from "@/components/campaigns/CampaignBanner";
import { Footer } from "@/components/layout/Footer";
import { ModelCard } from "@/components/mobile/ModelCard";
import { ProductCard } from "@/components/products/ProductCard";
import { FilterSidebar } from "@/components/products/FilterSidebar";
import { mobileMasterService } from "@/services/mobileMasterService";
import type { CategoryFilter } from "@/services/mobileMasterService";
import { useAuth } from "@/hooks/useAuth";
import { isAdminRole } from "@/lib/roles";
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
  Upload, Sparkles, ShieldCheck, TrendingUp, BadgeCheck,
} from "lucide-react";

// ── Device category strip ──────────────────────────────────────
const DEVICE_CATEGORIES = [
  { label: "Smartphones", icon: Smartphone, href: "/cat/mobiles" },
  { label: "Laptops", icon: Laptop, href: "/cat/mobiles?tab=buy&category=Laptops" },
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
const productCategories = [
  "All",
  "Smartphones",
  "Laptops",
  "Tablets",
  "Earbuds",
  "Headphones",
  "Smartwatches",
  "Monitors",
  "Speakers",
  "PC Builds",
  "Gaming",
  "Drones",
];

const BUY_PAGE_SIZE = 20;

export default function MobileCategoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { role } = useAuth();
  const canManageCatalog = isAdminRole(role);

  const isCatActive = (href: string) => {
    if (href === "/cat/mobiles") {
      return location.pathname === "/cat/mobiles" && !searchParams.get("category");
    }
    try {
      const u = new URL(href, window.location.origin);
      return (
        location.pathname === u.pathname &&
        searchParams.get("tab") === u.searchParams.get("tab") &&
        searchParams.get("category") === u.searchParams.get("category")
      );
    } catch {
      return false;
    }
  };

  // Which main tab
  const tabParam = searchParams.get("tab") ?? "compare";
  const [activeTab, setActiveTab] = useState(tabParam === "buy" ? "buy" : "compare");

  useEffect(() => {
    setActiveTab(tabParam === "buy" ? "buy" : "compare");
  }, [tabParam]);

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

  const { data: brandsRaw = [] } = useQuery({
    queryKey: ["brands-active"],
    queryFn: () => mobileMasterService.getBrands(),
    placeholderData: () => mobileMasterService.getLocalBrands(),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });
  const TOP_PRIORITY_MOBILE = ['apple','samsung','xiaomi','oneplus','oppo','vivo','realme','nothing','infinix','poco','huawei','motorola','nokia','honor'];
  const brands = (brandsRaw||[]).slice().sort((a,b)=>{ const ai=TOP_PRIORITY_MOBILE.indexOf((a.slug||a.name||'').toLowerCase()), bi=TOP_PRIORITY_MOBILE.indexOf((b.slug||b.name||'').toLowerCase()); if(ai!==-1||bi!==-1) return (ai===-1?999:ai)-(bi===-1?999:bi); return (a.name||'').localeCompare(b.name||''); });

  const compareFilter: CategoryFilter = useMemo(() => ({
    ...FILTER_CHIPS[activeChip].filter,
    sort,
    brand_id: activeBrand ?? undefined,
    search: compareSearch || undefined,
  }), [activeChip, sort, activeBrand, compareSearch]);

  const { data: modelData, isLoading: loadingModels } = useQuery({
    queryKey: ["model-list", compareFilter],
    queryFn: () => mobileMasterService.getModelList(compareFilter),
    placeholderData: () => mobileMasterService.getLocalModelList(compareFilter),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const models = modelData?.items ?? [];
  const total = modelData?.total ?? 0;

  // ── Buy tab state ──────────────────────────────────────────
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const categoryParam = searchParams.get("category") || "All";
  const requestedPage = Number(searchParams.get("page"));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
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
    if (key !== "page") p.set("page", "1");
    setSearchParams(p);
  };

  const handleBuyPageChange = (nextPage: number) => {
    const p = new URLSearchParams(searchParams);
    if (nextPage <= 1) p.delete("page"); else p.set("page", String(nextPage));
    p.set("tab", "buy");
    setSearchParams(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleProductCategoryChange = (category: string) => {
    const p = new URLSearchParams(searchParams);
    p.set("tab", "buy");
    if (category === "All") p.delete("category"); else p.set("category", category);
    p.delete("brand");
    p.delete("minPrice");
    p.delete("maxPrice");
    p.set("page", "1");
    setBuySearchQuery("");
    setPriceRange([0, 300000]);
    setSearchParams(p);
  };

  const { data: productsData, isLoading: loadingProducts } = useProductsQuery({
    category: categoryParam,
    page,
    pageSize: BUY_PAGE_SIZE,
    sort: sortKey,
    order,
    brand: brandParam || undefined,
    minPrice,
    maxPrice,
    search: buySearchQuery,
  });

  const { data: storeBrands } = useBrandsByCategory(categoryParam);
  const totalBuyPages = Math.max(1, Math.ceil((productsData?.total ?? 0) / BUY_PAGE_SIZE));
  const visibleBuyPages = Array.from({ length: Math.min(5, totalBuyPages) }, (_, index) => {
    const start = Math.min(Math.max(1, page - 2), Math.max(1, totalBuyPages - 4));
    return start + index;
  });

  useEffect(() => {
    if (activeTab === "buy" && productsData && productsData.total > 0 && page > totalBuyPages) {
      const p = new URLSearchParams(searchParams);
      if (totalBuyPages <= 1) p.delete("page"); else p.set("page", String(totalBuyPages));
      p.set("tab", "buy");
      setSearchParams(p, { replace: true });
    }
  }, [activeTab, page, productsData, searchParams, setSearchParams, totalBuyPages]);

  return (
    <>
      <SEO
        title="Mobile Price in Nepal 2026"
        description="Latest mobile phone prices in Nepal. Compare iPhone, Samsung, Xiaomi, OnePlus, and more. Buy from verified stores at Tamrakar Complex."
        url="/cat/mobiles"
        keywords={["mobile price Nepal", "smartphone price Nepal", "buy phone Nepal", "Tamrakar Complex mobiles"]}
        structuredData={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Mobile Phones", url: "/cat/mobiles" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Mobile Price in Nepal",
            description: "All mobile phone prices in Nepal",
            url: absoluteUrl("/cat/mobiles"),
          },
          faqSchema(mobilePriceFaqs),
        ]}
      />

      <Header />
      <CampaignBanner placement="category_top" variant="compact" limit={1} />

      <div className="min-h-screen bg-[linear-gradient(to_bottom,hsl(var(--muted)/.35),hsl(var(--background))_34rem)]">
        <section className="relative isolate overflow-hidden bg-slate-950 text-white">
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />
          <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-violet-500/20 blur-[100px]" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-cyan-400/20 blur-[110px]" />
          <div className="pointer-events-none absolute left-[58%] top-24 h-52 w-32 rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-white/10 to-transparent shadow-[0_40px_90px_rgba(34,211,238,.2)] [transform:perspective(800px)_rotateY(-20deg)_rotateZ(8deg)]" />
          <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-10 md:pb-28 md:pt-16">
            <nav className="mb-9 flex items-center gap-1.5 text-xs text-white/45"><Link to="/" className="transition-colors hover:text-white">Home</Link><ChevronRight className="h-3.5 w-3.5" /><span className="font-medium text-white">Mobile Phones</span></nav>
            <div className="grid items-end gap-10 lg:grid-cols-[1fr_auto]">
              <div className="max-w-3xl animate-fade-up">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-200 backdrop-blur-xl"><Sparkles className="h-3.5 w-3.5" /> Nepal's live device intelligence</div>
                <h1 className="font-display text-4xl font-black leading-[.96] tracking-[-.045em] md:text-6xl lg:text-7xl">Compare smarter.<br /><span className="bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-transparent">Buy with confidence.</span></h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-white/60 md:text-lg">Explore current Nepal pricing, compare specifications and discover products from trusted Tamrakar Complex sellers—all in one focused workspace.</p>
                <div className="mt-7 flex flex-wrap gap-2 text-xs font-semibold text-white/65">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 py-2"><TrendingUp className="h-3.5 w-3.5 text-cyan-300" /> Current market prices</span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 py-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Trusted store offers</span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 py-2"><BadgeCheck className="h-3.5 w-3.5 text-violet-300" /> Verified specifications</span>
                </div>
              </div>
              {canManageCatalog && <Button asChild className="w-fit rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-xl hover:bg-white/20"><Link to="/staffadmin/mobile-master"><Upload className="mr-2 h-4 w-4" />Upload product images</Link></Button>}
            </div>
          </div>
        </section>

        <div className="relative z-10 mx-auto -mt-10 max-w-7xl px-4">
          <div className="rounded-[2rem] border border-white/60 bg-background/85 p-2 shadow-[0_25px_70px_-30px_rgba(15,23,42,.45)] backdrop-blur-2xl">
            <div className="flex gap-1 overflow-x-auto scrollbar-none">
              {DEVICE_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.label}
                    to={cat.href}
                    className={`group flex min-w-[94px] flex-col items-center gap-2 rounded-[1.4rem] px-4 py-3 shrink-0 transition-all duration-300 text-xs font-bold whitespace-nowrap ${
                      isCatActive(cat.href)
                        ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15 -translate-y-0.5"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 ${isCatActive(cat.href) ? "bg-cyan-300 text-slate-950" : "bg-muted group-hover:bg-background"}`}><Icon className="h-5 w-5" /></span>
                    {cat.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">

          {/* Main tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className="flex justify-center overflow-x-auto pb-1">
              <TabsList className="mb-4 h-auto min-w-max rounded-2xl border bg-card p-1.5 shadow-sm">
                <TabsTrigger value="compare" className="rounded-xl px-7 py-3 text-sm font-bold data-[state=active]:bg-slate-950 data-[state=active]:text-white">Compare Phones</TabsTrigger>
                <TabsTrigger value="buy" className="rounded-xl px-7 py-3 text-sm font-bold data-[state=active]:bg-slate-950 data-[state=active]:text-white">Shop Products</TabsTrigger>
              </TabsList>
            </div>

            {/* ── COMPARE TAB ─────────────────────────────────── */}
            <TabsContent value="compare" className="space-y-5 mt-4">
              {/* Search */}
              <div className="relative mx-auto max-w-2xl">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search iPhone, Samsung, Xiaomi…"
                  className="h-14 rounded-2xl border-border/70 bg-card pl-14 pr-5 text-base shadow-[0_16px_45px_-28px_rgba(15,23,42,.5)]"
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
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {SORT_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={sort === opt.value ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSort(opt.value)}
                      className="h-8 px-3 text-xs shrink-0"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Brand filter row */}
              {brands.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <Button
                    variant={activeBrand === null ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-3 text-xs shrink-0"
                    onClick={() => setActiveBrand(null)}
                  >
                    All Brands
                  </Button>
                  {brands.map((b) => (
                    <Button
                      key={b.id}
                      variant={activeBrand === b.id ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 px-2 text-xs gap-1.5 shrink-0"
                      onClick={() => setActiveBrand(b.id === activeBrand ? null : b.id)}
                    >
                      {b.logo ? (
                        <img src={b.logo} alt="" className="w-4 h-4 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <span className="w-4 h-4 rounded-sm bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                          {b.name.charAt(0)}
                        </span>
                      )}
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
                <div className="rounded-xl border bg-card py-16 px-4 text-center">
                  <p className="font-medium text-foreground">No phones found</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try a different brand, search term, or price filter.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setCompareSearch("");
                      setActiveChip(0);
                      setActiveBrand(null);
                      setSort("latest");
                    }}
                  >
                    Reset compare filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {models.map((m, index) => (
                    <div key={m.id} className="animate-fade-up will-change-transform transition-transform duration-500 hover:-translate-y-1" style={{ animationDelay: `${Math.min(index, 9) * 70}ms` }}>
                      <ModelCard model={m} />
                    </div>
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
                        className="flex items-center gap-1.5 text-sm px-3 py-1.5 border rounded-full hover:bg-muted/50 hover:border-primary/40 transition-colors"
                      >
                        {b.logo ? (
                          <img src={b.logo} alt="" className="w-4 h-4 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        ) : (
                          <span className="w-4 h-4 rounded-sm bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                            {b.name.charAt(0)}
                          </span>
                        )}
                        {b.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* SEO content */}
              <section className="border-t pt-6" aria-labelledby="mobile-price-guide">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                    <h2 id="mobile-price-guide">Mobile Phone Price in Nepal</h2>
                    <p>
                      Tamrakar Complex helps buyers compare mobile phone prices in Nepal with specs, variants, availability,
                      purchase offers, and EMI details from verified stores. Browse Apple, Samsung, Xiaomi, Redmi, OnePlus,
                      Realme, Vivo, Oppo, Nothing, Honor, and other phones before you contact a shop or visit New Road.
                    </p>
                    <p>
                      For the best result, compare the listed price with warranty, storage variant, stock status, exchange
                      value, and installment charges. Phone prices can change quickly, so confirm the final invoice amount
                      with the seller before buying.
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card p-4">
                    <h3 className="text-sm font-semibold">Popular price searches</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        "Under Rs. 10,000",
                        "Under Rs. 15,000",
                        "Under Rs. 20,000",
                        "Under Rs. 25,000",
                        "Under Rs. 30,000",
                        "5G phones",
                        "Latest phones",
                      ].map((label) => (
                        <span key={label} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {mobilePriceFaqs.map((item) => (
                    <div key={item.question} className="rounded-lg border bg-card p-4">
                      <h3 className="text-sm font-semibold">{item.question}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            </TabsContent>

            {/* ── BUY TAB ─────────────────────────────────────── */}
            <TabsContent value="buy" className="mt-4">
              {/* Category pills */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-5">
                {productCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleProductCategoryChange(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                      (categoryParam === cat || (cat === "All" && categoryParam === "All"))
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
                    {categoryParam !== "All" ? <span> in {categoryParam}</span> : null}
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
                        {productsData.items.map((product, index) => (
                          <div key={product.id} className="animate-fade-up will-change-transform transition-transform duration-500 hover:-translate-y-1" style={{ animationDelay: `${Math.min(index, 9) * 70}ms` }}>
                            <ProductCard product={product} />
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {productsData.total > BUY_PAGE_SIZE && (
                        <nav className="flex flex-wrap items-center justify-center gap-2 pt-4" aria-label="Product pages">
                          <Button
                            variant="outline"
                            disabled={page <= 1}
                            onClick={() => handleBuyPageChange(page - 1)}
                          >
                            Previous
                          </Button>
                          {visibleBuyPages.map((pageNumber) => (
                            <Button
                              key={pageNumber}
                              type="button"
                              variant={pageNumber === page ? "default" : "outline"}
                              size="icon"
                              className="h-10 w-10"
                              aria-label={`Go to product page ${pageNumber}`}
                              aria-current={pageNumber === page ? "page" : undefined}
                              onClick={() => handleBuyPageChange(pageNumber)}
                            >
                              {pageNumber}
                            </Button>
                          ))}
                          <Button
                            variant="outline"
                            disabled={page >= totalBuyPages}
                            onClick={() => handleBuyPageChange(page + 1)}
                          >
                            Next
                          </Button>
                          <span className="basis-full text-center text-xs text-muted-foreground">
                            Page {page} of {totalBuyPages}
                          </span>
                        </nav>
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl border bg-card text-center py-12 px-4">
                      <p className="font-medium text-foreground">No {categoryParam === "All" ? "products" : categoryParam} found</p>
                      <p className="mt-1 text-sm text-muted-foreground">Clear filters or try another product category.</p>
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => { const p = new URLSearchParams(); p.set("tab", "buy"); setSearchParams(p); }}>
                        Reset buy filters
                      </Button>
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
