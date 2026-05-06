import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
}

// ─── Hardcoded Fallbacks ───────────────────────────────────────────────────────
const APPLE_PRODUCTS: ProductCard[] = [
  { id: "a1", name: "iPhone 16 Pro Max", subtitle: "Titanium · A18 Pro", price: "NPR 2,05,000", priceValue: 205000, icon: <Smartphone className="w-6 h-6" />, brand: "Apple" },
  { id: "a2", name: "iPhone 16", subtitle: "Dynamic Island · A18", price: "NPR 1,45,000", priceValue: 145000, icon: <Smartphone className="w-6 h-6" />, brand: "Apple" },
  { id: "a3", name: "MacBook Air M3", subtitle: "18-hr battery · 13″", price: "NPR 1,85,000", priceValue: 185000, icon: <Laptop className="w-6 h-6" />, brand: "Apple" },
  { id: "a4", name: "iPad Pro M4", subtitle: "OLED · Ultra Retina", price: "NPR 1,65,000", priceValue: 165000, icon: <Tablet className="w-6 h-6" />, brand: "Apple" },
  { id: "a5", name: "Apple Watch Series 10", subtitle: "Thinnest ever · watchOS 11", price: "NPR 75,000", priceValue: 75000, icon: <Watch className="w-6 h-6" />, brand: "Apple" },
  { id: "a6", name: "AirPods Pro 2", subtitle: "ANC · Vision Pro audio", price: "NPR 42,000", priceValue: 42000, icon: <Headphones className="w-6 h-6" />, brand: "Apple" },
];

const SAMSUNG_PRODUCTS: ProductCard[] = [
  { id: "s1", name: "Galaxy S25 Ultra", subtitle: "Snapdragon 8 Elite · S Pen", price: "NPR 1,95,000", priceValue: 195000, icon: <Smartphone className="w-6 h-6" />, brand: "Samsung" },
  { id: "s2", name: "Galaxy S25+", subtitle: "Snapdragon 8 Elite · 6.7″", price: "NPR 1,45,000", priceValue: 145000, icon: <Smartphone className="w-6 h-6" />, brand: "Samsung" },
  { id: "s3", name: "Galaxy Z Fold 6", subtitle: "Foldable · 7.6″ AMOLED", price: "NPR 3,20,000", priceValue: 320000, icon: <Smartphone className="w-6 h-6" />, brand: "Samsung" },
  { id: "s4", name: "Galaxy Z Flip 6", subtitle: "Compact Flip · Flex Window", price: "NPR 1,55,000", priceValue: 155000, icon: <Smartphone className="w-6 h-6" />, brand: "Samsung" },
  { id: "s5", name: "Galaxy Tab S9", subtitle: "Dynamic AMOLED · S Pen", price: "NPR 1,25,000", priceValue: 125000, icon: <Tablet className="w-6 h-6" />, brand: "Samsung" },
  { id: "s6", name: "Galaxy Buds3 Pro", subtitle: "360 Audio · ANC", price: "NPR 38,000", priceValue: 38000, icon: <Headphones className="w-6 h-6" />, brand: "Samsung" },
];

const TRENDING_FALLBACK = [
  { rank: 1, name: "Galaxy S25 Ultra", brand: "Samsung", price: "NPR 1,95,000" },
  { rank: 2, name: "iPhone 16 Pro Max", brand: "Apple", price: "NPR 2,05,000" },
  { rank: 3, name: "Galaxy Z Fold 6", brand: "Samsung", price: "NPR 3,20,000" },
  { rank: 4, name: "iPhone 16", brand: "Apple", price: "NPR 1,45,000" },
  { rank: 5, name: "MacBook Air M3", brand: "Apple", price: "NPR 1,85,000" },
];

const VALUE_FALLBACK: ProductCard[] = [
  { id: "v1", name: "Redmi Note 13", subtitle: "108MP · 120Hz AMOLED", price: "NPR 24,999", priceValue: 24999, icon: <Smartphone className="w-6 h-6" />, brand: "Xiaomi" },
  { id: "v2", name: "Realme 12x", subtitle: "50MP · 5000mAh", price: "NPR 19,999", priceValue: 19999, icon: <Smartphone className="w-6 h-6" />, brand: "Realme" },
  { id: "v3", name: "Samsung Galaxy A35", subtitle: "50MP · Gorilla Glass", price: "NPR 29,999", priceValue: 29999, icon: <Smartphone className="w-6 h-6" />, brand: "Samsung" },
];

