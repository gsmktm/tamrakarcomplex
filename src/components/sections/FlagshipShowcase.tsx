import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SafeImage } from "@/components/common/SafeImage";
import { resolveListingImage } from "@/lib/phoneImages";
import {
  Smartphone,
  Laptop,
  Watch,
  Headphones,
  Tablet,
  Flame,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  ChevronRight,
  Star,
  Shield,
  Zap,
  BadgeCheck,
  DollarSign,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProductCard {
  id: string;
  name: string;
  subtitle: string;
  price: string;
  priceValue: number;
  icon: React.ReactNode;
  brand: string;
  slug?: string;
  image?: string | null;
}

// ─── Hardcoded Fallbacks ───────────────────────────────────────────────────────
const APPLE_PRODUCTS: ProductCard[] = [
  { id: "a17pm", name: "iPhone 17 Pro Max", subtitle: "A19 Pro · 256GB", price: "Price on request", priceValue: 0, icon: <Smartphone className="w-6 h-6" />, brand: "Apple" },
  { id: "a17p", name: "iPhone 17 Pro", subtitle: "A19 Pro · 256GB", price: "Price on request", priceValue: 0, icon: <Smartphone className="w-6 h-6" />, brand: "Apple" },
  { id: "a17air", name: "iPhone 17 Air", subtitle: "Ultra-thin · 256GB", price: "Price on request", priceValue: 0, icon: <Smartphone className="w-6 h-6" />, brand: "Apple" },
  { id: "a17", name: "iPhone 17", subtitle: "A19 · 256GB", price: "Price on request", priceValue: 0, icon: <Smartphone className="w-6 h-6" />, brand: "Apple" },
  { id: "a17e", name: "iPhone 17e", subtitle: "A19 · 256GB", price: "Price on request", priceValue: 0, icon: <Smartphone className="w-6 h-6" />, brand: "Apple" },
  { id: "aw11", name: "Apple Watch Series 11", subtitle: "S10 · watchOS", price: "Price on request", priceValue: 0, icon: <Watch className="w-6 h-6" />, brand: "Apple" },
];

function appleProductRecency(product: { name?: string; specs?: Record<string, unknown> | null }) {
  const name = product.name ?? "";
  const metadataYear = Number(product.specs?.release_year ?? product.specs?.releaseYear);
  const explicitYear = Number(name.match(/\b(20\d{2})\b/)?.[1]);
  let year = metadataYear > 2000 ? metadataYear : explicitYear > 2000 ? explicitYear : 0;
  let generation = 0;

  const iphone = name.match(/iphone\s+(\d+)/i);
  const watch = name.match(/watch(?:\s+series)?\s+(\d+)/i);
  const chip = name.match(/\bM(\d+)\b/i);

  if (iphone) {
    const iphoneGeneration = Number(iphone[1]);
    const variantRank = /pro max/i.test(name) ? 5 : /\bpro\b/i.test(name) ? 4 : /air|plus/i.test(name) ? 3 : /\d+e\b/i.test(name) ? 1 : 2;
    generation = iphoneGeneration * 10 + variantRank;
    year ||= 2008 + iphoneGeneration;
  } else if (watch) {
    generation = Number(watch[1]);
    year ||= 2014 + generation;
  } else if (chip) {
    generation = Number(chip[1]);
    year ||= 2020 + generation;
  }

  return year * 100 + generation;
}

const SAMSUNG_PRODUCTS: ProductCard[] = [
  { id: "s26u", name: "Galaxy S26 Ultra", subtitle: "Galaxy AI · S Pen", price: "Price on request", priceValue: 0, icon: <Smartphone className="w-6 h-6" />, brand: "Samsung" },
  { id: "s26p", name: "Galaxy S26+", subtitle: "Galaxy AI · Large display", price: "Price on request", priceValue: 0, icon: <Smartphone className="w-6 h-6" />, brand: "Samsung" },
  { id: "s26", name: "Galaxy S26", subtitle: "Galaxy AI · Flagship performance", price: "Price on request", priceValue: 0, icon: <Smartphone className="w-6 h-6" />, brand: "Samsung" },
  { id: "zfold7", name: "Galaxy Z Fold7", subtitle: "Latest book-style foldable", price: "Price on request", priceValue: 0, icon: <Smartphone className="w-6 h-6" />, brand: "Samsung" },
  { id: "zflip7", name: "Galaxy Z Flip7", subtitle: "Latest compact foldable", price: "Price on request", priceValue: 0, icon: <Smartphone className="w-6 h-6" />, brand: "Samsung" },
  { id: "s25fe", name: "Galaxy S25 FE", subtitle: "Fan Edition · Galaxy AI", price: "Price on request", priceValue: 0, icon: <Smartphone className="w-6 h-6" />, brand: "Samsung" },
];

function productSlug(product: ProductCard) {
  return `${product.brand} ${product.name}`
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^apple-apple-/, "apple-")
    .replace(/^samsung-samsung-/, "samsung-");
}

