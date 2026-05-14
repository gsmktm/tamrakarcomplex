import { useState, useCallback, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { usePublicPriceList, usePriceListBrands } from "@/hooks/usePriceList";

interface CatalogProductWithBrand {
  id: string;
  name: string;
  slug: string;
  brand?: { name: string; logo_url?: string };
  model?: { name: string };
  variant?: { storage?: string; ram?: string; color?: string };
  image_url?: string;
  specs_json: Record<string, unknown>;
  official_price?: number;
  market_price?: number;
  price_npr?: number;
  price_text?: string;
  source_url?: string;
  source_site?: string;
  verified: boolean;
  is_active: boolean;
}
import { ProductCard } from "@/components/products/ProductCard";
import type { Product } from "@/hooks/useProducts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Smartphone, Search, Filter, LayoutGrid, List,
  ChevronDown, X, ArrowUpDown, ExternalLink,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Brand visual metadata ────────────────────────────────────────────────────
const BRAND_META: Record<string, { bg: string; text: string; slug: string }> = {
  Apple:    { bg: "#000000", text: "#ffffff", slug: "apple" },
  Samsung:  { bg: "#1428A0", text: "#ffffff", slug: "samsung" },
  Xiaomi:   { bg: "#FF6700", text: "#ffffff", slug: "xiaomi" },
  OnePlus:  { bg: "#F3122E", text: "#ffffff", slug: "oneplus" },
  Realme:   { bg: "#FFCD00", text: "#000000", slug: "realme" },
  Vivo:     { bg: "#415FFF", text: "#ffffff", slug: "vivo" },
  OPPO:     { bg: "#05BA4B", text: "#ffffff", slug: "oppo" },
  Nokia:    { bg: "#001135", text: "#ffffff", slug: "nokia" },
  Motorola: { bg: "#000000", text: "#ffffff", slug: "motorola" },
  Huawei:   { bg: "#FF0000", text: "#ffffff", slug: "huawei" },
  Honor:    { bg: "#000000", text: "#ffffff", slug: "honor" },
  Tecno:    { bg: "#00529B", text: "#ffffff", slug: "tecnomobile" },
  Infinix:  { bg: "#000000", text: "#ffffff", slug: "infinix" },
  Poco:     { bg: "#000000", text: "#FFCD00", slug: "poco" },
  Redmi:    { bg: "#FF6700", text: "#ffffff", slug: "xiaomi" },
  Itel:     { bg: "#FF6600", text: "#ffffff", slug: "itel" },
  Sony:     { bg: "#000000", text: "#ffffff", slug: "sony" },
  Asus:     { bg: "#00539B", text: "#ffffff", slug: "asus" },
  Google:   { bg: "#4285F4", text: "#ffffff", slug: "google" },
  Nothing:  { bg: "#000000", text: "#ffffff", slug: "nothing" },
  ZTE:      { bg: "#000000", text: "#ffffff", slug: "zte" },
  "Ai+":    { bg: "#000000", text: "#ffffff", slug: "aiplus" },
  Coolpad:  { bg: "#000000", text: "#ffffff", slug: "coolpad" },
  Benco:    { bg: "#000000", text: "#ffffff", slug: "benco" },
};

// ─── Budget brackets ──────────────────────────────────────────────────────────
const BUDGET_BRACKETS = [
  { label: "Under Rs. 15K", min: 0,      max: 15000  },
  { label: "Rs. 15K–30K",   min: 15000,  max: 30000  },
  { label: "Rs. 30K–50K",   min: 30000,  max: 50000  },
  { label: "Rs. 50K–1L",    min: 50000,  max: 100000 },
  { label: "Above Rs. 1L",  min: 100000, max: 999999 },
];

// ─── Spec extractor (handles flat and nested specs) ───────────────────────────
function extractSpec(specs: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  if (!specs) return "—";
  const lowerKeys = keys.map((k) => k.toLowerCase());
  for (const [rawKey, val] of Object.entries(specs)) {
    if (lowerKeys.includes(rawKey.toLowerCase())) {
      if (typeof val === "string" || typeof val === "number") return String(val);
    }
    // nested object section (e.g. specs.Display.Size)
    if (typeof val === "object" && val !== null) {
      for (const [subKey, subVal] of Object.entries(val as Record<string, unknown>)) {
        if (lowerKeys.includes(subKey.toLowerCase())) {
          if (typeof subVal === "string" || typeof subVal === "number") return String(subVal);
        }
      }
    }
  }
  return "—";
}

// ─── Brand initial avatar ─────────────────────────────────────────────────────
function BrandAvatar({ brand, size = 36 }: { brand: string; size?: number }) {
  const meta = BRAND_META[brand];
  
  if (meta?.slug) {
    const logoUrl = `https://cdn.simpleicons.org/${meta.slug}/${meta.bg.replace("#", "")}`;
    return (
      <div 
        className="inline-flex items-center justify-center rounded-full bg-secondary/50 shrink-0 select-none overflow-hidden"
        style={{ width: size, height: size, padding: size * 0.2 }}
      >
          <img 
            src={logoUrl} 
            alt={brand} 
            className="w-full h-full object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              if (target.parentElement) {
                target.parentElement.innerHTML = `<span>${brand.slice(0, 1)}</span>`;
              }
            }}
          />
      </div>
    );
  }

  const fallbackMeta = meta ?? { bg: "#6366f1", text: "#ffffff" };
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-bold shrink-0 select-none"
      style={{ 
        width: size, 
        height: size, 
        background: fallbackMeta.bg, 
        color: fallbackMeta.text, 
        fontSize: size * 0.38 
      }}
    >
      {brand.slice(0, 2).toUpperCase()}
    </span>
  );
}

