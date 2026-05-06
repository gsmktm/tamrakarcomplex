import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useArticle, useArticles } from "@/hooks/useArticles";
import { Clock, User, Calendar, ArrowLeft, Share2, Bookmark, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { SEO } from "@/components/common/SEO";

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading } = useArticle(slug || "");
  const { data: relatedArticles } = useArticles(4);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-8">
          <div className="container max-w-4xl">
            <Skeleton className="h-8 w-3/4 mb-4" />
            <Skeleton className="h-4 w-1/2 mb-8" />
            <Skeleton className="h-[400px] w-full mb-8 rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
            <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist.</p>
            <Link to="/">
              <Button className="hero-gradient">Go Home</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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

  return (
    <div className="min-h-screen flex flex-col">
      <SEO 
        title={article.title}
        description={article.excerpt || article.title}
        image={article.image || undefined}
        url={`/article/${article.slug}`}
        type="article"
        keywords={[article.category, article.category_label || "article", "tech news Nepal", article.author]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          image: article.image ? [article.image] : undefined,
          description: article.excerpt,
          author: {
            "@type": "Person",
            name: article.author,
          },
          datePublished: article.created_at,
          dateModified: article.updated_at || article.created_at,
          mainEntityOfPage: `https://tamrakarcomplex.com/article/${article.slug}`,
        }}
      />
      <Header />
      
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-secondary/25 py-4 border-b border-border/60">
          <div className="container">
            <div className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-muted-foreground hover:text-primary">Home</Link>
              <span className="text-muted-foreground">/</span>
              <Link to="/news" className="text-muted-foreground hover:text-primary">News</Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground line-clamp-1">{article.title}</span>
            </div>
          </div>
        </div>

        <article className="py-8">
          <div className="container max-w-4xl">
            {/* Back button */}
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>

            {/* Category Badge */}
            <div className="mb-4">
              <span className={`category-badge ${categoryColorMap[article.category] || "category-mobile"}`}>
                {article.category_label || article.category}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-6">
              {article.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{article.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDistanceToNow(new Date(article.created_at), { addSuffix: true })}</span>
              </div>
              {article.read_time && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{article.read_time}</span>
                </div>
              )}
              {article.source_url ? (
                <a
                  href={article.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Source
                </a>
              ) : null}
            </div>

            {/* Featured Image */}
            {article.image && (
              <div className="relative aspect-video rounded-2xl overflow-hidden mb-8 border border-border/60 shadow-card">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 mb-8 pb-8 border-b border-border">
              <Button variant="outline" size="sm" className="gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Bookmark className="w-4 h-4" />
                Save
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <MessageCircle className="w-4 h-4" />
                Comments
              </Button>
            </div>

            {/* Content */}
            <div className="prose prose-lg max-w-none">
              {article.excerpt && (
                <p className="text-xl text-muted-foreground leading-relaxed mb-6">
                  {article.excerpt}
                </p>
              )}
              {article.content && (
                <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {article.content}
                </div>
              )}
            </div>
          </div>
        </article>

        {/* Related Articles */}
        {relatedArticles && relatedArticles.length > 0 && (
          <section className="py-12 bg-secondary/25">
            <div className="container">
              <h2 className="font-display text-2xl font-bold mb-8">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedArticles
                  .filter((a) => a.id !== article.id)
                  .slice(0, 4)
                  .map((relatedArticle) => (
                    <ArticleCard key={relatedArticle.id} article={relatedArticle} />
                  ))}
              </div>
            </div>
          </section>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
