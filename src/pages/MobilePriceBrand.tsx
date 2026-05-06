import { useState, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { usePublicPriceList, usePriceListBrands } from "@/hooks/usePriceList";
import { type Product, type ProductSortKey } from "@/hooks/useProducts";
import { ProductCard } from "@/components/products/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Smartphone, ArrowUpDown, ChevronDown, ChevronLeft,
  ChevronRight, ExternalLink, LayoutGrid, List, ArrowLeft,
  TrendingUp, Star, Zap, CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Brand metadata (keep in sync with MobilePrice.tsx) ──────────────────────
const BRAND_META: Record<string, { bg: string; text: string; tagline: string; slug: string }> = {
  Apple:    { bg: "#000000", text: "#ffffff", tagline: "iPhone, iPad & Mac — the Apple ecosystem", slug: "apple" },
  Samsung:  { bg: "#1428A0", text: "#ffffff", tagline: "Galaxy series — innovation at every tier", slug: "samsung" },
  Xiaomi:   { bg: "#FF6700", text: "#ffffff", tagline: "Redmi & POCO — flagship value for all", slug: "xiaomi" },
  OnePlus:  { bg: "#F3122E", text: "#ffffff", tagline: "Fast & smooth — Never Settle", slug: "oneplus" },
  Realme:   { bg: "#FFCD00", text: "#000000", tagline: "Dare to Leap — performance midrange", slug: "realme" },
  Vivo:     { bg: "#415FFF", text: "#ffffff", tagline: "V & Y series — camera-first smartphones", slug: "vivo" },
  OPPO:     { bg: "#05BA4B", text: "#ffffff", tagline: "Find & Reno series — stylish innovation", slug: "oppo" },
  Nokia:    { bg: "#001135", text: "#ffffff", tagline: "Reliable builds with Android One", slug: "nokia" },
  Motorola: { bg: "#000000", text: "#ffffff", tagline: "Moto series — clean Android experience", slug: "motorola" },
  Huawei:   { bg: "#FF0000", text: "#ffffff", tagline: "Premium Kirin-powered devices", slug: "huawei" },
  Honor:    { bg: "#000000", text: "#ffffff", tagline: "Honor series — tech for the bold", slug: "honor" },
  Tecno:    { bg: "#00529B", text: "#ffffff", tagline: "Feature-packed at every budget", slug: "tecnomobile" },
  Infinix:  { bg: "#000000", text: "#ffffff", tagline: "Bold designs and long battery life", slug: "infinix" },
  Poco:     { bg: "#000000", text: "#FFCD00", tagline: "POCO — flagship killers redefined", slug: "poco" },
  Itel:     { bg: "#FF6600", text: "#ffffff", tagline: "Affordable smartphones for everyone", slug: "itel" },
  Sony:     { bg: "#000000", text: "#ffffff", tagline: "Sony — precision engineering", slug: "sony" },
  Asus:     { bg: "#00539B", text: "#ffffff", tagline: "Asus — search for incredible", slug: "asus" },
  Google:   { bg: "#4285F4", text: "#ffffff", tagline: "Google — the pure Android experience", slug: "google" },
  Nothing:  { bg: "#000000", text: "#ffffff", tagline: "Nothing — technology made fun again", slug: "nothing" },
  ZTE:      { bg: "#000000", text: "#ffffff", tagline: "ZTE — tomorrow never waits", slug: "zte" },
  "Ai+":    { bg: "#000000", text: "#ffffff", tagline: "Ai+ — intelligence at your fingertips", slug: "aiplus" },
  Coolpad:  { bg: "#000000", text: "#ffffff", tagline: "Coolpad — smart living for everyone", slug: "coolpad" },
  Benco:    { bg: "#000000", text: "#ffffff", tagline: "Benco — quality meets value", slug: "benco" },
};

// ─── Spec extractor ────────────────────────────────────────────────────────────
function extractSpec(specs: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  if (!specs) return "—";
  const lowerKeys = keys.map((k) => k.toLowerCase());
  for (const [rawKey, val] of Object.entries(specs)) {
    if (lowerKeys.includes(rawKey.toLowerCase())) {
      if (typeof val === "string" || typeof val === "number") return String(val);
    }
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

// ─── Capitalize helper ────────────────────────────────────────────────────────
function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Table row ─────────────────────────────────────────────────────────────────
function ProductTableRow({ product, rank }: { product: Product; rank: number }) {
  const specs   = product.specs as Record<string, unknown> | null;
  const screen  = extractSpec(specs, "screen", "display", "Size", "Display Size");
  const ram     = extractSpec(specs, "ram", "RAM", "Memory");
  const battery = extractSpec(specs, "battery", "Battery", "Capacity");
  const camera  = extractSpec(specs, "camera", "Camera", "Main Camera");
  const storage = extractSpec(specs, "storage", "Storage", "Internal");

  return (
    <tr className="group border-b border-border/50 hover:bg-muted/40 transition-colors">
      <td className="py-3 px-3 text-sm text-muted-foreground font-mono w-8 text-center">{rank}</td>
      <td className="py-2 px-3 w-14">
        <Link to={`/product/${product.slug}`}>
          <img
            src={product.image || "/default-product.svg"}
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
        {product.in_stock === false && (
          <span className="text-[10px] text-destructive block">Out of stock</span>
        )}
      </td>
      <td className="py-2 px-3 text-xs text-muted-foreground hidden md:table-cell">{screen}</td>
      <td className="py-2 px-3 text-xs text-muted-foreground hidden lg:table-cell">{ram}{storage !== "—" ? ` / ${storage}` : ""}</td>
      <td className="py-2 px-3 text-xs text-muted-foreground hidden xl:table-cell">{camera}</td>
      <td className="py-2 px-3 text-xs text-muted-foreground hidden xl:table-cell">{battery}</td>
      <td className="py-2 px-3 whitespace-nowrap">
        <div className="font-bold text-primary text-sm">{product.price}</div>
      </td>
      <td className="py-2 px-3">
        <Link to={`/product/${product.slug}`}>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            View <ExternalLink className="h-3 w-3" />
          </Button>
        </Link>
      </td>
    </tr>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  const pages: (number | "…")[] = [];
  if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
  else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }
  return (
    <nav className="flex items-center justify-center gap-1 mt-10">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} className="gap-1">
        <ChevronLeft className="h-4 w-4" /> Prev
      </Button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e-${i}`} className="px-2 text-muted-foreground text-sm">…</span>
        ) : (
          <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="w-9" onClick={() => onPage(p as number)}>
            {p}
          </Button>
        )
      )}
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="gap-1">
        Next <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
interface BrandData {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string;
}

export default function MobilePriceBrand() {
  const { brand: brandSlug = "" } = useParams<{ brand: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const { data: allBrands = [] } = usePriceListBrands();
  const brandObj = (allBrands as BrandData[]).find(
    (b) => b.slug?.toLowerCase() === brandSlug.toLowerCase() || b.name?.toLowerCase() === brandSlug.toLowerCase(),
  );
  const brand = brandObj?.name ?? capitalize(brandSlug);

  const page     = Number(searchParams.get("page")) || 1;
  const sort     = (searchParams.get("sort") as ProductSortKey | null) || "created_at";
  const order    = (searchParams.get("order") as "asc" | "desc") || "desc";
  const pageSize = 24;

  const { data: productsData, isLoading } = usePublicPriceList({
    brand_id: brandObj?.id,
    sort_by: sort === "price_value" ? (order === "asc" ? "price_asc" : "price_desc") : sort === "name" ? "name" : "newest",
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

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

  const handlePage = (p: number) => {
    updateParam("page", p.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const items = productsData?.items ?? [];
  const total = productsData?.total ?? 0;

  const meta = BRAND_META[brand] ?? { bg: "#6366f1", text: "#ffffff", tagline: `Latest ${brand} smartphones in Nepal` };
  const year = new Date().getFullYear();

  // ── Auto-generated SEO content ──────────────────────────────────────────────
  const seoTitle = `${brand} Mobile Price in Nepal`;
  const seoDesc = `Check the latest ${brand} mobile phone prices in Nepal ${year}. Compare all ${brand} models with full specifications, RAM, storage, camera, battery. Buy ${brand} smartphones at Tamrakar Complex.`;
  const seoKeywords = [
    `${brand} mobile price in Nepal`,
    `${brand} smartphone price Nepal`,
    `${brand} phone price list Nepal ${year}`,
    `buy ${brand} phone Nepal`,
    `${brand} latest model Nepal`,
  ];

  // Structured data
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://tamrakarcomplex.com/" },
      { "@type": "ListItem", position: 2, name: "Mobile Price in Nepal", item: "https://tamrakarcomplex.com/mobile-price" },
      { "@type": "ListItem", position: 3, name: `${brand} Mobile Price`, item: `https://tamrakarcomplex.com/mobile-price/brand/${brandSlug}` },
    ],
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${brand} Mobile Price in Nepal ${year}`,
    description: seoDesc,
    numberOfItems: total,
    itemListElement: items.slice(0, 20).map((p, i) => ({
      "@type": "ListItem",
      position: (page - 1) * pageSize + i + 1,
      name: `${p.name} — ${p.price}`,
      url: `https://tamrakarcomplex.com/product/${p.slug}`,
    })),
  };

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "Tamrakar Complex",
    url: "https://tamrakarcomplex.com",
    description: `Authorised dealer for ${brand} products in Nepal`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Kathmandu",
      addressCountry: "NP",
    },
  };

  // Related brands (excluding current)
  const relatedBrands = (allBrands as BrandData[])
    .filter((b) => b.name?.toLowerCase() !== brandSlug.toLowerCase() && b.slug?.toLowerCase() !== brandSlug.toLowerCase())
    .slice(0, 8);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={seoTitle}
        description={seoDesc}
        url={`/mobile-price/brand/${brandSlug}`}
        keywords={seoKeywords}
        structuredData={[breadcrumbSchema, itemListSchema, orgSchema]}
      />
      <Header />

      <main className="flex-1">
        {/* ── Brand Hero ───────────────────────────────────────────────── */}
        <div className="relative bg-white dark:bg-slate-950 border-b overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,hsl(var(--primary)/0.08),transparent_50%)] pointer-events-none" />
          <div className="container py-10 md:py-16 relative">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-muted-foreground/60 mb-6">
              <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <Link to="/mobile-price" className="hover:text-primary transition-colors">Mobile Price</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">{brand}</span>
            </nav>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                {/* Brand logo large */}
                <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border shadow-inner">
                  <BrandAvatar brand={brand} size={80} />
                </div>

                <div>
                  <Badge variant="outline" className="mb-2 bg-primary/5 text-primary border-primary/20">
                    Official Nepal Pricing
                  </Badge>
                  <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight">
                    {brand} Mobile Price in <span className="text-primary">Nepal</span>
                  </h1>
                  <p className="text-muted-foreground mt-2 text-lg max-w-xl">{meta.tagline}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Link to="/compare" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full gap-2 font-semibold">
                    Compare {brand} Models
                  </Button>
                </Link>
                <Link to="/mobile-price" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full gap-2 font-bold shadow-lg shadow-primary/20">
                    <ArrowLeft className="h-4 w-4" /> All Brands
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="mt-10 flex flex-wrap items-center gap-x-12 gap-y-4 py-4 px-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Models</p>
                  <p className="text-sm font-bold text-foreground">{isLoading ? "…" : total} {brand} Phones</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Star className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Market Rate</p>
                  <p className="text-sm font-bold text-foreground">Updated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Verified</p>
                  <p className="text-sm font-bold text-foreground">Official Distributors</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container py-8">
          <div className="flex gap-8">
            {/* ── Sidebar ─────────────────────────────────────────────── */}
            <aside className="hidden lg:block w-52 shrink-0 space-y-5">
              {/* Quick actions */}
              <div className="bg-card border rounded-xl p-4 space-y-2.5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Links</h3>
                <Link to={`/mobile-price?brand=${encodeURIComponent(brand)}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                  <Smartphone className="h-3.5 w-3.5" /> All {brand} Phones
                </Link>
                <Link to="/compare" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                  <TrendingUp className="h-3.5 w-3.5" /> Compare Models
                </Link>
                <Link to="/valuation-estimator" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                  <Zap className="h-3.5 w-3.5" /> Estimate Trade-in
                </Link>
                <Link to="/stores" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                  <CheckCircle className="h-3.5 w-3.5" /> Find a Store
                </Link>
              </div>

              {/* Sell/Exchange CTA */}
              <div className="bg-primary/8 border border-primary/20 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold">Upgrade your {brand}?</h3>
                <p className="text-xs text-muted-foreground">Get the best trade-in value for your old device.</p>
                <Link to="/exchange-your-phone">
                  <Button size="sm" className="w-full mt-2">Exchange Now</Button>
                </Link>
              </div>

              {/* Related brands */}
              {relatedBrands.length > 0 && (
                <div className="bg-card border rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Other Brands</h3>
                  <div className="space-y-1">
                    {relatedBrands.map((b) => {
                      const bMeta = BRAND_META[b.name] ?? { bg: "#6366f1", text: "#ffffff" };
                      return (
                        <Link
                          key={b.id}
                          to={`/mobile-price/brand/${b.slug || b.name.toLowerCase()}`}
                          className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-sm"
                        >
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                            style={{ background: bMeta.bg, color: bMeta.text }}
                          >
                            {b.name.slice(0, 1)}
                          </span>
                          {b.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </aside>

            {/* ── Main Content ─────────────────────────────────────────── */}
            <div className="flex-1 min-w-0">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 p-3 bg-card border rounded-xl shadow-sm">
                <span className="text-sm text-muted-foreground">
                  {isLoading ? "Loading…" : (
                    <><strong className="text-foreground">{total}</strong> {brand} phones in Nepal</>
                  )}
                </span>

                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <ArrowUpDown className="h-3.5 w-3.5" />
                        {sort === "price_value" ? (order === "asc" ? "Price ↑" : "Price ↓") : sort === "name" ? "A–Z" : "Newest"}
                        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { updateParam("sort", "created_at"); updateParam("order", "desc"); }}>Newest Arrivals</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { updateParam("sort", "price_value"); updateParam("order", "asc"); }}>Price: Low → High</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { updateParam("sort", "price_value"); updateParam("order", "desc"); }}>Price: High → Low</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { updateParam("sort", "name"); updateParam("order", "asc"); }}>Name: A → Z</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

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
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center font-black text-xl mx-auto mb-4"
                    style={{ background: meta.bg, color: meta.text }}
                  >
                    {brand.slice(0, 2).toUpperCase()}
                  </div>
                  <h3 className="text-lg font-semibold mb-1">No {brand} phones listed yet</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Check back soon — or browse all smartphones.
                  </p>
                  <Link to="/mobile-price">
                    <Button>Browse All Phones</Button>
                  </Link>
                </div>
              ) : viewMode === "list" ? (
                <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground text-left w-8 text-center">#</th>
                          <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground text-left w-14">Img</th>
                          <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground text-left">Phone</th>
                          <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground text-left hidden md:table-cell">Display</th>
                          <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground text-left hidden lg:table-cell">RAM / Storage</th>
                          <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground text-left hidden xl:table-cell">Camera</th>
                          <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground text-left hidden xl:table-cell">Battery</th>
                          <th className="py-2.5 px-3 text-xs font-semibold text-muted-foreground text-left">Price (Rs.)</th>
                          <th className="py-2.5 px-3 w-20"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((product, idx) => (
                          <ProductTableRow key={product.id} product={product} rank={(page - 1) * pageSize + idx + 1} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}

              <Pagination page={page} total={total} pageSize={pageSize} onPage={handlePage} />

              {/* ── Brand editorial ──────────────────────────────────── */}
              {!isLoading && (
                <section className="mt-12 p-6 bg-card border rounded-xl">
                  <h2 className="font-display text-xl font-bold mb-4">{brand} Mobile Price in Nepal — Overview</h2>
                  <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
                    <p>
                      {brand} smartphones are officially available in Nepal through authorised distributors.
                      The price list above covers all currently available {brand} models with their official Nepal market pricing in NPR (Nepalese Rupees).
                    </p>
                    <p>
                      Prices include applicable taxes. Actual retail prices may vary slightly between stores.
                      For the most accurate pricing, visit the verified stores at{" "}
                      <Link to="/stores" className="text-primary hover:underline">Tamrakar Complex, Kathmandu</Link>.
                    </p>
                    <p>
                      Looking to upgrade your existing {brand} phone? Use our{" "}
                      <Link to="/valuation-estimator" className="text-primary hover:underline">valuation estimator</Link>{" "}
                      to get an instant trade-in quote, or list it directly on the{" "}
                      <Link to="/marketplace" className="text-primary hover:underline">marketplace</Link>.
                    </p>
                    {total > 0 && (
                      <p>
                        There are currently <strong className="text-foreground">{total} {brand} phones</strong> listed in the Nepal market.
                        Use the sort controls to find phones by price or view the newest arrivals.
                      </p>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* ── Other brands section ─────────────────────────────────── */}
          {relatedBrands.length > 0 && (
            <section className="mt-12 lg:hidden">
              <h2 className="font-display text-lg font-bold mb-4">Other Brands</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {relatedBrands.map((b: BrandData) => {
                  const bMeta = BRAND_META[b.name] ?? { bg: "#6366f1", text: "#ffffff" };
                  return (
                    <Link
                      key={b.id}
                      to={`/mobile-price/brand/${b.name.toLowerCase()}`}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl border bg-card hover:border-primary/40 hover:shadow-md transition-all"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                        style={{ background: bMeta.bg, color: bMeta.text }}
                      >
                        {b.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-center">{b.name}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
