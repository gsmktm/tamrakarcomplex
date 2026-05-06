import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}

const popularComparisons = [
  { p1: "iphone-17-pro-max", p2: "samsung-galaxy-s25-ultra" },
  { p1: "iphone-17", p2: "oneplus-15" },
  { p1: "macbook-pro-m4-max", p2: "asus-rog-strix-g16" },
  { p1: "iphone-16-pro", p2: "pixel-9-pro" },
];

interface ComparisonSectionProps {
    settings?: {
        title?: string;
        count?: number;
    };
}

export function ComparisonSection({ settings = {} }: ComparisonSectionProps) {
  const { title = "Latest Comparisons", count = 3 } = settings;

  const { data: products } = useQuery({
    queryKey: ["products", "comparison-list"],
    queryFn: async () => {
      const slugs = [...new Set(popularComparisons.flatMap(c => [c.p1, c.p2]))];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, image")
        .in("slug", slugs);

      if (error) throw error;
      return data as Product[];
    },
  });

  const getProduct = (slug: string) => products?.find(p => p.slug === slug);

  return (
    <section className="py-12 bg-secondary/30">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-bold">{title}</h2>
            <p className="text-muted-foreground mt-1">Compare products side by side</p>
          </div>
          <Link to="/compare">
            <Button variant="outline" className="gap-2">
              Compare Products <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {popularComparisons.slice(0, count).map((comparison, index) => {
            const product1 = getProduct(comparison.p1);
            const product2 = getProduct(comparison.p2);

            if (!product1 || !product2) return null;

            return (
              <Link
                key={index}
                to={`/compare?p1=${comparison.p1}&p2=${comparison.p2}`}
                className="bg-card rounded-xl border p-6 hover:shadow-lg transition-shadow group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <img
                      src={product1.image || "/placeholder.svg"}
                      alt={product1.name}
                      className="w-20 h-20 object-contain mx-auto mb-3 group-hover:scale-105 transition-transform"
                    />
                    <p className="text-sm font-medium line-clamp-2">{product1.name}</p>
                  </div>

                  <div className="shrink-0 mx-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      VS
                    </div>
                  </div>

                  <div className="text-center flex-1">
                    <img
                      src={product2.image || "/placeholder.svg"}
                      alt={product2.name}
                      className="w-20 h-20 object-contain mx-auto mb-3 group-hover:scale-105 transition-transform"
                    />
                    <p className="text-sm font-medium line-clamp-2">{product2.name}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
