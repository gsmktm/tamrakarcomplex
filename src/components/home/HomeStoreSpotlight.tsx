import { useNavigate } from "react-router-dom";
import { Store, MapPin, BadgeCheck, MessageCircle, ShoppingBag, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useStorePreview } from "@/hooks/useStorePreview";
import { useAuth } from "@/hooks/useAuth";
import { getPublicStorePath } from "@/lib/storeRoutes";
import { Reveal } from "@/components/home/Reveal";

export const HomeStoreSpotlight = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: stores, isLoading } = useStorePreview(4);

  return (
    <section className="py-24 bg-muted/30 border-y border-border">
      <div className="container mx-auto px-4 max-w-6xl">

        {/* Section header */}
        <Reveal className="mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-border bg-background text-foreground/60 font-bold text-[10px] uppercase tracking-widest">
                <Store className="h-3 w-3" />
                Verified Network
              </div>
              <h2 className="font-syne font-black text-4xl md:text-5xl tracking-tight leading-none">
                Store Spotlight
              </h2>
              <p className="text-muted-foreground max-w-xl">
                Trusted mobile shops and service centers at Tamrakar Complex. Official brand partners and certified retailers.
              </p>
            </div>
            <Button
              variant="outline"
              className="shrink-0 h-11 px-6 rounded-sm font-bold text-sm gap-2 pressable"
              onClick={() => navigate("/stores")}
            >
              All Stores
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Reveal>

        {/* Store cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-background p-6 space-y-4">
                <Skeleton className="h-16 w-16" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))
          ) : stores && stores.length > 0 ? (
            stores.map((store, i) => (
              <Reveal key={store.id} delay={(i as 0 | 1 | 2 | 3 | 4 | 5)} className="bg-background group flex flex-col">
                <div className="p-6 flex-1 flex flex-col">
                  {/* Logo + verified */}
                  <div className="mb-4 flex items-start justify-between">
                    <div className="h-14 w-14 border border-border overflow-hidden bg-muted shrink-0">
                      <img
                        src={store.logo_url || "/placeholder.svg"}
                        alt={store.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {store.is_verified && (
                      <Badge className="bg-accent text-accent-foreground border-none text-[10px] px-2 py-0.5 gap-1 rounded-sm font-bold uppercase">
                        <BadgeCheck className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-bold text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors duration-200">
                        {store.name}
                      </h3>
                      <div className="flex items-center text-muted-foreground text-xs gap-1 mt-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{store.location}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {store.services?.slice(0, 3).map((s) => (
                        <span key={s} className="text-[10px] font-bold uppercase tracking-wide bg-secondary px-2 py-0.5 text-secondary-foreground">
                          {s}
                        </span>
                      ))}
                    </div>

                    {user && store.phone && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                        <Phone className="h-3 w-3" />
                        {store.phone}
                      </div>
                    )}
                    {!user && (
                      <div className="text-[10px] text-muted-foreground italic">
                        Sign in to view contact number
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t border-border space-y-2">
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 h-9 rounded-sm text-xs font-bold pressable"
                        onClick={() => navigate(getPublicStorePath(store))}
                      >
                        View Store
                      </Button>
                      {store.phone && (
                        <Button
                          variant="outline"
                          className="w-9 h-9 rounded-sm p-0 pressable"
                          onClick={() => window.open(`https://wa.me/${store.phone.replace(/\D/g, '')}`, '_blank')}
                          aria-label="WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full h-9 rounded-sm text-xs font-bold gap-1.5 pressable"
                      onClick={() => navigate(`/marketplace?store=${store.id}`)}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Browse Products
                    </Button>
                  </div>
                </div>

                {/* Bottom accent */}
                <div className="h-0.5 w-0 bg-primary group-hover:w-full transition-[width] duration-500" style={{ transitionTimingFunction: "var(--ease-out-expo)" }} />
              </Reveal>
            ))
          ) : null}
        </div>

        {/* CTA banner */}
        <Reveal delay={2} className="mt-16">
          <div className="border border-border bg-foreground text-background p-8 md:p-10 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: "repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)",
              backgroundSize: "20px 20px"
            }} />
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-2 text-center md:text-left">
                <h3 className="font-syne font-black text-2xl md:text-3xl">Own a mobile shop?</h3>
                <p className="text-background/70 max-w-md text-sm">
                  Join Nepal's largest mobile network. Get a digital storefront, manage inventory, and reach thousands of customers.
                </p>
              </div>
              <Button
                size="lg"
                variant="outline"
                className="shrink-0 h-12 px-8 rounded-sm text-sm font-black bg-transparent border-background/40 text-background hover:bg-background hover:text-foreground gap-2 pressable"
                onClick={() => navigate("/stores/apply")}
              >
                Join Tamrakar Complex
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
