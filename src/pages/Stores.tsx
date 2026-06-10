import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { storeDirectoryService } from "@/services/storeDirectoryService";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { useStoreDirectory } from "@/hooks/useStoreDirectory";
import type { SubscriptionTier } from "@/hooks/useStores";
import { TIER_META } from "@/hooks/useStores";
import type { StoreDirectoryItem } from "@/services/storeDirectoryService";
import { useAuth } from "@/hooks/useAuth";
import { isAdminRole } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { STORES } from "@/data/storeData";
import { getPublicStorePath, getPublicStoreSlug } from "@/lib/storeRoutes";
import {
  Search, MapPin, Phone, Mail, Globe, ExternalLink,
  CheckCircle2, Gem, Star, Award, Lock, Store as StoreIcon,
  ArrowRight, Crown, Sparkles, Building2, ChevronRight, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tier filter tabs ─────────────────────────────────────────────────────────
type TierFilter = "all" | "diamond" | "gold" | "silver" | "free";
type ServiceFilter = "all" | "new phones" | "accessories" | "repair" | "exchange";
type FloorFilter = "all" | "1st" | "2nd" | "3rd" | "4th" | "5th";

const TIER_TABS: { key: TierFilter; label: string; icon: React.ReactNode }[] = [
  { key: "all",     label: "All Stores", icon: <StoreIcon className="h-4 w-4" /> },
  { key: "diamond", label: "Diamond",    icon: <Gem className="h-4 w-4" /> },
  { key: "gold",    label: "Gold",       icon: <Star className="h-4 w-4 fill-current" /> },
  { key: "silver",  label: "Silver",     icon: <Award className="h-4 w-4" /> },
  { key: "free",    label: "Basic",      icon: <Building2 className="h-4 w-4" /> },
];

const SERVICE_TABS: { key: ServiceFilter; label: string }[] = [
  { key: "all", label: "All Services" },
  { key: "new phones", label: "New Phones" },
  { key: "accessories", label: "Accessories" },
  { key: "repair", label: "Repair" },
  { key: "exchange", label: "Exchange" },
];

const FLOOR_TABS: { key: FloorFilter; label: string }[] = [
  { key: "all", label: "All Floors" },
  { key: "1st", label: "1st Floor" },
  { key: "2nd", label: "2nd Floor" },
  { key: "3rd", label: "3rd Floor" },
  { key: "4th", label: "4th Floor" },
  { key: "5th", label: "5th Floor" },
];

function getStorePath(store: StoreDirectoryItem): string {
  return getPublicStorePath(store);
}

// ─── Store avatar ────────────────────────────────────────────────────────────
function StoreAvatar({
  name, logoUrl, tier, size = "md",
}: {
  name: string; logoUrl: string | null; tier: SubscriptionTier; size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizeMap = { 
    sm: "w-10 h-10 text-xs", 
    md: "w-16 h-16 text-base", 
    lg: "w-20 h-20 text-xl", 
    xl: "w-28 h-28 text-3xl" 
  };
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const tierMeta = tier ? TIER_META[tier] : null;

  return (
    <div className={cn(
      "relative rounded-[2rem] overflow-hidden p-1 flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-105",
      sizeMap[size],
      tier === "diamond" ? "bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-purple-500/20 shadow-lg shadow-cyan-500/10" : "bg-secondary/30"
    )}>
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt={name} 
          className="w-full h-full object-cover rounded-[1.8rem]" 
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} 
        />
      ) : (
        <div className={cn(
          "w-full h-full flex items-center justify-center font-black rounded-[1.8rem] text-white bg-gradient-to-br",
          tier === "diamond" ? "from-cyan-400 to-blue-600" : 
          tier === "gold" ? "from-amber-400 to-yellow-600" :
          "from-slate-400 to-slate-600"
        )}>
          {initials}
        </div>
      )}
    </div>
  );
}

