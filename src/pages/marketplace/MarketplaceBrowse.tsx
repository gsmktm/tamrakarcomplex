import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { CheckCircle2, MapPin, Search, Filter, X, Edit, Trash2, Store, ShieldCheck, ArrowRight, Tag, Clock, Phone, Lock } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { isAdminRole } from "@/lib/roles";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { SafeImage } from "@/components/common/SafeImage";
import type { SellListingRow } from "@/types/app";
import { decodeListingDescription, formatCondition } from "@/lib/listingMeta";
import { getPublicStorePath } from "@/lib/storeRoutes";
import { getFallbackStoreCards } from "@/services/publicFallbackData";
import { canShowPhoneNumber, getPackageBadgeLabel, getPackageBadgeClassName } from "@/lib/storePackages";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { useMarketplaceListings } from "@/hooks/useMarketplaceListings";

export default function MarketplaceBrowse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const conditionParam = searchParams.get("condition");
  const minPriceParam = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const maxPriceParam = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
  const searchParam = searchParams.get("q") || searchParams.get("search") || "";

  const storeIdParam = searchParams.get("store") || searchParams.get("storeId");

  const [activeCategory, setActiveCategory] = useState<string>((categoryParam || "all").toLowerCase());
  const [activeCondition, setActiveCondition] = useState<string>((conditionParam || "all").toLowerCase());
  const [priceRange, setPriceRange] = useState<[number, number]>([minPriceParam ?? 0, maxPriceParam ?? 500000]);
  const [search, setSearch] = useState(searchParam);
  const debouncedSearch = useDebounce(search, 400);

  const [selectedBrands, setSelectedBrands] = useState<string[]>(searchParams.get("brands")?.split(",").filter(Boolean) || []);
  const [selectedConditions, setSelectedConditions] = useState<string[]>(searchParams.get("conditions")?.split(",").filter(Boolean) || []);
  const [sortBy, setSortBy] = useState<string>(searchParams.get("sort") || "newest");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const ITEMS_PER_PAGE = 12;

  const categories = [
    { key: "all", label: "All Categories" },
    { key: "mobile", label: "Mobiles" },
    { key: "laptop", label: "Laptops" },
    { key: "tablet", label: "Tablets" },
    { key: "used", label: "Used Phones" },
    { key: "repair", label: "Repair Services" },
    { key: "accessories", label: "Accessories" },
    { key: "smartwatch", label: "Smartwatches" },
    { key: "audio", label: "Earbuds & Audio" },
    { key: "drone", label: "Drones" },
    { key: "camera", label: "Cameras" },
    { key: "gaming", label: "Gaming & Consoles" },
    { key: "monitor", label: "Monitors" },
    { key: "desktop", label: "Desktops" },
    { key: "tv", label: "TV & Appliances" },
  ];

  const [storeFilterId, setStoreFilterId] = useState<string | null>(storeIdParam || null);
  const [resolvedStoreId, setResolvedStoreId] = useState<string | null>(null);
  const [storeFilterName, setStoreFilterName] = useState<string | null>(null);
  
  const { user, role } = useAuth();
  const isAdmin = isAdminRole(role);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    setSearchParams(params);
  };
  type ListingWithShop = SellListingRow & {
    source_type?: "store_product" | "user_listing";
    owner_user_id?: string | null;
    created_by?: string | null;
    catalog_product_id?: string | null;
    stock?: number | null;
    shop_name?: string;
    store_package_slug?: string | null;
    store_is_featured?: boolean | null;
    store?: {
      id: string;
      name: string;
      slug?: string | null;
      seo_slug?: string | null;
      location: string;
      logo_url: string | null;
      is_verified: boolean | null;
      is_featured?: boolean | null;
      package_slug?: string | null;
      subscription_status: string | null;
    } | null;
  };

  type StoreCard = {
    id: string;
    name: string;
    slug?: string | null;
    seo_slug?: string | null;
    location: string;
    logo_url: string | null;
    is_verified: boolean | null;
    is_featured?: boolean | null;
    package_slug?: string | null;
    services: string[] | null;
    subscription_status: string | null;
  };

  const TIER_ORDER: Record<string, number> = { diamond: 4, gold: 3, silver: 2, free: 1 };
  const sortStoresByTier = (stores: StoreCard[]) =>
    [...stores].sort((a, b) => {
      const wa = (TIER_ORDER[a.package_slug ?? "free"] ?? 1) + (a.is_featured ? 1 : 0);
      const wb = (TIER_ORDER[b.package_slug ?? "free"] ?? 1) + (b.is_featured ? 1 : 0);
      return wb - wa;
    });

  const { data: featuredStores, isLoading: isStoresLoading } = useQuery({
    queryKey: ["marketplace_featured_stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id,name,slug,seo_slug,location,logo_url,is_verified,is_featured,package_slug,services,subscription_status")
        .eq("is_active", true)
        .limit(20);

      if (error || !data?.length) {
        return getFallbackStoreCards(12);
      }

      return sortStoresByTier(data as StoreCard[]).slice(0, 12);
    },
    staleTime: 60_000,
  });

  const { data: listingsData, loading: isListingsLoading } = useMarketplaceListings({
    category: activeCategory !== "all" ? activeCategory : undefined,
    condition: activeCondition !== "all" ? activeCondition : undefined,
    min_price: priceRange[0],
    max_price: priceRange[1],
    search: debouncedSearch,
    store_id: resolvedStoreId || (storeFilterId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeFilterId) ? storeFilterId : undefined),
    brands: selectedBrands.length > 0 ? selectedBrands : undefined,
    conditions: selectedConditions.length > 0 ? selectedConditions : undefined,
    limit: ITEMS_PER_PAGE,
    offset: (page - 1) * ITEMS_PER_PAGE,
    sort_by: sortBy,
  });

  const listings: ListingWithShop[] = (listingsData?.listings || [])
    .map(l => ({
      ...l,
      title: l.title || "Untitled",
      price: l.price || 0,
      condition: l.condition || "used",
      images: l.images || [],
      user_id: l.user_id || l.owner_user_id || "",
      created_at: l.created_at || new Date().toISOString(),
      status: l.status || "active",
      brand: l.brand || null,
      model: l.model || null,
      category: l.category || null,
      description: l.description || null,
      location: l.location || null,
      verified: l.verified || false,
      featured: l.featured || false,
      updated_at: l.updated_at || new Date().toISOString(),
    } as unknown as ListingWithShop)) as ListingWithShop[];
  const totalPages = Math.ceil((listingsData?.total || 0) / ITEMS_PER_PAGE);
  const paginatedListings = listings;
  const verifiedStoresCount = (featuredStores || []).filter((s) => s.is_verified).length;

  const handleDelete = async (listing: ListingWithShop) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;

    const table = listing.source_type === "store_product" ? "store_products" : "sell_listings";
    
    const { error } = await (supabase as any)
      .from(table)
      .delete()
      .eq("id", listing.id);
      
    if (error) {
      toast.error("Failed to delete listing");
    } else {
      toast.success("Listing deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["sell_listings"] });
      queryClient.invalidateQueries({ queryKey: ["store_products"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
    }
  };

  const brands = ["Acer", "Apple", "Asus", "Dell", "Google", "Honor", "HP", "Huawei", "Lenovo", "Motorola", "MSI", "Nokia", "Nothing", "OnePlus", "Oppo", "Realme", "Samsung", "Sony", "Vivo", "Xiaomi"];
  const conditions = [
    { id: "new", label: "Brand New" },
    { id: "like_new", label: "Like New" },
    { id: "refurbished", label: "Refurbished" },
    { id: "used", label: "Used / Good" },
    { id: "fair", label: "Fair" }
  ];
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = (params.get("category") || "all").toLowerCase();
    setActiveCategory(cat);

    const cond = (params.get("condition") || "all").toLowerCase();
    setActiveCondition(cond);

    const store = params.get("store") || params.get("storeId");
    if (store !== storeFilterId) {
      setStoreFilterId(store ? String(store) : null);
      if (!store) {
        setResolvedStoreId(null);
        setStoreFilterName(null);
      }
    }
    const p = Number(params.get("page")) || 1;
    setPage(p);

    const s = params.get("q") || params.get("search") || "";
    setSearch(s);
    
    const sort = params.get("sort") || "newest";
    setSortBy(sort);

    const brands = params.get("brands")?.split(",").filter(Boolean) || [];
    setSelectedBrands(brands);

    const conditions = params.get("conditions")?.split(",").filter(Boolean) || [];
    setSelectedConditions(conditions);
  }, [location.search]);

  useEffect(() => {
    if (!storeFilterId) {
      setStoreFilterName(null);
      setResolvedStoreId(null);
      return;
    }

    void (async () => {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeFilterId);
        const query = supabase
          .from("stores")
          .select("id,name");
        const { data } = await (isUuid
          ? query.or(`id.eq.${storeFilterId},slug.eq.${storeFilterId},seo_slug.eq.${storeFilterId}`)
          : query.or(`slug.eq.${storeFilterId},seo_slug.eq.${storeFilterId}`))
          .maybeSingle();
        
        setStoreFilterName(data?.name ?? null);
        setResolvedStoreId(data?.id ?? null);
      } catch {
        setStoreFilterName(null);
        setResolvedStoreId(null);
      }
    })();
  }, [storeFilterId]);

  useEffect(() => {
    setPriceRange([minPriceParam ?? 0, maxPriceParam ?? 500000]);
  }, [minPriceParam, maxPriceParam]);
  const toggleBrand = (brand: string) => {
    const next = selectedBrands.includes(brand) 
      ? selectedBrands.filter(b => b !== brand) 
      : [...selectedBrands, brand];
    setSelectedBrands(next);
    updateSearchParams({ brands: next.length > 0 ? next.join(",") : null, page: "1" });
  };

  const toggleCondition = (condition: string) => {
    const next = selectedConditions.includes(condition) 
      ? selectedConditions.filter(c => c !== condition) 
      : [...selectedConditions, condition];
    setSelectedConditions(next);
    updateSearchParams({ conditions: next.length > 0 ? next.join(",") : null, page: "1" });
  };

  const FilterContent = () => (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold mb-4 flex items-center text-base"><Tag className="w-4 h-4 mr-2 text-primary" /> Brands</h3>
        <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
          {brands.map(brand => (
            <div key={brand} className="flex items-center space-x-3">
              <Checkbox 
                id={`brand-${brand}`} 
                checked={selectedBrands.includes(brand)}
                onCheckedChange={() => toggleBrand(brand)}
                className="rounded-[4px]"
              />
              <label htmlFor={`brand-${brand}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                {brand}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-4 flex items-center text-base"><CheckCircle2 className="w-4 h-4 mr-2 text-primary" /> Condition</h3>
        <div className="space-y-3">
          {conditions.map(condition => (
            <div key={condition.id} className="flex items-center space-x-3">
              <Checkbox 
                id={`condition-${condition.id}`} 
                checked={selectedConditions.includes(condition.id)}
                onCheckedChange={() => toggleCondition(condition.id)}
                className="rounded-[4px]"
              />
              <label htmlFor={`condition-${condition.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                {condition.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-4 text-base">Price Range</h3>
        <div className="px-2">
          <Slider
            defaultValue={[0, 500000]}
            max={500000}
            step={5000}
            value={priceRange}
            onValueChange={(value) => setPriceRange(value as [number, number])}
            className="mb-5"
          />
          <div className="flex items-center justify-between text-sm font-medium">
            <div className="bg-secondary px-3 py-1.5 rounded-md">Rs. {priceRange[0].toLocaleString()}</div>
            <div className="text-muted-foreground">-</div>
            <div className="bg-secondary px-3 py-1.5 rounded-md">Rs. {priceRange[1].toLocaleString()}</div>
          </div>
        </div>
      </div>
      
      <Button 
        variant="outline" 
        className="w-full border-dashed"
        onClick={() => {
          setSelectedBrands([]);
          setSelectedConditions([]);
          setPriceRange([0, 500000]);
          setSearch("");
        }}
      >
        Clear Filters
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <SEO
        title="Marketplace - Buy & Sell Electronics in Nepal"
        description="Nepal's premier tech marketplace. Buy, sell, and trade electronics directly with verified stores and trusted community members."
        url="/marketplace"
        keywords={["marketplace Nepal", "mobile marketplace", "laptop marketplace", "used phones Nepal", "sell tech", "buy gadgets"]}
      />
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 dark:bg-slate-950 border-b">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px] translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-emerald-500/8 blur-[100px] -translate-x-1/4 translate-y-1/4" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_60%,hsl(var(--background))_100%)]" />
        </div>

        <div className="container relative py-14 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white/90 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Nepal's Premier Tech Marketplace
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-[1.08]">
            Buy & Sell Gadgets<br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-cyan-400">
              {" "}With Confidence
            </span>
          </h1>

          <p className="text-base md:text-lg text-white/60 max-w-2xl mx-auto mb-10">
            Discover great deals from verified stores and a trusted community across Nepal. 100% genuine listings.
          </p>

          {/* Stats bar */}
          <div className="flex flex-wrap items-center justify-center gap-8 mb-10">
            {[
              { val: `${listingsData?.total ?? 0}+`, label: "Active Listings" },
              { val: `${verifiedStoresCount}+`, label: "Verified Stores" },
              { val: "100%", label: "Genuine Products" },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-black text-white">{val}</div>
                <div className="text-xs text-white/50 uppercase tracking-wider font-semibold">{label}</div>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/10 backdrop-blur border border-white/20 p-2 rounded-2xl shadow-xl">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <Input
                  placeholder="Search iPhones, MacBooks, Samsung..."
                  className="pl-12 h-14 border-0 focus-visible:ring-0 text-base bg-transparent text-white placeholder:text-white/40"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    updateSearchParams({ q: e.target.value || null, page: "1" });
                  }}
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch("");
                      updateSearchParams({ q: null, page: "1" });
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto px-2 pb-2 sm:p-0">
                <Button
                  onClick={() => {
                    if (!user) navigate("/auth", { state: { from: "/marketplace/sell" } });
                    else navigate("/marketplace/sell");
                  }}
                  size="lg"
                  className="w-full sm:w-auto h-14 px-8 rounded-xl hero-gradient shadow-glow font-bold"
                >
                  Sell an Item
                </Button>
              </div>
            </div>
          </div>

                  <div className="mt-10 flex flex-wrap justify-center gap-2.5">
                    {categories.map((c) => {
                      const active = activeCategory === c.key;
                      return (
                        <div 
                          key={c.key}
                          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border cursor-pointer ${
                            active
                              ? "bg-primary text-white border-primary shadow-glow"
                              : "bg-white/8 text-white/70 border-white/15 hover:border-white/40 hover:bg-white/15 hover:text-white"
                          }`}
                          onClick={() => {
                            setActiveCategory(c.key);
                            updateSearchParams({ category: c.key === "all" ? null : c.key, page: "1" });
                          }}
                        >
                          {c.label}
                        </div>
                      );
                    })}
                  </div>
        </div>
      </section>

      <div className="container py-12 flex-1 space-y-16">
        {storeFilterId ? (
          <div className="flex flex-col gap-3 rounded-2xl border bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <span className="font-semibold">Filtered by store:</span>{" "}
              <span className="text-muted-foreground">{storeFilterName ?? storeFilterId}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateSearchParams({ store: null, storeId: null, page: "1" });
              }}
            >
              Clear Store Filter
            </Button>
          </div>
        ) : null}
        
        {/* Trusted Stores Banner */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center">
                <ShieldCheck className="mr-2 h-6 w-6 text-primary" />
                Trusted Stores
              </h2>
              <p className="text-muted-foreground mt-1">Shop from verified tech stores and official retailers.</p>
            </div>
            <Button variant="ghost" asChild className="text-primary hover:text-primary hover:bg-primary/5 hidden sm:flex">
              <Link to="/stores">View all stores <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>

          {isStoresLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl border bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(featuredStores || []).slice(0, 4).map((store) => (
                <Link to={getPublicStorePath(store)} key={store.id}>
                  <Card className="hover:shadow-md transition-all hover:border-primary/30 group bg-white dark:bg-slate-900 border-border/60">
                    <CardContent className="p-4 flex items-center gap-4">
                      {store.logo_url ? (
                        <img
                          src={store.logo_url}
                          alt={store.name}
                          className="h-14 w-14 rounded-full object-cover border border-border/60 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                          {store.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                            {store.name}
                          </h3>
                          {store.is_verified && <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <p className="text-xs text-muted-foreground truncate flex items-center">
                            <MapPin className="h-3 w-3 mr-1 shrink-0" />
                            {store.location || "Nepal"}
                          </p>
                          {getPackageBadgeLabel(store.package_slug, store.is_featured ?? false) && (
                            <span className={`text-[8px] px-1 py-0.5 rounded uppercase tracking-wide shrink-0 ${getPackageBadgeClassName(store.package_slug, store.is_featured ?? false)}`}>
                              {getPackageBadgeLabel(store.package_slug, store.is_featured ?? false)}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Main Marketplace Area */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Marketplace Listings</h2>
              <p className="text-muted-foreground mt-2">Browse {listingsData?.total || 0} active listings from across Nepal.</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-10">
            {/* Mobile Filters */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full h-12 flex items-center justify-center gap-2 bg-white">
                    <Filter className="h-4 w-4" /> 
                    Show Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full sm:w-[340px]">
                  <SheetHeader className="mb-6">
                    <SheetTitle>Filter Listings</SheetTitle>
                  </SheetHeader>
                  <FilterContent />
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Filters */}
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="sticky top-24 bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold">Filters</h2>
                  <Filter className="h-5 w-5 text-muted-foreground" />
                </div>
                <FilterContent />
              </div>
            </aside>

            {/* Products Grid */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-900 border p-3 rounded-xl mb-6 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground px-2">
                  Showing <span className="text-foreground">{listings.length}</span> results
                </p>
                <Select value={sortBy} onValueChange={(val) => {
                  setSortBy(val);
                  updateSearchParams({ sort: val });
                }}>
                  <SelectTrigger className="w-full sm:w-[200px] border-0 bg-secondary/50 focus:ring-0 mt-3 sm:mt-0">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isListingsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-[400px] rounded-2xl border bg-muted/20 animate-pulse" />
                  ))}
                </div>
              ) : listings?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {paginatedListings.map((listing) => {
                    const { meta } = decodeListingDescription(listing.description);
                    const conditionLabel = formatCondition(listing.condition);
                    const showBrand = listing.brand ? String(listing.brand) : "";
                    const showModel = listing.model ? String(listing.model) : "";
                    const showDevice = [showBrand, showModel].filter(Boolean).join(" ");
                    
                    // Format date nicely
                    const date = new Date(listing.created_at);
                    const isToday = new Date().toDateString() === date.toDateString();
                    const postedOn = isToday ? "Today" : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    
                    const isHiddenLocation = Boolean(meta?.hide_precise_location);
                    const locationLabel = listing.location || "Nepal";
                    const shownLocation = isHiddenLocation ? locationLabel.split(",")[0]?.trim() || locationLabel : locationLabel;
                    const store = (listing as ListingWithShop).store;

                    const conditionColor =
                      listing.condition === "new" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                      listing.condition === "like_new" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                      listing.condition === "used" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                      "bg-red-500/20 text-red-400 border-red-500/30";

                    const storePkg = store?.package_slug ?? listing.store_package_slug ?? "free";
                    const storeIsFeatured = store?.is_featured ?? listing.store_is_featured ?? false;
                    const badgeLabel = getPackageBadgeLabel(storePkg, storeIsFeatured);
                    const badgeCn = getPackageBadgeClassName(storePkg, storeIsFeatured);
                    const contact = canShowPhoneNumber(storePkg, {
                      isActive: true,
                      isFeatured: storeIsFeatured,
                      featuredContactVisible: storeIsFeatured,
                      isLoggedIn: !!user,
                    });

                    return (
                      <Link to={`/marketplace/listing/${listing.id}`} key={listing.id} className="group block">
                        <Card className="h-full overflow-hidden bg-card border-border/50 hover:border-primary/50 hover:shadow-elevated transition-all duration-300 rounded-2xl flex flex-col">
                          <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                            <SafeImage
                              src={listing.images && listing.images.length > 0 ? listing.images[0] : null}
                              alt={listing.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />

                            {/* Condition badge */}
                            <div className="absolute top-3 left-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border backdrop-blur-sm ${conditionColor}`}>
                                {conditionLabel}
                              </span>
                            </div>

                            {/* Admin/Owner Actions */}
                            {(isAdmin || user?.id === (listing.user_id || listing.owner_user_id)) && (
                              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="icon" variant="secondary" asChild className="h-8 w-8 rounded-full shadow-sm bg-black/60 backdrop-blur hover:bg-black/80 text-white">
                                  <Link to={listing.source_type === "store_product" ? "/storeadmin/products" : `/marketplace/edit/${listing.id}`} onClick={(e) => e.stopPropagation()}>
                                    <Edit className="h-4 w-4" />
                                  </Link>
                                </Button>
                                <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full shadow-sm" onClick={(e) => {
                                  e.preventDefault();
                                  handleDelete(listing);
                                }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>

                          <CardContent className="p-4 flex-1 flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-2xl font-black text-foreground tracking-tight">
                                Rs.{listing.price.toLocaleString()}
                              </span>
                              {badgeLabel && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0 ${badgeCn}`}>
                                  {badgeLabel}
                                </span>
                              )}
                            </div>

                            <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                              {listing.title}
                            </h3>

                            <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground pt-1">
                              {showDevice && (
                                <span className="bg-secondary px-2 py-0.5 rounded font-medium truncate">{showDevice}</span>
                              )}
                              <span className="flex items-center gap-1 shrink-0 ml-auto">
                                <MapPin className="h-3 w-3" />
                                {shownLocation}
                              </span>
                            </div>
                          </CardContent>

                          <CardFooter className="px-4 py-3 border-t flex flex-col gap-2">
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2 overflow-hidden">
                                {store ? (
                                  <>
                                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                      <Store className="h-3 w-3 text-primary" />
                                    </div>
                                    <span className="text-xs font-semibold text-foreground truncate">{store.name}</span>
                                    {store.is_verified && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                                  </>
                                ) : listing.shop_name ? (
                                  <>
                                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                                      <Store className="h-3 w-3 text-muted-foreground" />
                                    </div>
                                    <span className="text-xs font-medium text-foreground truncate">{listing.shop_name}</span>
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Private Seller</span>
                                )}
                              </div>
                              <div className="flex items-center text-xs text-muted-foreground shrink-0 ml-2">
                                <Clock className="h-3 w-3 mr-1" />
                                {postedOn}
                              </div>
                            </div>
                            {/* Contact button — visibility controlled by package tier */}
                            {store && (
                              <div
                                className="w-full"
                                onClick={(e) => e.preventDefault()}
                              >
                                {contact.showPhone ? (
                                  <a
                                    href={`/stores/${store.seo_slug || store.slug || store.id}`}
                                    className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Phone className="h-3 w-3" />
                                    {contact.buttonText}
                                  </a>
                                ) : (
                                  <Link
                                    to="/auth"
                                    className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-medium transition-colors border border-dashed"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Lock className="h-3 w-3" />
                                    {contact.buttonText}
                                  </Link>
                                )}
                              </div>
                            )}
                          </CardFooter>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed">
                  <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No listings found</h3>
                  <p className="text-muted-foreground max-w-md mb-6">
                    We couldn't find any gadgets matching your current filters. Try adjusting your search criteria or browse all categories.
                  </p>
                  <Button onClick={() => {
                    setSelectedBrands([]);
                    setSelectedConditions([]);
                    setPriceRange([0, 300000]);
                    setSearch("");
                    setActiveCategory("all");
                  }}>
                    Clear All Filters
                  </Button>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-10 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => {
                            const newPage = Math.max(1, page - 1);
                            setPage(newPage);
                            updateSearchParams({ page: newPage.toString() });
                            window.scrollTo({ top: 400, behavior: "smooth" });
                          }}
                          className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {[...Array(totalPages)].map((_, i) => {
                        // Logic to show limited pagination pages
                        const pageNum = i + 1;
                        if (
                          pageNum === 1 || 
                          pageNum === totalPages || 
                          (pageNum >= page - 1 && pageNum <= page + 1)
                        ) {
                          return (
                            <PaginationItem key={i}>
                              <PaginationLink 
                                isActive={page === pageNum}
                                onClick={() => {
                                  setPage(pageNum);
                                  updateSearchParams({ page: pageNum.toString() });
                                  window.scrollTo({ top: 400, behavior: "smooth" });
                                }}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        } else if (
                          pageNum === page - 2 || 
                          pageNum === page + 2
                        ) {
                          return <PaginationItem key={i}><span className="px-4 py-2 text-muted-foreground">...</span></PaginationItem>;
                        }
                        return null;
                      })}

                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => {
                            const newPage = Math.min(totalPages, page + 1);
                            setPage(newPage);
                            updateSearchParams({ page: newPage.toString() });
                            window.scrollTo({ top: 400, behavior: "smooth" });
                          }}
                          className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Sell CTA Banner */}
        <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-blue-500/5 dark:to-blue-900/10 p-8 md:p-12 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl text-center md:text-left">
              <h2 className="text-3xl font-bold tracking-tight mb-3">Looking to sell your device?</h2>
              <p className="text-lg text-muted-foreground">
                Join thousands of users and verified stores. List your gadget in minutes and reach buyers across Nepal.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 shrink-0">
              <Button size="lg" className="h-14 px-8 rounded-xl text-base" onClick={() => {
                if (!user) navigate("/auth", { state: { from: "/marketplace/sell" } });
                else navigate("/marketplace/sell");
              }}>
                Post a Listing for Free
              </Button>
              <Button variant="outline" size="lg" className="h-14 px-8 rounded-xl text-base bg-white/50 dark:bg-slate-900/50 backdrop-blur" asChild>
                <Link to="/stores/apply">Register as a Store</Link>
              </Button>
            </div>
          </div>
        </section>

      </div>
      <Footer />
    </div>
  );
}
