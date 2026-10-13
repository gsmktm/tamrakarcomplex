import { useParams, Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useProduct, useFeaturedProducts } from "@/hooks/useProducts";
import {
  Star, Heart, ShoppingCart, Share2, Check, ArrowLeft, Zap, Calculator, BookOpen,
  ExternalLink, PackageX, ShieldCheck, Truck, CreditCard, Minus, Plus,
  Search, Package, Smartphone, ChevronDown, ChevronRight, Award, RefreshCcw
} from "lucide-react";
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
import { AeoFaq } from "@/components/common/AeoFaq";
import { breadcrumbSchema, faqSchema } from "@/lib/seo";
import { useEffect, useState } from "react";
import { normalizeProductSlug } from "@/lib/productSlug";
import { SafeImage } from "@/components/common/SafeImage";
import { getProductAvailability, resolveProductDetailImage } from "@/lib/productPresentation";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

function buildGallery(product: any, primaryImage: string | null): string[] {
  const gallery: string[] = [];
  if (primaryImage) gallery.push(primaryImage);
  if (Array.isArray(product.images) && product.images.length > 0) {
    for (const img of product.images) {
      if (img && img !== primaryImage) gallery.push(String(img));
    }
  }
  if (Array.isArray(product.additional_images) && product.additional_images.length > 0) {
    for (const img of product.additional_images) {
      const s = String(img);
      if (s && !gallery.includes(s)) gallery.push(s);
    }
  }
  return gallery;
}

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const normalizedSlug = normalizeProductSlug(slug);
  const { data: product, isLoading } = useProduct(normalizedSlug);
  const { data: relatedProducts } = useFeaturedProducts();
  const { addToCart } = useCart();
  const { hasItem, toggleItem } = useWishlist();
  const [quantity, setQuantity] = useState<number>(1);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  useEffect(() => {
    setQuantity(1);
    setActiveImageIndex(0);
  }, [normalizedSlug]);

  useEffect(() => {
    if (slug && normalizedSlug && slug !== normalizedSlug) {
      navigate(`/product/${normalizedSlug}`, { replace: true });
    }
  }, [navigate, normalizedSlug, slug]);

  const handleBuyNow = () => {
    if (product) {
      for (let i = 0; i < quantity; i++) addToCart(product);
      navigate("/checkout");
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    for (let i = 0; i < quantity; i++) addToCart(product);
    toast.success(`${quantity > 1 ? `${quantity} units of ` : ""}${product.name} added to cart`);
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-8">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Skeleton className="aspect-square rounded-2xl" />
              <div className="space-y-5">
                <Skeleton className="h-10 w-4/5 rounded-md" />
                <Skeleton className="h-6 w-1/3 rounded-md" />
                <Skeleton className="h-16 w-2/5 rounded-lg" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
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
        <SEO
          title="Product Not Found"
          description="This product page is unavailable."
          url={`/product/${normalizedSlug}`}
          noindex
        />
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm px-6">
            <div className="mx-auto rounded-full bg-muted p-5 w-fit mb-6">
              <PackageX className="h-10 w-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Product Not Found</h1>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              The product you're looking for doesn't exist or has been moved.
            </p>
            <Link to="/buy">
              <Button className="hero-gradient gap-2">
                <ShoppingCart className="w-4 h-4" /> Browse Gadgets
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const valuationHref = `/sell-your-phone?brand=${encodeURIComponent(product.brand || "")}&model=${encodeURIComponent(product.name)}`;
  const numericPrice = Number(product.price_value);
  const availability = getProductAvailability(product);
  const hasMerchantOffer = availability.purchasable;
  const productImage = resolveProductDetailImage(product);
  const gallery = buildGallery(product, productImage);
  const activeImage = gallery[activeImageIndex] ?? productImage;
  const hasDetailedSpecs = Boolean(product.specs && Object.keys(product.specs).length > 0);
  const isIndexableProduct = hasMerchantOffer
    && Boolean(product.name?.trim())
    && Boolean(product.slug?.trim())
    && Boolean(product.description?.trim())
    && Boolean(productImage)
    && Boolean(product.brand?.trim())
    && Boolean(product.category?.trim());
  const productSummary = product.description ||
    `${product.name} is a ${product.category || "technology product"} listed for buyers in Nepal. Review its current price, stock status, specifications, seller terms, and warranty details before ordering.`;
  const productFaqs = [
    {
      question: `What is ${product.name}?`,
      answer: `${product.name} is a ${product.brand ? `${product.brand} ` : ""}${product.category || "technology product"} listed in the Tamrakar Complex catalog for Nepal buyers.`,
    },
    {
      question: `What is the price of ${product.name} in Nepal?`,
      answer: hasMerchantOffer
        ? `The current listed price is ${product.price}. Prices can change, so confirm the final invoice and delivery charge during checkout.`
        : "A confirmed online price is not currently available. Check the product page again or contact the seller before making a payment.",
    },
    {
      question: `Is ${product.name} in stock?`,
      answer: product.in_stock
        ? "The product is currently marked in stock. Availability can change until the order is confirmed."
        : "The product is currently marked out of stock and cannot be purchased through checkout.",
    },
    {
      question: `What should I confirm before buying ${product.name}?`,
      answer: "Confirm the exact variant, included accessories, warranty provider, invoice, delivery charge, return terms, and final payable amount.",
    },
  ];

  const emiPreview = numericPrice > 0 ? {
    three: Math.ceil(numericPrice / 3),
    six: Math.ceil(numericPrice / 6),
    twelve: Math.ceil(numericPrice / 12),
  } : null;

  const formatPrice = (amount: number) => `Rs. ${amount.toLocaleString("en-IN")}`;
  const isLaptop = product.category?.toLowerCase().includes("laptop") ?? false;
  const isPhone = (product.category?.toLowerCase().includes("smartphone") || product.category?.toLowerCase().includes("mobile")) ?? false;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-secondary/10">
        <SEO
          title={`${product.name} Price in Nepal ${new Date().getFullYear()} — Specs & Availability`}
          description={product.description || `${product.name} price in Nepal is ${product.price}. Check full specifications, features, camera, battery, RAM, and availability. Buy at Tamrakar Complex with genuine warranty.`}
          image={productImage || undefined}
          url={`/product/${product.slug}`}
          type="product"
          noindex={!isIndexableProduct}
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
              image: productImage ? [productImage] : undefined,
              description: product.description,
              brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
              ...(hasMerchantOffer ? { offers: {
                "@type": "Offer",
                priceCurrency: "NPR",
                price: numericPrice,
                availability: "https://schema.org/InStock",
                url: `https://tamrakarcomplex.com/product/${product.slug}`,
                seller: { "@type": "Organization", name: "Tamrakar Complex" },
              }} : {}),
            },
            {
              ...breadcrumbSchema([
                { name: "Home", url: "/" },
                { name: isPhone ? "Buy Mobiles" : "Buy Gadgets", url: isPhone ? "/mobile-price" : "/buy" },
                { name: product.brand || (isPhone ? "Mobiles" : "Gadgets"), url: isPhone && product.brand ? `/mobile-price/brand/${product.brand.toLowerCase()}` : (isPhone ? "/mobile-price" : "/buy") },
                { name: product.name, url: `/product/${product.slug}` },
              ]),
            },
            faqSchema(productFaqs),
          ]}
        />
        <Header />

        <main className="flex-1">
          <div className="bg-secondary/20 py-3 border-b border-border/40">
            <div className="container">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
                <span className="opacity-60">/</span>
                {isPhone ? (
                  <>
                    <Link to="/mobile-price" className="hover:text-foreground transition-colors">Mobile Price</Link>
                    {product.brand && (
                      <>
                        <span className="opacity-60">/</span>
                        <Link to={`/mobile-price/brand/${product.brand.toLowerCase()}`} className="hover:text-foreground transition-colors">{product.brand}</Link>
                      </>
                    )}
                  </>
                ) : (
                  <Link to="/buy" className="hover:text-foreground transition-colors">Buy Gadgets</Link>
                )}
                <span className="opacity-60">/</span>
                <span className="text-foreground line-clamp-1 font-medium">{product.name}</span>
              </div>
            </div>
          </div>

          <div className="container py-6 sm:py-10">
            <div className="mb-5">
              {isPhone ? (
                <Link to={product.brand ? `/mobile-price/brand/${product.brand.toLowerCase()}` : "/mobile-price"} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group">
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  Back to {product.brand ? `${product.brand} Prices` : "Mobile Price"}
                </Link>
              ) : (
                <Link to="/buy" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group">
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  Back to Catalog
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-6 lg:gap-10">
              <div className="space-y-4">
                <Card className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow duration-500">
                  <CardContent className="p-0">
                    <div
                      className={`relative aspect-square w-full bg-gradient-to-br from-secondary/40 via-secondary/10 to-primary/5 overflow-hidden cursor-zoom-in select-none ${isZoomed ? "cursor-zoom-out" : ""}`}
                      onClick={() => setIsZoomed(z => !z)}
                    >
                      <div className="absolute top-3 left-3 z-10 flex gap-2">
                        {product.condition === "New" || !product.condition ? (
                          <Badge className="shadow-sm bg-primary text-primary-foreground">New</Badge>
                        ) : (
                          <Badge variant="secondary" className="shadow-sm border border-border/60">Used</Badge>
                        )}
                        {isLaptop && (
                          <Badge variant="outline" className="bg-background/70 backdrop-blur-xs text-foreground/90 border-border/60">
                            <Package className="h-3 w-3 mr-1" />
                            Laptop
                          </Badge>
                        )}
                        {isPhone && (
                          <Badge variant="outline" className="bg-background/70 backdrop-blur-xs text-foreground/90 border-border/60">
                            <Smartphone className="h-3 w-3 mr-1" />
                            Smartphone
                          </Badge>
                        )}
                      </div>
                      <div className="absolute top-3 right-3 z-10">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setIsZoomed(z => !z); }}
                              className="rounded-full bg-background/80 backdrop-blur-xs border border-border/60 p-2 shadow-sm hover:bg-background transition-colors"
                              aria-label={isZoomed ? "Zoom out" : "Zoom product image"}
                            >
                              <Search className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{isZoomed ? "Click to zoom out" : "Click image to zoom"}</TooltipContent>
                        </Tooltip>
                      </div>
                      <SafeImage
                        src={activeImage}
                        alt={product.name}
                        className={`w-full h-full object-contain p-4 sm:p-8 transition-all duration-700 ease-out motion-reduce:transition-none ${isZoomed ? "scale-150" : "scale-100"}`}
                        loading="eager"
                        onError={() => setActiveImageIndex(0)}
                      />
                    </div>

                    {gallery.length > 1 && (
                      <div className="p-3 sm:p-4 border-t border-border/50 bg-secondary/10">
                        <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 sm:gap-3">
                          {gallery.slice(0, 6).map((img, idx) => (
                            <button
                              key={`${img}-${idx}`}
                              type="button"
                              onClick={() => setActiveImageIndex(idx)}
                              className={`aspect-square rounded-lg border overflow-hidden bg-background transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/60 hover:-translate-y-0.5 ${
                                idx === activeImageIndex
                                  ? "border-primary ring-2 ring-primary/40 shadow-md scale-[1.02]"
                                  : "border-border/60 hover:border-border hover:shadow-sm"
                              }`}
                              aria-label={`View product image ${idx + 1}`}
                            >
                              <SafeImage
                                src={img}
                                alt={`${product.name} thumbnail ${idx + 1}`}
                                className="w-full h-full object-contain p-1.5"
                                loading="lazy"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  <div className="rounded-xl border border-border/60 bg-background p-3 sm:p-4 flex flex-col items-start gap-2 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300">
                    <div className="rounded-lg bg-primary/10 text-primary p-2">
                      <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm font-semibold leading-tight">Genuine Warranty</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">Official brand warranty included</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background p-3 sm:p-4 flex flex-col items-start gap-2 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300">
                    <div className="rounded-lg bg-emerald-500/10 text-emerald-600 p-2">
                      <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm font-semibold leading-tight">Fast Delivery</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">Nationwide shipping across Nepal</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background p-3 sm:p-4 flex flex-col items-start gap-2 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300">
                    <div className="rounded-lg bg-violet-500/10 text-violet-600 p-2">
                      <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm font-semibold leading-tight">EMI Available</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">Flexible 3/6/12 month plans</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background p-3 sm:p-4 flex flex-col items-start gap-2 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300">
                    <div className="rounded-lg bg-amber-500/10 text-amber-600 p-2">
                      <RefreshCcw className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm font-semibold leading-tight">Easy Returns</p>
                      <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">7-day return window</p>
                    </div>
                  </div>
                </div>

                {product.video_url && (
                  <div className="rounded-2xl overflow-hidden border border-border/60">
                    <div className="px-4 py-3 border-b border-border/50 bg-secondary/10 flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm">Video Overview & Review</h3>
                    </div>
                    <div className="bg-black/5">
                      <VideoPlayer url={product.video_url} title={`${product.name} Video Review`} />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {product.brand && (
                      <Link to={isPhone ? `/mobile-price/brand/${product.brand.toLowerCase()}` : "/buy"}>
                        <Badge variant="secondary" className="text-xs sm:text-sm px-3 py-1 border border-border/60 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
                          {product.brand}
                        </Badge>
                      </Link>
                    )}
                    {product.source_site && product.source_site !== "gsmarena-mock" && (
                      <Badge variant="outline" className="text-xs border-dashed">
                        Catalog sourced from {product.source_site}
                      </Badge>
                    )}
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl lg:text-[2.1rem] font-bold leading-tight tracking-tight">
                    {product.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(product.rating || 0)
                                ? "fill-rating-star text-rating-star"
                                : "text-muted-foreground/60"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-semibold tabular-nums">{product.rating ?? "0.0"}</span>
                      <span className="text-muted-foreground">
                        ({product.reviews_count || 0} reviews)
                      </span>
                    </div>
                    <Separator orientation="vertical" className="h-4 w-px bg-border/70" />
                    <div className="flex items-center gap-1.5">
                      {availability.purchasable ? (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="font-medium text-emerald-600">In Stock</span>
                        </>
                      ) : (
                        <>
                          <PackageX className="h-4 w-4 text-destructive" />
                          <span className="font-medium text-destructive">Out of Stock</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Card className="border-primary/15 bg-gradient-to-br from-primary/[0.04] via-background to-background shadow-sm">
                  <CardContent className="p-4 sm:p-5">
                    <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
                      {availability.priceLabel}
                    </p>
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <p className="font-display font-bold text-3xl sm:text-4xl lg:text-[2.6rem] text-primary tabular-nums leading-none">
                        {availability.displayPrice}
                      </p>
                      {/* Reference/strikethrough prices remain hidden until
                          a verified catalog schema actually supplies them.
                          Never invent a discount from absent DB fields. */}

                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {availability.hasPrice ? "Prices include VAT. Delivery charges may apply depending on your location." : "Final price is set by the verified seller during checkout."}
                    </p>
                  </CardContent>
                </Card>

                {!availability.purchasable && (
                  <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/[0.07] via-amber-500/[0.02] to-background">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-amber-500/15 p-2 shrink-0">
                          <BookOpen className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <h2 className="font-semibold">Reference information, not a live offer</h2>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            This model is not currently available for checkout. The price shown is the last recorded catalog price. Specifications are provided for research and comparison.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {hasMerchantOffer && numericPrice > 0 && emiPreview && (
                  <Collapsible defaultOpen className="rounded-2xl border border-border/60 overflow-hidden bg-secondary/5">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="group w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-secondary/20 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-violet-500/10 text-violet-600 p-1.5 shrink-0">
                            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm sm:text-base">Easy EMI Plans</p>
                            <p className="text-xs text-muted-foreground">Preview installments · No extra cost</p>
                          </div>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Separator />
                      <div className="grid grid-cols-3 gap-2 sm:gap-3 p-4 sm:p-5">
                        {[
                          { months: 3, amount: emiPreview.three, label: "3 Months", accent: "primary" },
                          { months: 6, amount: emiPreview.six, label: "6 Months", accent: "violet" },
                          { months: 12, amount: emiPreview.twelve, label: "12 Months", accent: "emerald" },
                        ].map((plan) => (
                          <div key={plan.months} className="rounded-xl border border-border/60 bg-background p-3 text-center hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300">
                            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1">{plan.label}</p>
                            <p className="font-display font-bold text-base sm:text-lg text-foreground tabular-nums">
                              {formatPrice(plan.amount)}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">per month</p>
                          </div>
                        ))}
                      </div>
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                        <Link to="/emi-calculator" className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-primary hover:underline font-medium">
                          <Calculator className="h-3.5 w-3.5" />
                          Open full EMI calculator
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {product.highlights && product.highlights.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm uppercase tracking-[0.12em] text-muted-foreground">Highlights</h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                      {product.highlights.slice(0, 8).map((highlight, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm rounded-xl border border-border/50 bg-background p-3 hover:border-primary/20 hover:bg-primary/[0.02] transition-all duration-300">
                          <span className="mt-0.5 shrink-0 rounded-md bg-primary/10 text-primary p-1">
                            <Check className="w-3 h-3" />
                          </span>
                          <span className="leading-snug">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {availability.purchasable ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-0 rounded-xl border border-border/60 bg-background overflow-hidden shadow-sm">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          disabled={quantity <= 1}
                          className="p-2.5 sm:p-3 text-muted-foreground hover:text-foreground hover:bg-secondary/60 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="px-3 sm:px-5 min-w-[3.5rem] sm:min-w-[4.5rem] text-center font-semibold tabular-nums border-x border-border/60 bg-secondary/20 py-2.5 sm:py-3">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => setQuantity(q => Math.min(99, q + 1))}
                          disabled={quantity >= 99}
                          className="p-2.5 sm:p-3 text-muted-foreground hover:text-foreground hover:bg-secondary/60 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Subtotal:&nbsp;
                        <span className="font-semibold text-foreground tabular-nums">
                          {availability.hasPrice && numericPrice > 0 ? formatPrice(numericPrice * quantity) : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        className="flex-1 gap-2 h-12 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                        variant="outline"
                        size="lg"
                        onClick={handleAddToCart}
                      >
                        <ShoppingCart className="w-5 h-5" />
                        Add to Cart
                      </Button>
                      <Button
                        className="flex-1 hero-gradient gap-2 h-12 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                        size="lg"
                        onClick={handleBuyNow}
                      >
                        <Zap className="w-5 h-5 fill-current" />
                        Buy Now
                      </Button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        variant={hasItem(product.id) ? "default" : "outline"}
                        size="lg"
                        className={`gap-2 h-11 rounded-xl shadow-sm transition-all duration-300 ${hasItem(product.id) ? "bg-rose-500 hover:bg-rose-600 text-white" : "hover:-translate-y-0.5"}`}
                        onClick={handleWishlistToggle}
                      >
                        <Heart className={`w-5 h-5 ${hasItem(product.id) ? "fill-current" : ""}`} />
                        {hasItem(product.id) ? "Saved to Wishlist" : "Save for Later"}
                      </Button>
                      <Button variant="outline" size="lg" onClick={handleShare} className="gap-2 h-11 rounded-xl shadow-sm hover:-translate-y-0.5 transition-all duration-300">
                        <Share2 className="w-5 h-5" />
                        Share
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Link to={`/cat/mobiles?tab=buy${product.brand ? `&brand=${encodeURIComponent(product.brand)}` : ""}`}>
                      <Button size="lg" className="w-full hero-gradient gap-2 h-12 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                        <ShoppingCart className="h-5 w-5" /> Browse In-Stock Devices
                      </Button>
                    </Link>
                    <Link to={product.brand ? `/mobile-price/brand/${product.brand.toLowerCase()}` : "/mobile-price"}>
                      <Button size="lg" variant="outline" className="w-full gap-2 h-12 rounded-xl shadow-sm hover:-translate-y-0.5 transition-all duration-300">
                        <BookOpen className="h-5 w-5" /> Compare Models
                      </Button>
                    </Link>
                    <Button variant={hasItem(product.id) ? "default" : "outline"} size="lg" onClick={handleWishlistToggle} className={`gap-2 h-11 rounded-xl shadow-sm transition-all duration-300 ${hasItem(product.id) ? "bg-rose-500 hover:bg-rose-600 text-white" : "sm:col-span-2 hover:-translate-y-0.5"}`}>
                      <Heart className={`h-5 w-5 ${hasItem(product.id) ? "fill-current" : ""}`} />
                      {hasItem(product.id) ? "Saved to Wishlist" : "Save for Later (restock alert)"}
                    </Button>
                  </div>
                )}

                <Card className="border-primary/15 bg-gradient-to-br from-primary/[0.03] to-background overflow-hidden">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold leading-tight">Selling or upgrading from an older device?</p>
                        <p className="text-sm text-muted-foreground mt-1 leading-snug">
                          Get an instant phone valuation and use the credit toward your new purchase.
                        </p>
                      </div>
                      <Link to={valuationHref} className="shrink-0 self-start sm:self-center">
                        <Button variant="outline" className="gap-2 border-primary/25 rounded-xl hover:bg-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                          <Calculator className="h-4 w-4" />
                          Value My Old Phone
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Review our{" "}
                  <Link className="underline hover:text-foreground" to="/shipping-delivery">shipping & delivery policy</Link>,{" "}
                  <Link className="underline hover:text-foreground" to="/returns-refunds">returns & refunds</Link>, and{" "}
                  <Link className="underline hover:text-foreground" to="/marketplace-disclosure">seller & pricing disclosure</Link> before completing a purchase.
                </p>
              </div>
            </div>

            {hasDetailedSpecs && product.specs ? (
              <section className="mt-14 lg:mt-18">
                <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary mb-1">Technical Details</p>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                      Full Specifications
                      {isLaptop && <Badge variant="outline" className="ml-3 align-middle text-primary border-primary/20 bg-primary/5">Laptop</Badge>}
                      {isPhone && <Badge variant="outline" className="ml-3 align-middle text-primary border-primary/20 bg-primary/5">Smartphone</Badge>}
                    </h2>
                  </div>
                </div>
                <div className="space-y-8">
                  {Object.entries(product.specs).map(([key, value], groupIdx) => {
                    if (typeof value === "object" && value !== null) {
                      const entries = Object.entries(value as Record<string, string>);
                      return (
                        <div key={key} className="rounded-2xl border border-border/60 overflow-hidden bg-background shadow-sm hover:shadow-md transition-shadow duration-500">
                          <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-secondary/40 to-secondary/10 border-b border-border/50 flex items-center gap-3">
                            <span className="w-1 h-5 bg-primary rounded-full" />
                            <h3 className="font-semibold text-base sm:text-lg">{key}</h3>
                            <Badge variant="outline" className="ml-auto text-[10px] sm:text-xs px-2 py-0.5 opacity-70">
                              {entries.length} item{entries.length !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 divide-y divide-border/50 sm:divide-y-0 sm:grid-cols-[minmax(0,0.45fr)_minmax(0,1fr)] sm:divide-x sm:divide-border/50">
                            {entries.map(([subKey, subValue], i) => (
                              <div
                                key={subKey}
                                className="flex flex-col sm:contents"
                                style={groupIdx === 0 && i === 0 ? {} : undefined}
                              >
                                <div className="px-4 sm:px-6 py-3 text-sm font-medium text-muted-foreground sm:bg-secondary/[0.08] sm:py-3.5 leading-snug sm:border-b sm:border-border/30 last:border-b-0">
                                  {subKey}
                                </div>
                                <div className="px-4 sm:px-6 py-3 text-sm sm:py-3.5 leading-snug sm:border-b sm:border-border/30 last:border-b-0 break-words">
                                  {String(subValue)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </section>
            ) : null}

            {!hasDetailedSpecs && (
              <section className="mt-14">
                <div className="rounded-2xl border border-dashed border-border/80 p-8 sm:p-10 text-center bg-secondary/[0.04]">
                  <div className="mx-auto rounded-full bg-secondary/60 p-4 w-fit mb-4">
                    <BookOpen className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg">Detailed specifications are not available</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                    Use the product facts table below and confirm technical details directly with the manufacturer or a verified seller.
                  </p>
                </div>
              </section>
            )}

            <section className="mt-14">
              <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary mb-1">Quick Facts</p>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Product at a glance</h2>
                </div>
              </div>
              <Card className="overflow-hidden border-border/60 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  <div className="px-5 sm:px-6 py-4 bg-secondary/[0.08] border-b sm:border-b-0 sm:border-r border-border/50 flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-muted-foreground">Brand</span>
                    <span className="font-semibold text-right">{product.brand || "Not specified"}</span>
                  </div>
                  <div className="px-5 sm:px-6 py-4 border-b border-border/50 flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-muted-foreground">Category</span>
                    <span className="font-semibold text-right">{product.category || "Not specified"}</span>
                  </div>
                  <div className="px-5 sm:px-6 py-4 bg-secondary/[0.08] border-b sm:border-b-0 sm:border-r border-border/50 flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-muted-foreground">Price</span>
                    <span className="font-semibold text-right tabular-nums">
                      {availability.displayPrice}
                      {!availability.purchasable && availability.hasPrice && <span className="text-xs text-muted-foreground font-normal block">last listed</span>}
                    </span>
                  </div>
                  <div className="px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-muted-foreground">Availability</span>
                    <span className={`font-semibold text-right ${availability.purchasable ? "text-emerald-600" : "text-destructive"}`}>{availability.status}</span>
                  </div>
                  {product.updated_at && (
                    <>
                      <div className="px-5 sm:px-6 py-4 bg-secondary/[0.08] sm:border-r border-border/50 flex items-center justify-between gap-4 sm:col-span-2">
                        <span className="text-sm font-medium text-muted-foreground">Information last updated</span>
                        <span className="font-medium text-right tabular-nums text-sm">
                          {new Date(product.updated_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </Card>
              {product.source_url && product.source_site !== "gsmarena-mock" && (
                <a
                  href={product.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                >
                  View manufacturer / source information
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </section>

            <section className="mt-14">
              <AeoFaq items={productFaqs} title={`Questions about ${product.name}`} />
            </section>

            <section className="pt-14 pb-2 border-t border-border/50 mt-14">
              <ProductReviews productId={product.id} />
            </section>
          </div>

          {relatedProducts && relatedProducts.length > 0 && (
            <section className="py-14 bg-gradient-to-b from-secondary/10 via-secondary/5 to-background border-y border-border/40">
              <div className="container">
                <div className="flex items-end justify-between flex-wrap gap-3 mb-8">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary mb-1">You May Also Like</p>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Related Products</h2>
                  </div>
                  <Link to="/buy" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
                    View all products <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
                  {relatedProducts
                    .filter((p) => p.id !== product.id)
                    .slice(0, 6)
                    .map((relatedProduct) => (
                      <div key={relatedProduct.id} className="group">
                        <ProductCard product={relatedProduct} />
                      </div>
                    ))}
                </div>
              </div>
            </section>
          )}
        </main>

        <Footer />
      </div>
    </TooltipProvider>
  );
}