function productLink(product: ProductCard) {
  return product.slug ? `/product/${product.slug}` : `/mobile/${productSlug(product)}`;
}

function productThumbnail(product: ProductCard) {
  return resolveListingImage(product.name, product.brand, product.image ? [product.image] : [], product.name);
}

const TRENDING_FALLBACK = [
  { rank: 1, name: "Galaxy S25 Ultra", brand: "Samsung", price: "Price on request" },
  { rank: 2, name: "iPhone 16 Pro Max", brand: "Apple", price: "Price on request" },
  { rank: 3, name: "Galaxy Z Fold 6", brand: "Samsung", price: "Price on request" },
  { rank: 4, name: "iPhone 16", brand: "Apple", price: "Price on request" },
  { rank: 5, name: "MacBook Air M3", brand: "Apple", price: "Price on request" },
];

const VALUE_FALLBACK: ProductCard[] = [
  { id: "v1", name: "Redmi Note 13", subtitle: "108MP · 120Hz AMOLED", price: "Price on request", priceValue: 0, icon: <Smartphone className="w-6 h-6" />, brand: "Xiaomi" },
  { id: "v2", name: "Realme 12x", subtitle: "50MP · 5000mAh", price: "Price on request", priceValue: 0, icon: <Smartphone className="w-6 h-6" />, brand: "Realme" },
  { id: "v3", name: "Samsung Galaxy A35", subtitle: "50MP · Gorilla Glass", price: "Price on request", priceValue: 0, icon: <Smartphone className="w-6 h-6" />, brand: "Samsung" },
];

