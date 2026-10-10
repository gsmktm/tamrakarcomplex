import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, Star, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFeaturedArticles, useArticles } from "@/hooks/useArticles";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Reveal, Stagger } from "@/components/home/Reveal";

const categoryColorMap: Record<string, string> = {
  mobile: "bg-blue-500",
  laptop: "bg-purple-500",
  tablet: "bg-emerald-500",
  audio: "bg-amber-500",
  watch: "bg-pink-500",
  gaming: "bg-red-500",
  news: "bg-blue-500",
  review: "bg-purple-500",
  comparison: "bg-emerald-500",
  guide: "bg-amber-500",
  price: "bg-pink-500",
};

const highlights = [
  { icon: Zap, label: "Instant Sell", value: "Get quote in 60s", href: "/sell-your-phone" },
  { icon: Star, label: "Verified Stores", value: "250+ trusted", href: "/stores" },
  { icon: TrendingUp, label: "Best Prices", value: "Nepal-wide", href: "/cat/mobiles" },
];

interface HeroSectionProps {
  settings?: {
    autoplay?: boolean;
    interval?: number;
    showTrending?: boolean;
  };
}

export function HeroSection({ settings = {} }: HeroSectionProps) {
  const { autoplay = true, interval: slideInterval = 6000, showTrending = true } = settings;
  const [currentSlide, setCurrentSlide] = useState(0);
  const { data: featuredArticles, isLoading: featuredLoading } = useFeaturedArticles();
  const { data: trendingArticles, isLoading: trendingLoading } = useArticles(5);

  const slides = useMemo(() => featuredArticles || [], [featuredArticles]);

  useEffect(() => {
    if (slides.length <= 1 || !autoplay) return;
    const id = setInterval(() => setCurrentSlide((p) => (p + 1) % slides.length), slideInterval);
    return () => clearInterval(id);
  }, [slides.length, autoplay, slideInterval]);

  const goTo = (i: number) => setCurrentSlide((i + slides.length) % slides.length);
  const current = slides[currentSlide];

  if (featuredLoading) {
    return (
      <section className="pt-4 pb-8 lg:pt-8 lg:pb-12">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8"><Skeleton className="aspect-[16/10] rounded-3xl" /></div>
            <div className="lg:col-span-4 space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative pt-4 pb-8 lg:pt-8 lg:pb-12 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      <div className="container relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8">
            <Reveal>
              <div className="relative group rounded-3xl overflow-hidden bg-card shadow-soft">
                {current && (
                  <>
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img
                        src={current.image_url || current.thumbnail || current.image || "/og-image.png"}
                        alt={current.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        loading="eager"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
                    </div>
                    <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 lg:p-10">
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`inline-flex items-center h-6 rounded-full px-3 text-[10px] font-bold uppercase tracking-widest text-white ${categoryColorMap[current.category || "news"] || "bg-blue-500"}`}>
                          {current.category_label || current.category}
                        </span>
                        <span className="text-white/60 text-xs">
                          {formatDistanceToNow(new Date(current.created_at || Date.now()), { addSuffix: true })}
                        </span>
                      </div>
                      <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-extrabold text-white leading-[1.1] max-w-2xl line-clamp-3">
                        {current.title}
                      </h2>
                      {current.excerpt && (
                        <p className="text-white/70 text-sm md:text-base mt-3 max-w-xl line-clamp-2 hidden md:block">
                          {current.excerpt}
                        </p>
                      )}
                      <div className="mt-5">
                        <Button asChild size="lg" className="hero-gradient text-white font-bold gap-2 shadow-glow-blue">
                          <Link to={`/stores/article/${current.slug}`}>
                            Read Story <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => goTo(currentSlide - 1)} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                        <ChevronRight className="h-5 w-5 rotate-180" />
                      </button>
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => goTo(currentSlide + 1)} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                      {slides.map((_, i) => (
                        <button key={i} onClick={() => setCurrentSlide(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? "w-8 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </Reveal>
          </div>

          {/* ── Trending Sidebar ─────────────────────────────── */}
          {showTrending && (
            <div className="lg:col-span-4">
              <Reveal delay={150}>
                <div className="surface-elevated rounded-3xl p-5 h-full">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="text-heading">Trending Now</h3>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold">Live</Badge>
                  </div>

                  <div className="space-y-1">
                    {trendingLoading ? (
                      [...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
                    ) : (
                      <Stagger staggerMs={60}>
                        {trendingArticles?.slice(0, 4).map((article, i) => (
                          <Link
                            key={article.id}
                            to={`/stores/article/${article.slug}`}
                            className="flex gap-4 p-3 rounded-2xl hover:bg-secondary/50 transition-colors group"
                          >
                            <span className="text-3xl font-display font-black text-primary/15 w-10 shrink-0 group-hover:text-primary/30 transition-colors">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                                {article.title}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                                <span className="capitalize">{article.category}</span>
                                <span className="text-border">·</span>
                                {formatDistanceToNow(new Date(article.created_at || Date.now()), { addSuffix: true })}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </Stagger>
                    )}
                  </div>
                </div>
              </Reveal>
            </div>
          )}
        </div>

        {/* ── Highlight Strip ──────────────────────────────── */}
        <div className="mt-6">
          <Reveal delay={300}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {highlights.map(({ icon: Icon, label, value, href }) => (
                <Link
                  key={label}
                  to={href}
                  className="surface-elevated rounded-2xl p-4 flex items-center gap-4 hover-lift group"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{label}</p>
                    <p className="text-xs text-muted-foreground">{value}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
