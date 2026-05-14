import { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
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
  Watch,
  Wrench,
  Zap,
  Globe,
  ExternalLink,
  Search,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/products/ProductCard";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { PollSection } from "@/components/sections/PollSection";
import { HomeSearchBox } from "@/components/home/HomeSearchBox";
import { HomeQuickActions } from "@/components/home/HomeQuickActions";
import { HomePriceFinder } from "@/components/home/HomePriceFinder";
import { PhoneFinderQuiz } from "@/components/home/PhoneFinderQuiz";
import { HomeMarketplaceFeed } from "@/components/home/HomeMarketplaceFeed";
import { HomeRepairMiniForm } from "@/components/home/HomeRepairMiniForm";
import { HomeStoreSpotlight } from "@/components/home/HomeStoreSpotlight";
import { HomeOffers } from "@/components/home/HomeOffers";
import { HomeTrustStats } from "@/components/home/HomeTrustStats";
import { HomeCompareMini } from "@/components/home/HomeCompareMini";
import { MobileStickyCTA } from "@/components/home/MobileStickyCTA";
import { BannerSlider } from "@/components/home/BannerSlider";
import { useFeaturedProducts, useProducts, type Product } from "@/hooks/useProducts";
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

type HomeStore = {
  id: string;
  name: string;
  slug?: string | null;
  seo_slug?: string | null;
  location?: string | null;
  description?: string | null;
  services?: string[] | null;
  is_verified?: boolean | null;
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
  { key: "serviceMatrix", label: "Service Matrix", enabled: true, settings: {} },
  { key: "priceDesk", label: "Price Desk", enabled: true, settings: {} },
  { key: "featured", label: "Featured Products", enabled: true, settings: {} },
  { key: "storesAndStories", label: "Stores and Stories", enabled: true, settings: {} },
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

const heroStats = [
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
  const { data: featuredProducts, isLoading: productsLoading } = useFeaturedProducts();
  const { data: allProducts } = useProducts();
  const { data: latestArticles, isLoading: articlesLoading } = useArticlesList({ limit: 6 });
  const { data: latestGuides } = useGuidesList({ limit: 4 });
  const { data: featuredStores, isLoading: isStoresLoading } = useQuery({
    queryKey: ["featured-stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id,name,slug,seo_slug,location,description,services,is_verified,phone,email,website,logo_url,shop_no,subscription_status")
        .eq("is_verified", true)
        .limit(10);

      if (error) throw error;
      return (data ?? []) as HomeStore[];
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
    const covered = new Set(live.map((p) => p.category.toLowerCase()));
    return live as Product[];
  }, [allProducts]);
  const stores = rawStores ?? [];
  const articles = latestArticles ?? [];
  const guides = latestGuides ?? [];

  return (
    <div className="pb-20">
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      {(enabledSections.hero || enabledSections.search_box) && (
        <HeroSection products={products} showSearch={enabledSections.search_box} />
      )}

      {/* ── FLAGSHIP SHOWCASE (Apple + Samsung + Algorithm) ──────────────── */}
      <FlagshipShowcase />

      {/* ── QUICK ACTIONS ────────────────────────────────────────────────── */}
      {enabledSections.quick_actions && <HomeQuickActions />}

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
        <FeaturedSection products={allProductsList} isLoading={productsLoading} />
      )}

      {/* ── COMPARE MINI ─────────────────────────────────────────────────── */}
      {enabledSections.compare_mini && <HomeCompareMini />}

      {/* ── REPAIR MINI FORM ─────────────────────────────────────────────── */}
      {enabledSections.repair_form && <HomeRepairMiniForm />}

      {/* ── WHAT'S HOT — EDITORIAL ───────────────────────────────────────── */}
      <EditorialSection articles={articles} guides={guides} isLoading={articlesLoading} />

      {/* ── STORES SPOTLIGHT ─────────────────────────────────────────────── */}
      {(enabledSections.storesAndStories || enabledSections.store_spotlight) && (
        <HomeStoreSpotlight />
      )}

      {/* ── TRUST STATS ──────────────────────────────────────────────────── */}
      {enabledSections.trust_stats && <HomeTrustStats />}

      {/* ── SELL CTA BANNER ──────────────────────────────────────────────── */}
      <SellCtaBanner />

      {/* ── COMMUNITY POLL ───────────────────────────────────────────────── */}
      {enabledSections.poll && (
        <section className="py-12 bg-secondary/20">
          <div className="container max-w-2xl">
            <SectionHeader eyebrow="Community" title="Quick Poll" />
            <PollSection />
          </div>
        </section>
      )}

      {/* ── CHAT WIDGET ──────────────────────────────────────────────────── */}
      {enabledSections.chat && <ChatWidget />}

      {/* ── MOBILE STICKY CTA ────────────────────────────────────────────── */}
      <MobileStickyCTA />
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection({ products, showSearch }: { products: Product[], showSearch?: boolean }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const spotlight = products.slice(0, 3);
  const { data: homeSettings } = useHomepageSettings();

  useEffect(() => {
    if (spotlight.length < 2) return;
    const t = setInterval(() => setActiveSlide((p) => (p + 1) % spotlight.length), 4500);
    return () => clearInterval(t);
  }, [spotlight.length]);

  const heroData = homeSettings?.hero_section || {
    title: "Buy. Sell. Repair. Repeat.",
    subtitle: "Nepal's most connected gadget platform — shop the latest phones, get instant trade-in quotes, book repairs, and discover verified stores all in one place."
  };

  return (
    <section className="relative overflow-hidden border-b border-border/40 bg-background">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px] animate-[orb1_18s_ease-in-out_infinite]" />
        <div className="absolute -right-20 top-10 h-[500px] w-[500px] rounded-full bg-blue-500/8 blur-[100px] animate-[orb2_22s_ease-in-out_infinite]" />
        <div className="absolute bottom-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-[80px] animate-[orb3_16s_ease-in-out_infinite]" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
      </div>

      <div className="container relative py-14 md:py-20 xl:py-24">
        <div className="flex flex-col items-center text-center space-y-12">
          {/* Top — copy */}
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-1.5 text-xs font-semibold tracking-[0.2em] uppercase text-primary">
              <Zap className="h-3.5 w-3.5" />
              Nepal's #1 Mobile Hub
            </div>

            <h1 className="font-display text-[2.8rem] font-black leading-[1] tracking-tight md:text-7xl xl:text-8xl mb-6">
              {heroData.title.includes(".") ? (
                <>
                  {heroData.title.split(".")[0]}. {heroData.title.split(".")[1]}.
                  <span className="block bg-gradient-to-r from-primary via-blue-400 to-emerald-400 bg-clip-text text-transparent">
                    {heroData.title.split(".").slice(2).join(".")}
                  </span>
                </>
              ) : heroData.title}
            </h1>

            <p className="mt-6 mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {heroData.subtitle}
            </p>
          </div>

          {/* New Banner Slider */}
          <div className="w-full max-w-6xl mx-auto px-4">
            <BannerSlider />
          </div>

          {/* Smart Search Box */}
          {showSearch && (
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
              <HomeSearchBox />
            </div>
          )}

          {/* CTA row (Only if search is hidden or as secondary) */}
          {!showSearch && (
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/buy">
                <Button size="lg" className="h-12 rounded-full px-7 hero-gradient text-primary-foreground shadow-glow gap-2">
                  <ShoppingBag className="h-4 w-4" /> Shop Now
                </Button>
              </Link>
              <Link to="/sell-your-phone">
                <Button size="lg" variant="outline" className="h-12 rounded-full px-7 border-border/60 hover:bg-secondary gap-2">
                  <CircleDollarSign className="h-4 w-4" /> Sell Phone
                </Button>
              </Link>
              <Link to="/valuation-estimator">
                <Button size="lg" variant="ghost" className="h-12 rounded-full px-7 hover:-translate-y-0.5 transition-all gap-2">
                  <Sparkles className="h-4 w-4" /> Get Valuation
                </Button>
              </Link>
            </div>
          )}
          
          <div className="mt-12 flex items-center justify-center gap-8 border-t border-border/40 pt-10 w-full max-w-2xl mx-auto">
            {heroStats.map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}



// ─── Service Matrix ───────────────────────────────────────────────────────────

function ServiceMatrix() {
  return (
    <section className="py-14 bg-background">
      <div className="container">
        <SectionHeader eyebrow="Everything you need" title="Our Services" href="/services" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {serviceCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.title} to={card.href} className="group">
                <div
                  className={cn(
                    "relative flex flex-col gap-4 rounded-2xl border border-border/60 p-6 h-full transition-all duration-300",
                    "hover:-translate-y-1.5 hover:border-primary/30",
                    card.bg,
                    "hover:" + card.glow,
                  )}
                >
                  <div className={cn("h-11 w-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shrink-0", card.gradient)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold leading-tight">{card.title}</p>
                    <p className="text-xs text-primary mt-0.5">{card.subtitle}</p>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{card.description}</p>
                  </div>
                  <div className="mt-auto flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Learn more <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
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

  const { data: products, isLoading } = useQuery({
    queryKey: ["price-desk", mode, selectedBrand, selectedBudget],
    queryFn: async () => {
      let q = supabase.from("products").select("*").limit(6);
      if (mode === "budget") {
        q = q.gte("price_value", selectedBudget.min).lte("price_value", selectedBudget.max);
      } else {
        q = q.eq("brand", selectedBrand);
        if (mode === "phone") q = q.ilike("category", "%Smartphone%");
        if (mode === "laptop") q = q.ilike("category", "%Laptop%");
      }
      const { data } = await q;
      if (!data?.length) {
        const cat = mode === "phone" ? "smartphones" : mode === "laptop" ? "laptops" : null;
        return allProducts
          .filter((p) => {
            if (mode === "budget") return (p.price_value ?? 0) >= selectedBudget.min && (p.price_value ?? 0) <= selectedBudget.max;
            if (cat) return p.category.toLowerCase().includes(cat) && p.brand?.toLowerCase() === selectedBrand.toLowerCase();
            return true;
          })
          .slice(0, 6) as Product[];
      }
      return data as Product[];
    },
  });

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
        <div className="flex gap-2 mb-8 flex-wrap">
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
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2 mb-8">
            {brands.map((brand) => (
              <button
                key={brand.name}
                onClick={() => setSelectedBrand(brand.name)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all",
                  selectedBrand === brand.name ? "scale-105" : "hover:bg-secondary/60",
                )}
              >
                <div
                  className={cn(
                    "h-11 w-11 rounded-full flex items-center justify-center text-xs font-black text-white bg-gradient-to-br transition-all",
                    brand.color,
                    selectedBrand === brand.name ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg" : "",
                  )}
                >
                  {brand.code}
                </div>
                <span className={cn("text-[10px] font-medium truncate w-full text-center", selectedBrand === brand.name ? "text-primary" : "text-muted-foreground")}>
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
  const [visibleCount, setVisibleCount] = useState(12);
  const [isExpanding, setIsExpanding] = useState(false);

  const filtered = useMemo(
    () => activeTab === "All" ? products : products.filter((p) => p.category === activeTab),
    [products, activeTab],
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

  return (
    <section className="py-14 bg-background">
      <div className="container">
        <SectionHeader eyebrow="Popular picks" title="Featured Gadgets" href="/buy" />

        {/* Category tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1 no-scrollbar">
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
            <SectionHeader eyebrow="What's Hot" title="Latest News" href="/news" />
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
                  <Link to={`/article/${featured.slug}`} className="group block">
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
                    <Link key={article.id} to={`/article/${article.slug}`} className="group flex gap-3 rounded-2xl border border-border/60 bg-card p-3 hover:bg-secondary/40 hover:border-primary/30 transition-all">
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

function SellCtaBanner() {
  return (
    <section className="py-6">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl bg-foreground px-8 py-12 md:px-14 md:py-16">
          {/* Gradient orbs inside banner */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary/25 blur-[80px]" />
            <div className="absolute -left-10 bottom-0 h-60 w-60 rounded-full bg-blue-500/15 blur-[60px]" />
          </div>

          <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/80">
                <TrendingUp className="h-3.5 w-3.5" /> Best Resale Prices
              </div>
              <h2 className="font-display text-3xl font-black text-white md:text-4xl xl:text-5xl leading-tight">
                Your old phone is
                <span className="block bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
                  worth more than you think.
                </span>
              </h2>
              <p className="mt-4 max-w-lg text-white/70 text-lg">
                Get an AI-powered instant valuation in 30 seconds. No appointments, no guesswork.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/sell-your-phone">
                  <Button size="lg" className="h-12 rounded-full px-7 bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow gap-2">
                    <CircleDollarSign className="h-4 w-4" /> Sell Now
                  </Button>
                </Link>
                <Link to="/valuation-estimator">
                  <Button size="lg" variant="outline" className="h-12 rounded-full px-7 border-white/25 text-white hover:bg-white/10 gap-2">
                    <Sparkles className="h-4 w-4" /> Get Estimate
                  </Button>
                </Link>
              </div>
            </div>

            {/* Trust badges */}
            <div className="hidden md:flex flex-col gap-3 shrink-0">
              {[
                { icon: Zap, label: "Instant quote" },
                { icon: BadgeCheck, label: "Verified buyers" },
                { icon: Star, label: "4.9★ rated service" },
                { icon: MessageCircle, label: "Live support" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 backdrop-blur-sm">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium text-white/90">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