// ─── Service Tag ──────────────────────────────────────────────────────────────
function ServiceTag({ svc }: { svc: string }) {
  const lower = svc.toLowerCase();
  const isRepair = lower.includes("repair");
  const isExchange = lower.includes("exchange");
  const isSales = lower.includes("sales") || lower.includes("retail");
  
  return (
    <span className={cn(
      "text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border transition-colors",
      isRepair ? "bg-red-500/10 text-red-500 border-red-500/20" :
      isExchange ? "bg-green-500/10 text-green-500 border-green-500/20" :
      isSales ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
      "bg-slate-500/10 text-slate-500 border-slate-500/20"
    )}>
      {svc}
    </span>
  );
}

// ─── Modern Store Card ────────────────────────────────────────────────────────
function ModernStoreCard({ store, isAdmin }: { store: StoreDirectoryItem; isAdmin: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tier = store.subscription_tier || "free";
  const isDiamond = tier === "diamond";
  const isGold = tier === "gold";

  // Prefetch store detail on hover so the page feels instant on click
  const handleMouseEnter = useCallback(() => {
    const identifierValue = (store as any).slug || (store as any).seo_slug || store.id;
    const identifierType = (store as any).slug || (store as any).seo_slug ? "slug" : "id";
    queryClient.prefetchQuery({
      queryKey: ["store-detail", identifierType, identifierValue],
      queryFn: () => storeDirectoryService.getStoreByIdentifier({ type: identifierType, value: identifierValue }),
      staleTime: 10 * 60 * 1000,
    });
  }, [queryClient, store]);

  return (
    <div
      onMouseEnter={handleMouseEnter}
      className={cn(
      "group relative flex flex-col p-6 rounded-[2.5rem] transition-all duration-500 border h-full",
      "hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] hover:-translate-y-1",
      isDiamond ? "bg-white/40 backdrop-blur-xl border-cyan-100 shadow-[0_10px_30px_-15px_rgba(34,211,238,0.1)]" : 
      isGold ? "bg-white/60 border-amber-50" : "bg-white/80 border-slate-100"
    )}>
      {/* Decorative floating shapes for Premium tiers */}
      {isDiamond && (
        <>
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-cyan-400/5 blur-2xl rounded-full pointer-events-none group-hover:bg-cyan-400/10 transition-colors" />
          <div className="absolute top-2 right-6">
            <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" />
          </div>
        </>
      )}

      {/* Header with Avatar & Title */}
      <div className="flex items-start gap-5 mb-6">
        <StoreAvatar name={store.name} logoUrl={store.logo_url} tier={tier} size="md" />
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-2 mb-1.5">
            {store.is_verified && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-bold text-[9px] uppercase tracking-tighter">
                <CheckCircle2 className="h-2.5 w-2.5" /> Verified
              </div>
            )}
            <TierBadge tier={tier} />
          </div>
          <Link to={getStorePath(store)} className="block group/title">
            <h3 className="font-display text-xl font-black text-slate-900 leading-tight group-hover/title:text-primary transition-colors">
              {store.name}
            </h3>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
            <MapPin className="h-3 w-3 text-slate-400" />
            {store.location}
          </div>
        </div>
      </div>

      {/* Description & Services */}
      <div className="flex-1 flex flex-col">
        <p className="text-sm text-slate-600 leading-relaxed font-medium line-clamp-2 mb-5">
          {store.description || "Leading tech provider offering genuine products and certified repair services at Tamrakar Complex."}
        </p>

        {store.services && (
          <div className="flex flex-wrap gap-2 mb-6">
            {store.services.slice(0, 4).map((svc) => (
              <ServiceTag key={svc} svc={svc} />
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions & Gated Info */}
      <div className="pt-5 border-t border-slate-50 mt-auto space-y-4">
        <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
          {user ? (
            <>
              {store.phone && (
                <a href={`tel:${store.phone}`} className="flex items-center gap-2 text-xs font-black text-slate-900 hover:text-primary transition-colors">
                  <div className="w-8 h-8 rounded-2xl bg-slate-50 flex items-center justify-center">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  {store.phone}
                </a>
              )}
              {store.shop_no && (
                <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                  <div className="w-8 h-8 rounded-2xl bg-slate-50 flex items-center justify-center">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  Shop #{store.shop_no}
                </div>
              )}
            </>
          ) : (
            <Link to="/auth?redirect=/stores" className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] font-black text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all group/lock">
              <Lock className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
              LOGIN TO VIEW CONTACT & SHOP NO.
            </Link>
          )}
        </div>

        <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    className="flex-1 rounded-2xl h-12 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50" 
                    asChild
                  >
                    <Link to={getStorePath(store)}>Store Profile</Link>
                  </Button>
                  <Button 
                    className={cn(
                      "flex-1 rounded-2xl h-12 font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20",
                      isDiamond ? "bg-cyan-500 hover:bg-cyan-600" : "bg-primary"
                    )}
                    asChild
                  >
                    <Link to={`/marketplace?store=${store.slug || store.id}`}>Visit Marketplace</Link>
                  </Button>
                </div>
      </div>
    </div>
  );
}

// ─── Tier badge ───────────────────────────────────────────────────────────────
function TierBadge({ tier, name }: { tier: SubscriptionTier; name?: string }) {
  if (!tier) return null;
  const meta = TIER_META[tier];
  const icons: Record<NonNullable<SubscriptionTier>, React.ReactNode> = {
    diamond: <Gem className="h-3 w-3" />,
    gold:    <Star className="h-3 w-3 fill-current" />,
    silver:  <Award className="h-3 w-3" />,
    free:    <Building2 className="h-3 w-3" />,
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold", meta.badge)}>
      {icons[tier]} {name ?? meta.label}
    </span>
  );
}

// ─── Diamond store card (large featured) ─────────────────────────────────────
function DiamondCard({ store, isAdmin }: { store: StoreDirectoryItem; isAdmin: boolean }) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border-2 bg-card transition-all duration-300 group",
      "hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(34,211,238,0.2)]",
      TIER_META.diamond.border,
      TIER_META.diamond.glow,
    )}>
      {/* Animated gradient top bar */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 animate-[shimmer_3s_ease-in-out_infinite] bg-[length:200%_100%]" />

      {/* Background orb */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-cyan-400/8 blur-2xl pointer-events-none" />

      <div className="p-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <StoreAvatar name={store.name} logoUrl={store.logo_url} tier="diamond" size="lg" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TierBadge tier="diamond" />
                {store.is_verified && <CheckCircle2 className="h-4 w-4 text-cyan-400" />}
                {isAdmin && store.subscription_end_date && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    until {new Date(store.subscription_end_date).toLocaleDateString()}
                  </span>
                )}
              </div>
              <h3 className="font-display text-xl font-bold leading-tight">{store.name}</h3>
              {store.shop_no && (
                <p className="text-sm text-muted-foreground font-medium">Shop #{store.shop_no}</p>
              )}
            </div>
          </div>
          <Crown className="h-6 w-6 text-cyan-400/60 shrink-0" />
        </div>

        {/* Location & Address */}
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-400/70" />
            <span className="font-medium text-foreground">{store.location}</span>
          </div>
          {store.address && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground pl-5">
              <Building2 className="h-3 w-3 shrink-0 mt-0.5 opacity-70" />
              <span>{store.address}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {store.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{store.description}</p>
        )}

        {/* Services */}
        {store.services && store.services.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {store.services.slice(0, 5).map((svc) => (
              <span key={svc} className="text-xs px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 font-medium">
                {svc}
              </span>
            ))}
            {store.services.length > 5 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                +{store.services.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Contact row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {store.phone && (
            <a href={`tel:${store.phone}`} className="flex items-center gap-2 text-sm hover:text-cyan-400 transition-colors group/c">
              <div className="w-7 h-7 rounded-lg bg-cyan-400/10 flex items-center justify-center shrink-0 group-hover/c:bg-cyan-400/20">
                <Phone className="h-3.5 w-3.5 text-cyan-400" />
              </div>
              <span className="font-medium">{store.phone}</span>
            </a>
          )}
          {store.email && (
            <a href={`mailto:${store.email}`} className="flex items-center gap-2 text-sm hover:text-cyan-400 transition-colors group/c truncate">
              <div className="w-7 h-7 rounded-lg bg-cyan-400/10 flex items-center justify-center shrink-0 group-hover/c:bg-cyan-400/20">
                <Mail className="h-3.5 w-3.5 text-cyan-400" />
              </div>
              <span className="font-medium truncate">{store.email}</span>
            </a>
          )}
          {store.website && (
            <a href={store.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-cyan-400 transition-colors group/c">
              <div className="w-7 h-7 rounded-lg bg-cyan-400/10 flex items-center justify-center shrink-0 group-hover/c:bg-cyan-400/20">
                <Globe className="h-3.5 w-3.5 text-cyan-400" />
              </div>
              <span className="font-medium">Website</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {store.map_url && (
            <Button variant="outline" size="sm" className="flex-1 border-cyan-400/30 hover:border-cyan-400/60 hover:bg-cyan-400/5 gap-1.5" asChild>
              <a href={store.map_url} target="_blank" rel="noopener noreferrer">
                <MapPin className="h-3.5 w-3.5" /> Map
              </a>
            </Button>
          )}
          <Button size="sm" className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white gap-1.5 shadow-md" asChild>
            <Link to={getStorePath(store)}>
              View Store <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          {isAdmin && (
            <Button size="sm" variant="outline" className="border-border/50 gap-1.5" asChild>
              <Link to={`/stores/${store.id}/manage`}>Manage</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Gold store card ──────────────────────────────────────────────────────────
function GoldCard({ store, isAdmin }: { store: StoreDirectoryItem; isAdmin: boolean }) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border bg-card transition-all duration-300 group",
      "hover:-translate-y-0.5 hover:shadow-[0_4px_24px_rgba(251,191,36,0.15)]",
      TIER_META.gold.border,
    )}>
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-amber-400 to-yellow-500" />
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <StoreAvatar name={store.name} logoUrl={store.logo_url} tier="gold" size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <TierBadge tier="gold" />
              {store.is_verified && <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />}
            </div>
            <h3 className="font-semibold text-base leading-snug truncate">{store.name}</h3>
            {store.shop_no && <p className="text-xs text-muted-foreground">Shop #{store.shop_no}</p>}
          </div>
          {isAdmin && store.subscription_end_date && (
            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
              {new Date(store.subscription_end_date).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="space-y-1 mb-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0 text-amber-400/70" /> {store.location}
          </div>
          {store.address && (
            <div className="flex items-start gap-1 text-[11px] text-muted-foreground pl-4">
              <Building2 className="h-2.5 w-2.5 shrink-0 mt-0.5 opacity-70" />
              <span>{store.address}</span>
            </div>
          )}
        </div>

        {store.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{store.description}</p>
        )}

        {store.services && store.services.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {store.services.slice(0, 4).map((s) => (
              <span key={s} className="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
                {s}
              </span>
            ))}
            {store.services.length > 4 && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">+{store.services.length - 4}</span>}
          </div>
        )}

        <div className="space-y-1.5 mb-3">
          {store.phone && (
            <a href={`tel:${store.phone}`} className="flex items-center gap-2 text-xs hover:text-amber-400 transition-colors">
              <Phone className="h-3 w-3 text-amber-400/70 shrink-0" /> {store.phone}
            </a>
          )}
          {store.email && (
            <a href={`mailto:${store.email}`} className="flex items-center gap-2 text-xs hover:text-amber-400 transition-colors truncate">
              <Mail className="h-3 w-3 text-amber-400/70 shrink-0" /> <span className="truncate">{store.email}</span>
            </a>
          )}
          {store.website && (
            <a href={store.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-amber-400 hover:underline">
              <Globe className="h-3 w-3 shrink-0" /> Website <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 text-xs h-8 border-amber-400/30 hover:border-amber-400/60 hover:bg-amber-400/5" asChild>
            <Link to={getStorePath(store)}>View Details</Link>
          </Button>
          {isAdmin && (
            <Button size="sm" variant="ghost" className="text-xs h-8 px-2" asChild>
              <Link to={`/stores/${store.id}/manage`}>Manage</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Silver store card ────────────────────────────────────────────────────────
function SilverCard({ store, isAdmin }: { store: StoreDirectoryItem; isAdmin: boolean }) {
  const { user } = useAuth();
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border bg-card/80 transition-all duration-200 group",
      "hover:shadow-md hover:border-slate-400/50",
      TIER_META.silver.border,
    )}>
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-slate-300 to-slate-400" />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <StoreAvatar name={store.name} logoUrl={store.logo_url} tier="silver" size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <TierBadge tier="silver" />
              {store.is_verified && <CheckCircle2 className="h-3 w-3 text-slate-400" />}
            </div>
            <h3 className="font-semibold text-sm leading-snug truncate">{store.name}</h3>
            {store.shop_no && <p className="text-[11px] text-muted-foreground">Shop #{store.shop_no}</p>}
          </div>
        </div>

        <div className="space-y-1 mb-2">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0 text-slate-400/70" /> {store.location}
          </div>
          {store.address && (
            <div className="flex items-start gap-1 text-[10px] text-muted-foreground pl-4">
              <Building2 className="h-2.5 w-2.5 shrink-0 mt-0.5 opacity-70" />
              <span className="truncate">{store.address}</span>
            </div>
          )}
        </div>

        {store.services && store.services.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {store.services.slice(0, 3).map((s) => (
              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-400/10 text-slate-400 border border-slate-400/20">
                {s}
              </span>
            ))}
            {store.services.length > 3 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">+{store.services.length - 3}</span>}
          </div>
        )}

        {store.phone && (
          <a href={`tel:${store.phone}`} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors mb-2">
            <Phone className="h-3 w-3 text-slate-400/70 shrink-0" /> {store.phone}
          </a>
        )}

        <div className="flex gap-1.5">
          {user ? (
            <Button size="sm" variant="outline" className="flex-1 text-[11px] h-7 px-2" asChild>
              <Link to={getStorePath(store)}>View Details</Link>
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="flex-1 text-[11px] h-7 px-2 gap-1" asChild>
              <Link to="/auth?redirect=/stores">
                <Lock className="h-3 w-3" /> Login to View
              </Link>
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" variant="ghost" className="text-[11px] h-7 px-2" asChild>
              <Link to={`/stores/${store.id}/manage`}>Manage</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Free / Basic store chip ──────────────────────────────────────────────
function FreeStoreChip({ store, isAdmin }: { store: StoreDirectoryItem; isAdmin: boolean }) {
  if (isAdmin) {
    // Admins see a small card with full details even for free stores
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40 bg-card/50 hover:border-border transition-colors group">
        <StoreAvatar name={store.name} logoUrl={store.logo_url} tier="free" size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{store.name}</span>
            {store.shop_no && <span className="text-xs text-muted-foreground shrink-0">#{store.shop_no}</span>}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">{store.location}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline" className="text-[10px] h-5 px-1.5">Basic</Badge>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity" asChild>
            <Link to={getStorePath(store)}>View</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Public: name + brand logo only as requested
  return (
    <Link to={getStorePath(store)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border/20 bg-muted/20 hover:bg-muted/40 transition-colors group">
      <StoreAvatar name={store.name} logoUrl={store.logo_url} tier="free" size="sm" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{store.name}</span>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
    </Link>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({
  tier, count, icon, description,
}: {
  tier: "diamond" | "gold" | "silver" | "free";
  count: number;
  icon: React.ReactNode;
  description: string;
}) {
  if (tier === "free") {
    return (
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-base">Other Stores <span className="text-muted-foreground font-normal text-sm">({count})</span></h2>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    );
  }

  const meta = TIER_META[tier];
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br text-white shrink-0", meta.color)}>
          {icon}
        </div>
        <div>
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            {meta.label} Stores
            <span className={cn("text-sm font-normal", meta.text)}>({count})</span>
          </h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function StatsBar({ stores }: { stores: StoreDirectoryItem[] }) {
  const diamond = stores.filter((s) => s.subscription_tier === "diamond").length;
  const gold    = stores.filter((s) => s.subscription_tier === "gold").length;
  const silver  = stores.filter((s) => s.subscription_tier === "silver").length;
  const total   = stores.length;

  return (
    <div className="flex flex-wrap items-center gap-6 mt-6 py-4 px-6 rounded-2xl bg-card/50 border backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-black text-cyan-400">{diamond}</span>
        <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Diamond</span>
      </div>
      <div className="w-px h-8 bg-border hidden sm:block" />
      <div className="flex items-center gap-2">
        <span className="text-2xl font-black text-amber-400">{gold}</span>
        <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Gold</span>
      </div>
      <div className="w-px h-8 bg-border hidden sm:block" />
      <div className="flex items-center gap-2">
        <span className="text-2xl font-black text-slate-400">{silver}</span>
        <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Silver</span>
      </div>
      <div className="w-px h-8 bg-border hidden sm:block" />
      <div className="flex items-center gap-2">
        <span className="text-2xl font-black text-primary">{total}</span>
        <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Total</span>
      </div>
      
      <div className="ml-auto flex items-center gap-2 text-[10px] font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border">
        <ShieldCheck className="h-3 w-3 text-blue-500" />
        Admin view — all store details visible
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border-2 border-border/30 p-6 space-y-4">
            <div className="flex gap-4">
              <Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-14 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 flex-1" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function Stores() {
  const [search, setSearch]     = useState("");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("all");
  const [floorFilter, setFloorFilter] = useState("all");
  const [blockFilter, setBlockFilter] = useState("all");

  const { data: storesResponse, isLoading } = useStoreDirectory();
  const stores = storesResponse?.data || [];
  const { user, role } = useAuth();
  const isAdmin = isAdminRole(role);
  const floorOptions = useMemo(() => Array.from(new Set(stores.map((s) => s.floor).filter(Boolean))).sort(), [stores]);
  const blockOptions = useMemo(() => Array.from(new Set(stores.map((s) => s.block).filter(Boolean))).sort(), [stores]);

  // ── Filter & search ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = stores;

    // Tier filter
    if (tierFilter === "diamond") list = list.filter((s) => s.subscription_tier === "diamond");
    else if (tierFilter === "gold") list = list.filter((s) => s.subscription_tier === "gold");
    else if (tierFilter === "silver") list = list.filter((s) => s.subscription_tier === "silver");
    else if (tierFilter === "free") list = list.filter((s) => s.subscription_tier === "free" || !s.has_active_subscription);

    if (serviceFilter !== "all") {
      list = list.filter((s) => s.services?.some((sv) => sv.toLowerCase().includes(serviceFilter)));
    }
    if (floorFilter !== "all") list = list.filter((s) => s.floor === floorFilter);
    if (blockFilter !== "all") list = list.filter((s) => s.block === blockFilter);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q) ||
        s.shop_no?.toLowerCase().includes(q) ||
        s.services?.some((sv) => sv.toLowerCase().includes(q)) ||
        s.description?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [stores, tierFilter, serviceFilter, floorFilter, blockFilter, search]);

  // ── Group by tier ────────────────────────────────────────────────────────────
  const diamondStores = filtered.filter((s) => s.subscription_tier === "diamond");
  const goldStores    = filtered.filter((s) => s.subscription_tier === "gold");
  const silverStores  = filtered.filter((s) => s.subscription_tier === "silver");
  const freeStores    = filtered.filter((s) => s.subscription_tier === "free" || !s.has_active_subscription);

  // ── Structured data ─────────────────────────────────────────────────────────
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://tamrakarcomplex.com/" },
      { "@type": "ListItem", position: 2, name: "Store Directory", item: "https://tamrakarcomplex.com/stores" },
    ],
  };

  const localBusinessList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Tamrakar Complex Store Directory",
    numberOfItems: stores.filter((s) => s.has_active_subscription).length,
    itemListElement: stores
      .filter((s) => s.has_active_subscription)
      .slice(0, 20)
      .map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "LocalBusiness",
          name: s.name,
          address: { "@type": "PostalAddress", streetAddress: s.location, addressLocality: "Kathmandu", addressCountry: "NP" },
          telephone: s.phone ?? undefined,
          url: s.website ?? `https://tamrakarcomplex.com${getStorePath(s)}`,
        },
      })),
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEO
        title="Store Directory — Tamrakar Complex, Kathmandu"
        description="Browse all electronics stores, repair centers, and official distributors at Tamrakar Complex, Kathmandu. Diamond, Gold, and Silver tier listings with full contact details."
        url="/stores"
        keywords={["store directory Nepal", "Tamrakar Complex stores", "mobile stores Kathmandu", "electronics shops Nepal", "repair center Kathmandu"]}
        structuredData={[breadcrumbSchema, localBusinessList]}
      />
      <Header />

      <main className="flex-1">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-background to-secondary/15 border-b">
          {/* Decorative orbs */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-cyan-400/6 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-amber-400/6 blur-3xl pointer-events-none" />

          <div className="container py-10 relative">
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5">
              <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">Store Directory</span>
            </nav>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-3">
                  <Sparkles className="h-3 w-3" /> Tamrakar Complex, Kathmandu
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2">
                  Store Directory
                </h1>
                <p className="text-muted-foreground text-base max-w-xl">
                  Discover verified stores, repair centers, and official distributors — from Diamond flagship showrooms to neighbourhood specialists.
                </p>

                {!isLoading && <StatsBar stores={stores} />}
              </div>

              {/* Search */}
              <div className="w-full md:w-72 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search stores, services…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-11 rounded-xl"
                  />
                </div>
                {isAdmin && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Crown className="h-3 w-3 text-cyan-400" />
                    <span>Admin view — all store details visible</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tier filter tabs */}
            <div className="flex flex-wrap gap-2 mt-6">
              {TIER_TABS.map((tab) => {
                const count = tab.key === "all" ? stores.length
                  : tab.key === "diamond" ? stores.filter((s) => s.subscription_tier === "diamond").length
                  : tab.key === "gold"    ? stores.filter((s) => s.subscription_tier === "gold").length
                  : tab.key === "silver"  ? stores.filter((s) => s.subscription_tier === "silver").length
                  : stores.filter((s) => !s.has_active_subscription).length;

                const isActive = tierFilter === tab.key;
                const tierColors: Record<TierFilter, string> = {
                  all:     "bg-primary text-primary-foreground border-primary",
                  diamond: "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400",
                  gold:    "bg-gradient-to-r from-amber-400 to-yellow-500 text-black border-amber-400",
                  silver:  "bg-gradient-to-r from-slate-300 to-slate-400 text-black border-slate-400",
                  free:    "bg-muted text-foreground border-muted-foreground/30",
                };

                return (
                  <button
                    key={tab.key}
                    onClick={() => setTierFilter(tab.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all",
                      isActive
                        ? tierColors[tab.key]
                        : "bg-background border-border hover:border-primary/40 hover:bg-muted"
                    )}
                  >
                    {tab.icon} {tab.label}
                    <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-bold", isActive ? "bg-white/20" : "bg-muted text-muted-foreground")}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {SERVICE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setServiceFilter(tab.key)}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    serviceFilter === tab.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted",
                  )}
                >
                  {tab.label}
                </button>
              ))}
              {floorOptions.map((floor) => (
                <button
                  key={`floor-${floor}`}
                  onClick={() => setFloorFilter(floorFilter === floor ? "all" : String(floor))}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    floorFilter === floor ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted",
                  )}
                >
                  Floor {floor}
                </button>
              ))}
              {blockOptions.map((block) => (
                <button
                  key={`block-${block}`}
                  onClick={() => setBlockFilter(blockFilter === block ? "all" : String(block))}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    blockFilter === block ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted",
                  )}
                >
                  Block {block}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <div className="container py-10 space-y-14">
          {isLoading ? (
            <LoadingSkeleton />
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 border rounded-2xl bg-card/50 border-dashed">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No stores found</h3>
              <p className="text-muted-foreground text-sm mb-4">Try adjusting your search or filter.</p>
              <Button onClick={() => { setSearch(""); setTierFilter("all"); setServiceFilter("all"); setFloorFilter("all"); setBlockFilter("all"); }}>Clear Filters</Button>
            </div>
          ) : (
            <>
              {/* ── Diamond section ──────────────────────────────────── */}
              {diamondStores.length > 0 && (
                <section>
                  <SectionHeader
                    tier="diamond"
                    count={diamondStores.length}
                    icon={<Gem className="h-5 w-5" />}
                    description="Premium flagship stores with full service visibility and priority placement"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {diamondStores.map((s) => (
                      <ModernStoreCard key={s.id} store={s} isAdmin={isAdmin} />
                    ))}
                  </div>
                </section>
              )}

              {/* ── Gold section ─────────────────────────────────────── */}
              {goldStores.length > 0 && (
                <section>
                  <SectionHeader
                    tier="gold"
                    count={goldStores.length}
                    icon={<Star className="h-5 w-5 fill-current" />}
                    description="Verified stores with full contact details, services, and dedicated profiles"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {goldStores.map((s) => (
                      <ModernStoreCard key={s.id} store={s} isAdmin={isAdmin} />
                    ))}
                  </div>
                </section>
              )}

              {/* ── Silver section ────────────────────────────────────── */}
              {silverStores.length > 0 && (
                <section>
                  <SectionHeader
                    tier="silver"
                    count={silverStores.length}
                    icon={<Award className="h-5 w-5" />}
                    description="Listed stores with basic contact details and service information"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {silverStores.map((s) => (
                      <ModernStoreCard key={s.id} store={s} isAdmin={isAdmin} />
                    ))}
                  </div>
                </section>
              )}

              {/* ── Free / unsubscribed section ───────────────────────── */}
              {freeStores.length > 0 && (
                <section>
                  <SectionHeader
                    tier="free"
                    count={freeStores.length}
                    icon={<Building2 className="h-5 w-5" />}
                    description={isAdmin
                      ? "Stores without active subscription — contact details visible to admins only"
                      : "These stores haven't listed their full details yet"}
                  />

                  {/* Admin sees a grid of small cards; public sees name chips */}
                  {isAdmin ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                      {freeStores.map((s) => (
                        <FreeStoreChip key={s.id} store={s} isAdmin={isAdmin} />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {freeStores.map((s) => (
                          <FreeStoreChip key={s.id} store={s} isAdmin={false} />
                        ))}
                      </div>
                      {/* Upgrade CTA */}
                      <div className="mt-6 p-5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-sm">Are you one of these store owners?</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Subscribe to a Silver, Gold, or Diamond plan to unlock your full listing — phone, email, website, services, and a dedicated profile page.
                          </p>
                        </div>
                        <Button className="shrink-0 gap-2 hero-gradient" asChild>
                          <Link to="/stores/apply">Get Listed <ArrowRight className="h-4 w-4" /></Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {/* ── Subscription plans callout (for non-admin visitors) ─── */}
          {!isAdmin && !isLoading && (
            <section className="relative overflow-hidden rounded-2xl bg-foreground text-background p-8 md:p-10">
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TierBadge tier="diamond" /> <TierBadge tier="gold" /> <TierBadge tier="silver" />
                  </div>
                  <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">List your store at Tamrakar Complex</h2>
                  <p className="text-background/70 text-sm max-w-lg">
                    Get discovered by thousands of buyers. Silver, Gold, and Diamond plans include full profile listing, phone, email, website, services, priority placement, and a dedicated store page.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-4">
                    {[
                      { tier: "Silver", price: "Rs. 1,000/mo" },
                      { tier: "Gold",   price: "Rs. 2,500/mo" },
                      { tier: "Diamond", price: "Rs. 5,000/mo" },
                    ].map(({ tier, price }) => (
                      <div key={tier} className="px-3 py-1.5 rounded-lg bg-background/10 border border-background/20 text-sm">
                        <span className="font-bold">{tier}</span> — {price}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button size="lg" className="bg-white text-black hover:bg-white/90 gap-2" asChild>
                    <Link to="/contact-us">Get Listed <ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                  <Button size="sm" variant="ghost" className="text-background/70 hover:text-background hover:bg-background/10" asChild>
                    <Link to="/services">Learn more</Link>
                  </Button>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