const JUST_IN_FALLBACK: ProductCard[] = [
  { id: "j1", name: "OnePlus 13R", subtitle: "Snapdragon 8s Gen 3", price: "NPR 89,000", priceValue: 89000, icon: <Smartphone className="w-6 h-6" />, brand: "OnePlus" },
  { id: "j2", name: "Pixel 9 Pro", subtitle: "Google AI · Tensor G4", price: "NPR 1,55,000", priceValue: 155000, icon: <Smartphone className="w-6 h-6" />, brand: "Google" },
  { id: "j3", name: "ASUS ROG Phone 8", subtitle: "Gaming · 165Hz", price: "NPR 1,25,000", priceValue: 125000, icon: <Smartphone className="w-6 h-6" />, brand: "ASUS" },
  { id: "j4", name: "Vivo X200 Pro", subtitle: "Zeiss Camera · 5500mAh", price: "NPR 1,10,000", priceValue: 110000, icon: <Smartphone className="w-6 h-6" />, brand: "Vivo" },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function TrustBar() {
  const items = [
    { icon: <Shield className="w-4 h-4" />, text: "100% Authentic" },
    { icon: <Zap className="w-4 h-4" />, text: "Fast Delivery" },
    { icon: <BadgeCheck className="w-4 h-4" />, text: "Certified Repair" },
    { icon: <DollarSign className="w-4 h-4" />, text: "Easy EMI" },
    { icon: <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />, text: "4.9/5 Rating" },
  ];
  return (
    <div className="w-full bg-zinc-900/80 backdrop-blur border-y border-white/5 py-3 overflow-hidden">
      <div className="flex items-center justify-center gap-4 flex-wrap px-4">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-white/80 text-sm font-medium">
            <span className="text-blue-400">{item.icon}</span>
            <span>{item.text}</span>
            {i < items.length - 1 && (
              <span className="hidden sm:inline ml-4 text-white/20">·</span>
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
    <div className="w-full bg-zinc-950 py-4 px-4">
      <div className="container mx-auto flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {chips.map((chip) => (
          <button
            key={chip.value}
            onClick={() => onChange(chip.value)}
            className={`flex-shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
              active === chip.value
                ? "hero-gradient text-white shadow-glow scale-105"
                : "bg-white/8 text-white/70 border border-white/10 hover:bg-white/15 hover:text-white"
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
  return (
    <Link
      to={`/buy?brand=${product.brand}&search=${encodeURIComponent(product.name)}`}
      className="group flex-shrink-0 w-52 bg-white/5 border border-white/10 backdrop-blur rounded-2xl p-5 flex flex-col gap-3 hover:-translate-y-1 hover:ring-1 hover:ring-white/25 transition-all duration-300 hover:bg-white/8"
    >
      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/70 group-hover:text-white transition-colors">
        {product.icon}
      </div>
      <div className="flex-1">
        <p className="text-white font-semibold text-sm leading-tight">{product.name}</p>
        <p className="text-white/50 text-xs mt-0.5">{product.subtitle}</p>
      </div>
      <div>
        <p className="text-white/90 font-bold text-sm">{product.price}</p>
        <div className="mt-2 flex items-center gap-1 text-xs text-blue-400 font-medium group-hover:gap-2 transition-all">
          <span>View</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </Link>
  );
}

// Samsung product card
function SamsungCard({ product }: { product: ProductCard }) {
  return (
    <Link
      to={`/buy?brand=${product.brand}&search=${encodeURIComponent(product.name)}`}
      className="group flex-shrink-0 w-52 bg-white/5 border border-purple-500/20 backdrop-blur rounded-2xl p-5 flex flex-col gap-3 hover:-translate-y-1 hover:ring-1 hover:ring-purple-400/40 transition-all duration-300 hover:bg-[#1e2445]"
    >
      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 group-hover:text-purple-200 transition-colors">
        {product.icon}
      </div>
      <div className="flex-1">
        <p className="text-white font-semibold text-sm leading-tight">{product.name}</p>
        <p className="text-white/50 text-xs mt-0.5">{product.subtitle}</p>
      </div>
      <div>
        <p className="text-white/90 font-bold text-sm">{product.price}</p>
        <div className="mt-2 flex items-center gap-1 text-xs text-purple-400 font-medium group-hover:gap-2 transition-all">
          <span>View</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </Link>
  );
}

// Generic small product card
function MiniCard({ product, variant = "light" }: { product: ProductCard; variant?: "light" | "dark" }) {
  return (
    <Link
      to={`/buy?brand=${product.brand}&search=${encodeURIComponent(product.name)}`}
      className={`group flex items-center gap-3 rounded-xl p-3 transition-all duration-200 ${
        variant === "dark"
          ? "bg-white/5 border border-white/8 hover:bg-white/10"
          : "bg-zinc-800/60 border border-white/8 hover:bg-zinc-700/60"
      }`}
    >
      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white/60 flex-shrink-0">
        {product.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">{product.name}</p>
        <p className="text-white/50 text-xs">{product.price}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/70 flex-shrink-0 transition-colors" />
    </Link>
  );
}

// ─── Hero Section ──────────────────────────────────────────────────────────────
function DualBrandHero() {
  return (
    <section className="relative w-full min-h-[60vh] flex flex-col lg:flex-row overflow-hidden">
      {/* Apple Side */}
      <div className="relative flex-1 bg-black flex flex-col justify-center items-center lg:items-start px-8 py-16 lg:px-16 min-h-[320px] lg:min-h-0 group overflow-hidden">
        {/* Background radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(59,130,246,0.12),transparent_70%)] pointer-events-none" />
        <div className="absolute top-6 left-6 lg:top-8 lg:left-12">
          <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur border border-white/20 rounded-full px-3 py-1 text-white/80 text-xs font-semibold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Apple Ecosystem
          </span>
        </div>
        {/* Floating phone silhouette */}
        <div className="absolute right-8 bottom-8 opacity-10 text-[120px] leading-none select-none pointer-events-none group-hover:opacity-15 transition-opacity duration-500 hidden lg:block">
          📱
        </div>
        <div className="relative z-10 text-center lg:text-left mt-8 lg:mt-0">
          <p className="text-white/40 text-xs font-medium uppercase tracking-[0.2em] mb-2">Think Different</p>
          <h2 className="font-display text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-none mb-3">
            Apple
          </h2>
          <p className="text-white/60 text-base lg:text-lg mb-2 font-medium">iPhone 16 Pro Max.</p>
          <p className="text-white/40 text-sm mb-6">The most personal Pro ever.</p>
          <p className="text-white/50 text-sm mb-6">
            From{" "}
            <span className="text-white font-bold text-lg">NPR 1,45,000</span>
          </p>
          <Link
            to="/buy?brand=Apple"
            className="inline-flex items-center gap-2 bg-white text-black font-semibold text-sm px-6 py-3 rounded-full hover:bg-white/90 transition-all duration-200 hover:gap-3 shadow-lg"
          >
            Explore Apple
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* VS Divider */}
      <div className="hidden lg:flex flex-col items-center justify-center relative z-20 w-0">
        <div className="absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
        <div className="relative z-10 w-10 h-10 rounded-full bg-zinc-900 border border-white/20 flex items-center justify-center text-white/60 text-xs font-bold shadow-xl">
          VS
        </div>
      </div>

      {/* Samsung Side */}
      <div className="relative flex-1 bg-[#0d0f1e] flex flex-col justify-center items-center lg:items-end px-8 py-16 lg:px-16 min-h-[320px] lg:min-h-0 group overflow-hidden">
        {/* Purple gradient bg */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(139,92,246,0.18),transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_80%,rgba(59,130,246,0.1),transparent_60%)] pointer-events-none" />
        <div className="absolute top-6 right-6 lg:top-8 lg:right-12">
          <span className="inline-flex items-center gap-1.5 bg-purple-500/20 backdrop-blur border border-purple-400/30 rounded-full px-3 py-1 text-purple-200 text-xs font-semibold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Galaxy Flagship
          </span>
        </div>
        {/* Floating phone silhouette */}
        <div className="absolute left-8 bottom-8 opacity-10 text-[120px] leading-none select-none pointer-events-none group-hover:opacity-15 transition-opacity duration-500 hidden lg:block">
          📱
        </div>
        <div className="relative z-10 text-center lg:text-right mt-8 lg:mt-0">
          <p className="text-purple-300/60 text-xs font-medium uppercase tracking-[0.2em] mb-2">Epic Every Day</p>
          <h2 className="font-display text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-none mb-3 bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
            Samsung
          </h2>
          <p className="text-white/60 text-base lg:text-lg mb-2 font-medium">Galaxy S25 Ultra.</p>
          <p className="text-white/40 text-sm mb-6">Intelligence. Elevated.</p>
          <p className="text-white/50 text-sm mb-6">
            From{" "}
            <span className="text-white font-bold text-lg">NPR 1,45,000</span>
          </p>
          <Link
            to="/buy?brand=Samsung"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold text-sm px-6 py-3 rounded-full hover:from-purple-400 hover:to-blue-400 transition-all duration-200 hover:gap-3 shadow-lg shadow-purple-900/50"
          >
            Explore Samsung
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
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
        .select("id, name, subtitle, price_value, brand, slug")
        .eq("brand", "Apple")
        .limit(6);
      if (error || !data?.length) return null;
      return data as any[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const products: ProductCard[] = dbProducts?.length
    ? dbProducts.map((p: any, i: number) => ({
        id: p.id,
        name: p.name,
        subtitle: p.subtitle ?? "",
        price: `NPR ${Number(p.price_value).toLocaleString("en-IN")}`,
        priceValue: p.price_value,
        icon: <Smartphone className="w-6 h-6" />,
        brand: p.brand,
        slug: p.slug,
      }))
    : APPLE_PRODUCTS;

  return (
    <section id="apple-strip" className="bg-zinc-950 py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-white/40 text-xs uppercase tracking-widest font-medium mb-1">Cupertino Originals</p>
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-white">
              Apple Lineup{" "}
              <span className="text-white/40 font-normal">— Nepal Edition</span>
            </h2>
          </div>
          <Link
            to="/buy?brand=Apple"
            className="hidden sm:flex items-center gap-1.5 text-sm text-blue-400 font-medium hover:text-blue-300 transition-colors"
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
            to="/buy?brand=Apple"
            className="flex-shrink-0 w-40 border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 text-white/40 hover:text-white/70 hover:border-white/20 transition-all duration-200 p-5"
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
        .select("id, name, subtitle, price_value, brand, slug")
        .eq("brand", "Samsung")
        .limit(6);
      if (error || !data?.length) return null;
      return data as any[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const products: ProductCard[] = dbProducts?.length
    ? dbProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        subtitle: p.subtitle ?? "",
        price: `NPR ${Number(p.price_value).toLocaleString("en-IN")}`,
        priceValue: p.price_value,
        icon: <Smartphone className="w-6 h-6" />,
        brand: p.brand,
        slug: p.slug,
      }))
    : SAMSUNG_PRODUCTS;

  return (
    <section id="samsung-strip" className="py-12 relative overflow-hidden" style={{ backgroundColor: "#0d0f1e" }}>
      {/* Subtle gradient bg */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(139,92,246,0.12),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_10%_80%,rgba(59,130,246,0.08),transparent_60%)] pointer-events-none" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-purple-400/60 text-xs uppercase tracking-widest font-medium mb-1">Galaxy Series</p>
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-white">
              Galaxy Flagship{" "}
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                — Available Now
              </span>
            </h2>
          </div>
          <Link
            to="/buy?brand=Samsung"
            className="hidden sm:flex items-center gap-1.5 text-sm text-purple-400 font-medium hover:text-purple-300 transition-colors"
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
            to="/buy?brand=Samsung"
            className="flex-shrink-0 w-40 border border-purple-500/20 rounded-2xl flex flex-col items-center justify-center gap-2 text-purple-400/40 hover:text-purple-400 hover:border-purple-500/40 transition-all duration-200 p-5"
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
        .select("id, name, brand, price_value")
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
        price: `NPR ${Number(p.price_value).toLocaleString("en-IN")}`,
      }))
    : TRENDING_FALLBACK;

  // Best value query
  const { data: valueData } = useQuery({
    queryKey: ["value-products"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("products")
        .select("id, name, subtitle, price_value, brand")
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
        price: `NPR ${Number(p.price_value).toLocaleString("en-IN")}`,
        priceValue: p.price_value,
        icon: <Smartphone className="w-6 h-6" />,
        brand: p.brand,
      }))
    : VALUE_FALLBACK;

  // Just in query
  const { data: newData } = useQuery({
    queryKey: ["new-arrivals"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("products")
        .select("id, name, subtitle, price_value, brand")
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
        price: `NPR ${Number(p.price_value).toLocaleString("en-IN")}`,
        priceValue: p.price_value,
        icon: <Smartphone className="w-6 h-6" />,
        brand: p.brand,
      }))
    : JUST_IN_FALLBACK;

  return (
    <section id="picked-for-you" className="bg-zinc-950 py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-white/60 text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Smart Picks
          </div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-2">
            Picked For You
          </h2>
          <p className="text-white/40 text-sm">Based on what Nepal is browsing right now</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Trending */}
          <div className="bg-zinc-900 border border-white/8 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">Trending Now</h3>
                <p className="text-white/40 text-xs">Nepal searches this week</p>
              </div>
            </div>
            <p className="text-white/60 text-sm">
              Galaxy S25 series & iPhone 16 are dominating Nepal searches this week.
            </p>
            <div className="flex flex-col gap-2">
              {trending.map((item) => (
                <Link
                  key={item.rank}
                  to={`/buy?brand=${item.brand}&search=${encodeURIComponent(item.name)}`}
                  className="flex items-center gap-3 group py-1"
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      item.rank === 1
                        ? "bg-orange-500/20 text-orange-400"
                        : item.rank === 2
                        ? "bg-zinc-700 text-white/60"
                        : "bg-zinc-800 text-white/40"
                    }`}
                  >
                    {item.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm font-medium group-hover:text-white transition-colors truncate">
                      {item.name}
                    </p>
                    <p className="text-white/40 text-xs">{item.price}</p>
                  </div>
                  <TrendingUp className="w-3.5 h-3.5 text-white/20 group-hover:text-orange-400 flex-shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
            <Link
              to="/buy?sort=trending"
              className="mt-auto flex items-center justify-center gap-1.5 text-xs text-orange-400 font-semibold hover:text-orange-300 transition-colors pt-2 border-t border-white/5"
            >
              View all trending <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Best Value */}
          <div className="bg-zinc-900 border border-white/8 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">Best Value Right Now</h3>
                <p className="text-white/40 text-xs">Under NPR 30,000</p>
              </div>
            </div>
            <p className="text-white/60 text-sm">
              Best phones under NPR 30,000 — more phone for your money.
            </p>
            <div className="flex flex-col gap-2">
              {valueProducts.map((product) => (
                <MiniCard key={product.id} product={product} variant="dark" />
              ))}
            </div>
            <Link
              to="/buy?maxPrice=30000"
              className="mt-auto flex items-center justify-center gap-1.5 text-xs text-green-400 font-semibold hover:text-green-300 transition-colors pt-2 border-t border-white/5"
            >
              See all under 30K <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: Just In */}
          <div className="bg-zinc-900 border border-white/8 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">Just In</h3>
                <p className="text-white/40 text-xs">Freshly added this week</p>
              </div>
            </div>
            <p className="text-white/60 text-sm">
              Hot off the shelf — newest arrivals at Tamrakar Complex.
            </p>
            <div className="flex flex-col gap-2">
              {newProducts.map((product) => (
                <MiniCard key={product.id} product={product} variant="dark" />
              ))}
            </div>
            <Link
              to="/buy?sort=newest"
              className="mt-auto flex items-center justify-center gap-1.5 text-xs text-blue-400 font-semibold hover:text-blue-300 transition-colors pt-2 border-t border-white/5"
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
      {/* 1. Dual Brand Hero */}
      <DualBrandHero />

      {/* Trust bar */}
      <TrustBar />

      {/* 2. Quick Decision Chips */}
      <DecisionChips active={activeChip} onChange={handleChipChange} />

      {/* 3. Apple Showcase */}
      <AppleShowcaseStrip />

      {/* Trust bar */}
      <TrustBar />

      {/* 4. Samsung Flagship */}
      <SamsungFlagshipStrip />

      {/* 5. Algorithm Section */}
      <AlgorithmSection />
    </div>
  );
}

export default FlagshipShowcase;
