import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHomeOffers } from "@/hooks/useHomeOffers";
import { Skeleton } from "@/components/ui/skeleton";

const FALLBACK_OFFERS = [
  {
    id: "f1",
    title: "iPhone 16 Launch Offer",
    subtitle: "Get free accessories worth Rs. 5000",
    discount_text: "FREE GIFT",
    image_url: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=800",
    target_url: "/buy?brand=Apple",
    active: true
  },
  {
    id: "f2",
    title: "Exchange Bonanza",
    subtitle: "Extra Rs. 3000 valuation on top brands",
    discount_text: "EXTRA Rs. 3k",
    image_url: "https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&q=80&w=800",
    target_url: "/exchange-your-phone",
    active: true
  }
];

export const HomeOffers = () => {
  const navigate = useNavigate();
  const { data: dbOffers, isLoading } = useHomeOffers();
  
  const offers = (dbOffers && dbOffers.length > 0) ? dbOffers : FALLBACK_OFFERS;

  if (isLoading) {
    return (
      <section className="py-20">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="h-[300px] rounded-[2.5rem]" />
          <Skeleton className="h-[300px] rounded-[2.5rem]" />
        </div>
      </section>
    );
  }

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-12">
          <div className="space-y-2">
            <h2 className="text-3xl font-black flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              Hot Deals & Offers
            </h2>
            <p className="text-muted-foreground">Limited time promotions from our top stores.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {offers.map((offer) => (
            <div 
              key={offer.id}
              className="group relative h-[350px] rounded-[3rem] overflow-hidden cursor-pointer shadow-xl"
              onClick={() => navigate(offer.target_url || "#")}
            >
              <img 
                src={offer.image_url} 
                alt={offer.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              
              <div className="absolute top-6 right-6">
                <div className="bg-primary text-primary-foreground px-4 py-2 rounded-2xl font-black text-sm shadow-lg">
                  {offer.discount_text}
                </div>
              </div>

              <div className="absolute bottom-10 left-10 right-10 space-y-4">
                <div className="flex items-center gap-2 text-primary-foreground/70 text-sm font-bold uppercase tracking-widest">
                  <Timer className="h-4 w-4" />
                  Limited Time
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl font-black text-white leading-tight">{offer.title}</h3>
                  <p className="text-white/80 text-lg line-clamp-1">{offer.subtitle}</p>
                </div>
                <Button 
                  className="rounded-xl h-12 px-8 font-black group-hover:bg-primary/90 transition-colors"
                >
                  Claim Offer
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
