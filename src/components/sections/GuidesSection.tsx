import { Link } from "react-router-dom";
import { ArrowRight, Clock, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Guide, useGuidesList } from "@/hooks/useGuides";

const GuideCard = ({ guide }: { guide: Guide }) => (
    <Link to={`/guide/${guide.slug}`} className="group block">
      <article className="flex gap-4 items-start">
        <img
          src={guide.image || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300"}
          alt={guide.title}
          className="w-24 h-24 rounded-lg object-cover shrink-0 group-hover:shadow-lg transition-shadow"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
            {guide.title}
          </h4>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {guide.author}
            </span>
          </div>
        </div>
      </article>
    </Link>
);

interface GuidesSectionProps {
    settings?: {
        title?: string;
        count?: number;
    };
}

export function GuidesSection({ settings = {} }: GuidesSectionProps) {
  const { title = "Buying Guides", count = 4 } = settings;
  const { data: mobileGuides } = useGuidesList({ category: "mobile", limit: count });
  const { data: laptopGuides } = useGuidesList({ category: "laptop", limit: count });

  return (
    <section className="py-12">
      <div className="container">
        <Tabs defaultValue="mobile" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-1">
                {title}
              </div>
            </div>
            <TabsList className="bg-transparent p-0 gap-2 overflow-x-auto pb-2 sm:pb-0 justify-start">
              <TabsTrigger 
                value="mobile" 
                className="rounded-full border border-border/60 bg-card px-6 data-[state=active]:hero-gradient data-[state=active]:text-primary-foreground data-[state=active]:border-transparent"
              >
                Mobile Buying Guides
              </TabsTrigger>
              <TabsTrigger 
                value="laptop" 
                className="rounded-full border border-border/60 bg-card px-6 data-[state=active]:hero-gradient data-[state=active]:text-primary-foreground data-[state=active]:border-transparent"
              >
                Laptop Buying Guides
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="mobile">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Featured Guide - First Item */}
              {mobileGuides?.[0] && (
                <Link to={`/guide/${mobileGuides[0].slug}`} className="group block">
                  <article className="bg-card rounded-2xl border border-border/60 overflow-hidden hover:shadow-elevated transition-shadow h-full">
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={mobileGuides[0].image || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800"}
                        alt={mobileGuides[0].title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
                        {mobileGuides[0].title}
                      </h3>
                      {mobileGuides[0].excerpt && (
                        <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                          {mobileGuides[0].excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {mobileGuides[0].author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {mobileGuides[0].read_time || "5 min read"}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              )}

              {/* Guide List - Rest Items */}
              <div className="space-y-4 flex flex-col">
                {mobileGuides?.slice(1).map((guide) => (
                  <GuideCard key={guide.id} guide={guide} />
                ))}
                <div className="mt-auto pt-4">
                    <Link 
                    to="/mobile-guides" 
                    className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                    >
                    View All <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="laptop">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Featured Guide */}
              {laptopGuides?.[0] && (
                <Link to={`/guide/${laptopGuides[0].slug}`} className="group block">
                  <article className="bg-card rounded-2xl border border-border/60 overflow-hidden hover:shadow-elevated transition-shadow h-full">
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={laptopGuides[0].image || "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800"}
                        alt={laptopGuides[0].title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
                        {laptopGuides[0].title}
                      </h3>
                      {laptopGuides[0].excerpt && (
                        <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                          {laptopGuides[0].excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {laptopGuides[0].author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {laptopGuides[0].read_time || "5 min read"}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              )}

              {/* Guide List */}
              <div className="space-y-4 flex flex-col">
                {laptopGuides?.slice(1).map((guide) => (
                  <GuideCard key={guide.id} guide={guide} />
                ))}
                <div className="mt-auto pt-4">
                    <Link 
                    to="/laptop-guides" 
                    className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                    >
                    View All <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
