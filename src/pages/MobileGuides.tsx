import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChevronRight, Clock, User } from "lucide-react";
import { useGuidesList } from "@/hooks/useGuides";
import { SEO } from "@/components/common/SEO";

export default function MobileGuides() {
  const { data: guides, isLoading } = useGuidesList({ category: "mobile" });

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Mobile Buying Guides in Nepal"
        description="Phone buying guides, shortlist advice, and practical smartphone recommendations for Nepal buyers."
        url="/mobile-guides"
        keywords={["mobile guide Nepal", "smartphone buying guide", "best phone Nepal", "phone advice"]}
      />
      <Header />
      
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-secondary/30 border-b">
          <div className="container py-3">
            <nav className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-muted-foreground hover:text-foreground">
                Home
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Mobile Buying Guides</span>
            </nav>
          </div>
        </div>

        {/* Header */}
        <section className="py-8 bg-gradient-to-br from-primary/5 to-secondary/50">
          <div className="container">
            <h1 className="text-3xl font-display font-bold">Mobile Buying Guides</h1>
            <p className="text-muted-foreground mt-2">
              Find the perfect smartphone for your needs with our comprehensive buying guides
            </p>
          </div>
        </section>

        {/* Guides Grid */}
        <section className="py-8">
          <div className="container">
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-video bg-secondary rounded-xl mb-4" />
                    <div className="h-5 bg-secondary rounded w-3/4 mb-2" />
                    <div className="h-4 bg-secondary rounded w-full mb-2" />
                    <div className="h-4 bg-secondary rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : guides && guides.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {guides.map((guide) => (
                  <Link
                    key={guide.id}
                    to={`/guide/${guide.slug}`}
                    className="group"
                  >
                    <article className="bg-card rounded-xl border overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-video relative overflow-hidden">
                        <img
                          src={guide.image || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800"}
                          alt={guide.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4">
                        <h2 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
                          {guide.title}
                        </h2>
                        {guide.excerpt && (
                          <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                            {guide.excerpt}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {guide.author}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {guide.read_time || "5 min read"}
                          </span>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No guides found</p>
              </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
