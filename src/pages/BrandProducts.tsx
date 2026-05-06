import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/products/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight } from "lucide-react";
import { SEO } from "@/components/common/SEO";

const brandInfo: Record<string, { name: string; description: string }> = {
  samsung: {
    name: "Samsung",
    description: "Explore the latest Samsung smartphones with cutting-edge technology",
  },
  apple: {
    name: "Apple",
    description: "Discover Apple iPhone lineup with premium build and ecosystem",
  },
  xiaomi: {
    name: "Xiaomi",
    description: "Best value smartphones with flagship features at mid-range prices",
  },
  oneplus: {
    name: "OnePlus",
    description: "Never Settle - Premium flagship killers with OxygenOS",
  },
  vivo: {
    name: "Vivo",
    description: "Camera-focused smartphones with innovative features",
  },
  oppo: {
    name: "OPPO",
    description: "Leading camera technology and fast charging innovation",
  },
  realme: {
    name: "Realme",
    description: "Dare to leap with powerful performance at affordable prices",
  },
  honor: {
    name: "Honor",
    description: "Smart technology for the young and bold",
  },
  motorola: {
    name: "Motorola",
    description: "Iconic design meets modern innovation",
  },
  nothing: {
    name: "Nothing",
    description: "Tech distilled - Unique transparent design",
  },
  infinix: {
    name: "Infinix",
    description: "The future is now - Budget-friendly innovation",
  },
  tecno: {
    name: "Tecno",
    description: "Stop at nothing - Feature-packed budget phones",
  },
};

export default function BrandProducts() {
  const { brand } = useParams<{ brand: string }>();
  const brandData = brand ? brandInfo[brand.toLowerCase()] : null;

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "brand", brand],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, brand, price, image, rating, reviews_count, category, in_stock, featured")
        .ilike("brand", `%${brand}%`)
        .order("created_at", { ascending: false });

      if (error || !data?.length) {
        return [];
      }
      return data;
    },
    enabled: !!brand,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={`${brandData?.name || brand} Prices in Nepal`}
        description={brandData?.description || `Browse ${brand} products and prices in Nepal.`}
        url={brand ? `/brand/${brand}` : undefined}
        keywords={[`${brandData?.name || brand} Nepal`, "mobile price Nepal", "brand products"]}
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
              <Link to="/mobile-price" className="text-muted-foreground hover:text-foreground">
                Mobile Price
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{brandData?.name || brand}</span>
            </nav>
          </div>
        </div>

        {/* Brand Header */}
        <section className="py-8 bg-gradient-to-br from-primary/5 to-secondary/50">
          <div className="container">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl hero-gradient shadow-glow flex items-center justify-center text-primary-foreground font-display font-bold text-xl">
                {(brandData?.name || brand || "").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold">
                  {brandData?.name || brand} Mobiles Price in Nepal
                </h1>
                <p className="text-muted-foreground mt-1">
                  {brandData?.description || `Browse all ${brand} products`}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-8">
          <div className="container">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-square bg-secondary rounded-xl mb-3" />
                    <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                    <div className="h-4 bg-secondary rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : products && products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No products found for {brand}</p>
              </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
