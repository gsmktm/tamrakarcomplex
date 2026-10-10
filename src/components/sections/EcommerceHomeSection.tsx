import { useEffect, useMemo, useState, useRef, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  CreditCard,
  Cpu,
  Headphones,
  Laptop,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Tablet,
  TrendingUp,
  Trophy,
  Watch,
  Wrench,
  Zap,
  Globe,
  ExternalLink,
  Search,
  ShieldAlert,
  PackageCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/products/ProductCard";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { PollSection } from "@/components/sections/PollSection";
import { HomeSearchBox } from "@/components/home/HomeSearchBox";
import { HomePriceFinder } from "@/components/home/HomePriceFinder";
import { PhoneFinderQuiz } from "@/components/home/PhoneFinderQuiz";
import { HomeMarketplaceFeed } from "@/components/home/HomeMarketplaceFeed";
import { HomeRepairMiniForm } from "@/components/home/HomeRepairMiniForm";
import { HomeStoreSpotlight } from "@/components/home/HomeStoreSpotlight";
import { HomeOffers } from "@/components/home/HomeOffers";
import { HomeTrustStats } from "@/components/home/HomeTrustStats";
import { HomeCompareMini } from "@/components/home/HomeCompareMini";
import { useFeaturedProducts, useProducts, type Product } from "@/hooks/useProducts";
import { useLatestPrices } from "@/hooks/useLatestPrices";
import { useArticlesList } from "@/hooks/useArticles";
import { useGuidesList } from "@/hooks/useGuides";
import { useAuth } from "@/hooks/useAuth";
import { useHomepageSettings } from "@/hooks/useHomepageSettings";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { readThemeSettings } from "@/lib/siteSettings";
import { getPublicStorePath } from "@/lib/storeRoutes";
import type { SectionConfig } from "@/types/app";
import { formatDistanceToNow } from "date-fns";
import { FlagshipShowcase } from "@/components/sections/FlagshipShowcase";
import { Reveal } from "@/components/home/Reveal";
import { HomeCommandHero } from "@/components/home/HomeCommandHero";

type HomeStore = {
  id: string;
  name: string;
  slug?: string | null;
  seo_slug?: string | null;
  location?: string | null;
  description?: string | null;
  services?: string[] | null;
  is_verified?: boolean | null;
  is_featured?: boolean | null;
  package_slug?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  shop_no?: string | null;
  subscription_status?: string | null;
};

// ─── Device Showcase Components ───────────────────────────────────────────────

function DeviceFrame({ type, children, className }: { type: 'phone' | 'laptop', children: React.ReactNode, className?: string }) {
  if (type === 'phone') {
    return (
      <div className={cn("relative mx-auto w-[280px] h-[580px] bg-slate-900 rounded-[3rem] border-[8px] border-slate-800 shadow-2xl overflow-hidden", className)}>
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20" />
        {/* Screen Content */}
        <div className="absolute inset-0 bg-background overflow-hidden">
          {children}
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn("relative mx-auto w-full max-w-[500px] aspect-[16/10] bg-slate-900 rounded-xl border-[6px] border-slate-800 shadow-2xl overflow-hidden", className)}>
      {/* Camera */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-700 z-20" />
      {/* Screen Content */}
      <div className="absolute inset-0 bg-background overflow-hidden">
        {children}
      </div>
      {/* Base/Hinge Shadow */}
      <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-t from-black/20 to-transparent" />
    </div>
  );
}

// ─── Section config ───────────────────────────────────────────────────────────

const defaultSections: SectionConfig[] = [
  { key: "hero", label: "Hero", enabled: true, settings: {} },
  { key: "quick_actions", label: "Quick Actions", enabled: true, settings: {} },
  { key: "serviceMatrix", label: "Service Matrix", enabled: true, settings: {} },
  { key: "priceDesk", label: "Price Desk", enabled: true, settings: {} },
  { key: "featured", label: "Featured Products", enabled: true, settings: {} },
  { key: "storesAndStories", label: "Stores and Stories", enabled: true, settings: {} },
  { key: "trust_stats", label: "Trust Stats", enabled: true, settings: {} },
  { key: "trust", label: "Trust Section", enabled: true, settings: {} },
  { key: "poll", label: "Community Poll", enabled: true, settings: {} },
  { key: "chat", label: "Chat Widget", enabled: true, settings: {} },
];

function mergeSections(saved: unknown): SectionConfig[] {
  if (!Array.isArray(saved)) return defaultSections;
  return defaultSections.map((section) => {
    const match = saved.find(
      (c): c is SectionConfig =>
        typeof c === "object" && c !== null && "key" in c && (c as SectionConfig).key === section.key,
    );
    return match ? { ...section, enabled: match.enabled, settings: { ...section.settings, ...match.settings } } : section;
  });
}

// ─── Static data ─────────────────────────────────────────────────────────────

const tickerItems = [
  { label: "New iPhone 16 Pro — Now Available", href: "/buy?brand=Apple" },
  { label: "Samsung Galaxy S24 Ultra — Best Price in Nepal", href: "/buy?brand=Samsung" },
  { label: "Free Diagnosis with Every Repair Booking", href: "/repair" },
  { label: "Sell Your Old Phone — Get Instant Quote", href: "/sell-your-phone" },
  { label: "MacBook Air M3 — Unbeatable Exchange Offer", href: "/exchange-your-phone" },
  { label: "Verified Stores — Safe & Trusted Purchases", href: "/stores" },
];

const _legacyHeroStats = [
  { value: "500+", label: "Products" },
  { value: "50+", label: "Stores" },
  { value: "10K+", label: "Customers" },
  { value: "4.9★", label: "Rating" },
];

const serviceCards = [
  {
    title: "Instant Sell",
    subtitle: "Get cash today",
    description: "Quote-first selling — fast, transparent, and zero haggle.",
    href: "/sell-your-phone",
    icon: CircleDollarSign,
    gradient: "from-blue-600 to-emerald-500",
    glow: "shadow-[0_8px_32px_rgba(37,99,235,0.3)]",
    bg: "bg-[linear-gradient(135deg,rgba(37,99,235,0.1),rgba(16,185,129,0.08))]",
  },
  {
    title: "Exchange",
    subtitle: "Upgrade smarter",
    description: "Trade your old device toward your next iPhone or Galaxy.",
    href: "/exchange-your-phone",
    icon: RefreshCw,
    gradient: "from-violet-600 to-blue-500",
    glow: "shadow-[0_8px_32px_rgba(124,58,237,0.3)]",
    bg: "bg-[linear-gradient(135deg,rgba(124,58,237,0.1),rgba(37,99,235,0.06))]",
  },
  {
    title: "Marketplace",
    subtitle: "Direct deals",
    description: "List your device, set your price, sell to real buyers.",
    href: "/marketplace",
    icon: ShoppingBag,
    gradient: "from-sky-500 to-blue-600",
    glow: "shadow-[0_8px_32px_rgba(14,165,233,0.25)]",
    bg: "bg-[linear-gradient(135deg,rgba(14,165,233,0.1),rgba(59,130,246,0.06))]",
  },
  {
    title: "Diagnostics Hub",
    subtitle: "Identify device faults",
    description: "Smart troubleshooting to find hardware issues and get instant repair estimates.",
    href: "/repair#diagnostics-section",
    icon: ShieldAlert,
    gradient: "from-amber-500 to-orange-500",
    glow: "shadow-[0_8px_32px_rgba(245,158,11,0.25)]",
    bg: "bg-[linear-gradient(135deg,rgba(245,158,11,0.1),rgba(251,191,36,0.06))]",
  },
  {
    title: "Repair Desk",
    subtitle: "Expert service",
    description: "Book screen, battery, and diagnostics from certified techs.",
    href: "/repair",
    icon: Wrench,
    gradient: "from-orange-500 to-rose-500",
    glow: "shadow-[0_8px_32px_rgba(249,115,22,0.25)]",
    bg: "bg-[linear-gradient(135deg,rgba(249,115,22,0.1),rgba(244,63,94,0.06))]",
  },
  {
    title: "Find a Store",
    subtitle: "Verified sellers",
    description: "Discover trusted shops, repair counters, and brand partners.",
    href: "/stores",
    icon: Store,
    gradient: "from-emerald-500 to-cyan-500",
    glow: "shadow-[0_8px_32px_rgba(34,197,94,0.25)]",
    bg: "bg-[linear-gradient(135deg,rgba(34,197,94,0.1),rgba(6,182,212,0.06))]",
  },
];

const categoryTabs = [
  { label: "All", value: "All", icon: Sparkles },
  { label: "Phones", value: "Smartphones", icon: Smartphone },
  { label: "Laptops", value: "Laptops", icon: Laptop },
  { label: "Tablets", value: "Tablets", icon: Tablet },
  { label: "Earbuds", value: "Earbuds", icon: Headphones },
  { label: "Watches", value: "Smartwatches", icon: Watch },
];

const smartphoneBrands = [
  { name: "Samsung", code: "SA", color: "from-blue-600 to-blue-400" },
  { name: "Apple", code: "AP", color: "from-gray-700 to-gray-500" },
  { name: "Xiaomi", code: "XI", color: "from-orange-500 to-orange-400" },
  { name: "OnePlus", code: "1+", color: "from-red-600 to-red-400" },
  { name: "Vivo", code: "VI", color: "from-blue-500 to-purple-500" },
  { name: "OPPO", code: "OP", color: "from-green-500 to-emerald-400" },
  { name: "Realme", code: "RE", color: "from-yellow-500 to-orange-400" },
  { name: "Motorola", code: "MO", color: "from-indigo-500 to-blue-400" },
  { name: "Nothing", code: "NO", color: "from-gray-900 to-gray-700" },
  { name: "Honor", code: "HO", color: "from-cyan-500 to-blue-400" },
  { name: "Infinix", code: "IN", color: "from-purple-500 to-pink-400" },
  { name: "Tecno", code: "TE", color: "from-teal-500 to-green-400" },
  { name: "POCO", code: "PO", color: "from-yellow-600 to-yellow-400" },
  { name: "Ai+", code: "AI", color: "from-emerald-600 to-teal-400" },
  { name: "ZTE", code: "ZT", color: "from-sky-600 to-cyan-400" },
];

const laptopBrands = [
  { name: "Apple", code: "AP", color: "from-gray-700 to-gray-500" },
  { name: "Dell", code: "DE", color: "from-blue-700 to-blue-500" },
  { name: "HP", code: "HP", color: "from-blue-500 to-cyan-400" },
  { name: "Lenovo", code: "LE", color: "from-red-600 to-red-400" },
  { name: "ASUS", code: "AS", color: "from-indigo-600 to-blue-500" },
  { name: "Acer", code: "AC", color: "from-green-600 to-emerald-400" },
  { name: "MSI", code: "MS", color: "from-red-700 to-red-500" },
  { name: "Microsoft", code: "MI", color: "from-blue-600 to-sky-400" },
];

const budgetRanges = [
  { label: "Under 20K", fullLabel: "Under Rs. 20,000", min: 0, max: 20000, gradient: "from-green-500 to-emerald-400" },
  { label: "20K – 30K", fullLabel: "Rs. 20,000 – 30,000", min: 20000, max: 30000, gradient: "from-blue-500 to-sky-400" },
  { label: "30K – 50K", fullLabel: "Rs. 30,000 – 50,000", min: 30000, max: 50000, gradient: "from-violet-500 to-purple-400" },
  { label: "50K – 80K", fullLabel: "Rs. 50,000 – 80,000", min: 50000, max: 80000, gradient: "from-orange-500 to-amber-400" },
  { label: "80K – 1L", fullLabel: "Rs. 80,000 – 1 Lakh", min: 80000, max: 100000, gradient: "from-pink-500 to-rose-400" },
  { label: "Above 1L", fullLabel: "Above Rs. 1 Lakh", min: 100000, max: 1000000, gradient: "from-rose-600 to-red-400" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  eyebrow,
  title,
  href,
  hrefLabel = "View all",
}: {
  eyebrow: string;
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-8">
      <div>
        <p className="text-xs font-semibold tracking-[0.22em] uppercase text-muted-foreground mb-1">{eyebrow}</p>
        <h2 className="font-display text-2xl lg:text-3xl font-bold flex items-center gap-3">
          <span className="w-1.5 h-8 rounded-full hero-gradient shrink-0" />
          {title}
        </h2>
      </div>
      {href && (
        <Link to={href}>
          <Button variant="ghost" size="sm" className="gap-1 text-primary group shrink-0">
            {hrefLabel}
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      )}
    </div>
  );
}

function SkeletonGrid({ count = 6, cols = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" }: { count?: number; cols?: string }) {
  return (
    <div className={cn("grid gap-4", cols)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-square rounded-2xl" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EcommerceHomeSection() {
  const [sections, setSections] = useState(defaultSections);
  const { data: homeSettings, isLoading: settingsLoading } = useHomepageSettings();
  
  const enabledSections = useMemo(() => {
    // If we have database settings, use those primarily
    if (homeSettings?.sections_control) {
      return homeSettings.sections_control;
    }
    // Fallback to theme settings or defaults
    return sections.reduce((acc: Record<string, boolean>, s) => {
      acc[s.key] = s.enabled;
      return acc;
    }, {});
  }, [sections, homeSettings]);

  useEffect(() => {
    const sync = () => {
      try {
        setSections(mergeSections(readThemeSettings().sections));
      } catch {
        setSections(defaultSections);
      }
    };
    sync();
    window.addEventListener("theme-update", sync);
    return () => window.removeEventListener("theme-update", sync);
  }, []);

  // Data
  const { data: featuredProducts } = useFeaturedProducts();
  const { data: allProducts, isLoading: latestProductsLoading } = useProducts(100);
  const { data: latestArticles, isLoading: articlesLoading } = useArticlesList({ limit: 6 });
  const { data: latestGuides } = useGuidesList({ limit: 4 });
  const { data: featuredStores, isLoading: isStoresLoading } = useQuery({
    queryKey: ["featured-stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id,name,slug,seo_slug,location,description,services,is_verified,is_featured,package_slug,phone,email,website,logo_url,shop_no,subscription_status")
        .eq("is_active", true)
        .limit(30);

      if (error) throw error;

      const TIER: Record<string, number> = { diamond: 4, gold: 3, silver: 2, free: 1 };
      const sorted = (data ?? []).sort((a: HomeStore, b: HomeStore) => {
        const wa = (TIER[a.package_slug ?? "free"] ?? 1) + (a.is_featured ? 1 : 0);
        const wb = (TIER[b.package_slug ?? "free"] ?? 1) + (b.is_featured ? 1 : 0);
        return wb - wa;
      });

      return sorted.slice(0, 10) as HomeStore[];
    },
  });
  const { data: rawStores, isLoading: storesLoading } = useQuery({
    queryKey: ["home-stores-preview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id,name,slug,seo_slug,location,description,services,is_verified,phone,email,website,logo_url")
        .order("is_verified", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as HomeStore[];
    },
  });

  const products = useMemo(() => featuredProducts ?? [], [featuredProducts]);
  const allProductsList = useMemo(() => {
    const live = allProducts ?? [];
    return [...live].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    }) as Product[];
  }, [allProducts]);
  const stores = rawStores ?? [];
  const articles = latestArticles ?? [];
  const guides = latestGuides ?? [];

  return (
    <div className="home-world pb-20">
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      {(enabledSections.hero || enabledSections.search_box) && (
        <HomeCommandHero />
      )}

      {/* ── FLAGSHIP SHOWCASE (Apple + Samsung + Algorithm) ──────────────── */}
      <FlagshipShowcase />

      {/* ── OFFERS & DEALS ───────────────────────────────────────────────── */}
      {enabledSections.offers && <HomeOffers />}

      {/* ── PRICE FINDER ─────────────────────────────────────────────────── */}
      {enabledSections.price_finder && <HomePriceFinder />}

      {/* ── SERVICE MATRIX ───────────────────────────────────────────────── */}
      {enabledSections.serviceMatrix && <ServiceMatrix />}

      {/* ── MARKETPLACE FEED ─────────────────────────────────────────────── */}
      {enabledSections.marketplace_feed && <HomeMarketplaceFeed />}

      {/* ── PHONE FINDER QUIZ ────────────────────────────────────────────── */}
      {enabledSections.phone_finder && <PhoneFinderQuiz />}

      {/* ── PRICE DISCOVERY DESK (OLD) ────────────────────────────────────── */}
      {enabledSections.priceDesk && <PriceDesk allProducts={allProductsList} />}

      {/* ── FEATURED PRODUCTS ────────────────────────────────────────────── */}
      {enabledSections.featured && (
        <FeaturedSection products={allProductsList} isLoading={latestProductsLoading} />
      )}

      {/* ── COMPARE MINI ─────────────────────────────────────────────────── */}
      {enabledSections.compare_mini && <HomeCompareMini />}

      {/* ── REPAIR MINI FORM ─────────────────────────────────────────────── */}
      {enabledSections.repair_form && <HomeRepairMiniForm />}

      {/* ── PRE-BOOKING + EMI ────────────────────────────────────────────── */}
      <DeviceAccessSection />

      {/* ── WHAT'S HOT — EDITORIAL ───────────────────────────────────────── */}
      <EditorialSection articles={articles} guides={guides} isLoading={articlesLoading} />

      {/* Store Spotlight — removed */}

      {/* ── TRUST STATS ──────────────────────────────────────────────────── */}
      {enabledSections.trust_stats && <HomeTrustStats />}

      {/* ── SELL CTA BANNER ──────────────────────────────────────────────── */}
      <SellCtaBanner />

      {/* Community Poll — removed */}

      {/* ── CHAT WIDGET ──────────────────────────────────────────────────── */}
      {enabledSections.chat && <ChatWidget />}
      {/* Global mobile bottom nav (BottomNav) replaces the old homepage-only sticky CTA */}
    </div>
  );
}

// ─── Ticker ──────────────────────────────────────────────────────────────────

const tickerData = [
  { icon: Sparkles, text: "New iPhone 16 Pro - Now in Stock" },
  { icon: Zap, text: "Samsung Galaxy S24 Ultra - Best Price in Nepal" },
  { icon: Wrench, text: "Free Diagnosis with Every Repair Booking" },
  { icon: CircleDollarSign, text: "Sell Your Old Phone - Get Instant Quote Today" },
  { icon: RefreshCw, text: "MacBook Air M3 - Best Exchange Offer" },
  { icon: BadgeCheck, text: "250+ Verified Stores in Tamrakar Complex" },
  { icon: Smartphone, text: "Used iPhone 14 Pro - From Rs. 85,000" },
  { icon: Trophy, text: "Nepal's Largest Mobile Mega Market" },
];

function NewsTicker() {
  const items = [...tickerData, ...tickerData];
  return (
    <div
      className="overflow-hidden py-1.5 border-b border-white/[0.08]"
      style={{ background: "linear-gradient(90deg, oklch(16% 0.034 258) 0%, oklch(22% 0.040 258) 50%, oklch(16% 0.034 258) 100%)" }}
    >
      <div className="flex gap-12 ticker-track whitespace-nowrap">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wide" style={{ color: "oklch(80% 0.014 80)" }}>
            <item.icon className="h-3.5 w-3.5" aria-hidden style={{ color: "oklch(78% 0.165 65)" }} />
            <span>{item.text}</span>
            <span className="mx-2" style={{ color: "oklch(64% 0.118 70 / 0.55)" }}>◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

const heroStats = [
  { stat: "01", label: "Compare live catalog prices", eyebrow: "Price radar", href: "/cat/mobiles", icon: TrendingUp },
  { stat: "02", label: "Contact independent stores", eyebrow: "Local network", href: "/stores", icon: Store },
  { stat: "03", label: "Sell, exchange, or repair", eyebrow: "Device loop", href: "/sell-your-phone", icon: RefreshCw },
  { stat: "04", label: "Shop with clearer terms", eyebrow: "Buyer clarity", href: "/marketplace-disclosure", icon: ShieldAlert },
];

const heroCTAs = [
  { label: "Browse Phones",   icon: ShoppingBag,       href: "/buy",               variant: "gold" },
  { label: "Find Stores",     icon: Store,              href: "/stores",            variant: "outline" },
  { label: "Book Repair",     icon: Wrench,             href: "/repair",            variant: "outline" },
  { label: "Sell Phone",      icon: CircleDollarSign,   href: "/sell-your-phone",   variant: "ghost" },
  { label: "Exchange",        icon: RefreshCw,          href: "/exchange-your-phone", variant: "ghost" },
  { label: "Compare Prices",  icon: TrendingUp,         href: "/mobile-price",      variant: "ghost" },
];

const quickCategories = [
  { label: "iPhone",      href: "/buy?brand=Apple",    icon: Smartphone },
  { label: "Samsung",     href: "/buy?brand=Samsung",  icon: Star },
  { label: "Xiaomi",      href: "/buy?brand=Xiaomi",   icon: Zap },
  { label: "MacBook",     href: "/buy?category=Laptops&brand=Apple", icon: Laptop },
  { label: "Used Phones", href: "/marketplace",        icon: RefreshCw },
  { label: "Accessories", href: "/buy?category=Accessories", icon: Headphones },
  { label: "Repair",      href: "/repair",             icon: Wrench },
  { label: "iPad",        href: "/buy?category=Tablets", icon: Tablet },
];

const operationTiles = [
  { label: "Buy", value: "Live stock", href: "/buy", icon: ShoppingBag },
  { label: "Sell", value: "Instant quote", href: "/sell-your-phone", icon: CircleDollarSign },
  { label: "Repair", value: "Book service", href: "/repair", icon: Wrench },
  { label: "Stores", value: "Verified only", href: "/stores", icon: Store },
];

function HeroSection({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    navigate(`/buy?q=${encodeURIComponent(query.trim() || "")}`);
  };

  return (
    <section className="home-hero">
      <div className="home-hero-grid" aria-hidden />
      <div className="home-hero-sun" aria-hidden />
      <div className="container home-hero-content">
        <div className="grid min-h-[720px] items-center gap-12 py-14 lg:grid-cols-[1.08fr_.92fr] lg:py-20">
          <div className="relative z-10 animate-fade-up">
            <div className="mb-7 flex items-center gap-3">
              <span className="home-hero-index">TC / 01</span>
              <span className="home-hero-badge">
                <Zap className="h-3 w-3" aria-hidden />
                New Road · Kathmandu
              </span>
            </div>
            <h1 className="home-hero-title">
              Nepal&apos;s tech
              <span>market, decoded.</span>
            </h1>
            <p className="home-hero-description mt-6 max-w-xl text-base leading-7 md:text-lg">
              Compare devices, discover independent stores, repair what you own,
              and trade into what comes next—all through one connected gadget exchange.
            </p>

            <form onSubmit={handleSearch} className="mt-8 max-w-2xl">
              <div className="home-search-shell">
                <Search className="ml-5 h-5 w-5 shrink-0" aria-hidden />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a device, store, price or repair…"
                  className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none md:text-base"
                  aria-label="Search products and stores"
                />
                <button type="submit" className="home-search-submit">
                  Explore <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3">
              {quickCategories.slice(0, 6).map((cat) => (
                <Link key={cat.label} to={cat.href} className="home-chip">
                  <span>{cat.label}</span><ArrowRight className="h-3 w-3" />
                </Link>
              ))}
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              {heroCTAs.slice(0, 3).map((cta, index) => {
                const Icon = cta.icon;
                return (
                  <Link key={cta.label} to={cta.href} className={index === 0 ? "home-cta-primary" : "home-cta-secondary"}>
                    <Icon className="h-4 w-4" /> {cta.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="home-device-stage animate-fade-up delay-150" aria-label="Connected gadget services">
            <div className="home-device-shadow" aria-hidden />
            <div className="home-device-card home-device-card-back" aria-hidden>
              <span>REPAIR / 24</span>
            </div>
            <div className="home-device-card home-device-card-front">
              <div className="home-device-camera" />
              <div className="home-device-screen">
                <span className="home-device-kicker">LIVE EXCHANGE</span>
                <strong>Find your<br />next device.</strong>
                <div className="home-device-price">NPR / MARKET</div>
                <div className="home-device-wave" aria-hidden />
              </div>
            </div>
            {operationTiles.map((tile, index) => (
              <Link key={tile.label} to={tile.href} className={`home-orbit-card home-orbit-${index + 1}`}>
                <tile.icon className="h-4 w-4" />
                <span><strong>{tile.label}</strong>{tile.value}</span>
              </Link>
            ))}
            <div className="home-stage-stamp" aria-hidden>
              <span>TAMRAKAR</span><span>COMPLEX</span>
            </div>
          </div>
        </div>

        <div className="home-route-constellation" aria-label="Explore Tamrakar Complex services">
          <span className="home-route-line" aria-hidden />
          {heroStats.map(({ stat, label, eyebrow, href, icon: Icon }, index) => (
            <Link
              key={label}
              to={href}
              className="home-route-node"
              style={{ "--route-order": index } as CSSProperties}
            >
              <span className="home-route-orbit" aria-hidden />
              <span className="home-route-number">{stat}</span>
              <span className="home-route-copy">
                <span className="home-route-eyebrow"><Icon className="h-3.5 w-3.5" />{eyebrow}</span>
                <strong>{label}</strong>
              </span>
              <span className="home-route-arrow" aria-hidden><ArrowRight className="h-4 w-4" /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}



// ─── Service Matrix ───────────────────────────────────────────────────────────

const serviceCardColors = [
  { hex: "oklch(55% 0.22 255)", bg: "oklch(55% 0.22 255 / 0.12)", glow: "oklch(55% 0.22 255 / 0.25)" },
  { hex: "oklch(54% 0.130 268)", bg: "oklch(54% 0.130 268 / 0.12)", glow: "oklch(54% 0.130 268 / 0.22)" },
  { hex: "oklch(60% 0.18 220)", bg: "oklch(60% 0.18 220 / 0.12)", glow: "oklch(60% 0.18 220 / 0.25)" },
  { hex: "oklch(72% 0.18 65)",  bg: "oklch(72% 0.18 65  / 0.12)", glow: "oklch(72% 0.18 65  / 0.25)" },
  { hex: "oklch(65% 0.20 35)",  bg: "oklch(65% 0.20 35  / 0.12)", glow: "oklch(65% 0.20 35  / 0.25)" },
  { hex: "oklch(62% 0.18 152)", bg: "oklch(62% 0.18 152 / 0.12)", glow: "oklch(62% 0.18 152 / 0.25)" },
];

function ServiceMatrix() {
  return (
    <section className="py-14 bg-background">
      <div className="container">
        <Reveal>
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <p className="home-eyebrow mb-2">Everything you need</p>
              <h2 className="font-display text-2xl lg:text-3xl font-bold">Our Services</h2>
            </div>
            <Link to="/services">
              <Button variant="ghost" size="sm" className="gap-1 text-primary group shrink-0">
                View all
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </Reveal>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {serviceCards.map((card, i) => {
            const Icon = card.icon;
            const color = serviceCardColors[i % serviceCardColors.length];
            return (
              <Reveal key={card.title} delay={(Math.min(i, 5) as 0 | 1 | 2 | 3 | 4 | 5)}>
                <Link to={card.href} className="group block h-full">
                  <div className="home-service-card h-full">
                    {/* Cut-corner accent dot */}
                    <div
                      aria-hidden
                      className="absolute top-0 right-0 w-3 h-3 opacity-60"
                      style={{ background: color.hex, clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}
                    />
                    {/* Hex icon */}
                    <div
                      className="home-hex-icon"
                      style={{ background: color.bg, boxShadow: `0 0 0 1px ${color.hex}40` }}
                    >
                      <Icon className="h-5 w-5" aria-hidden style={{ color: color.hex }} />
                    </div>
                    {/* Copy */}
                    <div className="flex-1">
                      <p className="font-semibold text-sm leading-tight">{card.title}</p>
                      <p className="text-[11px] mt-0.5 font-medium" style={{ color: color.hex }}>{card.subtitle}</p>
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{card.description}</p>
                    </div>
                    {/* Arrow */}
                    <div className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: color.hex }}>
                      Learn more
                      <ArrowRight className="h-3 w-3 translate-x-0 group-hover:translate-x-1 transition-transform duration-200" aria-hidden />
                    </div>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Price Discovery Desk ─────────────────────────────────────────────────────

function PriceDesk({ allProducts }: { allProducts: Product[] }) {
  const [mode, setMode] = useState<"phone" | "laptop" | "budget">("phone");
  const [selectedBrand, setSelectedBrand] = useState<string>("Samsung");
  const [selectedBudget, setSelectedBudget] = useState(budgetRanges[0]);
  const [isAnimating, setIsAnimating] = useState(false);

  // Bridge hook: static latest-mobile-buying-prices via React Query (no network, staleTime: Infinity)
  const { data: latestPrices } = useLatestPrices();

  // Map LatestMobileBuyingPrice -> Product shape so ProductCard can render it
  const latestAsProducts = useMemo(() => {
    if (!latestPrices) return [] as Product[];
    return latestPrices.map((item, idx) => {
      const slug = `${item.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${item.model.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${idx}`;
      const priceLabel = `Rs. ${item.price.toLocaleString()}`;
      return {
        id: `latest-${idx}`,
        name: `${item.brand} ${item.model}`,
        slug,
        brand: item.brand,
        price: priceLabel,
        price_value: item.price,
        image: null,
        rating: null,
        category: "Smartphones",
        specs: item.previousPrice ? ({ previousPrice: item.previousPrice } as unknown as Record<string, unknown>) : null,
        in_stock: true,
        created_at: new Date().toISOString(),
      } as Product;
    });
  }, [latestPrices]);

  const filteredLatest = useMemo(() => {
    if (mode === "phone") {
      return latestAsProducts.filter((p) => p.brand?.toLowerCase() === selectedBrand.toLowerCase()).slice(0, 6);
    }
    if (mode === "budget") {
      return latestAsProducts
        .filter((p) => (p.price_value ?? 0) >= selectedBudget.min && (p.price_value ?? 0) <= selectedBudget.max)
        .slice(0, 6);
    }
    return [] as Product[];
  }, [mode, latestAsProducts, selectedBrand, selectedBudget]);

  // Laptop mode still queries live products (latestPrices is phone-only)
  const { data: laptopProducts, isLoading: laptopLoading } = useQuery({
    queryKey: ["price-desk", "laptop", selectedBrand],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("brand", selectedBrand).ilike("category", "%Laptop%").limit(6);
      if (!data?.length) {
        return allProducts.filter((p) => p.category.toLowerCase().includes("laptops") && p.brand?.toLowerCase() === selectedBrand.toLowerCase()).slice(0, 6) as Product[];
      }
      return data as Product[];
    },
    enabled: mode === "laptop",
  });

  const products = mode === "laptop" ? laptopProducts : filteredLatest;
  const isLoading = mode === "laptop" ? laptopLoading : !latestPrices;

  const switchMode = (next: typeof mode) => {
    setIsAnimating(true);
    setTimeout(() => {
      setMode(next);
      if (next === "phone") setSelectedBrand("Samsung");
      if (next === "laptop") setSelectedBrand("Apple");
      setIsAnimating(false);
    }, 180);
  };

  const brands = mode === "laptop" ? laptopBrands : smartphoneBrands;

  return (
    <section className="py-14 bg-secondary/20 border-y border-border/40">
      <div className="container">
        <SectionHeader eyebrow="Discover by brand or budget" title="Price Discovery" href="/mobile-price" />

        {/* Mode tabs */}
        <div className="flex gap-2 mb-8 flex-wrap justify-center">
          {[
            { key: "phone" as const, label: "Smartphones", icon: Smartphone },
            { key: "laptop" as const, label: "Laptops", icon: Laptop },
            { key: "budget" as const, label: "By Budget", icon: Banknote },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all border",
                mode === key
                  ? "hero-gradient text-primary-foreground border-transparent shadow-glow"
                  : "bg-card border-border/60 hover:bg-secondary",
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* Brand selector or Budget selector */}
        {mode !== "budget" ? (
          <div className="flex flex-wrap justify-center gap-x-1.5 gap-y-3 mb-8">
            {brands.map((brand) => (
              <button
                key={brand.name}
                onClick={() => setSelectedBrand(brand.name)}
                className={cn(
                  "flex w-[76px] flex-col items-center gap-1.5 rounded-xl p-2 transition-all",
                  selectedBrand === brand.name ? "scale-105" : "hover:bg-secondary/60",
                )}
              >
                <div
                  className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center text-xs font-black text-white bg-gradient-to-br transition-all",
                    brand.color,
                    selectedBrand === brand.name ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg" : "",
                  )}
                >
                  {brand.code}
                </div>
                <span className={cn("text-[11px] font-medium truncate w-full text-center", selectedBrand === brand.name ? "text-primary" : "text-muted-foreground")}>
                  {brand.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-8">
            {budgetRanges.map((range) => (
              <button
                key={range.label}
                onClick={() => setSelectedBudget(range)}
                className={cn(
                  "relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 overflow-hidden",
                  selectedBudget.label === range.label
                    ? "border-transparent text-white shadow-lg scale-105"
                    : "border-border/60 bg-card hover:border-primary/40 hover:-translate-y-0.5",
                )}
              >
                {selectedBudget.label === range.label && (
                  <div className={cn("absolute inset-0 bg-gradient-to-br", range.gradient)} />
                )}
                <span className="relative text-sm font-bold">{range.label.split(" ")[0]}</span>
                <span className="relative text-[10px] opacity-80 mt-0.5">{range.label.split("–")[1]?.trim() ?? range.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        <div className={cn("transition-all duration-300", isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0")}>
          <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-primary" />
                {mode === "budget"
                  ? `Best picks · ${selectedBudget.fullLabel}`
                  : `Top ${selectedBrand} picks`}
              </h3>
              <Link
                to={mode === "budget"
                  ? `/buy?minPrice=${selectedBudget.min}&maxPrice=${selectedBudget.max}`
                  : `/brand/${selectedBrand.toLowerCase()}`}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <SkeletonGrid />
            ) : products && products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground text-sm">No products found — try another selection.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Featured Products ────────────────────────────────────────────────────────

function FeaturedSection({ products, isLoading }: { products: Product[]; isLoading: boolean }) {
  const [activeTab, setActiveTab] = useState("All");
  const [activeBrand, setActiveBrand] = useState("All");
  const [visibleCount, setVisibleCount] = useState(12);
  const [isExpanding, setIsExpanding] = useState(false);

  const topBrands = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((product) => {
      const brand = product.brand?.trim();
      if (brand) counts.set(brand, (counts.get(brand) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 7)
      .map(([brand]) => brand);
  }, [products]);

  const filtered = useMemo(
    () => products.filter((product) => {
      const matchesCategory = activeTab === "All" || product.category === activeTab;
      const matchesBrand = activeBrand === "All" || product.brand === activeBrand;
      return matchesCategory && matchesBrand;
    }),
    [products, activeTab, activeBrand],
  );

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const handleLoadMore = () => {
    setIsExpanding(true);
    setTimeout(() => {
      setVisibleCount((n) => n + 12);
      setIsExpanding(false);
    }, 200);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setVisibleCount(12);
  };

  const handleBrandChange = (brand: string) => {
    setActiveBrand(brand);
    setVisibleCount(12);
  };

  return (
    <section className="py-14 bg-background">
      <div className="container">
        <SectionHeader eyebrow="Popular picks" title="Featured Gadgets" href="/buy" />

        <div className="mb-4 flex flex-wrap items-center justify-center gap-2" aria-label="Top brands">
          <span className="mr-1 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top brands</span>
          {["All", ...topBrands].map((brand) => (
            <button
              key={brand}
              type="button"
              onClick={() => handleBrandChange(brand)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                activeBrand === brand
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-card hover:border-primary/50 hover:text-primary",
              )}
            >
              {brand}
            </button>
          ))}
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categoryTabs.map(({ label, value, icon: Icon }) => (
            <button
              key={value}
              onClick={() => handleTabChange(value)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border shrink-0",
                activeTab === value
                  ? "hero-gradient text-primary-foreground border-transparent shadow-glow"
                  : "bg-card border-border/60 hover:bg-secondary",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <SkeletonGrid count={12} />
        ) : visible.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {visible.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-border/60 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
            {hasMore && (
              <div className="mt-10 text-center">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isExpanding}
                  className="h-11 rounded-full px-8 border-border/70 hover:border-primary hover:text-primary transition-all"
                >
                  {isExpanding ? "Loading…" : `Show more (${filtered.length - visibleCount} left)`}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="py-16 text-center text-muted-foreground">No products in this category yet.</div>
        )}
      </div>
    </section>
  );
}

// ─── Editorial (What's Hot) ───────────────────────────────────────────────────

function EditorialSection({
  articles,
  guides,
  isLoading,
}: {
  articles: ReturnType<typeof useArticlesList>["data"] extends undefined ? never[] : NonNullable<ReturnType<typeof useArticlesList>["data"]>;
  guides: NonNullable<ReturnType<typeof useGuidesList>["data"]>;
  isLoading: boolean;
}) {
  const featured = articles[0];
  const rest = articles.slice(1, 5);

  return (
    <section className="py-14 bg-secondary/20 border-y border-border/40">
      <div className="container">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* News column */}
          <div className="lg:col-span-2">
            <SectionHeader eyebrow="What's Hot" title="Latest News" href="/stores/article" />
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-20 w-28 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {featured && (
                  <Link to={`/stores/article/${featured.slug}`} className="group block">
                    <div className="relative rounded-2xl overflow-hidden border border-border/60 aspect-[16/7]">
                      <img
                        src={featured.image || "/placeholder.svg"}
                        alt={featured.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <Badge className="mb-2 rounded-full text-[10px] uppercase tracking-widest bg-primary/90">{featured.category}</Badge>
                        <h3 className="font-display text-xl font-bold text-white line-clamp-2 group-hover:text-primary transition-colors">
                          {featured.title}
                        </h3>
                        <p className="text-white/70 text-xs mt-1 flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(featured.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </Link>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  {rest.map((article) => (
                    <Link key={article.id} to={`/stores/article/${article.slug}`} className="group flex gap-3 rounded-2xl border border-border/60 bg-card p-3 hover:bg-secondary/40 hover:border-primary/30 transition-all">
                      <img
                        src={article.image || "/placeholder.svg"}
                        alt={article.title}
                        className="h-16 w-20 rounded-xl object-cover shrink-0 border border-border/50"
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">{article.title}</h4>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(article.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Guides column */}
          <div>
            <SectionHeader eyebrow="Buying advice" title="Guides" href="/mobile-guides" />
            <div className="space-y-3">
              {guides.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-16 w-20 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))
              ) : (
                guides.map((guide) => (
                  <Link
                    key={guide.id}
                    to={`/guide/${guide.slug}`}
                    className="group flex gap-3 rounded-2xl border border-border/60 bg-card p-3 hover:bg-secondary/40 hover:border-primary/30 transition-all"
                  >
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border border-primary/20">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">{guide.title}</h4>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {guide.read_time ?? "5 min read"}
                      </p>
                    </div>
                  </Link>
                ))
              )}
              <Link to="/mobile-guides">
                <Button variant="outline" className="w-full mt-2 rounded-full border-border/60 hover:border-primary hover:text-primary transition-all gap-2">
                  All guides <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Stores Spotlight ─────────────────────────────────────────────────────────

function StoresSection({
  stores,
  isLoading,
}: {
  stores: HomeStore[];
  isLoading: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 320 : -320, behavior: "smooth" });
  };

  return (
    <section className="py-14 bg-background">
      <div className="container">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] uppercase text-muted-foreground mb-1">Trusted network</p>
            <h2 className="font-display text-2xl lg:text-3xl font-bold flex items-center gap-3">
              <span className="w-1.5 h-8 rounded-full hero-gradient shrink-0" />
              Store Directory
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              className="h-9 w-9 rounded-full border border-border/60 flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="h-9 w-9 rounded-full border border-border/60 flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <Link to="/stores">
              <Button variant="ghost" size="sm" className="gap-1 text-primary group ml-1">
                View all <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-6 no-scrollbar snap-x snap-mandatory scroll-smooth"
        >
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-80 shrink-0 snap-start">
                  <Skeleton className="h-[320px] rounded-3xl" />
                </div>
              ))
            : stores.map((store) => (
                <div
                  key={store.id}
                  className="group w-80 shrink-0 snap-start relative flex flex-col rounded-3xl border border-border/60 bg-card p-6 hover:border-primary/40 hover:-translate-y-1.5 hover:shadow-2xl transition-all duration-500 overflow-hidden"
                >
                  {/* Glass Background Accents */}
                  <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors" />
                  <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-blue-500/5 blur-3xl group-hover:bg-blue-500/10 transition-colors" />

                  <div className="flex items-start justify-between gap-3 mb-5 relative">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center border border-primary/10 shadow-sm group-hover:shadow-md transition-all overflow-hidden">
                      {/* Brand Logo */}
                      {store.logo_url ? (
                        <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="relative">
                          <Store className="h-7 w-7 text-primary" />
                          <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                        </div>
                      )}
                    </div>
                    {store.is_verified && (
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-3 py-1 border border-emerald-500/20 backdrop-blur-sm">
                        <BadgeCheck className="h-3.5 w-3.5" /> Verified
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mb-4 relative">
                    <h3 className="font-display text-xl font-bold group-hover:text-primary transition-colors leading-tight">{store.name}</h3>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                      {store.location}
                    </p>
                  </div>

                  {!user ? (
                    /* ─── Without Login View ─────────────────────────────────── */
                    <div className="flex-1 flex flex-col relative">
                      <div className="bg-secondary/30 rounded-2xl p-4 mb-4 border border-border/40">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center border border-border/60">
                            <Phone className="h-4 w-4 text-primary/70" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Contact Number</p>
                            <p className="text-sm font-mono font-bold tracking-tight">
                              {store.phone ? `${store.phone.substring(0, 3)}xxxxxxx` : "N/A"}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                          {store.description}
                        </p>
                      </div>

                      <div className="mt-auto pt-4 border-t border-dashed border-border/60">
                        <Button variant="outline" className="w-full rounded-2xl group/btn hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 gap-2" asChild>
                          <Link to="/auth?redirect=/">
                            Login to Connect <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ─── With Login View ────────────────────────────────────── */
                    <div className="flex-1 flex flex-col relative">
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <Link to={`/marketplace?store=${store.slug || store.id}`} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-primary/5 border border-primary/10 hover:bg-primary/10 hover:border-primary/20 transition-all text-center">
                          <ShoppingBag className="h-4 w-4 text-primary" />
                          <span className="text-[10px] font-bold uppercase tracking-tight">Sales</span>
                        </Link>
                        <Link to={`/exchange-your-phone?store=${store.slug || store.id}`} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all text-center">
                          <RefreshCw className="h-4 w-4 text-emerald-600" />
                          <span className="text-[10px] font-bold uppercase tracking-tight">Repair Ex.</span>
                        </Link>
                        <Link to={`/marketplace?store=${store.slug || store.id}&category=Accessories`} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 hover:border-blue-500/20 transition-all text-center">
                          <Headphones className="h-4 w-4 text-blue-600" />
                          <span className="text-[10px] font-bold uppercase tracking-tight">Accessories</span>
                        </Link>
                        <Link to="/sell-your-phone" className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 hover:border-amber-500/20 transition-all text-center">
                          <Smartphone className="h-4 w-4 text-amber-600" />
                          <span className="text-[10px] font-bold uppercase tracking-tight">Marketplace</span>
                        </Link>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-xl border border-border/40">
                          <Mail className="h-3.5 w-3.5 text-primary/60" />
                          <span className="truncate">{store.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-xl border border-border/40">
                          <Globe className="h-3.5 w-3.5 text-primary/60" />
                          <span className="truncate">Visit Store Website</span>
                        </div>
                      </div>

                      <div className="mt-auto pt-4 border-t border-dashed border-border/60">
                        <Button className="w-full rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-glow group/btn gap-2" asChild>
                          <Link to={getPublicStorePath(store)}>
                            View Store Page <ExternalLink className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}

// ─── Sell CTA Banner ──────────────────────────────────────────────────────────

// ─── Pre-Booking Section ──────────────────────────────────────────────────────

function DeviceAccessSection() {
  return (
    <section className="home-device-access py-16 md:py-20">
      <div className="container">
        <Reveal>
          <div className="mx-auto mb-10 max-w-3xl text-center md:mb-12">
            <span className="home-device-access-kicker inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Your next flagship, your way
            </span>
            <h2 className="home-device-access-heading mt-4 font-display text-3xl font-black tracking-tight md:text-5xl">
              Reserve now. Pay your way.
            </h2>
            <p className="home-device-access-copy mx-auto mt-4 max-w-2xl text-sm leading-6 md:text-base">
              Secure an upcoming device for free or ask our verified store partners for an easy EMI plan—all from one place.
            </p>
          </div>
        </Reveal>

        <div className="grid items-start gap-6 xl:grid-cols-2 xl:gap-8">
          <PreBookingSection />
          <EmiInquirySection />
        </div>
      </div>
    </section>
  );
}

function PreBookingSection() {
  const [form, setForm] = useState({ name: "", phone: "", model: "", storage: "", color: "", city: "", delivery: "pickup", notes: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.model) return;
    setLoading(true);
    try {
      await supabase.from("pre_bookings").insert({
        customer_name: form.name,
        phone: form.phone,
        model: form.model,
        storage: form.storage,
        color: form.color,
        city: form.city,
        delivery_option: form.delivery,
        notes: form.notes,
        status: "new",
      });
      setSubmitted(true);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const field = (label: string, key: keyof typeof form, placeholder = "", type = "text") => (
    <div>
      <label className="block text-xs font-semibold text-navy mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-lg border border-border text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all bg-background text-foreground"
      />
    </div>
  );

  return (
    <article className="home-device-access-card home-device-access-card--booking overflow-hidden rounded-[2rem]">
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] xl:grid-cols-1">

          {/* ── Left content ── */}
          <Reveal>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-gold/10 border border-gold/30 px-3.5 py-1 text-[11px] font-bold tracking-widest uppercase text-gold mb-4">
                <PackageCheck className="h-3.5 w-3.5" aria-hidden />
                New Model Pre-Booking
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-black text-navy leading-tight mb-4">
                Reserve Your Next
                <span className="text-gold block">iPhone Before It Lands</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Be the first to get the latest iPhones, Samsungs, and flagship devices. Book now — zero advance payment. We'll call you to confirm.
              </p>
              <div className="space-y-3">
                {[
                  { icon: CheckCircle2, text: "Zero advance payment required" },
                  { icon: Phone, text: "We call to confirm within 24 hours" },
                  { icon: Zap, text: "Priority delivery when stock arrives" },
                  { icon: Store, text: "Pickup or home delivery options" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3 text-sm text-foreground">
                    <item.icon className="h-4 w-4 text-gold" aria-hidden />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* ── Form ── */}
          <Reveal>
            <div className="home-device-access-form rounded-2xl border border-border p-5 shadow-tk-md sm:p-6">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold">
                    <CheckCircle2 className="h-7 w-7" aria-hidden />
                  </div>
                  <h3 className="font-display text-xl font-bold text-navy mb-2">Pre-Booking Confirmed!</h3>
                  <p className="text-muted-foreground text-sm">We'll contact you within 24 hours to confirm your booking.</p>
                  <button onClick={() => setSubmitted(false)} className="mt-6 text-xs text-gold hover:underline">Book another</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="font-display text-lg font-bold text-navy mb-2">Pre-Book a Device</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {field("Your Name *", "name", "Full name")}
                    {field("WhatsApp / Phone *", "phone", "+977 98XXXXXXXX", "tel")}
                  </div>
                  {field("Device Model *", "model", "e.g. iPhone 16 Pro Max, Samsung S24")}
                  <div className="grid grid-cols-2 gap-4">
                    {field("Storage", "storage", "e.g. 256GB")}
                    {field("Color", "color", "e.g. Natural Titanium")}
                  </div>
                  {field("Your City", "city", "e.g. Kathmandu")}
                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">Delivery Option</label>
                    <select
                      value={form.delivery}
                      onChange={(e) => setForm((f) => ({ ...f, delivery: e.target.value }))}
                      className="w-full h-10 px-3 rounded-lg border border-border text-sm outline-none focus:border-gold bg-background text-foreground"
                    >
                      <option value="pickup">Store Pickup — Tamrakar Complex</option>
                      <option value="delivery">Home Delivery (Kathmandu Valley)</option>
                      <option value="courier">Outside Valley — Courier</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl font-bold text-sm text-navy transition-opacity hover:opacity-90 pressable disabled:opacity-60"
                    style={{ background: "oklch(72% 0.175 75)" }}
                  >
                    {loading ? "Submitting..." : "Pre-Book Now - Free & Instant"}
                  </button>
                  <p className="text-[11px] text-muted-foreground text-center">No payment now. We confirm by call or WhatsApp.</p>
                </form>
              )}
            </div>
          </Reveal>
      </div>
    </article>
  );
}

// ─── EMI Inquiry Section ─────────────────────────────────────────────────────

function EmiInquirySection() {
  const [form, setForm] = useState({ name: "", phone: "", product: "", down: "", plan: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    setLoading(true);
    try {
      await supabase.from("emi_inquiries").insert({
        customer_name: form.name,
        phone: form.phone,
        product_interest: form.product,
        down_payment: form.down,
        preferred_plan: form.plan,
        status: "new",
      });
      setSubmitted(true);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  return (
    <article className="home-device-access-card home-device-access-card--emi overflow-hidden rounded-[2rem]">
      <div className="home-emi-section grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] xl:grid-cols-1">

          <Reveal>
            <div>
              <span className="home-emi-badge inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[11px] font-bold tracking-widest uppercase mb-4">
                <CreditCard className="h-3.5 w-3.5" aria-hidden />
                EMI Available
              </span>
              <h2 className="home-emi-heading font-display text-2xl md:text-3xl font-black leading-tight mb-3">
                Buy Now,<br />
                <span className="home-emi-accent">Pay Easy EMI</span>
              </h2>
              <p className="home-emi-copy text-sm leading-relaxed mb-5">
                Get iPhone 15 or Samsung S24 Ultra on easy monthly installments. Submit your inquiry — our store partners will reach out with the best offer.
              </p>
              <div className="flex flex-wrap gap-2">
                {["3 Month", "6 Month", "12 Month", "24 Month"].map((plan) => (
                  <span key={plan} className="home-emi-plan inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold">
                    <CheckCircle2 className="h-3 w-3" aria-hidden />
                    {plan}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="home-emi-form rounded-2xl p-5 sm:p-6">
              {submitted ? (
                <div className="text-center py-6">
                  <div className="home-emi-success-icon mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                    <CheckCircle2 className="h-6 w-6" aria-hidden />
                  </div>
                  <p className="home-emi-heading font-bold">EMI Inquiry Sent!</p>
                  <p className="home-emi-copy text-sm mt-1">A store partner will call you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="home-emi-heading font-display text-base font-bold mb-1">EMI Inquiry</h3>
                  {[
                    { label: "Your Name *", key: "name" as const, ph: "Full name" },
                    { label: "Phone *", key: "phone" as const, ph: "+977 98XXXXXXXX" },
                    { label: "Product Interested In", key: "product" as const, ph: "e.g. iPhone 15 Pro 256GB" },
                    { label: "Down Payment Amount", key: "down" as const, ph: "e.g. Rs. 20,000" },
                  ].map(({ label, key, ph }) => (
                    <div key={key}>
                      <label className="home-emi-label block text-xs font-semibold mb-1">{label}</label>
                      <input
                        value={form[key]}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        placeholder={ph}
                        className="home-emi-input w-full h-9 px-3 rounded-lg text-sm outline-none transition-all"
                      />
                    </div>
                  ))}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 rounded-xl font-bold text-sm text-navy hover:opacity-90 pressable disabled:opacity-60"
                    style={{ background: "oklch(72% 0.175 75)" }}
                  >
                    {loading ? "Sending..." : "Send EMI Inquiry"}
                  </button>
                </form>
              )}
            </div>
          </Reveal>
      </div>
    </article>
  );
}

function SellCtaBanner() {
  return (
    <section className="py-6">
      <div className="container">
        <div className="home-sell-cta relative px-8 py-12 md:px-14 md:py-16">
          {/* Decorative slashes */}
          <div aria-hidden className="pointer-events-none">
            <div className="home-sell-cta-slash" />
            <div className="home-sell-cta-slash-2" />
          </div>
          {/* Top accent line */}
          <div aria-hidden className="absolute inset-x-0 top-0 h-[2px]"
            style={{ background: "linear-gradient(90deg, transparent, oklch(64% 0.118 70), oklch(78% 0.130 72), oklch(64% 0.118 70), transparent)" }}
          />

          <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="mb-5">
                <span
                  className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.20em]"
                  style={{
                    clipPath: "polygon(6% 0, 100% 0, 94% 100%, 0 100%)",
                    background: "oklch(64% 0.118 70 / 0.16)",
                    border: "1px solid oklch(64% 0.118 70 / 0.38)",
                    padding: "5px 14px",
                    color: "oklch(82% 0.095 74)",
                  }}
                >
                  <TrendingUp className="h-3 w-3" aria-hidden /> Best Resale Prices in Nepal
                </span>
              </div>
              <h2
                className="font-display font-bold text-white leading-tight"
                style={{ fontSize: "clamp(1.8rem, 4vw, 3.2rem)" }}
              >
                Your old phone is
                <br />
                <span className="home-headline-accent">worth more than you think.</span>
              </h2>
              <p className="mt-4 max-w-lg text-white/60 text-base md:text-lg">
                Tell us the model and condition — we&apos;ll quote a fair resale price in under a minute. Walk into New Road, get paid the same day.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/sell-your-phone">
                  <button
                    className="inline-flex items-center gap-2 h-12 px-7 font-bold text-sm pressable transition-all"
                    style={{
                      background: "linear-gradient(135deg, oklch(78% 0.165 65), oklch(64% 0.118 70))",
                      color: "oklch(10% 0.022 48)",
                      fontFamily: "'Space Grotesk', sans-serif",
                      clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)",
                      boxShadow: "0 4px 24px oklch(64% 0.118 70 / 0.50)",
                    }}
                  >
                    <CircleDollarSign className="h-4 w-4" aria-hidden /> Sell Now
                  </button>
                </Link>
                <Link to="/sell-your-phone?mode=exchange">
                  <button
                    className="inline-flex items-center gap-2 h-12 px-7 font-medium text-sm text-white/85 pressable transition-all hover:text-white"
                    style={{
                      border: "1px solid oklch(64% 0.118 70 / 0.38)",
                      background: "oklch(64% 0.118 70 / 0.10)",
                      clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)",
                    }}
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden /> Exchange &amp; Upgrade
                  </button>
                </Link>
              </div>
            </div>

            {/* Trust badges */}
            <div className="hidden md:flex flex-col gap-3 shrink-0">
              {[
                { icon: Zap,          label: "Instant quote",      color: "oklch(78% 0.165 65)" },
                { icon: BadgeCheck,   label: "Verified buyers",    color: "oklch(62% 0.18 152)" },
                { icon: Star,         label: "4.9★ rated service", color: "oklch(78% 0.165 65)" },
                { icon: MessageCircle,label: "Live support",       color: "oklch(60% 0.130 240)" },
              ].map(({ icon: Icon, label, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 px-4 py-2.5"
                  style={{
                    border: "1px solid oklch(100% 0 0 / 0.10)",
                    background: "oklch(100% 0 0 / 0.05)",
                    clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)",
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                  <span className="text-sm font-medium text-white/85">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
