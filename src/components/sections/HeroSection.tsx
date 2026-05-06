import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock, User, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeaturedArticles, useArticles } from "@/hooks/useArticles";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

const categoryColorMap: Record<string, string> = {
  mobile: "category-mobile",
  laptop: "category-laptop",
  tablet: "category-tablet",
  audio: "category-audio",
  watch: "category-watch",
  gaming: "category-gaming",
  news: "category-mobile",
  review: "category-laptop",
  comparison: "category-tablet",
  guide: "category-audio",
  price: "category-watch",
};

interface HeroSectionProps {
    settings?: {
        autoplay?: boolean;
        interval?: number;
        showTrending?: boolean;
    };
}

export function HeroSection({ settings = {} }: HeroSectionProps) {
  const { autoplay = true, interval: slideInterval = 5000, showTrending = true } = settings;
  const [currentSlide, setCurrentSlide] = useState(0);
  const { data: featuredArticles, isLoading: featuredLoading } = useFeaturedArticles();
  const { data: trendingArticles, isLoading: trendingLoading } = useArticles(5);

  useEffect(() => {
    if (!featuredArticles || featuredArticles.length === 0 || !autoplay) return;
    
    const intervalId = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredArticles.length);
    }, slideInterval);
    return () => clearInterval(intervalId);
  }, [featuredArticles, autoplay, slideInterval]);

  const nextSlide = () => {
    if (featuredArticles) {
      setCurrentSlide((prev) => (prev + 1) % featuredArticles.length);
    }
  };

  const prevSlide = () => {
    if (featuredArticles) {
      setCurrentSlide((prev) => (prev - 1 + featuredArticles.length) % featuredArticles.length);
    }
  };

  if (featuredLoading) {
    return (
      <section className="py-6 lg:py-10">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="aspect-[16/10] rounded-xl" />
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6 lg:py-10">
      <div className="container">
        <div className={`grid grid-cols-1 ${showTrending ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-6`}>
          {/* Main Featured Slider */}
          <div className={`${showTrending ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
            <div className="relative rounded-3xl overflow-hidden group border border-border/60 bg-card shadow-elevated">
              {featuredArticles && featuredArticles.length > 0 && (
                <>
                  <Link to={`/article/${featuredArticles[currentSlide].slug}`}>
                    <div className="relative aspect-[16/10]">
                      <img
                        src={featuredArticles[currentSlide].image || "/placeholder.svg"}
                        alt={featuredArticles[currentSlide].title}
                        className="w-full h-full object-cover transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent" />
                      
                      <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
                        <div className="flex items-center gap-3 mb-4">
                          <span
                            className={`category-badge ${categoryColorMap[featuredArticles[currentSlide].category] || "category-mobile"}`}
                          >
                          {featuredArticles[currentSlide].category_label || featuredArticles[currentSlide].category}
                          </span>
                          <span className="text-xs text-white/70">
                            {featuredArticles[currentSlide].read_time || "5 min read"}
                          </span>
                        </div>
                        
                        <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight">
                          {featuredArticles[currentSlide].title}
                        </h2>
                        
                        <p className="text-white/80 mb-4 line-clamp-2 max-w-2xl">
                          {featuredArticles[currentSlide].excerpt}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-white/70">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {featuredArticles[currentSlide].author}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDistanceToNow(new Date(featuredArticles[currentSlide].created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Navigation Arrows */}
                  <button
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/25 border border-white/15"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/25 border border-white/15"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Dots */}
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    {featuredArticles.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentSlide ? "bg-accent w-7" : "bg-white/50 hover:bg-white/70"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Trending Sidebar */}
          {showTrending && (
              <div className="lg:col-span-4 space-y-4">
                <div className="rounded-3xl border border-border/60 bg-card shadow-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-accent" />
                    <h3 className="font-display text-lg font-bold">Trending</h3>
                  </div>
                
                  {trendingLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16" />
                      ))}
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {trendingArticles?.slice(0, 5).map((article, index) => (
                        <Link
                          key={article.id}
                          to={`/article/${article.slug}`}
                          className="flex gap-3 group py-3 first:pt-1 last:pb-1"
                        >
                          <span className="font-display text-base font-bold text-muted-foreground/40 w-8 shrink-0 pt-0.5">
                            #{index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                              {article.title}
                            </h4>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(article.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <img
                            src={article.image || "/placeholder.svg"}
                            alt={article.title}
                            className="w-16 h-12 rounded-lg object-cover shrink-0 border border-border/50"
                          />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
          )}
        </div>
      </div>
    </section>
  );
}