const JUST_IN_FALLBACK: ProductCard[] = [
  { id: "j1", name: "OnePlus 13R", subtitle: "Snapdragon 8s Gen 3", price: "Price on request", priceValue: 0, icon: <Smartphone className="w-6 h-6" />, brand: "OnePlus" },
  { id: "j2", name: "Pixel 9 Pro", subtitle: "Google AI · Tensor G4", price: "Price on request", priceValue: 0, icon: <Smartphone className="w-6 h-6" />, brand: "Google" },
  { id: "j3", name: "ASUS ROG Phone 8", subtitle: "Gaming · 165Hz", price: "Price on request", priceValue: 0, icon: <Smartphone className="w-6 h-6" />, brand: "ASUS" },
  { id: "j4", name: "Vivo X200 Pro", subtitle: "Zeiss Camera · 5500mAh", price: "Price on request", priceValue: 0, icon: <Smartphone className="w-6 h-6" />, brand: "Vivo" },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function TrustBar() {
  const items = [
    { icon: <Shield className="w-4 h-4" />, text: "Explore store profiles" },
    { icon: <Zap className="w-4 h-4" />, text: "Compare available choices" },
    { icon: <BadgeCheck className="w-4 h-4" />, text: "Review listing terms" },
    { icon: <DollarSign className="w-4 h-4" />, text: "Prices shown in NPR" },
    { icon: <Star className="w-4 h-4" />, text: "Discover repair services" },
  ];
  return (
    <div className="w-full bg-secondary/60 backdrop-blur border-y border-border py-3 overflow-hidden">
      <div className="flex items-center justify-center gap-4 flex-wrap px-4">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-foreground/80 text-sm font-medium">
            <span className="text-primary">{item.icon}</span>
            <span>{item.text}</span>
            {i < items.length - 1 && (
              <span className="hidden sm:inline ml-4 text-border">·</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DecisionChips({
  active,
  onChange,
}: {
  active: string;
  onChange: (chip: string) => void;
}) {
  const chips = [
    { label: "All Devices", value: "all" },
    { label: "Under 20K", value: "budget" },
    { label: "Apple", value: "apple" },
    { label: "Samsung", value: "samsung" },
    { label: "Repair", value: "repair" },
    { label: "Exchange", value: "exchange" },
    { label: "Sell", value: "sell" },
  ];
  return (
    <div className="w-full bg-background border-b border-border py-4 px-4">
      <div className="container mx-auto flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {chips.map((chip) => (
          <button
            key={chip.value}
            onClick={() => onChange(chip.value)}
            className={`flex-shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
              active === chip.value
                ? "bg-primary text-primary-foreground shadow-glow scale-105"
                : "bg-secondary text-foreground/70 border border-border hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Apple product card
function AppleCard({ product }: { product: ProductCard }) {
  const thumbnail = productThumbnail(product);

  return (
    <Link
      to={productLink(product)}
      className="flagship-strip-card group flex-shrink-0 w-52 backdrop-blur rounded-2xl p-5 flex flex-col gap-3 hover:-translate-y-1 transition-all duration-300"
    >
      <div className="flagship-strip-icon relative h-36 w-full overflow-hidden rounded-xl flex items-center justify-center transition-colors">
        <SafeImage
          src={thumbnail}
          alt={`${product.name} thumbnail`}
          className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
          aspect="free"
          width={176}
          height={144}
        />
      </div>
      <div className="flex-1">
        <p className="flagship-strip-name font-semibold text-sm leading-tight">{product.name}</p>
        <p className="flagship-strip-muted text-xs mt-0.5">{product.subtitle}</p>
      </div>
      <div>
        <p className="flagship-strip-price font-bold text-sm">{product.price}</p>
        <div className="flagship-strip-link mt-2 flex items-center gap-1 text-xs font-medium group-hover:gap-2 transition-all">
          <span>View</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </Link>
  );
}

// Samsung product card
function SamsungCard({ product }: { product: ProductCard }) {
  const thumbnail = productThumbnail(product);
  return (
    <Link
      to={productLink(product)}
      className="flagship-strip-card group flex-shrink-0 w-52 backdrop-blur rounded-2xl p-5 flex flex-col gap-3 hover:-translate-y-1 transition-all duration-300"
    >
      <div className="flagship-strip-icon relative h-36 w-full overflow-hidden rounded-xl flex items-center justify-center transition-colors">
        <SafeImage
          src={thumbnail}
          alt={`${product.name} thumbnail`}
          className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
          aspect="free"
          width={176}
          height={144}
        />
      </div>
      <div className="flex-1">
        <p className="flagship-strip-name font-semibold text-sm leading-tight">{product.name}</p>
        <p className="flagship-strip-muted text-xs mt-0.5">{product.subtitle}</p>
      </div>
      <div>
        <p className="flagship-strip-price font-bold text-sm">{product.price}</p>
        <div className="flagship-strip-link mt-2 flex items-center gap-1 text-xs font-medium group-hover:gap-2 transition-all">
          <span>View</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </Link>
  );
}

// Generic small product card
function MiniCard({ product }: { product: ProductCard; variant?: "light" | "dark" }) {
  const thumbnail = productThumbnail(product);
  return (
    <Link
      to={productLink(product)}
      className="group flex items-center gap-3 rounded-xl p-3 transition-all duration-200 bg-muted/50 border border-border hover:bg-muted"
    >
      <div className="w-11 h-11 overflow-hidden rounded-lg bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
        <SafeImage src={thumbnail} alt="" className="h-full w-full object-contain p-1" aspect="free" width={44} height={44} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground text-sm font-semibold truncate">{product.name}</p>
        <p className="text-muted-foreground text-xs">{product.price}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground flex-shrink-0 transition-colors" />
    </Link>
  );
}

// ─── Hero Section ──────────────────────────────────────────────────────────────
function DualBrandHero() {
  return (
    <section className="flagship-duel" aria-labelledby="flagship-duel-title">
      <h2 id="flagship-duel-title" className="sr-only">Apple and Samsung flagship collections</h2>
      <div className="flagship-duel-grid" aria-hidden />

      <article className="flagship-duel-panel flagship-duel-apple">
        <span className="flagship-duel-serial">TC / CUPERTINO / 01</span>
        <div className="flagship-duel-copy">
          <span className="flagship-duel-badge"><Sparkles className="h-3.5 w-3.5" />Apple Ecosystem</span>
          <p className="flagship-duel-kicker">Think Different</p>
          <h3>Apple<span>iPhone 17 Pro Max.</span></h3>
          <p className="flagship-duel-tagline">The most personal Pro ever.</p>
          <div className="flagship-duel-price"><small>Pricing</small><strong>See store offers</strong></div>
          <Link to="/mobile/apple-iphone-17-pro-max" className="flagship-duel-link">
            View iPhone 17 Pro Max <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="flagship-device flagship-device-apple" aria-hidden>
          <span className="flagship-device-lens lens-one" />
          <span className="flagship-device-lens lens-two" />
          <span className="flagship-device-lens lens-three" />
          <span className="flagship-device-mark">A19<br />PRO</span>
        </div>
        <span className="flagship-duel-ring" aria-hidden />
      </article>

      <div className="flagship-duel-core" aria-hidden><span>VS</span><small>FLAGSHIP</small></div>

      <article className="flagship-duel-panel flagship-duel-samsung">
        <span className="flagship-duel-serial">TC / SEOUL / 02</span>
        <div className="flagship-duel-copy">
          <span className="flagship-duel-badge"><Zap className="h-3.5 w-3.5" />Galaxy Flagship</span>
          <p className="flagship-duel-kicker">Epic Every Day</p>
          <h3>Samsung<span>Galaxy S26 Ultra.</span></h3>
          <p className="flagship-duel-tagline">Intelligence. Elevated.</p>
          <div className="flagship-duel-price"><small>Pricing</small><strong>See store offers</strong></div>
          <Link to="/mobile/samsung-galaxy-s26-ultra" className="flagship-duel-link">
            View Galaxy S26 Ultra <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="flagship-device flagship-device-samsung" aria-hidden>
          <span className="flagship-device-pen" />
          <span className="flagship-device-camera camera-one" />
          <span className="flagship-device-camera camera-two" />
          <span className="flagship-device-camera camera-three" />
          <span className="flagship-device-mark">GALAXY<br />AI</span>
        </div>
        <span className="flagship-duel-ring" aria-hidden />
      </article>
    </section>
  );
}

// ─── Apple Showcase Strip ──────────────────────────────────────────────────────
function AppleShowcaseStrip() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: dbProducts } = useQuery({
    queryKey: ["flagship-apple"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("products")
        .select("id, name, subtitle, price_value, brand, slug, image, images, specs, created_at")
        .eq("brand", "Apple")
        .order("created_at", { ascending: false })
        .limit(24);
      if (error || !data?.length) return null;
      return (data as any[])
        .sort((a, b) =>
          appleProductRecency(b) - appleProductRecency(a)
          || String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
        )
        .slice(0, 6);
    },
    staleTime: 5 * 60 * 1000,
  });

  const products: ProductCard[] = dbProducts?.length
    ? dbProducts.map((p: any, i: number) => ({
        id: p.id,
        name: p.name,
        subtitle: p.subtitle ?? "",
        price: Number(p.price_value) > 0 ? `NPR ${Number(p.price_value).toLocaleString("en-IN")}` : "Price on request",
        priceValue: p.price_value,
        icon: <Smartphone className="w-6 h-6" />,
        brand: p.brand,
        slug: p.slug,
        image: p.image || (Array.isArray(p.images) ? p.images[0] : null),
      }))
    : [...APPLE_PRODUCTS].sort((a, b) => appleProductRecency(b) - appleProductRecency(a));

  return (
    <section id="apple-strip" className="flagship-product-strip flagship-product-strip-apple py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="flagship-strip-eyebrow text-xs uppercase tracking-widest font-medium mb-1">Cupertino Originals</p>
            <h2 className="flagship-strip-heading font-display text-2xl lg:text-3xl font-bold">
              Apple Lineup{" "}
              <span className="flagship-strip-muted font-normal">— Nepal Edition</span>
            </h2>
          </div>
          <Link
            to="/cat/mobiles/apple"
            className="flagship-strip-link hidden sm:flex items-center gap-1.5 text-sm font-medium transition-colors"
          >
            See all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-none pb-2"
          style={{ scrollbarWidth: "none" }}
        >
          {products.map((product) => (
            <AppleCard key={product.id} product={product} />
          ))}
          {/* End card */}
          <Link
            to="/cat/mobiles/apple"
            className="flagship-strip-end flex-shrink-0 w-40 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-200 p-5"
          >
            <ArrowRight className="w-5 h-5" />
            <span className="text-xs font-medium text-center">View all Apple</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Samsung Flagship Strip ────────────────────────────────────────────────────
function SamsungFlagshipStrip() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: dbProducts } = useQuery({
    queryKey: ["flagship-samsung"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("products")
        .select("id, name, subtitle, price_value, brand, slug, image, images, specs, created_at")
        .eq("brand", "Samsung")
        .eq("in_stock", true)
        .order("created_at", { ascending: false })
        .limit(24);
      if (error || !data?.length) return null;
      return (data as any[])
        .sort((a, b) =>
          appleProductRecency(b) - appleProductRecency(a)
          || String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
        )
        .slice(0, 6);
    },
    staleTime: 5 * 60 * 1000,
  });

  const products: ProductCard[] = dbProducts?.length
    ? dbProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        subtitle: p.subtitle ?? "",
        price: Number(p.price_value) > 0 ? `NPR ${Number(p.price_value).toLocaleString("en-IN")}` : "Price on request",
        priceValue: p.price_value,
        icon: <Smartphone className="w-6 h-6" />,
        brand: p.brand,
        slug: p.slug,
        image: p.image || (Array.isArray(p.images) ? p.images[0] : null),
      }))
    : SAMSUNG_PRODUCTS;

  return (
    <section id="samsung-strip" className="flagship-product-strip flagship-product-strip-samsung py-12 relative overflow-hidden">
      {/* Subtle gradient bg */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(139,92,246,0.12),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_10%_80%,rgba(59,130,246,0.08),transparent_60%)] pointer-events-none" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="flagship-strip-eyebrow text-xs uppercase tracking-widest font-medium mb-1">Galaxy Series</p>
            <h2 className="flagship-strip-heading font-display text-2xl lg:text-3xl font-bold">
              Galaxy Flagship{" "}
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                — Available Now
              </span>
            </h2>
          </div>
          <Link
            to="/cat/mobiles/samsung"
            className="flagship-strip-link hidden sm:flex items-center gap-1.5 text-sm font-medium transition-colors"
          >
            See all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-none pb-2"
          style={{ scrollbarWidth: "none" }}
        >
          {products.map((product) => (
            <SamsungCard key={product.id} product={product} />
          ))}
          <Link
            to="/cat/mobiles/samsung"
            className="flagship-strip-end flex-shrink-0 w-40 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-200 p-5"
          >
            <ArrowRight className="w-5 h-5" />
            <span className="text-xs font-medium text-center">View all Galaxy</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Algorithm Section ─────────────────────────────────────────────────────────
function AlgorithmSection() {
  // Trending query
  const { data: trendingData } = useQuery({
    queryKey: ["trending-products"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("products")
        .select("id, name, brand, price_value, slug, image, images")
        .order("view_count", { ascending: false })
        .limit(5);
      if (error || !data?.length) return null;
      return data as any[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const trending = trendingData?.length
    ? trendingData.map((p: any, i: number) => ({
        rank: i + 1,
        name: p.name,
        brand: p.brand,
        price: Number(p.price_value) > 0 ? `NPR ${Number(p.price_value).toLocaleString("en-IN")}` : "Price on request",
        slug: p.slug,
        image: p.image || (Array.isArray(p.images) ? p.images[0] : null),
      }))
    : TRENDING_FALLBACK;

  // Best value query
  const { data: valueData } = useQuery({
    queryKey: ["value-products"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("products")
        .select("id, name, subtitle, price_value, brand, slug, image, images")
        .lte("price_value", 30000)
        .order("price_value", { ascending: false })
        .limit(3);
      if (error || !data?.length) return null;
      return data as any[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const valueProducts: ProductCard[] = valueData?.length
    ? valueData.map((p: any) => ({
        id: p.id,
        name: p.name,
        subtitle: p.subtitle ?? "",
        price: Number(p.price_value) > 0 ? `NPR ${Number(p.price_value).toLocaleString("en-IN")}` : "Price on request",
        priceValue: p.price_value,
        icon: <Smartphone className="w-6 h-6" />,
        brand: p.brand,
        slug: p.slug,
        image: p.image || (Array.isArray(p.images) ? p.images[0] : null),
      }))
    : VALUE_FALLBACK;

  // Just in query
  const { data: newData } = useQuery({
    queryKey: ["new-arrivals"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("products")
        .select("id, name, subtitle, price_value, brand, slug, image, images")
        .order("created_at", { ascending: false })
        .limit(4);
      if (error || !data?.length) return null;
      return data as any[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const newProducts: ProductCard[] = newData?.length
    ? newData.map((p: any) => ({
        id: p.id,
        name: p.name,
        subtitle: p.subtitle ?? "",
        price: Number(p.price_value) > 0 ? `NPR ${Number(p.price_value).toLocaleString("en-IN")}` : "Price on request",
        priceValue: p.price_value,
        icon: <Smartphone className="w-6 h-6" />,
        brand: p.brand,
        slug: p.slug,
        image: p.image || (Array.isArray(p.images) ? p.images[0] : null),
      }))
    : JUST_IN_FALLBACK;

  return (
    <section id="picked-for-you" className="bg-background py-16 border-t border-border/40">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-secondary border border-border rounded-full px-4 py-1.5 text-muted-foreground text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Smart Picks
          </div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-2">
            Picked For You
          </h2>
          <p className="text-muted-foreground text-sm">Browse useful device options across popular categories</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Trending */}
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-foreground font-bold text-base">Trending Now</h3>
                <p className="text-muted-foreground text-xs">Nepal searches this week</p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              Galaxy S25 series & iPhone 16 are dominating Nepal searches this week.
            </p>
            <div className="flex flex-col gap-2">
              {trending.map((item) => (
                <Link
                  key={item.rank}
                  to={productLink({ ...item, id: String(item.rank), subtitle: "", priceValue: 0, icon: null })}
                  className="flex items-center gap-3 group py-1"
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      item.rank === 1
                        ? "bg-orange-500/20 text-orange-400"
                        : item.rank === 2
                        ? "bg-muted text-muted-foreground"
                        : "bg-muted/60 text-muted-foreground/60"
                    }`}
                  >
                    {item.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm font-medium group-hover:text-primary transition-colors truncate">
                      {item.name}
                    </p>
                    <p className="text-muted-foreground text-xs">{item.price}</p>
                  </div>
                  <TrendingUp className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-orange-400 flex-shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
            <Link
              to="/cat/mobiles?sort=trending"
              className="mt-auto flex items-center justify-center gap-1.5 text-xs text-orange-400 font-semibold hover:text-orange-500 transition-colors pt-2 border-t border-border"
            >
              View all trending <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Best Value */}
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="text-foreground font-bold text-base">Best Value Right Now</h3>
                <p className="text-muted-foreground text-xs">Under NPR 30,000</p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              Best phones under NPR 30,000 — more phone for your money.
            </p>
            <div className="flex flex-col gap-2">
              {valueProducts.map((product) => (
                <MiniCard key={product.id} product={product} variant="dark" />
              ))}
            </div>
            <Link
              to="/cat/mobiles?maxPrice=30000"
              className="mt-auto flex items-center justify-center gap-1.5 text-xs text-green-500 font-semibold hover:text-green-600 transition-colors pt-2 border-t border-border"
            >
              See all under 30K <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: Just In */}
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-foreground font-bold text-base">Just In</h3>
                <p className="text-muted-foreground text-xs">Explore more devices</p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              Hot off the shelf — newest arrivals at Tamrakar Complex.
            </p>
            <div className="flex flex-col gap-2">
              {newProducts.map((product) => (
                <MiniCard key={product.id} product={product} variant="dark" />
              ))}
            </div>
            <Link
              to="/cat/mobiles?sort=newest"
              className="mt-auto flex items-center justify-center gap-1.5 text-xs text-blue-500 font-semibold hover:text-blue-600 transition-colors pt-2 border-t border-border"
            >
              See all new arrivals <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────────
export function FlagshipShowcase() {
  const [activeChip, setActiveChip] = useState("all");

  const handleChipChange = (chip: string) => {
    setActiveChip(chip);
    const sectionMap: Record<string, string> = {
      apple: "apple-strip",
      samsung: "samsung-strip",
      "picked-for-you": "picked-for-you",
    };
    const target = sectionMap[chip];
    if (target) {
      const el = document.getElementById(target);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <div className="w-full flex flex-col">
      <section className="tc-curated-heading" aria-labelledby="tc-curated-title">
        <div className="container tc-curated-heading-inner">
          <div>
            <span className="tc-curated-eyebrow">THE DEVICE EDIT / 2026</span>
            <h2 id="tc-curated-title">Discover something <em>remarkable.</em></h2>
            <p>Explore device collections and compare marketplace options before choosing your next upgrade.</p>
          </div>
          <Link to="/cat/mobiles" className="tc-curated-link">
            Browse the catalog <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <DecisionChips active={activeChip} onChange={handleChipChange} />
      <AppleShowcaseStrip />
      <SamsungFlagshipStrip />
      <AlgorithmSection />
    </div>
  );
}

export default FlagshipShowcase;
