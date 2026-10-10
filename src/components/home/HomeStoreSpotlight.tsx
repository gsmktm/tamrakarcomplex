import { useNavigate } from "react-router-dom";
import { Store, MapPin, BadgeCheck, MessageCircle, ShoppingBag, Phone, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useStorePreview } from "@/hooks/useStorePreview";
import { useAuth } from "@/hooks/useAuth";
import { getPublicStorePath } from "@/lib/storeRoutes";
import { Reveal, Stagger } from "@/components/home/Reveal";
import { cn } from "@/lib/utils";

export const HomeStoreSpotlight = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: stores, isLoading } = useStorePreview(4);

  return (
    <section className="py-16 lg:py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-section pointer-events-none" />
      <div className="container relative">

        <Reveal className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="space-y-3 max-w-xl">
            <p className="text-caption text-primary">Verified Network</p>
            <h2 className="text-display-lg">Trusted stores, verified for you.</h2>
            <p className="text-body-lg">
              Shop with confidence at Nepal's most trusted mobile retailers — all under one roof at Tamrakar Complex.
            </p>
          </div>
          <Button variant="outline" className="shrink-0 h-11 px-6 font-bold text-sm gap-2" onClick={() => navigate("/stores")}>
            View All Stores <ArrowRight className="h-4 w-4" />
          </Button>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)
          ) : (
            <Stagger staggerMs={80}>
              {stores?.map((store) => (
                <div key={store.id} className="card-premium group flex flex-col h-full">
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl border border-border overflow-hidden bg-muted shrink-0">
                        <img src={store.logo_url || "/placeholder.svg"} alt={store.name} loading="lazy" className="w-full h-full object-cover" />
                      </div>
                      {store.is_verified && (
                        <span className="badge-soft text-[10px] gap-1">
                          <BadgeCheck className="h-3 w-3" /> Verified
                        </span>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <h3 className="font-display font-bold text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                        {store.name}
                      </h3>
                      <div className="flex items-center text-muted-foreground text-xs gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{store.location}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {store.services?.slice(0, 2).map((s) => (
                          <span key={s} className="badge-soft text-[9px]">{s}</span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50 flex gap-2">
                      <Button className="flex-1 h-9 text-xs font-bold gap-1.5" onClick={() => navigate(getPublicStorePath(store))}>
                        Visit <ArrowRight className="h-3 w-3" />
                      </Button>
                      {store.phone && (
                        <Button variant="outline" className="w-9 h-9 p-0 shrink-0" onClick={() => window.open(`https://wa.me/${store.phone.replace(/\D/g, '')}`, '_blank')} aria-label="WhatsApp">
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="h-0.5 w-0 bg-primary group-hover:w-full transition-[width] duration-500" />
                </div>
              ))}
            </Stagger>
          )}
        </div>

        <Reveal delay={400} className="mt-10">
          <div className="bg-gradient-cta rounded-2xl p-8 md:p-10 relative overflow-hidden text-white">
            <div className="absolute inset-0 opacity-[0.07]" style={{
              backgroundImage: "repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)",
              backgroundSize: "16px 16px"
            }} />
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <h3 className="font-display font-black text-2xl md:text-3xl">Own a mobile shop?</h3>
                <p className="text-white/70 max-w-md text-sm">
                  Join Nepal's largest mobile network. Get a digital storefront, manage inventory, and reach thousands of customers.
                </p>
              </div>
              <Button size="lg" className="shrink-0 h-11 px-7 bg-white text-foreground hover:bg-white/90 font-bold gap-2 shadow-lg" onClick={() => navigate("/stores/apply")}>
                <Sparkles className="h-4 w-4" /> Join Tamrakar
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
