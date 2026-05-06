import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useArticlesList } from "@/hooks/useArticles";
import { useFeaturedProducts } from "@/hooks/useProducts";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Zap, TrendingUp } from "lucide-react";
import { SEO } from "@/components/common/SEO";

export default function News() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [hashtags, setHashtags] = useState<string[]>([]);
  
  // Config States
  const [itemsPerPage, setItemsPerPage] = useState(16);
  const [showPopular, setShowPopular] = useState(true);
  const [showFeatured, setShowFeatured] = useState(true);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("theme-settings");
      const parsed = raw ? JSON.parse(raw) : {};
      
      let tags = parsed.newsHashtags;
      if (typeof tags === 'string') {
        tags = tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      }
      if (!Array.isArray(tags)) {
        tags = ["#NepalTech", "#GadgetLaunches", "#PriceUpdate"];
      }
      setHashtags(tags);

      if (parsed.newsItemsPerPage) setItemsPerPage(Number(parsed.newsItemsPerPage));
      if (parsed.showPopularProducts !== undefined) setShowPopular(parsed.showPopularProducts);
      if (parsed.showFeaturedNews !== undefined) setShowFeatured(parsed.showFeaturedNews);
    } catch {
      // ignore
    }
  }, []);

  const { data: articles, isLoading } = useArticlesList({ category: activeCategory === "all" ? undefined : activeCategory });
  const { data: popularProducts, isLoading: isProductsLoading } = useFeaturedProducts();

  // Reset page when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory]);

  const totalItems = articles?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const currentArticles = articles 
    ? articles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : [];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const firstArticle = articles && articles.length > 0 ? articles[0] : null;
  const lastArticle = articles && articles.length > 1 ? articles[articles.length - 1] : null;

  return (
    <div className="min-h-screen flex flex-col">
      <SEO 
        title="Tamrakar Newsroom - Tech News & Updates"
        description="Stay updated with the latest tech news, gadget launches, and industry updates from Nepal and around the world."
        url="/news"
        keywords={["tech news Nepal", "gadget launches", "price updates", "Tamrakar newsroom"]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Tamrakar Newsroom",
          description: "Latest tech news, launches, reviews, and updates.",
          url: "https://tamrakarcomplex.com/news",
        }}
      />
      <Header />
      
      <main className="flex-1">
        {/* Page Header */}
        <div className="bg-secondary/25 py-12 border-b border-border/60">
          <div className="container">
            <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">
              Newsroom
            </div>
            <h1 className="font-display text-4xl font-bold mb-4 flex items-center gap-3">
              <span className="w-1.5 h-10 rounded-full hero-gradient" />
              Latest News
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Stay updated with the latest tech news, gadget launches, and industry updates from Nepal and around the world.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {hashtags.map((h) => (
                <Link key={h} to={`/news?tag=${encodeURIComponent(h.replace("#",""))}`} className="text-xs px-3 py-1 rounded-full border border-border/60 hover:bg-secondary">
                  {h}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Featured Section (First & Last) */}
        {showFeatured && !isLoading && articles && articles.length > 1 && (
            <section className="py-8 bg-background border-b">
                <div className="container">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        Featured Stories
                    </h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        {firstArticle && <ArticleCard article={firstArticle} featured />}
                        {lastArticle && <ArticleCard article={lastArticle} featured />}
                    </div>
                </div>
            </section>
        )}

        <section className="py-12">
          <div className="container">
            <div className="flex flex-col lg:flex-row gap-12">
                
                {/* Main Content Area */}
                <div className={`flex-1 ${showPopular ? 'lg:w-3/4' : 'w-full'}`}>
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    {["all", "news", "mobile", "price", "review", "guide", "comparison"].map((c) => (
                        <button
                        key={c}
                        onClick={() => setActiveCategory(c)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                            activeCategory === c
                            ? "hero-gradient text-primary-foreground shadow-glow border-transparent"
                            : "bg-card hover:bg-secondary text-foreground border-border/60"
                        }`}
                        >
                        {c.toUpperCase()}
                        </button>
                    ))}
                    </div>

                    {isLoading ? (
                    <div className={`grid grid-cols-1 md:grid-cols-2 ${showPopular ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-6`}>
                        {[...Array(itemsPerPage)].map((_, i) => (
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
                    ) : currentArticles.length > 0 ? (
                    <>
                        <div className={`grid grid-cols-1 md:grid-cols-2 ${showPopular ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-6`}>
                            {currentArticles.map((article) => (
                                <ArticleCard key={article.id} article={article} />
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-4 mt-12 pt-6 border-t">
                                <Button 
                                    variant="outline" 
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="gap-2"
                                >
                                    <ChevronLeft className="h-4 w-4" /> Previous
                                </Button>
                                <div className="text-sm font-medium bg-secondary px-4 py-2 rounded-md">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <Button 
                                    variant="outline" 
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="gap-2"
                                >
                                    Next <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </>
                    ) : (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">No articles found.</p>
                    </div>
                    )}
                </div>

                {/* Popular Products Sidebar */}
                {showPopular && (
                    <div className="lg:w-1/4 space-y-8">
                        <div className="bg-card border rounded-xl p-6 sticky top-24 shadow-sm">
                            <h3 className="font-display text-lg font-bold mb-6 flex items-center gap-2 pb-4 border-b">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                Popular Products
                            </h3>
                            
                            <div className="space-y-6">
                                {isProductsLoading ? (
                                    [...Array(5)].map((_, i) => (
                                        <div key={i} className="flex gap-4">
                                            <Skeleton className="w-16 h-16 rounded-md" />
                                            <div className="flex-1 space-y-2">
                                                <Skeleton className="h-4 w-full" />
                                                <Skeleton className="h-3 w-1/2" />
                                            </div>
                                        </div>
                                    ))
                                ) : popularProducts && popularProducts.length > 0 ? (
                                    popularProducts.slice(0, 6).map((product) => (
                                        <Link key={product.id} to={`/product/${product.slug}`} className="flex gap-3 group items-start">
                                            <div className="w-16 h-16 bg-secondary rounded-md overflow-hidden flex-shrink-0 border border-border/50">
                                                {product.image ? (
                                                    <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                ) : (
                                                    <div className="w-full h-full bg-secondary flex items-center justify-center text-xs text-muted-foreground">Img</div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-2 leading-tight mb-1">
                                                    {product.name}
                                                </h4>
                                                <p className="text-primary font-bold text-sm">
                                                    {product.price}
                                                </p>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No popular products.</p>
                                )}
                            </div>
                            
                            <div className="mt-6 pt-4 border-t">
                                <Link to="/buy" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                                    Browse Marketplace <ChevronRight className="h-3 w-3" />
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
