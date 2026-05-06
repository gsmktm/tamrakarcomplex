import DOMPurify from "dompurify";
import { Link, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Award,
  BatteryCharging,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe2,
  HardDrive,
  Loader2,
  Lock,
  Plus,
  MonitorSmartphone,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Store as StoreIcon,
  Tablet,
  Wrench,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { STORES } from "@/data/storeData";
import { storeDirectoryService } from "@/services/storeDirectoryService";
import { SEO } from "@/components/common/SEO";
import { isAdminRole } from "@/lib/roles";
import { fetchStoreTierOverrides, resolveTierForStore } from "@/lib/storeTier";
import { cn, slugify } from "@/lib/utils";
import type { SellListingRow, StorePageRow, StoreRow } from "@/types/app";
import { sanitizeThemeForPackage } from "@/lib/storeThemeBuilder";
import { absoluteUrl, breadcrumbSchema } from "@/lib/seo";

function isMissingRelationshipError(error: unknown) {
  const message = (error as { message?: string })?.message;
  const code = (error as { code?: string })?.code;
  if (!message && !code) return false;
  return (
    code === "PGRST200" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    message?.includes("Could not find a relationship") ||
    message?.includes("Could not find the table") ||
    message?.includes("schema cache")
  );
}

const serviceAccents = [
  "from-blue-500/20 via-cyan-400/5 to-transparent",
  "from-emerald-500/20 via-lime-400/5 to-transparent",
  "from-amber-500/20 via-orange-400/5 to-transparent",
  "from-rose-500/20 via-fuchsia-400/5 to-transparent",
  "from-indigo-500/20 via-blue-400/5 to-transparent",
  "from-teal-500/20 via-emerald-400/5 to-transparent",
];

const serviceIconsBg = [
  "bg-blue-500/15 text-blue-400",
  "bg-emerald-500/15 text-emerald-400",
  "bg-amber-500/15 text-amber-400",
  "bg-rose-500/15 text-rose-400",
  "bg-indigo-500/15 text-indigo-400",
  "bg-teal-500/15 text-teal-400",
];

const tickerItems = [
  "Diamond Service Desk",
  "MacBook Repair",
  "iPhone Screen Repair",
  "iPad Service",
  "Expert Technicians",
  "Fast Turnaround",
  "Transparent Support",
  "Board-Level Repair",
  "Battery Replacement",
  "Trusted Local Store",
  "Data Safety Check",
  "Precision Workflow",
];

function StoreQuickActions({
  storeId,
  isPremiumTheme,
  showOwnerActions,
}: {
  storeId: string;
  isPremiumTheme: boolean;
  showOwnerActions?: boolean;
}) {
  return (
    <div
      className={cn(
        "mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2",
        showOwnerActions ? "lg:grid-cols-5" : "lg:grid-cols-4",
        isPremiumTheme ? "text-white" : "",
      )}
    >
      <Card
        className={cn(
          "rounded-2xl border transition-colors",
          isPremiumTheme ? "border-white/10 bg-white/5 hover:bg-white/8" : "border-border/60 bg-background/70 hover:bg-muted/30",
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                isPremiumTheme ? "bg-blue-500/15 text-blue-300" : "bg-primary/10 text-primary",
              )}
            >
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className={cn("text-sm font-semibold", isPremiumTheme ? "text-white" : "")}>Buy</div>
              <div className={cn("text-xs leading-5", isPremiumTheme ? "text-white/55" : "text-muted-foreground")}>
                Browse this store’s live listings.
              </div>
            </div>
          </div>
          <Button asChild size="sm" className={cn("mt-3 w-full rounded-xl", isPremiumTheme ? "bg-blue-600/80 hover:bg-blue-600" : "")}>
            <Link to={`/marketplace?store=${storeId}`}>View Products</Link>
          </Button>
        </CardContent>
      </Card>

      <Card
        className={cn(
          "rounded-2xl border transition-colors",
          isPremiumTheme ? "border-white/10 bg-white/5 hover:bg-white/8" : "border-border/60 bg-background/70 hover:bg-muted/30",
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                isPremiumTheme ? "bg-amber-500/15 text-amber-300" : "bg-amber-500/10 text-amber-600",
              )}
            >
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className={cn("text-sm font-semibold", isPremiumTheme ? "text-white" : "")}>Exchange</div>
              <div className={cn("text-xs leading-5", isPremiumTheme ? "text-white/55" : "text-muted-foreground")}>
                Swap your phone with a newer one.
              </div>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className={cn(
              "mt-3 w-full rounded-xl",
              isPremiumTheme ? "border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white" : "",
            )}
          >
            <Link to={`/exchange-your-phone?store=${storeId}`}>Start Exchange</Link>
          </Button>
        </CardContent>
      </Card>

      <Card
        className={cn(
          "rounded-2xl border transition-colors",
          isPremiumTheme ? "border-white/10 bg-white/5 hover:bg-white/8" : "border-border/60 bg-background/70 hover:bg-muted/30",
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                isPremiumTheme ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-500/10 text-emerald-600",
              )}
            >
              <Star className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className={cn("text-sm font-semibold", isPremiumTheme ? "text-white" : "")}>Sell</div>
              <div className={cn("text-xs leading-5", isPremiumTheme ? "text-white/55" : "text-muted-foreground")}>
                Get an instant quote and sell.
              </div>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className={cn(
              "mt-3 w-full rounded-xl",
              isPremiumTheme ? "border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white" : "",
            )}
          >
            <Link to={`/sell-your-phone?store=${storeId}`}>Sell Phone</Link>
          </Button>
        </CardContent>
      </Card>

      <Card
        className={cn(
          "rounded-2xl border transition-colors",
          isPremiumTheme ? "border-white/10 bg-white/5 hover:bg-white/8" : "border-border/60 bg-background/70 hover:bg-muted/30",
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                isPremiumTheme ? "bg-fuchsia-500/15 text-fuchsia-300" : "bg-fuchsia-500/10 text-fuchsia-600",
              )}
            >
              <Wrench className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className={cn("text-sm font-semibold", isPremiumTheme ? "text-white" : "")}>Repair</div>
              <div className={cn("text-xs leading-5", isPremiumTheme ? "text-white/55" : "text-muted-foreground")}>
                Book a repair request in minutes.
              </div>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className={cn(
              "mt-3 w-full rounded-xl",
              isPremiumTheme ? "border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white" : "",
            )}
          >
            <Link to={`/repair/custom?store=${storeId}`}>Book Repair</Link>
          </Button>
        </CardContent>
      </Card>

      {showOwnerActions ? (
        <Card
          className={cn(
            "rounded-2xl border transition-colors",
            isPremiumTheme ? "border-white/10 bg-white/5 hover:bg-white/8" : "border-border/60 bg-background/70 hover:bg-muted/30",
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                  isPremiumTheme ? "bg-white/10 text-white" : "bg-muted text-foreground",
                )}
              >
                <Plus className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className={cn("text-sm font-semibold", isPremiumTheme ? "text-white" : "")}>Add Product</div>
                <div className={cn("text-xs leading-5", isPremiumTheme ? "text-white/55" : "text-muted-foreground")}>
                  Create a marketplace listing.
                </div>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              variant="outline"
              className={cn(
                "mt-3 w-full rounded-xl",
                isPremiumTheme ? "border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white" : "",
              )}
            >
              <Link to={`/marketplace/sell?store=${storeId}`}>Add Listing</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default function StoreDetail() {
  const params = useParams();
  const id = params.id ?? params.slug ?? params.shop_no;
  const location = useLocation();
  const { user, role } = useAuth();
  const isAdmin = isAdminRole(role);

  // Determine lookup type based on route
  const isInsideRoute = location.pathname.startsWith('/stores/inside/');
  const isOutsideRoute = location.pathname.startsWith('/stores/outside/');

  const lookupType = isInsideRoute ? 'shop_no' : isOutsideRoute ? 'slug' : 'id_or_slug';
  const isUuid = id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) : false;

  const repairPartnerFallback = STORES.find((item) =>
    item.id === id ||
    item.slug === id ||
    (lookupType === "shop_no" && item.shop_no === id) ||
    item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") === id
  );

  const { data: store, isLoading: isStoreLoading, error: storeError } = useQuery<StoreRow & { subscription_tier?: string }>({
    queryKey: ["store", lookupType, id],
    queryFn: async () => {
      if (!id) throw new Error("missing_store_id");

      const buildStoreQuery = () => {
        const query = supabase.from("stores");
        if (lookupType === "shop_no") return query.eq("shop_no", id).eq("complex_zone", "inside");
        if (lookupType === "slug") return query.eq("slug", id);
        
        // id_or_slug logic
        if (isUuid) return query.eq("id", id);
        return query.eq("slug", id);
      };

      const fromDirectoryFallback = async () => {
        try {
          const directory = await storeDirectoryService.getStoresForDirectory();
          const match = directory.data.find((item) =>
            item.id === id ||
            item.slug === id ||
            item.shop_no === id ||
            item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") === id
          );

          if (match) {
            return {
              ...(match as unknown as StoreRow),
              subscription_tier: match.subscription_tier || match.package_slug || "free",
            };
          }
        } catch {
          // Keep store profile URLs working even when optional detail joins fail.
        }
        return null;
      };

      const tryWithJoin = async () =>
        buildStoreQuery()
          .select("*, store_subscriptions(packages(slug))")
          .maybeSingle();

      const tryBase = async () =>
        buildStoreQuery()
          .select("*")
          .maybeSingle();

      let data: StoreRow & { subscription_tier?: string } | null = null;

      const joined = await tryWithJoin();
      if (!joined.error && joined.data) {
        data = joined.data;
      } else if (isMissingRelationshipError(joined.error)) {
        const base = await tryBase();
        if (base.error) {
          const directoryStore = await fromDirectoryFallback();
          if (directoryStore) return directoryStore;
          if (repairPartnerFallback) {
            return {
              ...(repairPartnerFallback as unknown as StoreRow),
              subscription_tier: repairPartnerFallback.package_slug,
            };
          }
          throw base.error;
        }
        data = base.data || await fromDirectoryFallback();
      } else {
        // Unknown error: still try base query before failing
        const base = await tryBase();
        if (base.error) {
          const directoryStore = await fromDirectoryFallback();
          if (directoryStore) return directoryStore;
          if (repairPartnerFallback) {
            return {
              ...(repairPartnerFallback as unknown as StoreRow),
              subscription_tier: repairPartnerFallback.package_slug,
            };
          }
          throw joined.error;
        }
        data = base.data || await fromDirectoryFallback();
      }

      if (!data) {
        const directoryStore = await fromDirectoryFallback();
        if (directoryStore) return directoryStore;
        if (repairPartnerFallback) {
          return {
            ...(repairPartnerFallback as unknown as StoreRow),
            subscription_tier: repairPartnerFallback.package_slug,
          };
        }
        throw new Error("Store not found");
      }

      const overrides = await fetchStoreTierOverrides(supabase);

      // Flatten the subscription tier from join (if present) and merge with override/default rules
      const sub = (data as { store_subscriptions?: unknown }).store_subscriptions?.[0] || (data as { store_subscriptions?: unknown }).store_subscriptions;
      const joinedTier = sub?.packages?.slug as string | undefined;
      const tier = resolveTierForStore({ ...data, subscription_tier: joinedTier }, overrides);

      return { ...data, subscription_tier: tier };
    },
    enabled: !!id,
  });

  const { data: products, isLoading: isProductsLoading } = useQuery<SellListingRow[]>({
    queryKey: ["store_products", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];

      const { data, error } = await supabase
        .from("sell_listings")
        .select("*")
        .eq("store_id", store.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  const { data: pages } = useQuery<StorePageRow[]>({
    queryKey: ["store_pages", store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_pages")
        .select("*")
        .eq("store_id", store?.id)
        .eq("is_published", true);

      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  if (isStoreLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#050816]">
        <Header />
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border border-blue-500/20 bg-blue-500/5" />
              <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-blue-400" />
            </div>
            <p className="text-sm text-white/40 uppercase tracking-[0.2em]">Loading Store</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (storeError || !store) {
    return (
      <div className="flex min-h-screen flex-col bg-[#050816]">
        <Header />
        <div className="container flex flex-1 flex-col items-center justify-center py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
            <StoreIcon className="h-10 w-10 text-red-400" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-white">Store Not Found</h1>
          <p className="mt-2 text-white/50">
            The store you are looking for does not exist or is no longer active.
          </p>
          <Button asChild className="mt-8 rounded-full bg-blue-600 px-8 hover:bg-blue-500">
            <Link to="/stores">Back to Directory</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  // Permission checks:
  // - suadmin/staffadmin can see any store
  // - store owner can see their own store
  // - public can only see "active" stores
  const isAuthorized = 
    store.status === "active" || 
    role === "suadmin" || 
    role === "staffadmin" || 
    (user?.id && store.owner_id === user.id) ||
    isAdmin ||
    lookupType === "slug"; // Allow public access to slug-based SEO routes even if they'd normally be filtered

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen flex-col bg-[#050816]">
        <Header />
          <div className="container flex flex-1 flex-col items-center justify-center py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
              <ShieldCheck className="h-10 w-10 text-amber-400" />
            </div>
          <h1 className="mt-6 text-2xl font-bold text-white">Store Pending Review</h1>
          <p className="mt-2 text-white/50">
            This store is currently inactive or under verification.
          </p>
          <Button asChild className="mt-8 rounded-full bg-blue-600 px-8 hover:bg-blue-500">
            <Link to="/stores">Back to Directory</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const tier = store?.subscription_tier || "free";
  const publicStoreSlug = store.slug || slugify(store.name) || store.id;
  const isDiamond = tier === "diamond";
  const isGold = tier === "gold";
  const isSilver = tier === "silver";
  const isBasic = tier === "free";
  const showOwnerActions = !!user && (user.id === store.owner_id || isAdmin);

  const services = Array.isArray((store as StoreRow & { services_json?: string[] }).services_json) && (store as StoreRow & { services_json?: string[] }).services_json.length > 0
    ? (store as StoreRow & { services_json?: string[] }).services_json
    : store.services ?? [];
  const publishedPages = pages ?? [];
  const featuredIds = Array.isArray((store as StoreRow & { featured_product_ids?: string[] }).featured_product_ids)
    ? (store as StoreRow & { featured_product_ids?: string[] }).featured_product_ids
    : [];
  const activeProducts = featuredIds.length > 0
    ? (products ?? []).filter((product) => featuredIds.includes(product.id))
    : products ?? [];

  // Theme configuration
  const storeTheme = sanitizeThemeForPackage(tier, store?.theme_slug);
  
  const themes = {
    default: {
      bg: "bg-[#050816]",
      accent: "text-blue-400",
      accentBg: "bg-blue-400",
      border: "border-blue-500/20",
      gradient: "from-blue-500/20 via-cyan-400/5 to-transparent",
      button: "bg-blue-600 hover:bg-blue-500 text-white",
      orb1: "bg-blue-700/20",
      orb2: "bg-cyan-600/15",
      orb3: "bg-indigo-800/18"
    },
    emerald: {
      bg: "bg-[#040d0a]",
      accent: "text-emerald-400",
      accentBg: "bg-emerald-400",
      border: "border-emerald-500/20",
      gradient: "from-emerald-500/20 via-teal-400/5 to-transparent",
      button: "bg-emerald-600 hover:bg-emerald-500 text-white",
      orb1: "bg-emerald-700/20",
      orb2: "bg-teal-600/15",
      orb3: "bg-green-800/18"
    },
    rose: {
      bg: "bg-[#0d0406]",
      accent: "text-rose-400",
      accentBg: "bg-rose-400",
      border: "border-rose-500/20",
      gradient: "from-rose-500/20 via-pink-400/5 to-transparent",
      button: "bg-rose-600 hover:bg-rose-500 text-white",
      orb1: "bg-rose-700/20",
      orb2: "bg-pink-600/15",
      orb3: "bg-purple-800/18"
    },
    basic: {
      bg: "bg-[#101418]",
      accent: "text-slate-100",
      accentBg: "bg-slate-100",
      border: "border-slate-400/20",
      gradient: "from-slate-300/15 via-white/5 to-transparent",
      button: "bg-slate-100 hover:bg-white text-slate-950",
      orb1: "bg-slate-400/10",
      orb2: "bg-white/5",
      orb3: "bg-slate-600/10"
    },
    modern: {
      bg: "bg-[#07120f]",
      accent: "text-teal-300",
      accentBg: "bg-teal-300",
      border: "border-teal-500/20",
      gradient: "from-teal-500/20 via-cyan-400/5 to-transparent",
      button: "bg-teal-500 hover:bg-teal-400 text-slate-950",
      orb1: "bg-teal-700/20",
      orb2: "bg-cyan-600/15",
      orb3: "bg-emerald-800/18"
    },
    editorial: {
      bg: "bg-[#11100d]",
      accent: "text-yellow-200",
      accentBg: "bg-yellow-200",
      border: "border-yellow-200/20",
      gradient: "from-yellow-200/15 via-white/5 to-transparent",
      button: "bg-yellow-200 hover:bg-yellow-100 text-slate-950",
      orb1: "bg-yellow-200/10",
      orb2: "bg-white/5",
      orb3: "bg-stone-500/10"
    },
    premium: {
      bg: "bg-[#050816]",
      accent: "text-blue-400",
      accentBg: "bg-blue-400",
      border: "border-blue-500/20",
      gradient: "from-blue-500/20 via-cyan-400/5 to-transparent",
      button: "bg-blue-600 hover:bg-blue-500 text-white",
      orb1: "bg-blue-700/20",
      orb2: "bg-cyan-600/15",
      orb3: "bg-indigo-800/18"
    },
    luxury: {
      bg: "bg-[#070606]",
      accent: "text-stone-100",
      accentBg: "bg-stone-100",
      border: "border-stone-200/15",
      gradient: "from-stone-100/15 via-white/5 to-transparent",
      button: "bg-stone-100 hover:bg-white text-stone-950",
      orb1: "bg-stone-300/10",
      orb2: "bg-white/5",
      orb3: "bg-zinc-500/10"
    },
    atelier: {
      bg: "bg-[#04100d]",
      accent: "text-emerald-300",
      accentBg: "bg-emerald-300",
      border: "border-emerald-400/20",
      gradient: "from-emerald-400/20 via-lime-300/5 to-transparent",
      button: "bg-emerald-400 hover:bg-emerald-300 text-slate-950",
      orb1: "bg-emerald-600/20",
      orb2: "bg-lime-500/10",
      orb3: "bg-teal-700/15"
    },
    custom: {
      bg: "bg-[#050816]",
      accent: "text-[var(--store-theme-color)]",
      accentBg: "bg-[var(--store-theme-color)]",
      border: "border-white/15",
      gradient: "from-white/10 via-white/5 to-transparent",
      button: "bg-[var(--store-theme-color)] text-white",
      orb1: "bg-white/10",
      orb2: "bg-white/5",
      orb3: "bg-white/8"
    },
    amber: {
      bg: "bg-slate-950",
      accent: "text-amber-400",
      accentBg: "bg-amber-400",
      border: "border-amber-500/20",
      gradient: "from-amber-500/20 via-orange-400/5 to-transparent",
      button: "bg-amber-500 hover:bg-amber-600 text-black",
      orb1: "bg-amber-700/20",
      orb2: "bg-orange-600/15",
      orb3: "bg-yellow-800/18"
    }
  };

  const currentTheme = themes[storeTheme as keyof typeof themes] || themes.default;
  const storeFingerprint = `${store.name} ${store.description || ""} ${services.join(" ")}`.toLowerCase();
  const isAppleRepairBrand = /(apple|mac|macbook|iphone|ipad|repair|diagnostic)/.test(storeFingerprint);
  const isPremiumTheme = storeTheme !== "default" || isDiamond || isGold || isAppleRepairBrand;
  const isPremium = isDiamond;

  // Public store profiles:
  // - Basic: minimal public profile (no contact details)
  // - Silver: minimal profile to guests, full profile to logged-in users
  // - Gold/Diamond: full profile public
  if (isBasic && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SEO title={`${store.name} — Store`} description={store.description ?? undefined} />
        <Header />
        <main className="container flex-1 py-10">
          <Button variant="ghost" asChild className="pl-0 text-muted-foreground hover:bg-transparent">
            <Link to="/stores" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Stores
            </Link>
          </Button>

          <div className="mx-auto mt-6 max-w-3xl">
            <Card className="rounded-3xl border-border/60 bg-card/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="h-20 w-20 rounded-2xl border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                    {store.logo_url ? (
                      <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
                    ) : (
                      <StoreIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-bold tracking-tight">{store.name}</h1>
                      <Badge variant="outline" className="rounded-full">
                        Basic
                      </Badge>
                      {store.is_verified ? (
                        <Badge variant="outline" className="rounded-full border-emerald-400/30 bg-emerald-500/10 text-emerald-700">
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Verified
                        </Badge>
                      ) : null}
                    </div>
	                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
	                      <span className="inline-flex items-center gap-1.5">
	                        <MapPin className="h-4 w-4 text-primary" />
	                        {store.location}
	                      </span>
	                    </div>

	                    {store.description ? (
	                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{store.description}</p>
	                    ) : null}

	                    {store.website || store.map_url ? (
	                      <div className="mt-4 flex flex-wrap gap-2">
	                        {store.website ? (
	                          <Button asChild size="sm" variant="outline" className="rounded-full">
	                            <a href={store.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
	                              <Globe2 className="h-4 w-4" />
	                              Website
	                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
	                            </a>
	                          </Button>
	                        ) : null}
	                        {store.map_url ? (
	                          <Button asChild size="sm" variant="outline" className="rounded-full">
	                            <a href={store.map_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
	                              <MapPin className="h-4 w-4" />
	                              Map
	                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
	                            </a>
	                          </Button>
	                        ) : null}
	                      </div>
	                    ) : null}

	                    {Array.isArray(store.services) && store.services.length > 0 ? (
	                      <div className="mt-4 flex flex-wrap gap-2">
	                        {store.services.slice(0, 6).map((s) => (
	                          <Badge key={s} variant="secondary" className="rounded-full">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-6 rounded-2xl border bg-muted/30 p-4">
                      <div className="flex items-start gap-3">
                        <Lock className="mt-0.5 h-5 w-5 text-muted-foreground" />
                        <div className="text-sm">
                          <div className="font-semibold">Basic listing</div>
                          <div className="mt-1 text-muted-foreground">
                            Contact details and premium sections are hidden for free listings.
                          </div>
                        </div>
                      </div>
	                      {showOwnerActions ? (
	                        <div className="mt-4 flex flex-wrap gap-2">
	                          <Button asChild variant="outline" className="rounded-full">
	                            <Link to={`/stores/${store.id}/manage`}>
	                              <Settings className="mr-2 h-4 w-4" />
	                              Manage Store
	                            </Link>
	                          </Button>
	                        </div>
	                      ) : null}
	                    </div>

                    <StoreQuickActions storeId={store.id} isPremiumTheme={false} showOwnerActions={showOwnerActions} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isSilver && !user && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SEO title={`${store.name} — Store`} description={store.description ?? undefined} />
        <Header />
        <main className="container flex-1 py-10">
          <Button variant="ghost" asChild className="pl-0 text-muted-foreground hover:bg-transparent">
            <Link to="/stores" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Stores
            </Link>
          </Button>

          <div className="mx-auto mt-6 max-w-3xl">
            <Card className="rounded-3xl border-border/60 bg-card/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="h-20 w-20 rounded-2xl border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                    {store.logo_url ? (
                      <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
                    ) : (
                      <StoreIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-bold tracking-tight">{store.name}</h1>
                      <Badge variant="outline" className="rounded-full">
                        Silver
                      </Badge>
                      {store.is_verified ? (
                        <Badge variant="outline" className="rounded-full border-emerald-400/30 bg-emerald-500/10 text-emerald-700">
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Verified
                        </Badge>
                      ) : null}
                    </div>
	                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
	                      <span className="inline-flex items-center gap-1.5">
	                        <MapPin className="h-4 w-4 text-primary" />
	                        {store.location}
	                      </span>
	                    </div>

	                    {store.description ? (
	                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{store.description}</p>
	                    ) : null}

	                    {store.website || store.map_url ? (
	                      <div className="mt-4 flex flex-wrap gap-2">
	                        {store.website ? (
	                          <Button asChild size="sm" variant="outline" className="rounded-full">
	                            <a href={store.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
	                              <Globe2 className="h-4 w-4" />
	                              Website
	                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
	                            </a>
	                          </Button>
	                        ) : null}
	                        {store.map_url ? (
	                          <Button asChild size="sm" variant="outline" className="rounded-full">
	                            <a href={store.map_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
	                              <MapPin className="h-4 w-4" />
	                              Map
	                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
	                            </a>
	                          </Button>
	                        ) : null}
	                      </div>
	                    ) : null}

	                    {Array.isArray(store.services) && store.services.length > 0 ? (
	                      <div className="mt-4 flex flex-wrap gap-2">
	                        {store.services.slice(0, 6).map((s) => (
	                          <Badge key={s} variant="secondary" className="rounded-full">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-6 rounded-2xl border bg-muted/30 p-4">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                        <div className="text-sm">
                          <div className="font-semibold">Login required for contact details</div>
                          <div className="mt-1 text-muted-foreground">
                            Silver tier stores show phone number, email, and premium sections to registered members.
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button asChild className="rounded-full">
                          <Link to={`/auth?redirect=/stores/${publicStoreSlug}`}>Login / Register</Link>
                        </Button>
                        <Button asChild variant="outline" className="rounded-full">
                          <Link to="/stores">Back to Directory</Link>
                        </Button>
                      </div>
                    </div>

                    <StoreQuickActions storeId={store.id} isPremiumTheme={false} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const initials = store.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const locationLabel = store.location.split(",")[0]?.trim() || store.location;
  
  const diamondBadges = isPremiumTheme
    ? ["Diamond Service Experience", "Premium Brand Presence", locationLabel]
    : [locationLabel];

  const trustPoints = [
    store.is_verified ? "Verified store — trust-first profile" : "Independent store profile",
    store.phone ? "Direct repair line in hero & CTA" : "Contact-ready layout",
    store.website ? "Brand website bridge available" : "Focused in-platform journey",
    activeProducts.length > 0 ? `${activeProducts.length} active listings on-page` : "Ready for inventory listing",
  ];

  const signatureServices = isPremiumTheme
    ? ["MacBook Diagnostics", "iPhone Screen Repair", "iPad Service Desk", "Battery & Charging", "Board-Level Repair", "Data Safety Check"]
    : services.length > 0
      ? services
      : ["Sales", "Support", "Warranty", "Trade-In", "Accessories", "Setup"];

  const workflowSteps = isPremiumTheme
    ? [
        { title: "Book a Diagnosis", description: "Start with issue capture, visible symptoms, and a faster route into technical inspection.", icon: Smartphone },
        { title: "Get a Clean Quote", description: "Transparent pricing before you commit — no hidden fees, no surprises.", icon: Award },
        { title: "Authorize Repair", description: "Move into screen, battery, board, or device-level repair with clearer expectations.", icon: Wrench },
        { title: "Collect & Verify", description: "Device checks, pickup, and direct follow-up through phone, map, or website.", icon: CheckCircle2 },
      ]
    : [
        { title: "Discover the Store", description: "Lead with trust signals, service categories, and stronger contact entry points.", icon: StoreIcon },
        { title: "Choose a Service", description: "Guide visitors toward buying, support, repairs, trade-ins, or custom offerings.", icon: Star },
        { title: "Confirm Details", description: "Use clearer calls to action for phone, location, website, and inventory.", icon: CheckCircle2 },
        { title: "Follow Through", description: "Keep the whole experience closer to a real frontpage than a listing profile.", icon: Zap },
      ];

  const premiumPillars = isPremiumTheme
    ? [
        "Apple repair center feel with sharper premium hierarchy",
        "Device-first service framing for MacBook, iPhone, and iPad",
        "Minimal, high-contrast visuals instead of generic card stacks",
        "Repair journey sections that feel like a real branded homepage",
      ]
    : [
        "Distinctive frontpage structure instead of a generic store profile",
        "Service-first story flow with stronger section rhythm",
        "Clear direct actions for contact, map, and website",
        "Better merchandising and content on one page",
      ];

  type SupportedDeviceCard = {
    title: string;
    subtitle: string;
    description: string;
    icon: LucideIcon;
    color: string;
    accent: string;
    border: string;
    bg?: string;
  };

  const supportedDevices: SupportedDeviceCard[] = isPremiumTheme
    ? [
        {
          title: "MacBook",
          subtitle: "Laptop Repair",
          description: "Diagnostics, liquid-damage checks, keyboard issues, charging faults, and board-level problem isolation.",
          icon: MonitorSmartphone,
          color: "from-blue-600/20 to-blue-900/20",
          accent: "text-blue-400",
          border: "border-blue-500/20",
        },
        {
          title: "iPhone",
          subtitle: "Phone Repair",
          description: "Screen replacement, battery service, camera repair, charging fix, speaker faults, and performance checks.",
          icon: Smartphone,
          color: "from-cyan-600/20 to-cyan-900/20",
          accent: "text-cyan-400",
          border: "border-cyan-500/20",
        },
        {
          title: "iPad",
          subtitle: "Tablet Repair",
          description: "Display issues, battery concerns, software troubleshooting, connectivity problems, and part replacement.",
          icon: Tablet,
          color: "from-indigo-600/20 to-indigo-900/20",
          accent: "text-indigo-400",
          border: "border-indigo-500/20",
        },
      ]
    : [];

  const issueHighlights = isPremiumTheme
    ? [
        { title: "Battery & Power", stat: "01", description: "Fast-draining batteries, charging failure, overheating, and no-power diagnostics.", icon: BatteryCharging, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
        { title: "Screen & Body", stat: "02", description: "Broken display, touch issues, glass damage, frame problems, and hardware inspection.", icon: Smartphone, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
        { title: "Storage & Data", stat: "03", description: "Startup problems, data risk checks, software instability, and storage troubleshooting.", icon: HardDrive, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
        { title: "Turnaround Flow", stat: "04", description: "Quote-first intake, issue verification, repair authorization, and post-service testing.", icon: Clock3, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
      ]
    : [];

  const infoCards = [
    { label: "Service Lines", value: signatureServices.length || 1, note: isPremiumTheme ? "Repair pathways" : "Store services" },
    { label: "Active Listings", value: activeProducts.length, note: activeProducts.length > 0 ? "Live inventory" : "No listings yet" },
    { label: "Published Pages", value: publishedPages.length, note: publishedPages.length > 0 ? "Custom pages" : "Ready for content" },
    { label: "Location", value: store.shop_no ? `#${store.shop_no}` : "Open", note: store.location },
  ];
  const openingHours = ((store as StoreRow & { opening_hours?: Record<string, string> }).opening_hours ?? {}) as Record<string, string>;
  const socialLinks = ((store as StoreRow & { social_links_json?: Record<string, string> }).social_links_json ?? {}) as Record<string, string>;
  const banner = ((store as StoreRow & { banner_json?: { title?: string; subtitle?: string; cta_label?: string; cta_url?: string } }).banner_json ?? {}) as {
    title?: string;
    subtitle?: string;
    cta_label?: string;
    cta_url?: string;
  };
  const coverImageUrl = (store as StoreRow & { cover_image_url?: string }).cover_image_url;

  return (
    <div
      className={`flex min-h-screen flex-col ${isPremiumTheme ? currentTheme.bg : "bg-background"}`}
      style={{ "--store-theme-color": (store as StoreRow & { theme_color?: string }).theme_color || "#2563eb" } as React.CSSProperties}
    >
      <SEO
        title={store.name}
        description={store.description || `${store.name} — premium device service page with support, repairs, and direct contact.`}
        image={store.logo_url || coverImageUrl || undefined}
        url={`/stores/${publicStoreSlug}`}
        keywords={[store.name, "device repair", "store profile", "premium service center"]}
        structuredData={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Stores", url: "/stores" },
            { name: store.name, url: `/stores/${publicStoreSlug}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: store.name,
            image: store.logo_url || coverImageUrl || undefined,
            description: store.description,
            telephone: store.phone,
            email: store.email,
            url: absoluteUrl(`/stores/${publicStoreSlug}`),
            sameAs: Object.values(socialLinks).filter(Boolean),
            address: { "@type": "PostalAddress", streetAddress: store.location, addressLocality: "Kathmandu", addressCountry: "NP" },
            openingHoursSpecification: Object.entries(openingHours).map(([day, hours]) => ({
              "@type": "OpeningHoursSpecification",
              dayOfWeek: day,
              opens: hours?.split("-")[0]?.trim(),
              closes: hours?.split("-")[1]?.trim(),
            })),
          },
        ]}
      />
      <Header />

      <main className="flex-1">

        {/* ─── HERO ─── */}
        <section className={`relative overflow-hidden ${isPremiumTheme ? `${currentTheme.bg} text-white` : "bg-background"}`}>

          {isPremiumTheme && (
            <>
              {/* Animated gradient orbs */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className={`animate-orb-1 absolute left-[-12%] top-[-15%] h-[700px] w-[700px] rounded-full ${currentTheme.orb1} blur-[130px]`} />
                <div className={`animate-orb-2 absolute right-[-8%] top-[10%] h-[500px] w-[500px] rounded-full ${currentTheme.orb2} blur-[110px]`} />
                <div className={`animate-orb-3 absolute bottom-[-15%] left-[35%] h-[600px] w-[600px] rounded-full ${currentTheme.orb3} blur-[120px]`} />
              </div>
              {/* Dot grid */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.025]"
                style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
              />
              {/* Top shimmer line */}
              <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
            </>
          )}

          <div className="container relative py-12 md:py-16">
            {/* Nav row */}
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
              <Button
                variant="ghost"
                asChild
                className={isPremiumTheme ? "pl-0 text-white/50 hover:bg-transparent hover:text-white" : "pl-0 text-muted-foreground hover:bg-transparent"}
              >
                <Link to="/stores" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Stores
                </Link>
              </Button>

              {user && (user.id === store.owner_id || isAdmin) && (
                <Button
                  asChild
                  variant="outline"
                  className={isPremiumTheme ? "gap-2 rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10" : "gap-2 rounded-full"}
                >
                  <Link to={`/stores/${store.id}/manage`}>
                    <Settings className="h-4 w-4" />
                    Manage Store
                  </Link>
                </Button>
              )}
            </div>

            <div className="grid gap-10 xl:grid-cols-[1.25fr_0.75fr] xl:items-start">

              {/* Left */}
              <div>
                {/* Badges */}
                <div className="mb-7 flex flex-wrap items-center gap-3">
                  <Badge
                    className={
                      isPremiumTheme
                        ? `rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] uppercase tracking-[0.26em] ${currentTheme.accent} hover:bg-white/10`
                        : "rounded-full bg-foreground px-4 py-1.5 text-[11px] uppercase tracking-[0.26em] text-primary-foreground hover:bg-foreground"
                    }
                  >
                    {isDiamond ? "Diamond Store Experience" : isPremiumTheme ? "Apple Repair Specialist" : "Gold Tier Partner"}
                  </Badge>
                  {store.is_verified && (
                    <Badge
                      className={
                        isPremiumTheme
                          ? "rounded-full border border-emerald-400/25 bg-emerald-500/10 px-4 py-1.5 text-[11px] uppercase tracking-[0.26em] text-emerald-300 hover:bg-emerald-500/10"
                          : "rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-sky-700 hover:bg-sky-100"
                      }
                    >
                      <CheckCircle2 className="mr-1.5 h-3 w-3" />
                      Verified Partner
                    </Badge>
                  )}
                </div>

                {/* Logo + Name */}
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                  {/* Logo with glow */}
                  <div className="relative shrink-0">
                    {isPremiumTheme && (
                      <div className={`absolute inset-[-4px] rounded-[32px] ${currentTheme.orb1} blur-xl`} />
                    )}
                    {store.logo_url ? (
                      <img
                        src={store.logo_url}
                        alt={store.name}
                        className={`relative h-24 w-24 rounded-[28px] border object-cover shadow-2xl md:h-32 md:w-32 ${isPremiumTheme ? "border-white/10 bg-white logo-glow" : "border-border"}`}
                      />
                    ) : (
                      <div
                        className={`relative flex h-24 w-24 items-center justify-center rounded-[28px] border text-2xl font-bold shadow-2xl md:h-32 md:w-32 ${
                          isPremiumTheme
                            ? `border-white/10 ${currentTheme.bg} ${currentTheme.accent} logo-glow`
                            : "border-border bg-gradient-to-br from-slate-800 to-slate-900 text-white"
                        }`}
                      >
                        {initials}
                      </div>
                    )}
                  </div>

                  <div className="max-w-2xl">
                    {isPremiumTheme ? (
                      <h1 className={`${currentTheme.accent} font-display text-5xl font-bold tracking-tight md:text-7xl`}>
                        {store.name}
                      </h1>
                    ) : (
                      <h1 className="font-display text-5xl font-bold tracking-tight md:text-7xl">
                        {store.name}
                      </h1>
                    )}
                    <p className={`mt-5 max-w-xl text-[1.05rem] leading-8 ${isPremiumTheme ? "text-white/58" : "text-muted-foreground"}`}>
                      {store.description ||
                        (isPremiumTheme
                          ? `${store.name} is presented as a diamond-tier repair landing page with premium structure, stronger service clarity, and cleaner device-first messaging.`
                          : `${store.name} — premium store experience with clearer service paths, trust signals, and direct contact routes.`)}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2.5">
                      {diamondBadges.map((badge) => (
                        <span
                          key={badge}
                          className={`rounded-full border px-3.5 py-1.5 text-[11px] uppercase tracking-[0.2em] ${
                            isPremiumTheme
                              ? "border-white/10 bg-white/5 text-white/60"
                              : "border-border/60 bg-background/80 text-muted-foreground"
                          }`}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Contact pills */}
                <div className="mt-8 flex flex-wrap gap-2.5">
                  {store.location && (
                    <div className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm backdrop-blur ${isPremiumTheme ? "border-white/10 bg-white/5 text-white/65" : "border-border/60 bg-background/80 text-muted-foreground"}`}>
                      <MapPin className={`h-3.5 w-3.5 ${isPremiumTheme ? currentTheme.accent : "text-primary"}`} />
                      {store.location}
                    </div>
                  )}
                  {store.shop_no && (
                    <div className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm backdrop-blur ${isPremiumTheme ? "border-white/10 bg-white/5 text-white/65" : "border-border/60 bg-background/80 text-muted-foreground"}`}>
                      <StoreIcon className={`h-3.5 w-3.5 ${isPremiumTheme ? currentTheme.accent : "text-primary"}`} />
                      Shop #{store.shop_no}
                    </div>
                  )}
                  {store.email && (
                    <div className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm backdrop-blur ${isPremiumTheme ? "border-white/10 bg-white/5 text-white/65" : "border-border/60 bg-background/80 text-muted-foreground"}`}>
                      <Mail className={`h-3.5 w-3.5 ${isPremiumTheme ? currentTheme.accent : "text-primary"}`} />
                      {store.email}
                    </div>
                  )}
                </div>

                {/* CTAs */}
                <div className="mt-9 flex flex-wrap gap-4">
                  {store.phone && (
                    <Button
                      size="lg"
                      asChild
                      className={
                        isPremiumTheme
                          ? "group relative overflow-hidden rounded-full bg-blue-600 px-8 text-white shadow-[0_0_24px_rgba(59,130,246,0.4)] hover:bg-blue-500 hover:shadow-[0_0_36px_rgba(59,130,246,0.5)]"
                          : "rounded-full px-8"
                      }
                    >
                      <a href={`tel:${store.phone}`}>
                        {isPremiumTheme ? "Book a Repair" : "Call Store"}
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {store.map_url && (
                    <Button
                      size="lg"
                      variant="outline"
                      asChild
                      className={
                        isPremiumTheme
                          ? "rounded-full border-white/12 bg-white/5 px-8 text-white hover:bg-white/10 hover:text-white"
                          : "rounded-full px-8"
                      }
                    >
                      <a href={store.map_url} target="_blank" rel="noopener noreferrer">
                        <MapPin className="mr-2 h-4 w-4" />
                        Open Map
                      </a>
                    </Button>
                  )}
                  {store.website && (
                    <Button
                      size="lg"
                      variant="ghost"
                      asChild
                      className={
                        isPremiumTheme
                          ? "rounded-full px-8 text-white/75 hover:bg-white/5 hover:text-white"
                          : "rounded-full px-8"
                      }
                    >
                      <a href={store.website} target="_blank" rel="noopener noreferrer">
                        Visit Website
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>

                <StoreQuickActions storeId={store.id} isPremiumTheme={isPremiumTheme} showOwnerActions={showOwnerActions} />

                {banner.title ? (
                  <div className={cn("mt-8 rounded-[28px] border p-6", isPremiumTheme ? "border-white/10 bg-white/5 text-white" : "bg-muted/30")}>
                    <div className="text-xl font-bold">{banner.title}</div>
                    {banner.subtitle ? (
                      <p className={cn("mt-2 text-sm leading-6", isPremiumTheme ? "text-white/60" : "text-muted-foreground")}>{banner.subtitle}</p>
                    ) : null}
                    {banner.cta_label && banner.cta_url ? (
                      <Button asChild className={cn("mt-4 rounded-full", isPremiumTheme ? currentTheme.button : "")}>
                        <a href={banner.cta_url}>{banner.cta_label}</a>
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* Right — Glassmorphism cards */}
              <div className="space-y-4">
                {coverImageUrl ? (
                  <div className="overflow-hidden rounded-[32px] border border-white/10 shadow-2xl">
                    <img src={coverImageUrl} alt={`${store.name} cover`} className="aspect-[4/3] w-full object-cover" />
                  </div>
                ) : null}

                <Card
                  className={
                    isPremiumTheme
                      ? "overflow-hidden rounded-[32px] border-white/8 bg-white/5 text-white shadow-2xl backdrop-blur-xl"
                      : "overflow-hidden rounded-[32px] border-border/60 bg-foreground text-primary-foreground shadow-2xl"
                  }
                >
                  <CardContent className="p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className={`text-xs uppercase tracking-[0.26em] ${isPremiumTheme ? "text-white/38" : "text-primary-foreground/55"}`}>
                          Store Pulse
                        </div>
                        <div className="mt-3 text-2xl font-bold">
                          {isPremiumTheme ? "Apple Device Repair Center" : services.length > 0 ? services[0] : "Sales & Support"}
                        </div>
                        <p className={`mt-3 text-sm leading-6 ${isPremiumTheme ? "text-white/55" : "text-primary-foreground/70"}`}>
                          {isPremiumTheme
                            ? "A premium repair-center presentation with stronger issue framing, direct contact flow, and higher-end visual trust."
                            : "Premium store layout with service-led positioning and faster contact routes."}
                        </p>
                      </div>
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isPremiumTheme ? "border border-blue-400/20 bg-blue-500/10" : "border border-white/10 bg-white/8"}`}>
                        <Sparkles className={`h-5 w-5 ${isPremiumTheme ? currentTheme.accent : "text-cyan-300"}`} />
                      </div>
                    </div>
                    <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                      {trustPoints.map((item) => (
                        <div
                          key={item}
                          className={`rounded-2xl border p-3.5 text-sm ${isPremiumTheme ? "border-white/8 bg-black/25 text-white/60" : "border-white/10 bg-white/5 text-primary-foreground/75"}`}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-3 sm:grid-cols-2">
                  {infoCards.map((card) => (
                    <Card
                      key={card.label}
                      className={
                        isPremiumTheme
                          ? "rounded-[26px] border-white/8 bg-white/4 backdrop-blur"
                          : "rounded-[26px] border-border/60 bg-card/90 shadow-sm backdrop-blur"
                      }
                    >
                      <CardContent className="p-5">
                        <div className={`text-xs uppercase tracking-[0.22em] ${isPremiumTheme ? "text-white/38" : "text-muted-foreground"}`}>
                          {card.label}
                        </div>
                        <div className={`mt-2.5 text-3xl font-bold ${isPremiumTheme ? "text-white" : ""}`}>
                          {card.value}
                        </div>
                        <p className={`mt-1.5 text-xs leading-5 ${isPremiumTheme ? "text-white/45" : "text-muted-foreground"}`}>
                          {card.note}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {isPremiumTheme && (
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          )}
        </section>

        {/* ─── MARQUEE TICKER ─── */}
        {isPremiumTheme && (
          <div className="relative overflow-hidden border-y border-white/6 bg-[#080d1a] py-4">
            <div className="flex">
              <div className="animate-marquee flex shrink-0 items-center gap-0 whitespace-nowrap">
                {[...tickerItems, ...tickerItems].map((item, i) => (
                  <span key={i} className="flex items-center gap-3 px-6 text-sm text-white/45 uppercase tracking-[0.18em]">
                    <span className="h-1 w-1 rounded-full bg-blue-500/60" />
                    {item}
                  </span>
                ))}
              </div>
              <div className="animate-marquee flex shrink-0 items-center gap-0 whitespace-nowrap" aria-hidden>
                {[...tickerItems, ...tickerItems].map((item, i) => (
                  <span key={i} className="flex items-center gap-3 px-6 text-sm text-white/45 uppercase tracking-[0.18em]">
                    <span className="h-1 w-1 rounded-full bg-blue-500/60" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── SERVICES ─── */}
        <section className={`py-16 ${isPremiumTheme ? "bg-[#060b18]" : ""}`}>
          <div className="container">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className={`text-xs font-semibold uppercase tracking-[0.28em] ${isPremiumTheme ? currentTheme.accent : "text-muted-foreground"}`}>
                  {isPremiumTheme ? "Device Service Lines" : "Signature Services"}
                </div>
                <h2 className={`mt-3 text-3xl font-bold tracking-tight md:text-5xl ${isPremiumTheme ? "gradient-text-apple" : ""}`}>
                  {isPremiumTheme
                    ? "MacBook, iPhone & iPad\nRepair Pathways"
                    : "Built like a service brand,\nnot just a listing"}
                </h2>
              </div>
              <Badge
                variant="outline"
                className={`w-fit rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.18em] ${isPremiumTheme ? "border-white/10 text-white/50" : ""}`}
              >
                {signatureServices.length} service categories
              </Badge>
            </div>

            {/* Bento-style service grid */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {signatureServices.map((service, index) => {
                const isFeatured = index === 0;
                return (
                  <Card
                    key={service}
                    className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                      isFeatured ? "xl:col-span-2" : ""
                    } ${
                      isPremiumTheme
                        ? "rounded-[28px] border-white/8 bg-white/4 shadow-none backdrop-blur hover:border-blue-500/20 hover:bg-white/6"
                        : "rounded-[28px] border-border/60 bg-card shadow-card"
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${serviceAccents[index % serviceAccents.length]} opacity-60`} />
                    <CardContent className="relative p-7">
                      <div className="flex items-center justify-between gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isPremiumTheme ? serviceIconsBg[index % serviceIconsBg.length] : "bg-background/90 text-primary"} shadow-sm`}>
                          {index % 3 === 0 ? <Wrench className="h-5 w-5" /> : index % 3 === 1 ? <Zap className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                        </div>
                        <Badge
                          variant="secondary"
                          className={`rounded-full text-[10px] uppercase tracking-[0.18em] ${isPremiumTheme ? "border border-white/10 bg-white/5 text-white/55" : ""}`}
                        >
                          0{index + 1}
                        </Badge>
                      </div>
                      <h3 className={`mt-8 text-2xl font-bold tracking-tight ${isPremiumTheme ? "text-white" : ""}`}>
                        {service}
                      </h3>
                      <p className={`mt-3 text-sm leading-7 ${isPremiumTheme ? "text-white/50" : "text-muted-foreground"}`}>
                        {isPremiumTheme
                          ? `Premium-grade ${service.toLowerCase()} service with clear diagnostics, polished intake flow, and expert technician oversight.`
                          : `A more intentional landing-page treatment for ${service.toLowerCase()} with cleaner conversion routes and stronger trust framing.`}
                      </p>
                      {isFeatured && isPremiumTheme && (
                        <div className="mt-6 flex flex-wrap gap-2">
                          {["Diamond Support", "Precision Workflow", "Expert Technicians"].map((tag) => (
                            <span key={tag} className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── SUPPORTED DEVICES (Apple only) ─── */}
        {isPremiumTheme && (
          <section className="py-16 bg-[#050912]">
            <div className="container">
              <div className="mb-10">
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
                  Supported Apple Devices
                </div>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-5xl">
                  Every Apple device,{" "}
                  <span className="gradient-text-apple">expertly serviced</span>
                </h2>
                <p className="mt-4 max-w-xl text-white/50">
                  {store.name} can highlight MacBook, iPhone, and iPad support in a cleaner, more premium device-service layout.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                {supportedDevices.map((device) => {
                  const Icon = device.icon;
                  return (
                    <div
                      key={device.title}
                      className={`group relative overflow-hidden rounded-[32px] border ${device.border} bg-gradient-to-b ${device.color} p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
                    >
                      {/* Glow orb */}
                      <div className={`absolute right-[-20%] top-[-20%] h-48 w-48 rounded-full ${device.bg || "bg-blue-600/10"} blur-3xl`} />
                      <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border ${device.border} bg-white/5`}>
                        <Icon className={`h-8 w-8 ${device.accent}`} />
                      </div>
                      <div className={`mt-4 text-xs uppercase tracking-[0.22em] ${device.accent}`}>
                        {device.subtitle}
                      </div>
                      <h3 className="mt-2 text-3xl font-bold text-white">{device.title}</h3>
                      <p className="mt-4 text-sm leading-7 text-white/55">{device.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ─── ISSUE HIGHLIGHTS (Apple only) ─── */}
        {isPremiumTheme && (
          <section className="py-16 bg-[#060b18]">
            <div className="container">
              <div className="mb-10">
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
                  Common Repair Paths
                </div>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
                  Identify the issue. Fix it fast.
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {issueHighlights.map((issue) => {
                  const Icon = issue.icon;
                  return (
                    <div
                      key={issue.title}
                      className={`group relative overflow-hidden rounded-[28px] border ${issue.border} bg-white/3 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white/5`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${issue.bg}`}>
                          <Icon className={`h-6 w-6 ${issue.color}`} />
                        </div>
                        <span className="font-display text-4xl font-bold text-white/8">{issue.stat}</span>
                      </div>
                      <h3 className="mt-6 text-xl font-bold text-white">{issue.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-white/50">{issue.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ─── WORKFLOW ─── */}
        <section className={`py-16 ${isPremiumTheme ? "bg-[#050912]" : "bg-secondary/20"}`}>
          <div className="container">
            <div className="mb-10">
              <div className={`text-xs font-semibold uppercase tracking-[0.28em] ${isPremiumTheme ? currentTheme.accent : "text-muted-foreground"}`}>
                {isPremiumTheme ? "Repair Journey" : "How It Works"}
              </div>
              <h2 className={`mt-3 text-3xl font-bold tracking-tight md:text-4xl ${isPremiumTheme ? "text-white" : ""}`}>
                {isPremiumTheme
                  ? "From diagnosis to delivery — a cleaner repair flow"
                  : "How the store experience flows like a real homepage"}
              </h2>
            </div>

            <div className="grid gap-4 xl:grid-cols-4">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                const isLast = index === workflowSteps.length - 1;
                return (
                  <div key={step.title} className="relative">
                    {/* Connector line */}
                    {!isLast && (
                      <div className="absolute hidden xl:block" style={{ top: "28px", left: "56px", right: "-16px", height: "2px", background: "linear-gradient(90deg, rgba(59,130,246,0.5), rgba(56,189,248,0.15))" }} />
                    )}
                    <Card
                      className={`relative overflow-hidden ${
                        isPremiumTheme
                          ? "rounded-[28px] border-white/8 bg-white/4 backdrop-blur hover:border-blue-500/15 hover:bg-white/6"
                          : "rounded-[28px] border-border/60 bg-card"
                      } transition-all duration-200`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                              isPremiumTheme
                                ? "border border-blue-500/20 bg-blue-500/10"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {isPremiumTheme
                              ? <Icon className="h-5 w-5 text-blue-400" />
                              : <span className="text-sm font-bold">0{index + 1}</span>
                            }
                          </div>
                          {isPremiumTheme && (
                            <span className="font-display text-5xl font-bold text-white/5">0{index + 1}</span>
                          )}
                        </div>
                        <h3 className={`mt-6 text-xl font-bold tracking-tight ${isPremiumTheme ? "text-white" : ""}`}>
                          {step.title}
                        </h3>
                        <p className={`mt-3 text-sm leading-6 ${isPremiumTheme ? "text-white/50" : "text-muted-foreground"}`}>
                          {step.description}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── PRODUCTS ─── */}
        <section className={`py-16 ${isPremiumTheme ? "bg-[#060b18]" : "bg-secondary/20"}`}>
          <div className="container">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className={`text-xs font-semibold uppercase tracking-[0.28em] ${isPremiumTheme ? currentTheme.accent : "text-muted-foreground"}`}>
                  Product Floor
                </div>
                <h2 className={`mt-3 text-3xl font-bold tracking-tight md:text-4xl ${isPremiumTheme ? "text-white" : ""}`}>
                  {isPremiumTheme ? "Inventory, accessories & active offers" : "Latest arrivals & active offers"}
                </h2>
              </div>
              {activeProducts.length > 0 && (
                <Badge
                  className={`w-fit rounded-full px-4 py-1.5 text-xs ${isPremiumTheme ? "border border-blue-500/20 bg-blue-500/10 text-blue-300" : ""}`}
                >
                  {activeProducts.length} live listings
                </Badge>
              )}
            </div>

            {isProductsLoading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`h-[320px] animate-pulse rounded-[28px] ${isPremiumTheme ? "bg-white/4" : "bg-muted"}`} />
                ))}
              </div>
            ) : activeProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {activeProducts.map((product, index) => (
                  <Card
                    key={product.id}
                    className={`group overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                      isPremiumTheme
                        ? "rounded-[28px] border-white/8 bg-white/4 shadow-none hover:border-blue-500/20 hover:shadow-[0_20px_60px_rgba(59,130,246,0.12)]"
                        : "rounded-[28px] border-border/60 bg-card shadow-card hover:shadow-xl"
                    }`}
                  >
                    <div className={`relative aspect-square overflow-hidden ${isPremiumTheme ? "bg-white/3" : "bg-muted/30"}`}>
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className={`flex h-full items-center justify-center ${isPremiumTheme ? "bg-gradient-to-br from-blue-950 to-slate-950" : "bg-gradient-to-br from-slate-100 to-slate-200"}`}>
                          <div className="text-center">
                            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${isPremiumTheme ? "bg-white/8" : "bg-white/60"}`}>
                              <StoreIcon className={`h-7 w-7 ${isPremiumTheme ? "text-white/40" : "text-muted-foreground"}`} />
                            </div>
                            <div className={`mt-3 text-xs uppercase tracking-[0.22em] ${isPremiumTheme ? "text-white/30" : "text-muted-foreground"}`}>
                              Listing Preview
                            </div>
                          </div>
                        </div>
                      )}
                      <Badge
                        className={`absolute left-4 top-4 rounded-full ${isPremiumTheme ? "border-white/10 bg-black/50 text-white backdrop-blur" : ""}`}
                        variant={product.condition === "new" ? "default" : "secondary"}
                      >
                        {(product.condition || "active").replace("_", " ")}
                      </Badge>
                      <div className={`absolute bottom-4 right-4 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur ${isPremiumTheme ? "bg-white/10 text-white/60" : "bg-background/90 shadow-sm"}`}>
                        #{index + 1}
                      </div>
                    </div>

                    <CardContent className="p-5">
                      <div className={`text-xs uppercase tracking-[0.22em] ${isPremiumTheme ? "text-white/38" : "text-muted-foreground"}`}>
                        {product.category}
                      </div>
                      <h3 className={`mt-2.5 line-clamp-2 text-lg font-bold tracking-tight transition-colors ${isPremiumTheme ? "text-white group-hover:text-blue-300" : "group-hover:text-primary"}`}>
                        <Link to={`/marketplace/listing/${product.id}`}>{product.title}</Link>
                      </h3>
                      <div className={`mt-3 text-2xl font-bold ${isPremiumTheme ? currentTheme.accent : "text-primary"}`}>
                        Rs. {product.price.toLocaleString()}
                      </div>
                      <p className={`mt-2.5 line-clamp-2 text-sm leading-6 ${isPremiumTheme ? "text-white/45" : "text-muted-foreground"}`}>
                        {product.description || "Explore this listing for detailed specs, pricing, and direct store contact."}
                      </p>
                      <Button
                        className={`mt-5 w-full rounded-full ${isPremiumTheme ? "bg-blue-600/80 text-white hover:bg-blue-600" : ""}`}
                        asChild
                      >
                        <Link to={`/marketplace/listing/${product.id}`}>
                          View Listing
                          <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card
                className={`rounded-[32px] border-dashed ${isPremiumTheme ? "border-white/10 bg-white/3" : "border-border/60 bg-card/70"}`}
              >
                <CardContent className="p-12 text-center">
                  <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${isPremiumTheme ? "border border-white/10 bg-white/5" : "bg-secondary"}`}>
                    <StoreIcon className={`h-8 w-8 ${isPremiumTheme ? "text-white/30" : "text-primary"}`} />
                  </div>
                  <h3 className={`mt-6 text-xl font-bold ${isPremiumTheme ? "text-white" : ""}`}>No live listings yet</h3>
                  <p className={`mx-auto mt-3 max-w-md text-sm leading-6 ${isPremiumTheme ? "text-white/45" : "text-muted-foreground"}`}>
                    Once this store adds active listings, they'll appear here as a stronger merchandise section.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* ─── BRAND STORY + CONTACT ─── */}
        <section className={`py-16 ${isPremiumTheme ? "bg-[#050912]" : ""}`}>
          <div className="container">
            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">

              {/* Brand story card */}
              <Card
                className={
                  isPremiumTheme
                    ? "relative overflow-hidden rounded-[32px] border-white/8 bg-gradient-to-b from-white/6 to-transparent shadow-2xl backdrop-blur"
                    : "overflow-hidden rounded-[32px] border-border/60 bg-foreground text-primary-foreground shadow-elevated"
                }
              >
                {isPremiumTheme && (
                  <div className="absolute right-[-20%] top-[-20%] h-64 w-64 rounded-full bg-blue-600/15 blur-3xl" />
                )}
                <CardContent className="relative p-8 md:p-10">
                  <div className={`text-xs uppercase tracking-[0.26em] ${isPremiumTheme ? currentTheme.accent : "text-primary-foreground/55"}`}>
                    Brand Story
                  </div>
                  <h2 className={`mt-3 text-3xl font-bold tracking-tight ${isPremiumTheme ? "text-white" : "text-primary-foreground"}`}>
                    {isPremiumTheme
                      ? "A diamond-grade Apple service presence"
                      : "A store profile that feels like a destination"}
                  </h2>
                  <p className={`mt-4 max-w-xl text-sm leading-7 ${isPremiumTheme ? "text-white/55" : "text-primary-foreground/76"}`}>
                    {store.description ||
                      `${store.name} — a premium device-service page with stronger structure, direct conversion paths, and clearer trust framing.`}
                  </p>
                  <div className="mt-8 space-y-3">
                    {premiumPillars.map((item) => (
                      <div
                        key={item}
                        className={`flex items-start gap-3 rounded-2xl border p-4 ${
                          isPremiumTheme
                            ? "border-white/8 bg-white/4"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                        <span className={`text-sm leading-6 ${isPremiumTheme ? "text-white/65" : "text-primary-foreground/80"}`}>
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Contact + Policy */}
              <div className="space-y-5">
                <Card className={isPremiumTheme ? "rounded-[30px] border-white/8 bg-white/4 backdrop-blur" : "rounded-[30px] border-border/60"}>
                  <CardContent className="p-7">
                    <div className={`text-xs font-semibold uppercase tracking-[0.26em] ${isPremiumTheme ? currentTheme.accent : "text-muted-foreground"}`}>
                      Visit The Store
                    </div>
                    <h3 className={`mt-3 text-2xl font-bold tracking-tight ${isPremiumTheme ? "text-white" : ""}`}>
                      {store.location}
                    </h3>
                    <p className={`mt-3 text-sm leading-6 ${isPremiumTheme ? "text-white/50" : "text-muted-foreground"}`}>
                      {isPremiumTheme
                        ? "Contact the store directly for diagnostics, repair quotes, pickup coordination, or directions to the service desk."
                        : "Move quickly from discovery into a call, map action, or website handoff."}
                    </p>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {store.phone && (
                        <a
                          href={`tel:${store.phone}`}
                          className={`group rounded-2xl border p-4 transition-all ${isPremiumTheme ? "border-white/8 bg-white/3 hover:border-blue-500/20 hover:bg-blue-500/5" : "border-border/60 hover:bg-secondary/50"}`}
                        >
                          <Phone className={`h-5 w-5 ${isPremiumTheme ? currentTheme.accent : "text-primary"}`} />
                          <div className={`mt-3 text-sm font-semibold ${isPremiumTheme ? "text-white" : ""}`}>
                            {isPremiumTheme ? "Service Desk" : "Call"}
                          </div>
                          <div className={`mt-1 text-sm ${isPremiumTheme ? "text-white/50" : "text-muted-foreground"}`}>{store.phone}</div>
                        </a>
                      )}
                      {store.email && (
                        <a
                          href={`mailto:${store.email}`}
                          className={`group rounded-2xl border p-4 transition-all ${isPremiumTheme ? "border-white/8 bg-white/3 hover:border-blue-500/20 hover:bg-blue-500/5" : "border-border/60 hover:bg-secondary/50"}`}
                        >
                          <Mail className={`h-5 w-5 ${isPremiumTheme ? currentTheme.accent : "text-primary"}`} />
                          <div className={`mt-3 text-sm font-semibold ${isPremiumTheme ? "text-white" : ""}`}>Email</div>
                          <div className={`mt-1 text-sm ${isPremiumTheme ? "text-white/50" : "text-muted-foreground"}`}>{store.email}</div>
                        </a>
                      )}
                      {store.map_url && (
                        <a
                          href={store.map_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`group rounded-2xl border p-4 transition-all ${isPremiumTheme ? "border-white/8 bg-white/3 hover:border-blue-500/20 hover:bg-blue-500/5" : "border-border/60 hover:bg-secondary/50"}`}
                        >
                          <MapPin className={`h-5 w-5 ${isPremiumTheme ? currentTheme.accent : "text-primary"}`} />
                          <div className={`mt-3 text-sm font-semibold ${isPremiumTheme ? "text-white" : ""}`}>Map</div>
                          <div className={`mt-1 text-sm ${isPremiumTheme ? "text-white/50" : "text-muted-foreground"}`}>Get directions</div>
                        </a>
                      )}
                      {store.website && (
                        <a
                          href={store.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`group rounded-2xl border p-4 transition-all ${isPremiumTheme ? "border-white/8 bg-white/3 hover:border-blue-500/20 hover:bg-blue-500/5" : "border-border/60 hover:bg-secondary/50"}`}
                        >
                          <Globe2 className={`h-5 w-5 ${isPremiumTheme ? currentTheme.accent : "text-primary"}`} />
                          <div className={`mt-3 text-sm font-semibold ${isPremiumTheme ? "text-white" : ""}`}>Website</div>
                          <div className={`mt-1 text-sm ${isPremiumTheme ? "text-white/50" : "text-muted-foreground"}`}>Visit main site</div>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className={isPremiumTheme ? "rounded-[30px] border-white/8 bg-white/4 backdrop-blur" : "rounded-[30px] border-border/60"}>
                  <CardContent className="p-7">
                    <div className={`text-xs font-semibold uppercase tracking-[0.26em] ${isPremiumTheme ? currentTheme.accent : "text-muted-foreground"}`}>
                      Service Policy
                    </div>
                    <h3 className={`mt-3 text-2xl font-bold tracking-tight ${isPremiumTheme ? "text-white" : ""}`}>
                      {isPremiumTheme ? "Clear expectations before repair" : "Simple, trust-first policies"}
                    </h3>
                    <div className="mt-5 space-y-3">
                      {[
                        {
                          title: isPremiumTheme ? "Service Assurance" : "Warranty Approach",
                          body: isPremiumTheme
                            ? "Use this section to describe your repair assurance, support coverage, and how customers should contact the store after service."
                            : "New products follow manufacturer or store-backed warranty handling. Pre-owned items should be clarified at the point of sale.",
                        },
                        {
                          title: "Before You Visit",
                          body: isPremiumTheme
                            ? "Call ahead to describe your issue and get a rough diagnosis. We'll confirm parts availability and repair timeline before you drop off."
                            : "Call ahead for current stock, exchange terms, service timing, and documentation required for repairs or trade-ins.",
                        },
                      ].map((policy) => (
                        <div
                          key={policy.title}
                          className={`rounded-2xl border p-4 ${isPremiumTheme ? "border-white/8 bg-white/3" : "border-border/60"}`}
                        >
                          <div className={`font-semibold ${isPremiumTheme ? "text-white" : ""}`}>{policy.title}</div>
                          <p className={`mt-2 text-sm leading-6 ${isPremiumTheme ? "text-white/50" : "text-muted-foreground"}`}>
                            {policy.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {Object.keys(openingHours).length > 0 ? (
                  <Card className={isPremiumTheme ? "rounded-[28px] border-white/8 bg-white/5 text-white backdrop-blur-xl" : "rounded-[28px]"}>
                    <CardContent className="p-6">
                      <div className="mb-4 flex items-center gap-2 font-semibold">
                        <Clock3 className={`h-4 w-4 ${isPremiumTheme ? currentTheme.accent : "text-primary"}`} />
                        Opening Hours
                      </div>
                      <div className="grid gap-2 text-sm">
                        {Object.entries(openingHours).map(([day, hours]) => (
                          hours ? (
                            <div key={day} className="flex justify-between gap-4">
                              <span className={isPremiumTheme ? "text-white/55" : "text-muted-foreground"}>{day}</span>
                              <span className="font-medium">{hours}</span>
                            </div>
                          ) : null
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {Object.values(socialLinks).some(Boolean) ? (
                  <Card className={isPremiumTheme ? "rounded-[28px] border-white/8 bg-white/5 text-white backdrop-blur-xl" : "rounded-[28px]"}>
                    <CardContent className="p-6">
                      <div className="mb-4 font-semibold">Social Links</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(socialLinks).map(([label, url]) => (
                          url ? (
                            <Button key={label} asChild size="sm" variant="outline" className={isPremiumTheme ? "rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white" : "rounded-full"}>
                              <a href={url} target="_blank" rel="noopener noreferrer">
                                {label}
                                <ExternalLink className="ml-2 h-3.5 w-3.5" />
                              </a>
                            </Button>
                          ) : null
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* ─── CUSTOM PAGES ─── */}
        {publishedPages.length > 0 && (
          <section className={`pb-16 ${isPremiumTheme ? "bg-[#060b18]" : ""}`}>
            <div className="container">
              <div className="mb-8">
                <div className={`text-xs font-semibold uppercase tracking-[0.28em] ${isPremiumTheme ? currentTheme.accent : "text-muted-foreground"}`}>
                  Inside The Brand
                </div>
                <h2 className={`mt-3 text-3xl font-bold tracking-tight md:text-4xl ${isPremiumTheme ? "text-white" : ""}`}>
                  Custom pages & brand content
                </h2>
              </div>
              <div className="grid gap-5 xl:grid-cols-2">
                {publishedPages.map((page, index) => (
                  <Card
                    key={page.id}
                    className={`overflow-hidden ${isPremiumTheme ? "rounded-[28px] border-white/8 bg-white/4 backdrop-blur" : "rounded-[28px] border-border/60 shadow-card"}`}
                  >
                    <div className={`h-1.5 bg-gradient-to-r ${serviceAccents[index % serviceAccents.length]}`} />
                    <CardContent className="p-7">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className={`text-xs uppercase tracking-[0.22em] ${isPremiumTheme ? "text-white/38" : "text-muted-foreground"}`}>
                            {page.slug.replace(/-/g, " ")}
                          </div>
                          <h3 className={`mt-2.5 text-2xl font-bold tracking-tight ${isPremiumTheme ? "text-white" : ""}`}>{page.title}</h3>
                        </div>
                        <Badge
                          variant="outline"
                          className={`rounded-full text-xs ${isPremiumTheme ? "border-white/10 text-white/40" : ""}`}
                        >
                          Section {index + 1}
                        </Badge>
                      </div>
                      <div
                        className={`prose mt-6 max-w-none prose-headings:font-display prose-p:text-muted-foreground ${isPremiumTheme ? "prose-invert" : ""}`}
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.content || "") }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── FINAL CTA ─── */}
        {isPremiumTheme && store.phone && (
          <section className="relative overflow-hidden bg-[#050816] py-20">
            {/* Glow */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-[400px] w-[600px] rounded-full bg-blue-700/20 blur-[100px]" />
            </div>
            <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

            <div className="container relative text-center">
              <Badge className="rounded-full border border-blue-400/25 bg-blue-500/10 px-4 py-1.5 text-xs uppercase tracking-[0.24em] text-blue-300">
                Ready to fix your device?
              </Badge>
              <h2 className="mx-auto mt-5 max-w-2xl font-display text-4xl font-bold text-white md:text-6xl">
                Professional Apple repair,{" "}
                <span className="gradient-text-apple">done right</span>
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-lg text-white/50">
                {store.name} now presents a more premium service-center experience with clearer action paths, stronger trust, and a more polished repair-first layout.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Button
                  size="lg"
                  asChild
                  className="rounded-full bg-blue-600 px-10 text-white shadow-[0_0_32px_rgba(59,130,246,0.45)] hover:bg-blue-500 hover:shadow-[0_0_48px_rgba(59,130,246,0.55)]"
                >
                  <a href={`tel:${store.phone}`}>
                    Book a Repair Now
                    <ArrowUpRight className="ml-2 h-5 w-5" />
                  </a>
                </Button>
                {store.map_url && (
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="rounded-full border-white/12 bg-white/5 px-10 text-white hover:bg-white/10 hover:text-white"
                  >
                    <a href={store.map_url} target="_blank" rel="noopener noreferrer">
                      <MapPin className="mr-2 h-5 w-5" />
                      Find Us on Map
                    </a>
                  </Button>
                )}
              </div>

              {/* Trust row */}
              <div className="mx-auto mt-12 flex max-w-2xl flex-wrap items-center justify-center gap-6">
                {["Expert Technicians", "Diamond Support Flow", "Trusted Repair Desk", "Direct Contact"].map((trust) => (
                  <div key={trust} className="flex items-center gap-2 text-sm text-white/40">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    {trust}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>

      <Footer />
    </div>
  );
}
