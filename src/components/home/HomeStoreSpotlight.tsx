import { useNavigate } from "react-router-dom";
import { Store, MapPin, BadgeCheck, MessageCircle, ShoppingBag, Phone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useStorePreview } from "@/hooks/useStorePreview";
import { useAuth } from "@/hooks/useAuth";
import { getPublicStorePath } from "@/lib/storeRoutes";

export const HomeStoreSpotlight = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: stores, isLoading } = useStorePreview(4);

  return (
    <section className="py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider">
            <Store className="h-3 w-3" />
            Verified Network
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">Store Spotlight</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Discover trusted mobile shops and service centers at Tamrakar Complex. 
            Official brand partners and certified retailers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="space-y-4 bg-background p-6 rounded-[2rem] border">
                <Skeleton className="h-20 w-20 rounded-2xl" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))
          ) : stores && stores.length > 0 ? (
            stores.map((store) => (
              <div key={store.id} className="group bg-background p-8 rounded-[2.5rem] border hover:shadow-2xl transition-all duration-500 relative flex flex-col">
                <div className="mb-6 flex justify-between items-start">
                  <div className="h-20 w-20 rounded-2xl bg-muted overflow-hidden border-2 border-muted group-hover:border-primary/20 transition-colors">
                    <img 
                      src={store.logo_url || "/placeholder.svg"} 
                      alt={store.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {store.is_verified && (
                    <Badge className="bg-blue-500 hover:bg-blue-600 border-none px-2 py-1 gap-1">
                      <BadgeCheck className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>

                <div className="space-y-4 flex-1">
                  <div>
                    <h3 className="text-xl font-black line-clamp-1 group-hover:text-primary transition-colors">
                      {store.name}
                    </h3>
                    <div className="flex items-center text-muted-foreground text-sm gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      <span>{store.location}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {store.services?.slice(0, 3).map((s) => (
                      <span key={s} className="text-[10px] font-bold uppercase tracking-wider bg-muted px-2 py-1 rounded-md text-muted-foreground">
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="pt-4 space-y-3">
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 rounded-xl h-11 font-bold text-xs"
                        onClick={() => navigate(getPublicStorePath(store))}
                      >
                        View Store
                      </Button>
                      {store.phone && (
                        <Button 
                          variant="outline" 
                          className="w-11 h-11 rounded-xl p-0 border-primary/20 hover:bg-primary/5 text-primary"
                          onClick={() => window.open(`https://wa.me/${store.phone.replace(/\D/g, '')}`, '_blank')}
                        >
                          <MessageCircle className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                    
                    <Button 
                      variant="secondary" 
                      className="w-full rounded-xl h-11 font-bold text-xs gap-2"
                      onClick={() => navigate(`/marketplace?store=${store.id}`)}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Browse Products
                    </Button>
                  </div>

                  {user ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-primary pt-2">
                      <Phone className="h-3 w-3" />
                      {store.phone}
                    </div>
                  ) : (
                    <div className="text-[10px] font-medium text-muted-foreground pt-2 italic">
                      Login to view contact number
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : null}
        </div>

        <div className="mt-20 bg-primary rounded-[3rem] p-8 md:p-12 text-primary-foreground relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-left">
              <h3 className="text-3xl md:text-4xl font-black">Own a mobile shop?</h3>
              <p className="text-primary-foreground/80 text-lg max-w-xl">
                Join Nepal's largest mobile network. Get a digital storefront, manage inventory, 
                and reach thousands of customers daily.
              </p>
            </div>
            <Button 
              size="lg" 
              variant="secondary" 
              className="h-16 px-10 rounded-2xl text-lg font-black group"
              onClick={() => navigate("/stores/apply")}
            >
              Join Tamrakar Complex
              <ExternalLink className="h-5 w-5 ml-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
