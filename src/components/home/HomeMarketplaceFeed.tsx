import { useNavigate } from "react-router-dom";
import { ShoppingBag, MapPin, BadgeCheck, ArrowRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketplacePreview } from "@/hooks/useMarketplacePreview";
import { Reveal } from "@/components/home/Reveal";

export const HomeMarketplaceFeed = () => {
  const navigate = useNavigate();
  const { data: listings, isLoading } = useMarketplacePreview(4);

  return (
    <section className="py-24 border-b border-border">
      <div className="container mx-auto px-4 max-w-6xl">

        {/* Header */}
        <Reveal className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-border bg-background text-foreground/60 font-bold text-[10px] uppercase tracking-widest">
                <Tag className="h-3 w-3" />
                Direct from Owners
              </div>
              <h2 className="font-syne font-black text-4xl md:text-5xl tracking-tight leading-none">
                Marketplace Feed
              </h2>
              <p className="text-muted-foreground max-w-xl">
                Latest used phone listings from verified sellers across Nepal. Buy directly and save money.
              </p>
            </div>
            <Button
              variant="outline"
              className="shrink-0 h-11 px-6 rounded-sm font-bold text-sm gap-2 pressable"
              onClick={() => navigate("/marketplace")}
            >
              View All Listings
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Reveal>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-background p-4 space-y-3">
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))
          ) : listings && listings.length > 0 ? (
            listings.map((item, i) => (
              <Reveal key={item.id} delay={(i as 0 | 1 | 2 | 3 | 4 | 5)} className="bg-background group flex flex-col">
                {/* Image */}
                <div
                  className="relative aspect-square overflow-hidden bg-muted cursor-pointer"
                  onClick={() => navigate(`/marketplace/listing/${item.id}`)}
                >
                  <img
                    src={item.image_url || "/placeholder.svg"}
                    alt={item.title}
                    loading="lazy"
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
                  />
                  {item.is_verified && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-accent text-accent-foreground border-none text-[10px] rounded-sm px-2 py-0.5 gap-1 font-bold uppercase">
                        <BadgeCheck className="h-3 w-3" />
                        Verified
                      </Badge>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2">
                    <div className="bg-background/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border border-border/50">
                      {item.condition}
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <h3
                    className="font-bold text-sm line-clamp-1 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate(`/marketplace/listing/${item.id}`)}
                  >
                    {item.title}
                  </h3>

                  <div className="flex items-center text-muted-foreground text-xs gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{item.location}</span>
                  </div>

                  <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                    <p className="font-syne font-black text-lg text-primary leading-none">
                      Rs. {item.price.toLocaleString()}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-3 rounded-sm text-xs font-bold pressable"
                      onClick={() => navigate(`/marketplace/listing/${item.id}`)}
                    >
                      Details
                    </Button>
                  </div>
                </div>
              </Reveal>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-background">
              <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-bold text-muted-foreground">No active listings right now</p>
              <Button
                variant="link"
                onClick={() => navigate("/marketplace/sell")}
                className="mt-1 text-primary text-sm"
              >
                Be the first to list a phone
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
