import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useArticle, useArticles, useArticleProducts } from "@/hooks/useArticles";
import { Clock, User, Calendar, ArrowLeft, Share2, Bookmark, MessageCircle, ShoppingCart, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { SEO } from "@/components/common/SEO";
import type { ReactNode } from "react";
import { AeoFaq } from "@/components/common/AeoFaq";
import { breadcrumbSchema, faqSchema } from "@/lib/seo";

const articleTextClass = "text-[1.05rem] leading-8 text-foreground/90";

function plainText(value: string | null | undefined) {
  return (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractVisibleSteps(content: string | null) {
  if (!content) return [];
  const htmlItems = Array.from(content.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
    .map((match) => plainText(match[1]))
    .filter(Boolean);
  if (htmlItems.length >= 2) return htmlItems.slice(0, 12);
  return content
    .split(/\n/)
    .map((line) => line.match(/^\s*(?:\d+[.)]|[-*])\s+(.+)$/)?.[1]?.trim() || "")
    .filter(Boolean)
    .slice(0, 12);
}

function renderInlineNode(node: ChildNode, key: string): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  const children = Array.from(element.childNodes).map((child, index) => renderInlineNode(child, `${key}-${index}`));

  switch (element.tagName.toLowerCase()) {
    case "strong":
    case "b":
      return <strong key={key} className="font-semibold text-foreground">{children}</strong>;
    case "em":
    case "i":
      return <em key={key}>{children}</em>;
    case "a": {
      const href = element.getAttribute("href") || "";
      const isSafeHref = href.startsWith("http://") || href.startsWith("https://") || href.startsWith("/") || href.startsWith("#");

      return isSafeHref ? (
        <a key={key} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className="font-medium text-primary underline underline-offset-4">
          {children}
        </a>
      ) : (
        <>{children}</>
      );
    }
    case "br":
      return <br key={key} />;
    default:
      return <>{children}</>;
  }
}

function renderArticleBlock(element: Element, key: string): ReactNode {
  const children = Array.from(element.childNodes).map((child, index) => renderInlineNode(child, `${key}-${index}`));

  switch (element.tagName.toLowerCase()) {
    case "h2":
      return <h2 key={key} className="mt-10 text-2xl font-bold tracking-tight text-foreground md:text-3xl">{children}</h2>;
    case "h3":
      return <h3 key={key} className="mt-8 text-xl font-semibold tracking-tight text-foreground md:text-2xl">{children}</h3>;
    case "h4":
      return <h4 key={key} className="mt-7 text-lg font-semibold text-foreground">{children}</h4>;
    case "p":
      return <p key={key} className={articleTextClass}>{children}</p>;
    case "ul":
      return (
        <ul key={key} className="ml-6 list-disc space-y-2 text-[1.05rem] leading-8 text-foreground/90">
          {Array.from(element.children).map((child, index) => (
            <li key={`${key}-${index}`}>{Array.from(child.childNodes).map((node, nodeIndex) => renderInlineNode(node, `${key}-${index}-${nodeIndex}`))}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="ml-6 list-decimal space-y-2 text-[1.05rem] leading-8 text-foreground/90">
          {Array.from(element.children).map((child, index) => (
            <li key={`${key}-${index}`}>{Array.from(child.childNodes).map((node, nodeIndex) => renderInlineNode(node, `${key}-${index}-${nodeIndex}`))}</li>
          ))}
        </ol>
      );
    case "blockquote":
      return <blockquote key={key} className="border-l-4 border-primary/50 bg-secondary/40 py-3 pl-5 pr-4 text-lg italic leading-8 text-foreground/80">{children}</blockquote>;
    default:
      return <p key={key} className={articleTextClass}>{children}</p>;
  }
}

function ArticleContent({ content }: { content: string }) {
  const trimmed = content.trim();

  if (!trimmed) return null;

  if (/<[a-z][\s\S]*>/i.test(trimmed) && typeof window !== "undefined") {
    const doc = new DOMParser().parseFromString(trimmed, "text/html");
    const blocks = Array.from(doc.body.children);

    if (blocks.length > 0) {
      return <div className="space-y-5">{blocks.map((element, index) => renderArticleBlock(element, `block-${index}`))}</div>;
    }
  }

  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

  return (
    <div className="space-y-5">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={articleTextClass}>{paragraph}</p>
      ))}
    </div>
  );
}

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading } = useArticle(slug || "");
  const { data: relatedArticles } = useArticles(4);
  const { data: linkedProducts } = useArticleProducts(article?.id);

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
  const summary = plainText(article.excerpt) || plainText(article.content).slice(0, 320) ||
    `${article.title} explains a current technology topic for readers in Nepal.`;
  const articleFaqs = [
    {
      question: `What does “${article.title}” cover?`,
      answer: summary,
    },
    {
      question: "Why is this topic relevant to buyers in Nepal?",
      answer: `It provides Nepal-focused context for ${article.category_label || article.category}, helping readers compare claims, costs, availability, and practical buying considerations.`,
    },
    {
      question: "How current is this information?",
      answer: `The article was last updated on ${new Date(article.updated_at || article.created_at).toLocaleDateString("en-NP", { year: "numeric", month: "long", day: "numeric" })}. Time-sensitive prices and availability should still be confirmed with the seller.`,
    },
    {
      question: "Where should product prices and availability be verified?",
      answer: "Use the linked product or mobile catalog page and confirm the exact variant, seller, warranty, stock, delivery charge, and final invoice before payment.",
    },
  ];
  const guideSteps = article.category === "guide" ? extractVisibleSteps(article.content) : [];
  const articleSchemas: Array<Record<string, unknown>> = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      image: article.og_image || article.image ? [article.og_image || article.image] : undefined,
      description: article.meta_description || article.excerpt,
      author: {
        "@type": "Person",
        name: article.author,
      },
      publisher: {
        "@type": "Organization",
        name: "Tamrakar Complex",
        url: "https://tamrakarcomplex.com",
      },
      datePublished: article.created_at,
      dateModified: article.updated_at || article.created_at,
      mainEntityOfPage: `https://tamrakarcomplex.com/stores/article/${article.slug}`,
    },
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Articles", url: "/stores/article" },
      { name: article.title, url: `/stores/article/${article.slug}` },
    ]),
    faqSchema(articleFaqs),
  ];
  if (guideSteps.length >= 2) {
    articleSchemas.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: article.title,
      description: article.meta_description || article.excerpt || summary,
      step: guideSteps.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: `Step ${index + 1}`,
        text: step,
      })),
    });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEO 
        title={article.meta_title || article.title}
        description={article.meta_description || article.excerpt || article.title}
        image={article.og_image || article.image || undefined}
        url={`/stores/article/${article.slug}`}
        type="article"
        keywords={[article.category, article.category_label || "article", "tech news Nepal", article.author]}
        structuredData={articleSchemas}
      />
      <Header />
      
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-secondary/25 py-4 border-b border-border/60">
          <div className="container">
            <div className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-muted-foreground hover:text-primary">Home</Link>
              <span className="text-muted-foreground">/</span>
              <Link to="/stores/article" className="text-muted-foreground hover:text-primary">Articles</Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground line-clamp-1">{article.title}</span>
            </div>
          </div>
        </div>

        <article className="py-8">
          <div className="container max-w-4xl">
            {/* Back button */}
            <Link to="/stores/article" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6">
              <ArrowLeft className="w-4 h-4" />
              Back to News
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

            <div className="mb-6 rounded-xl border-l-4 border-primary bg-primary/5 p-5">
              <p className="font-semibold">TL;DR</p>
              <p className="mt-2 leading-7 text-muted-foreground">{summary}</p>
              <p className="mt-2 text-sm">
                <strong>{article.title}</strong> is a {article.category_label || article.category} topic explained for Nepal readers with practical context and verification guidance.
              </p>
            </div>

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
              <figure className="mb-8">
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-border/60 shadow-card">
                  <img
                    src={article.image}
                    alt={`${article.title} — article illustration`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <figcaption className="mt-2 text-center text-xs text-muted-foreground">
                  Illustration for {article.title}
                </figcaption>
              </figure>
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
            <div className="mx-auto max-w-3xl">
              {article.excerpt && (
                <p className="mb-8 border-l-4 border-primary/40 pl-5 text-xl leading-8 text-muted-foreground">
                  {article.excerpt}
                </p>
              )}
              {article.content ? <ArticleContent content={article.content} /> : null}
              <div className="mt-10 rounded-xl border bg-muted/20 p-5">
                <h2 className="text-xl font-bold">Key takeaways</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
                  <li>Check when the article was last updated before relying on time-sensitive information.</li>
                  <li>Verify product price, availability, warranty, and seller terms independently.</li>
                  <li>Use the linked catalog and related articles for specifications and broader context.</li>
                </ul>
              </div>
              <div className="mt-10">
                <AeoFaq items={articleFaqs} title={`Questions about ${article.title}`} />
              </div>
            </div>
          </div>
        </article>

        {/* Linked Products */}
        {linkedProducts && linkedProducts.length > 0 && (
          <section className="py-12 bg-secondary/10">
            <div className="container">
              <h2 className="font-display text-2xl font-bold mb-8 flex items-center gap-2">
                <ShoppingCart className="h-6 w-6 text-primary" />
                Products Mentioned
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {linkedProducts.map((product: any) => (
                  <Link key={product.id} to={`/product/${product.slug}`} className="group">
                    <div className="bg-card rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition-all">
                      <div className="aspect-square bg-secondary/30 p-4">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No Image</div>
                        )}
                      </div>
                      <div className="p-4 space-y-2">
                        <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">{product.name}</h3>
                        <p className="text-primary font-bold">{product.price}</p>
                        <Button variant="default" size="sm" className="w-full">
                          View Product <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

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
