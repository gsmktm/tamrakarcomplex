import { useNavigate } from "react-router-dom";
import { ShoppingBag, MapPin, BadgeCheck, ArrowRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketplacePreview } from "@/hooks/useMarketplacePreview";

export const HomeMarketplaceFeed = () => {
  const navigate = useNavigate();
  const { data: listings, isLoading } = useMarketplacePreview(4);

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-600 font-bold text-xs uppercase tracking-wider">
              <Tag className="h-3 w-3" />
              Direct from Owners
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight">Marketplace Live Feed</h2>
            <p className="text-muted-foreground text-lg max-w-2xl">Latest used phone listings from verified sellers across Nepal. Buy directly and save money.</p>
          </div>
          <Button 
            variant="outline" 
            className="rounded-xl h-12 px-6"
            onClick={() => navigate("/marketplace")}
          >
            View All Marketplace
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="space-y-4 border rounded-3xl p-4">
                <Skeleton className="aspect-square rounded-2xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))
          ) : listings && listings.length > 0 ? (
            listings.map((item) => (
              <div 
                key={item.id} 
                className="group relative bg-background border rounded-[2rem] p-4 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <div 
                  className="relative aspect-square rounded-2xl overflow-hidden bg-muted mb-4 cursor-pointer"
                  onClick={() => navigate(`/marketplace/listing/${item.id}`)}
                >
                  <img 
                    src={item.image_url || "/placeholder.svg"} 
                    alt={item.title}
                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                  />
                  {item.is_verified && (
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-blue-600 hover:bg-blue-700 border-none px-2 py-1 gap-1 shadow-lg">
                        <BadgeCheck className="h-3 w-3" />
                        Verified
                      </Badge>
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3">
                    <div className="bg-background/90 backdrop-blur-md px-3 py-1 rounded-full font-bold text-sm shadow-sm">
                      {item.condition}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 
                    className="font-bold text-lg line-clamp-1 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate(`/marketplace/listing/${item.id}`)}
                  >
                    {item.title}
                  </h3>
                  
                  <div className="flex items-center text-muted-foreground text-sm gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{item.location}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xl font-black text-primary">Rs. {item.price.toLocaleString()}</p>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="rounded-lg h-8 text-xs font-bold"
                      onClick={() => navigate(`/marketplace/listing/${item.id}`)}
                    >
                      View Detail
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[3rem] bg-muted/30">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl font-bold text-muted-foreground">No active listings right now</p>
              <Button 
                variant="link" 
                onClick={() => navigate("/marketplace/sell")}
                className="mt-2"
              >
                Be the first to list a phone →
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
