import { useParams, Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useProduct, useFeaturedProducts } from "@/hooks/useProducts";
import { Star, Heart, ShoppingCart, Share2, Check, ArrowLeft, Zap, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/products/ProductCard";
import { useCart } from "@/contexts/CartContext";
import { SEO } from "@/components/common/SEO";
import { useWishlist } from "@/hooks/useWishlist";
import { toast } from "sonner";
import { VideoPlayer } from "@/components/common/VideoPlayer";
import { ProductReviews } from "@/components/products/ProductReviews";

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(slug || "");
  const { data: relatedProducts } = useFeaturedProducts();
  const { addToCart } = useCart();
  const { hasItem, toggleItem } = useWishlist();

  const handleBuyNow = () => {
    if (product) {
        addToCart(product);
        navigate("/checkout");
    }
  };

  const handleWishlistToggle = () => {
    if (!product) return;

    const added = toggleItem(product);
    toast.success(added ? "Added to wishlist" : "Removed from wishlist");
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/product/${product.slug}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: `${product.name} at ${product.price}`,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      toast.success("Product link copied");
    } catch {
      toast.error("Unable to share this product right now");
    }
  };

  const valuationHref = product
    ? `/sell-your-phone?brand=${encodeURIComponent(product.brand || "")}&model=${encodeURIComponent(product.name)}`
    : "/sell-your-phone";
  
  // SEO Logic handled by SEO component now

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-8">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Skeleton className="aspect-square rounded-xl" />
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-12 w-1/3" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
            <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist.</p>
            <Link to="/buy">
              <Button className="hero-gradient">Browse Gadgets</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Remove the old 'specs' variable assignment
  // const specs = product.specs as Record<string, string> | null;

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={`${product.name} Price in Nepal ${new Date().getFullYear()} — Specs & Availability`}
        description={product.description || `${product.name} price in Nepal is ${product.price}. Check full specifications, features, camera, battery, RAM, and availability. Buy at Tamrakar Complex with genuine warranty.`}
        image={product.image || undefined}
        url={`/product/${product.slug}`}
        type="product"
        keywords={[
          product.name,
          `${product.name} price in Nepal`,
          `${product.name} price`,
          product.brand ? `${product.brand} price in Nepal` : "",
          "buy online Nepal",
          "Tamrakar Complex",
        ].filter(Boolean)}
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            image: product.image ? [product.image] : undefined,
            description: product.description,
            brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
            offers: {
              "@type": "Offer",
              priceCurrency: "NPR",
              price: product.price_value || undefined,
              availability: product.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              url: `https://tamrakarcomplex.com/product/${product.slug}`,
              seller: { "@type": "Organization", name: "Tamrakar Complex" },
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://tamrakarcomplex.com/" },
              ...(product.category?.toLowerCase().includes("smartphone") || product.category?.toLowerCase().includes("mobile")
                ? [
                    { "@type": "ListItem", position: 2, name: "Mobile Price in Nepal", item: "https://tamrakarcomplex.com/mobile-price" },
                    ...(product.brand ? [{ "@type": "ListItem", position: 3, name: `${product.brand} Price in Nepal`, item: `https://tamrakarcomplex.com/mobile-price/brand/${product.brand.toLowerCase()}` }] : []),
                    { "@type": "ListItem", position: product.brand ? 4 : 3, name: product.name, item: `https://tamrakarcomplex.com/product/${product.slug}` },
                  ]
                : [
                    { "@type": "ListItem", position: 2, name: "Buy Gadgets", item: "https://tamrakarcomplex.com/buy" },
                    { "@type": "ListItem", position: 3, name: product.name, item: `https://tamrakarcomplex.com/product/${product.slug}` },
                  ]),
            ],
          },
        ]}
      />
      <Header />
      
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-secondary/25 py-4 border-b border-border/60">
          <div className="container">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Link to="/" className="text-muted-foreground hover:text-primary">Home</Link>
              <span className="text-muted-foreground">/</span>
              {product.category?.toLowerCase().includes("smartphone") || product.category?.toLowerCase().includes("mobile") ? (
                <>
                  <Link to="/mobile-price" className="text-muted-foreground hover:text-primary">Mobile Price</Link>
                  {product.brand && (
                    <>
                      <span className="text-muted-foreground">/</span>
                      <Link to={`/mobile-price/brand/${product.brand.toLowerCase()}`} className="text-muted-foreground hover:text-primary">{product.brand}</Link>
                    </>
                  )}
                </>
              ) : (
                <Link to="/buy" className="text-muted-foreground hover:text-primary">Buy Gadgets</Link>
              )}
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground line-clamp-1">{product.name}</span>
            </div>
          </div>
        </div>

        <div className="container py-8">
          {/* Back button */}
          {product.category?.toLowerCase().includes("smartphone") || product.category?.toLowerCase().includes("mobile") ? (
            <Link to={product.brand ? `/mobile-price/brand/${product.brand.toLowerCase()}` : "/mobile-price"} className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6">
              <ArrowLeft className="w-4 h-4" />
              Back to {product.brand ? `${product.brand} Prices` : "Mobile Price"}
            </Link>
          ) : (
            <Link to="/buy" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6">
              <ArrowLeft className="w-4 h-4" />
              Back to Buy
            </Link>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Product Image */}
            <div className="space-y-4">
              <div className="article-card p-8 aspect-square flex items-center justify-center bg-secondary/25">
                <img
                  src={product.image || "/default-product.svg"}
                  alt={product.name}
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/default-product.svg";
                  }}
                />
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {/* Brand */}
              {product.brand && (
                <Link to={`/mobile-price/brand/${product.brand.toLowerCase()}`}>
                  <Badge variant="secondary" className="text-sm hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
                    {product.brand}
                  </Badge>
                </Link>
              )}

              {/* Title */}
              <h1 className="font-display text-3xl md:text-4xl font-bold">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(product.rating || 0)
                          ? "fill-rating-star text-rating-star"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-medium">{product.rating}</span>
                <span className="text-muted-foreground">
                  ({product.reviews_count || 0} reviews)
                </span>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <p className="text-3xl font-display font-bold text-primary">
                  {product.price}
                </p>
                {product.in_stock ? (
                  <p className="text-primary flex items-center gap-1">
                    <Check className="w-4 h-4" /> In Stock
                  </p>
                ) : (
                  <p className="text-destructive">Out of Stock</p>
                )}
              </div>

              {/* Highlights */}
              {product.highlights && product.highlights.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Highlights</h3>
                  <ul className="space-y-1">
                    {product.highlights.map((highlight, i) => (
                      <li key={i} className="flex items-start gap-2 text-muted-foreground">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                    className="flex-1 gap-2" 
                    variant="outline"
                    size="lg"
                    onClick={() => addToCart(product)}
                    disabled={!product.in_stock}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {product.in_stock ? "Add to Cart" : "Out of Stock"}
                </Button>
                <Button 
                    className="flex-1 hero-gradient gap-2" 
                    size="lg"
                    onClick={handleBuyNow}
                    disabled={!product.in_stock}
                >
                  <Zap className="w-5 h-5 fill-current" />
                  Buy Now
                </Button>
                <Button
                  variant={hasItem(product.id) ? "default" : "outline"}
                  size="lg"
                  className="gap-2"
                  onClick={handleWishlistToggle}
                >
                  <Heart className={`w-5 h-5 ${hasItem(product.id) ? "fill-current" : ""}`} />
                  <span className="hidden sm:inline">{hasItem(product.id) ? "Saved" : "Save"}</span>
                </Button>
                <Button variant="outline" size="lg" onClick={handleShare}>
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">Selling or upgrading from an older phone?</p>
                    <p className="text-sm text-muted-foreground">Get an instant valuation before you buy.</p>
                  </div>
                  <Link to={valuationHref} className="shrink-0">
                    <Button variant="outline" className="gap-2 border-primary/30">
                      <Calculator className="h-4 w-4" />
                      Value My Phone
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Video Reviews Section */}
              {product.video_url && (
                <div className="pt-6 border-t border-border">
                  <h3 className="font-display text-xl font-bold mb-4">Video Overview & Review</h3>
                  <VideoPlayer url={product.video_url} title={`${product.name} Video Review`} />
                </div>
              )}

              {/* Specs */}
              {product.specs && (
                <div className="pt-6 border-t border-border">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display text-xl font-bold">Specifications</h3>
                    {product.category?.toLowerCase().includes("laptop") && (
                      <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                        Laptop Details
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-6">
                    {Object.entries(product.specs).map(([key, value]) => {
                      if (typeof value === 'object' && value !== null) {
                        // Nested object (GSMArena style)
                        return (
                          <div key={key}>
                            <h4 className="font-semibold text-base mb-3 text-primary flex items-center gap-2">
                              <span className="w-1 h-4 bg-primary rounded-full"></span>
                              {key}
                            </h4>
                            <div className="grid grid-cols-1 border border-border/50 rounded-lg divide-y divide-border/50 overflow-hidden">
                              {Object.entries(value as Record<string, string>).map(([subKey, subValue]) => (
                                <div key={subKey} className="flex flex-col sm:flex-row bg-secondary/5 p-3 sm:px-4 sm:py-3 gap-1 sm:gap-4 hover:bg-secondary/10 transition-colors">
                                  <span className="text-muted-foreground font-medium text-sm sm:w-32 shrink-0">{subKey}</span>
                                  <span className="text-foreground text-sm">{String(subValue)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      } else {
                        // Flat key-value (Legacy style)
                        return (
                          <div key={key} className="flex justify-between p-3 bg-secondary/50 rounded-lg">
                            <span className="text-muted-foreground capitalize">{key}</span>
                            <span className="font-medium text-right">{String(value)}</span>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              )}

              {/* Reviews Section */}
              <div className="pt-12 border-t border-border mt-12">
                <ProductReviews productId={product.id} />
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <section className="py-12 bg-secondary/25">
            <div className="container">
              <h2 className="font-display text-2xl font-bold mb-8">Related Products</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {relatedProducts
                  .filter((p) => p.id !== product.id)
                  .slice(0, 6)
                  .map((relatedProduct) => (
                    <ProductCard key={relatedProduct.id} product={relatedProduct} />
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
