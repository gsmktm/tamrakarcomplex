import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useArticlesList } from "@/hooks/useArticles";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { SEO } from "@/components/common/SEO";

export default function Reviews() {
  const { data: articles, isLoading } = useArticlesList({ category: "review" });

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Tech Reviews in Nepal"
        description="Read hands-on gadget reviews, long-term impressions, and buying verdicts before you spend."
        url="/reviews"
        keywords={["tech reviews Nepal", "mobile review Nepal", "laptop reviews", "gadget verdicts"]}
      />
      <Header />

      <main className="flex-1">
        <div className="bg-secondary/25 py-12 border-b border-border/60">
          <div className="container">
            <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">
              Hands-on
            </div>
            <h1 className="font-display text-4xl font-bold mb-4 flex items-center gap-3">
              <span className="w-1.5 h-10 rounded-full hero-gradient" />
              Reviews
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Hands-on reviews, long-term tests, and buying advice for the latest gadgets.
            </p>
          </div>
        </div>

        <section className="py-12">
          <div className="container">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No reviews found.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
