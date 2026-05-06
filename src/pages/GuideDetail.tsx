import { Link, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useGuide, useGuidesList } from "@/hooks/useGuides";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { SEO } from "@/components/common/SEO";

export default function GuideDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: guide, isLoading } = useGuide(slug || "");
  const { data: relatedGuides } = useGuidesList({ limit: 4 });

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

  if (!guide) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Guide Not Found</h1>
            <p className="text-muted-foreground mb-6">The guide you're looking for doesn't exist.</p>
            <Link to="/">
              <Button className="hero-gradient">Go Home</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const backHref =
    guide.category === "mobile"
      ? "/mobile-guides"
      : guide.category === "laptop"
        ? "/laptop-guides"
        : "/mobile-guides";

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={guide.title}
        description={guide.excerpt || guide.title}
        image={guide.image || undefined}
        url={`/guide/${guide.slug}`}
        type="article"
        keywords={["buying guide Nepal", guide.category, guide.guide_type]}
      />
      <Header />

      <main className="flex-1">
        <div className="bg-secondary/30 py-4 border-b border-border">
          <div className="container">
            <div className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-muted-foreground hover:text-primary">
                Home
              </Link>
              <span className="text-muted-foreground">/</span>
              <Link to={backHref} className="text-muted-foreground hover:text-primary">
                Guides
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground line-clamp-1">{guide.title}</span>
            </div>
          </div>
        </div>

        <article className="py-8">
          <div className="container max-w-4xl">
            <Link to={backHref} className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6">
              <ArrowLeft className="w-4 h-4" />
              Back to Guides
            </Link>

            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-6">
              {guide.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{guide.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDistanceToNow(new Date(guide.created_at), { addSuffix: true })}</span>
              </div>
              {guide.read_time ? (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{guide.read_time}</span>
                </div>
              ) : null}
              {guide.source_url ? (
                <a
                  href={guide.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Source
                </a>
              ) : null}
            </div>

            {guide.image ? (
              <div className="relative aspect-video rounded-xl overflow-hidden mb-8">
                <img src={guide.image} alt={guide.title} className="w-full h-full object-cover" />
              </div>
            ) : null}

            <div className="prose prose-lg max-w-none">
              {guide.excerpt ? (
                <p className="text-xl text-muted-foreground leading-relaxed mb-6">{guide.excerpt}</p>
              ) : null}
              {guide.content ? (
                <div className="text-foreground leading-relaxed whitespace-pre-wrap">{guide.content}</div>
              ) : null}
            </div>
          </div>
        </article>

        {relatedGuides && relatedGuides.length > 0 ? (
          <section className="py-12 bg-secondary/30">
            <div className="container">
              <h2 className="font-display text-2xl font-bold mb-8">More Guides</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedGuides
                  .filter((g) => g.id !== guide.id)
                  .slice(0, 4)
                  .map((g) => (
                    <Link key={g.id} to={`/guide/${g.slug}`} className="article-card overflow-hidden group">
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={g.image || "/placeholder.svg"}
                          alt={g.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                          {g.title}
                        </h3>
                        <div className="text-sm text-muted-foreground mt-2">{g.author}</div>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
