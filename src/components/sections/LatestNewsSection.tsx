import { Link } from "react-router-dom";
import { ArrowRight, Clock, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useArticles } from "@/hooks/useArticles";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { useEffect, useState } from "react";
import { differenceInSeconds } from "date-fns";

interface LatestNewsSectionProps {
    settings?: {
        count?: number;
        title?: string;
        showSubtitle?: boolean;
        dealTitle?: string;
        dealDescription?: string;
        dealExpiry?: string;
        dealLink?: string;
    };
}

export function LatestNewsSection({ settings = {} }: LatestNewsSectionProps) {
  // Default count to 2 as per requirement, unless overridden (but requirement says "show only 2")
  const { 
      count = 2, 
      title = "Latest News", 
      showSubtitle = true,
      dealTitle = "Limited Time Offer",
      dealDescription = "Grab the best deals before time runs out!",
      dealExpiry,
      dealLink = "/buy"
  } = settings;

  const { data: articles, isLoading } = useArticles(count);

  // Countdown Logic
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!dealExpiry) return;

    const calculateTimeLeft = () => {
        const now = new Date();
        const expiryDate = new Date(dealExpiry);
        const diff = differenceInSeconds(expiryDate, now);

        if (diff <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        }

        return {
            days: Math.floor(diff / (3600 * 24)),
            hours: Math.floor((diff % (3600 * 24)) / 3600),
            minutes: Math.floor((diff % 3600) / 60),
            seconds: Math.floor(diff % 60),
        };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
        setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [dealExpiry]);

  return (
    <section className="py-10 lg:py-16">
      <div className="container">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            {showSubtitle && (
                <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Fresh Updates
                </div>
            )}
            <h2 className="font-display text-2xl lg:text-3xl font-bold flex items-center gap-2">
              <span className="w-1.5 h-9 rounded-full hero-gradient" />
              {title}
            </h2>
          </div>
          
          <Link to="/news">
            <Button variant="ghost" className="text-primary gap-1 group">
              View all news
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Articles Column (Span 2) */}
            <div className="lg:col-span-2">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[...Array(count)].map((_, i) => (
                        <div key={i} className="article-card">
                            <Skeleton className="aspect-video" />
                            <div className="p-4 space-y-3">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            </div>
                        </div>
                        ))}
                    </div>
                ) : articles && articles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                        {articles.map((article) => (
                            <ArticleCard key={article.id} article={article} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-secondary/20 rounded-xl border border-dashed">
                        <p className="text-muted-foreground">No articles found.</p>
                    </div>
                )}
            </div>

            {/* Deal Countdown Column (Span 1) */}
            <div className="lg:col-span-1">
                <div className="h-full min-h-[300px] bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-8 text-primary-foreground relative overflow-hidden flex flex-col justify-between group shadow-lg hover:shadow-xl transition-shadow">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/3" />
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                                <Timer className="w-3 h-3" /> Limited Time
                            </span>
                        </div>
                        
                        <h3 className="text-3xl font-bold mb-3 leading-tight">
                            {dealTitle}
                        </h3>
                        <p className="text-primary-foreground/90 text-sm md:text-base mb-6">
                            {dealDescription}
                        </p>
                    </div>

                    <div className="relative z-10 mt-auto">
                        {timeLeft ? (
                            <div className="grid grid-cols-4 gap-2 mb-8 text-center">
                                <div className="bg-white/20 backdrop-blur rounded-lg p-2">
                                    <div className="text-xl font-bold font-mono">{String(timeLeft.days).padStart(2, '0')}</div>
                                    <div className="text-[10px] uppercase opacity-80">Days</div>
                                </div>
                                <div className="bg-white/20 backdrop-blur rounded-lg p-2">
                                    <div className="text-xl font-bold font-mono">{String(timeLeft.hours).padStart(2, '0')}</div>
                                    <div className="text-[10px] uppercase opacity-80">Hrs</div>
                                </div>
                                <div className="bg-white/20 backdrop-blur rounded-lg p-2">
                                    <div className="text-xl font-bold font-mono">{String(timeLeft.minutes).padStart(2, '0')}</div>
                                    <div className="text-[10px] uppercase opacity-80">Min</div>
                                </div>
                                <div className="bg-white/20 backdrop-blur rounded-lg p-2">
                                    <div className="text-xl font-bold font-mono text-yellow-300">{String(timeLeft.seconds).padStart(2, '0')}</div>
                                    <div className="text-[10px] uppercase opacity-80">Sec</div>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-8 p-4 bg-white/10 rounded-lg text-center backdrop-blur-sm">
                                <p className="font-medium flex items-center justify-center gap-2">
                                    <Clock className="w-4 h-4" /> Offer ending soon!
                                </p>
                            </div>
                        )}

                        <Button size="lg" variant="secondary" className="w-full font-bold shadow-md hover:shadow-lg transition-all" asChild>
                            <Link to={dealLink}>
                                Check Deal <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </section>
  );
}