function toProductCardProduct(product: CatalogProductWithBrand): Product {
  const officialPrice = product.official_price ?? product.price_npr ?? null;
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brand: product.brand?.name ?? null,
    price: officialPrice ? `Rs. ${officialPrice.toLocaleString()}` : product.price_text || "—",
    price_value: officialPrice,
    image: product.image_url || "/default-product.svg",
    rating: null,
    category: "Mobile",
    specs: product.specs_json as Record<string, string | number | boolean> | null,
    in_stock: product.is_active,
    source_url: product.source_url,
    source_site: product.source_site,
  };
}

// ─── Product table row ────────────────────────────────────────────────────────
function ProductTableRow({ product, rank }: { product: CatalogProductWithBrand; rank: number }) {
  const specs = product.specs_json as Record<string, unknown> | null;
  const screen  = extractSpec(specs, "screen", "display", "Size", "Display Size");
  const ram     = extractSpec(specs, "ram", "RAM", "Memory");
  const battery = extractSpec(specs, "battery", "Battery", "Capacity");
  const camera  = extractSpec(specs, "camera", "Camera", "Main Camera", "Rear Camera");
  const storage = extractSpec(specs, "storage", "Storage", "Internal");
  const officialPrice = product.official_price ?? product.price_npr;
  const priceDisplay = officialPrice ? `Rs. ${officialPrice.toLocaleString()}` : product.price_text || "—";

  return (
    <tr className="group border-b border-border/50 hover:bg-muted/40 transition-colors">
      <td className="py-3 px-3 text-sm text-muted-foreground font-mono w-8 text-center">{rank}</td>
      <td className="py-2 px-3 w-14">
        <Link to={`/product/${product.slug}`}>
          <img
            src={product.image_url || "/default-product.svg"}
            alt={product.name}
            className="w-11 h-11 object-contain rounded-lg border bg-secondary/30"
            onError={(e) => { (e.target as HTMLImageElement).src = "/default-product.svg"; }}
          />
        </Link>
      </td>
      <td className="py-2 px-3 min-w-[180px]">
        <Link to={`/product/${product.slug}`} className="font-semibold text-sm hover:text-primary transition-colors line-clamp-2">
          {product.name}
        </Link>
        {product.brand && (
          <Link
            to={`/mobile-price/brand/${product.brand.name?.toLowerCase()}`}
            className="text-xs text-muted-foreground hover:text-primary transition-colors mt-0.5 block"
          >
            {product.brand.name}
          </Link>
        )}
      </td>
      <td className="py-2 px-3 text-xs text-muted-foreground hidden md:table-cell">{screen}</td>
      <td className="py-2 px-3 text-xs text-muted-foreground hidden lg:table-cell">{ram}{storage !== "—" ? ` / ${storage}` : ""}</td>
      <td className="py-2 px-3 text-xs text-muted-foreground hidden xl:table-cell">{camera}</td>
      <td className="py-2 px-3 text-xs text-muted-foreground hidden xl:table-cell">{battery}</td>
      <td className="py-2 px-3 whitespace-nowrap">
        <div className="font-bold text-primary text-sm">{priceDisplay}</div>
      </td>
      <td className="py-2 px-3">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link to={`/product/${product.slug}`}>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
              View <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
          <Link to={`/sell-your-phone?from=price-list&brand=${encodeURIComponent(product.brand?.name || "")}&model=${encodeURIComponent(product.name || "")}`}>
            <Button size="sm" className="h-7 text-xs gap-1 bg-primary/80 hover:bg-primary">
              Sell <Smartphone className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </td>
    </tr>
  );
}

