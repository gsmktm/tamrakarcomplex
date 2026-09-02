import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

type HomeBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  button_text: string | null;
};

const fallbackBanners: HomeBanner[] = [
  {
    id: "fallback-hero",
    title: "Latest phones, repairs and verified stores",
    subtitle: "Shop new arrivals, compare prices, request repair support and connect with Tamrakar stores.",
    image_url: "/og-image.png",
    link_url: "/products",
    button_text: "Shop Now",
  },
];

export function BannerSlider() {
  const [current, setCurrent] = useState(0);

  const { data: banners = fallbackBanners, isLoading } = useQuery({
    queryKey: ["active-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_banners")
        .select("*")
        .eq("is_active", true)
        .eq("placement", "home_hero")
        .order("sort_order", { ascending: true });
      if (error) {
        console.warn("Marketing banners unavailable, using fallback banner:", error.message);
        return fallbackBanners;
      }
      return (data?.length ? data : fallbackBanners) as HomeBanner[];
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners]);

  if (isLoading) return <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!banners?.length) return null;

  return (
    <div className="relative group overflow-hidden rounded-[2.5rem] bg-slate-900 aspect-[21/9] md:aspect-[25/9] shadow-2xl">
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={cn(
            "absolute inset-0 transition-all duration-1000 ease-in-out transform",
            index === current ? "opacity-100 scale-100 translate-x-0" : "opacity-0 scale-110 translate-x-full"
          )}
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            <img 
              src={banner.image_url} 
              alt={banner.title} 
              className="h-full w-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative h-full container flex flex-col justify-center px-8 md:px-16 space-y-4 md:space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-display font-black text-white leading-tight max-w-2xl animate-in slide-in-from-left-8 duration-700">
                {banner.title}
              </h2>
              <p className="text-white/80 text-sm md:text-xl max-w-xl line-clamp-2 animate-in slide-in-from-left-12 duration-1000">
                {banner.subtitle}
              </p>
            </div>
            
            <div className="flex gap-4 animate-in slide-in-from-left-16 duration-1000">
              <Button size="lg" className="hero-gradient rounded-xl px-8 font-bold gap-2" asChild>
                <Link to={banner.link_url || "/buy"}>
                {banner.button_text || "Explore"} <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={cn(
              "h-1.5 transition-all duration-500 rounded-full",
              i === current ? "w-8 bg-primary" : "w-2 bg-card/30 hover:bg-card/50"
            )}
          />
        ))}
      </div>

      {/* Arrow Controls */}
      <button 
        onClick={() => setCurrent((prev) => (prev - 1 + banners.length) % banners.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button 
        onClick={() => setCurrent((prev) => (prev + 1) % banners.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </div>
  );
}