// ─── Sidebar filter ───────────────────────────────────────────────────────────
function SidebarFilters({
  brands,
  selectedBrand,
  onBrandChange,
  priceRange,
  setPriceRange,
  onPriceApply,
  onClear,
}: {
  brands: { id: string, name: string }[];
  selectedBrand: string | null;
  onBrandChange: (b: string) => void;
  priceRange: [number, number];
  setPriceRange: (v: [number, number]) => void;
  onPriceApply: () => void;
  onClear: () => void;
}) {
  const [brandSearch, setBrandSearch] = useState("");
  const filtered = brands.filter((b) => b.name.toLowerCase().includes(brandSearch.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Brands</h3>
          {selectedBrand && (
            <button onClick={onClear} className="text-xs text-muted-foreground hover:text-primary">Clear</button>
          )}
        </div>
        {brands.length > 6 && (
          <Input
            placeholder="Search brands…"
            value={brandSearch}
            onChange={(e) => setBrandSearch(e.target.value)}
            className="h-8 text-xs mb-2"
          />
        )}
        <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
          {filtered.map((brand) => (
            <button
              key={brand.id}
              onClick={() => onBrandChange(brand.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
                selectedBrand === brand.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted text-foreground"
              )}
            >
              <BrandAvatar brand={brand.name} size={22} />
              {brand.name}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">No brands found.</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-3">Price Range (NPR)</h3>
        <Slider
          min={0} max={300000} step={1000}
          value={priceRange}
          onValueChange={(v) => setPriceRange(v as [number, number])}
          className="mb-4"
        />
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span>Rs. {priceRange[0].toLocaleString()}</span>
          <span className="flex-1 border-t" />
          <span>Rs. {priceRange[1].toLocaleString()}</span>
        </div>
        <Button size="sm" className="w-full" onClick={onPriceApply}>Apply</Button>
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-3">Quick Budget</h3>
        <div className="space-y-1">
          {BUDGET_BRACKETS.map((b) => (
            <button
              key={b.label}
              onClick={() => { setPriceRange([b.min, b.max]); onPriceApply(); }}
              className="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors"
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Numbered pagination ──────────────────────────────────────────────────────
function Pagination({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 mt-10">
      <Button
        variant="outline" size="sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" /> Prev
      </Button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm">…</span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="sm"
            className="w-9"
            onClick={() => onPage(p as number)}
          >
            {p}
          </Button>
        )
      )}
      <Button
        variant="outline" size="sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className="gap-1"
      >
        Next <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function MobilePrice() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const page      = Number(searchParams.get("page")) || 1;
  const sort      = searchParams.get("sort") || "created_at";
  const order     = (searchParams.get("order") as "asc" | "desc") || "desc";
  const brandParam = searchParams.get("brand");
  const minPrice  = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const maxPrice  = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
  const search    = searchParams.get("q") || "";
  const pageSize  = 24;

  const [priceRange, setPriceRange] = useState<[number, number]>([minPrice ?? 0, maxPrice ?? 300000]);
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    setPriceRange([minPrice ?? 0, maxPrice ?? 300000]);
  }, [minPrice, maxPrice]);

  const { data: productsData, isLoading } = usePublicPriceList({
    brand_id: brandParam || undefined,
    min_price: minPrice,
    max_price: maxPrice,
    search,
    sort_by: (sort === 'price' || sort === 'price_value') ? (order === 'asc' ? 'price_asc' : 'price_desc') : sort === 'name' ? 'name' : 'newest',
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const { data: brandsData } = usePriceListBrands();
  const brands = brandsData || [];
  const selectedBrandObj = brands.find((brand) => brand.id === brandParam);

  const updateParam = useCallback((key: string, value: string | null) => {
    const p = new URLSearchParams(searchParams);
    if (value === null) {
      p.delete(key);
    } else {
      p.set(key, value);
    }
    p.set("page", "1");
    setSearchParams(p);
  }, [searchParams, setSearchParams]);

  const handleBrandChange = (brand: string) => {
    updateParam("brand", brandParam === brand ? null : brand);
  };

  const handlePriceApply = () => {
    const p = new URLSearchParams(searchParams);
    p.set("minPrice", priceRange[0].toString());
    p.set("maxPrice", priceRange[1].toString());
    p.set("page", "1");
    setSearchParams(p);
  };

  const handleSearch = () => {
    updateParam("q", localSearch.trim() || null);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
    setPriceRange([0, 300000]);
    setLocalSearch("");
  };

  const handlePage = (p: number) => {
    updateParam("page", p.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasFilters = !!(brandParam || minPrice || maxPrice || search);
  const items: CatalogProductWithBrand[] = productsData?.items ?? [];
  const total = productsData?.total ?? 0;

  // ── Structured data ─────────────────────────────────────────────────────────
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://tamrakarcomplex.com/" },
      { "@type": "ListItem", position: 2, name: "Mobile Price in Nepal", item: "https://tamrakarcomplex.com/mobile-price" },
    ],
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Mobile Phone Prices in Nepal 2026",
    description: "Latest smartphone prices in Nepal from all major brands.",
    numberOfItems: total,
    itemListElement: items.slice(0, 20).map((p, i) => ({
      "@type": "ListItem",
      position: (page - 1) * pageSize + i + 1,
      name: p.name,
      url: `https://tamrakarcomplex.com/product/${p.slug}`,
    })),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is the latest mobile price in Nepal?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Tamrakar Complex lists the latest smartphone prices in Nepal from brands like Samsung, Apple, Xiaomi, OnePlus, Realme, and more. Prices are updated regularly to reflect current market rates.",
        },
      },
      {
        "@type": "Question",
        name: "Which is the best smartphone under NPR 30,000 in Nepal?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Several great options exist under NPR 30,000 in Nepal including phones from Xiaomi Redmi, Realme, Samsung Galaxy A-series, and Nokia. Use our price filter to browse all phones in this budget range.",
        },
      },
      {
        "@type": "Question",
        name: "Where can I buy a smartphone in Nepal at the best price?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Tamrakar Complex, located in Kathmandu, is one of Nepal's largest electronics marketplaces with verified stores selling genuine smartphones with warranty. You can browse prices online and visit in-store.",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={brandParam ? `${brandParam} Mobile Price in Nepal` : "Mobile Price in Nepal"}
        description={`Check the latest mobile phone prices in Nepal ${new Date().getFullYear()}. Compare Samsung, Apple, Xiaomi, OnePlus, Realme smartphones. Full specs & best deals at Tamrakar Complex.`}
        url={`/mobile-price${brandParam ? `?brand=${brandParam}` : ""}`}
        keywords={["mobile price in Nepal", "smartphone price Nepal", "phone price list Nepal", brandParam || "Samsung Apple Xiaomi"]}
        structuredData={[breadcrumbSchema, itemListSchema, faqSchema]}
      />
      <Header />

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="relative bg-white dark:bg-slate-950 border-b overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,hsl(var(--primary)/0.08),transparent_50%),radial-gradient(circle_at_70%_120%,hsl(var(--primary)/0.05),transparent_50%)] pointer-events-none" />
          <div className="container py-10 md:py-16 relative">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-muted-foreground/60 mb-6">
              <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">Mobile Price in Nepal</span>
            </nav>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="max-w-3xl">
                <Badge variant="outline" className="mb-4 bg-primary/5 text-primary border-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                  Price Guide {new Date().getFullYear()}
                </Badge>
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
                  Mobile Price in <span className="text-primary">Nepal</span>
                </h1>
                <p className="text-muted-foreground text-lg md:text-xl max-w-2xl leading-relaxed">
                  The most comprehensive and up-to-date guide for smartphone prices in Nepal. 
                  Compare specifications, track price drops, and find the best deals from verified stores.
                </p>

                {/* Stats */}
                <div className="flex flex-wrap gap-6 mt-8">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-foreground">{total > 0 ? `${total}+` : "500+"}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Phones</span>
                  </div>
                  <div className="w-px h-10 bg-border self-center" />
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-foreground">{brands.length > 0 ? brands.length : "20"}+</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Brands</span>
                  </div>
                  <div className="w-px h-10 bg-border self-center" />
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-primary">Daily</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Updates</span>
                  </div>
                </div>
              </div>

              {/* Search Box Card */}
              <div className="w-full lg:w-[400px] bg-card border rounded-2xl p-6 shadow-xl shadow-primary/5">
                <h3 className="font-semibold mb-4 text-sm">Quick Phone Search</h3>
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g. iPhone 15 Pro, S24 Ultra..."
                      value={localSearch}
                      onChange={(e) => setLocalSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="pl-9 h-12 bg-muted/50 border-0 focus-visible:ring-1"
                    />
                  </div>
                  <Button onClick={handleSearch} className="h-12 font-bold shadow-lg shadow-primary/20">Find Best Price</Button>
                </div>
                <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Popular: iPhone, Samsung, Xiaomi</span>
                  <Link to="/compare" className="text-primary hover:underline font-medium">Compare Phones →</Link>
                </div>
              </div>
            </div>

            {/* Brand Carousel/Grid */}
            {brands.length > 0 && (
              <div className="mt-12 border-t pt-8">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.2em]">Top Brands</p>
                  <Link to="/brands" className="text-xs text-primary font-semibold hover:underline">View All Brands</Link>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  <button
                    onClick={() => updateParam("brand", null)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border transition-all hover:shadow-md",
                      !brandParam ? "bg-primary/5 border-primary/40 shadow-sm" : "bg-card border-border/50"
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <LayoutGrid className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider">All</span>
                  </button>
                  {brands.slice(0, 7).map((brand) => (
                    <Link
                      key={brand.id}
                      to={`/mobile-price/brand/${brand.name.toLowerCase()}`}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border transition-all hover:shadow-md group",
                        brandParam === brand.id ? "bg-primary/5 border-primary/40 shadow-sm" : "bg-card border-border/50"
                      )}
                    >
                      <div className="mb-2 group-hover:scale-110 transition-transform">
                        <BrandAvatar brand={brand.name} size={40} />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider truncate w-full text-center">{brand.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <div className="container py-8">
          <div className="flex gap-8">
            {/* Desktop sidebar */}
            <aside className="hidden lg:block w-56 shrink-0">
              <div className="sticky top-20 bg-card border rounded-xl p-4">
                <SidebarFilters
                  brands={brands}
                  selectedBrand={brandParam}
                  onBrandChange={handleBrandChange}
                  priceRange={priceRange}
                  setPriceRange={setPriceRange}
                  onPriceApply={handlePriceApply}
                  onClear={clearFilters}
                />
              </div>
            </aside>

            {/* Main */}
            <div className="flex-1 min-w-0">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 p-3 bg-card border rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  {/* Mobile filter */}
                  <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 lg:hidden">
                        <Filter className="h-4 w-4" /> Filters
                        {hasFilters && <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px]">!</Badge>}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[280px] overflow-y-auto">
                      <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                      <div className="mt-6">
                        <SidebarFilters
                          brands={brands}
                          selectedBrand={brandParam}
                          onBrandChange={handleBrandChange}
                          priceRange={priceRange}
                          setPriceRange={setPriceRange}
                          onPriceApply={handlePriceApply}
                          onClear={clearFilters}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>

                  <span className="text-sm text-muted-foreground">
                    {isLoading ? "Loading…" : (
                      <>Showing <strong className="text-foreground">{items.length}</strong> of <strong className="text-foreground">{total}</strong></>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sort */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <ArrowUpDown className="h-3.5 w-3.5" />
                        {sort === "price_value" ? (order === "asc" ? "Price ↑" : "Price ↓") : sort === "name" ? "A–Z" : "Newest"}
                        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { updateParam("sort", "created_at"); updateParam("order", "desc"); }}>
                        Newest Arrivals
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { updateParam("sort", "price_value"); updateParam("order", "asc"); }}>
                        Price: Low → High
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { updateParam("sort", "price_value"); updateParam("order", "desc"); }}>
                        Price: High → Low
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { updateParam("sort", "name"); updateParam("order", "asc"); }}>
                        Name: A → Z
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* View toggle */}
                  <div className="flex border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode("list")}
                      className={cn("p-2 transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                      aria-label="List view"
                    >
                      <List className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                      aria-label="Grid view"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Active filter badges */}
              {hasFilters && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {brandParam && (
                    <Badge variant="secondary" className="gap-1 pr-1.5">
                      Brand: {selectedBrandObj?.name ?? brandParam}
                      <button onClick={() => updateParam("brand", null)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  )}
                  {(minPrice !== undefined || maxPrice !== undefined) && (
                    <Badge variant="secondary" className="gap-1 pr-1.5">
                      Rs. {minPrice?.toLocaleString() ?? 0} – Rs. {maxPrice?.toLocaleString() ?? "Max"}
                      <button onClick={() => {
                        const p = new URLSearchParams(searchParams);
                        p.delete("minPrice"); p.delete("maxPrice");
                        setSearchParams(p);
                      }} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  )}
                  {search && (
                    <Badge variant="secondary" className="gap-1 pr-1.5">
                      Search: "{search}"
                      <button onClick={() => { updateParam("q", null); setLocalSearch(""); }} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearFilters}>Clear all</Button>
                </div>
              )}

              {/* Products */}
              {isLoading ? (
                viewMode === "list" ? (
                  <div className="border rounded-xl overflow-hidden bg-card">
                    <table className="w-full"><tbody>
                      {[...Array(8)].map((_, i) => (
                        <tr key={i} className="border-b"><td colSpan={9} className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-11 h-11 rounded-lg shrink-0" />
                            <div className="flex-1 space-y-1.5">
                              <Skeleton className="h-4 w-48" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                            <Skeleton className="h-5 w-20 hidden md:block" />
                            <Skeleton className="h-5 w-16" />
                          </div>
                        </td></tr>
                      ))}
                    </tbody></table>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="space-y-3">
                        <Skeleton className="aspect-square rounded-xl" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    ))}
                  </div>
                )
              ) : items.length === 0 ? (
                <div className="text-center py-24 border rounded-xl bg-card/50 border-dashed">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">No phones found</h3>
                  <p className="text-muted-foreground text-sm mb-4">Try adjusting your filters or search term.</p>
                  <Button onClick={clearFilters}>Clear Filters</Button>
                </div>
              ) : viewMode === "list" ? (
                <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50 text-left">
                          <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground w-8 text-center">#</th>
                          <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground w-14">Img</th>
                          <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground">Phone</th>
                          <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Display</th>
                          <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">RAM / Storage</th>
                          <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground hidden xl:table-cell">Camera</th>
                          <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground hidden xl:table-cell">Battery</th>
                          <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground">Price</th>
                          <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((product, idx) => (
                          <ProductTableRow
                            key={product.id}
                            product={product}
                            rank={(page - 1) * pageSize + idx + 1}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map((product) => (
                    <ProductCard key={product.id} product={toProductCardProduct(product)} />
                  ))}
                </div>
              )}

              <Pagination page={page} total={total} pageSize={pageSize} onPage={handlePage} />
            </div>
          </div>

          {/* ── Popular brands quick links ────────────────────────────── */}
          {brands.length > 0 && !brandParam && (
            <section className="mt-20">
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-display text-2xl font-bold">Popular Brands</h2>
                <Link to="/brands" className="text-sm text-primary font-semibold hover:underline">All brands →</Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {brands.map((brand) => (
                  <Link
                    key={brand.id}
                    to={`/mobile-price/brand/${brand.slug || brand.name.toLowerCase()}`}
                    className="flex flex-col items-center gap-4 p-6 rounded-2xl border bg-card hover:border-primary/40 hover:shadow-xl transition-all group text-center"
                  >
                    <div className="group-hover:scale-110 transition-transform duration-300">
                      <BrandAvatar brand={brand.name} size={56} />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-wider">{brand.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── FAQ / Editorial ───────────────────────────────────────── */}
          <section className="mt-20 max-w-4xl mx-auto">
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-8 md:p-12 border">
              <h2 className="font-display text-3xl font-bold mb-8 text-center">Mobile Price in Nepal — Buying Guide</h2>
              <div className="grid md:grid-cols-2 gap-8 text-sm text-muted-foreground leading-relaxed">
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-primary rounded-full" />
                    Best Budget Options
                  </h3>
                  <p>
                    For those looking for value under <strong>Rs. 30,000</strong>, Xiaomi's Redmi series and Samsung's Galaxy A-series consistently lead the market. These devices now offer 120Hz AMOLED displays and fast charging, features once reserved for flagships.
                  </p>
                </div>
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-primary rounded-full" />
                    Official vs Grey Market
                  </h3>
                  <p>
                    Always insist on official warranty phones. At <strong>Tamrakar Complex</strong>, our verified stores provide genuine products with VAT bills, ensuring your MDMS registration is handled correctly and your investment is protected.
                  </p>
                </div>
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-primary rounded-full" />
                    Price Consistency
                  </h3>
                  <p>
                    Mobile prices in Nepal can fluctuate due to import duties and currency exchange. We update our listings <strong>daily</strong> to ensure you see the most accurate market rates available in Kathmandu and across Nepal.
                  </p>
                </div>
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-primary rounded-full" />
                    Upgrade & Save
                  </h3>
                  <p>
                    Don't let your old phone gather dust. Use our <Link to="/exchange-your-phone" className="text-primary font-semibold hover:underline">Exchange Program</Link> or get an instant quote via our <Link to="/sell-your-phone" className="text-primary font-semibold hover:underline">Sell Your Phone</Link> portal to fund your next upgrade.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
