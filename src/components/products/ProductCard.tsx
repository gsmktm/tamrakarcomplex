import { useNavigate, Link } from "react-router-dom";
import { Star, ShoppingCart, Zap, GitCompare } from "lucide-react";
import { Product } from "@/hooks/useProducts";
import { SafeImage } from "@/components/common/SafeImage";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useCompareStore } from "@/hooks/useCompareStore";
import { cn } from "@/lib/utils";
import { resolveProductDetailImage } from "@/lib/productPresentation";

interface ProductCardProps {
  product: Product;
}

function extractPreviousPrice(product: Product): number | null {
  const specs = product.specs as Record<string, unknown> | null;
  if (specs && typeof specs.previousPrice === "number") return specs.previousPrice as number;
  if (specs && typeof specs.previousPrice === "string") {
    const n = Number(specs.previousPrice);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function extractSpecsBadges(product: Product): string[] {
  const badges: string[] = [];
  const specs = product.specs as Record<string, unknown> | null;
  // Prefer structured specs if present
  if (specs) {
    const ram = (specs.ram ?? specs.RAM ?? specs.memory) as string | undefined;
    const storage = (specs.storage ?? specs.Storage ?? specs.rom) as string | undefined;
    if (ram && typeof ram === "string") badges.push(String(ram));
    if (storage && typeof storage === "string") badges.push(String(storage));
  }
  // Fallback: parse from name like "Galaxy A07 (4+64GB)" or "Moto G05 (4+64GB)"
  if (badges.length === 0) {
    const match = product.name.match(/\(\s*(\d+\s*\+\s*\d+\s*GB|\d+\s*GB)[^)]*\)/i);
    if (match) badges.push(match[1].replace(/\s+/g, " ").toUpperCase());
  }
  // Category hint as third badge when available
  if (badges.length === 1 && product.category && product.category !== "Smartphones") {
    badges.push(product.category);
  }
  return badges.slice(0, 2);
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { addItem, items } = useCompareStore();
  const navigate = useNavigate();

  const isComparing = items.some((item) => item.id === product.id);
  const outOfStock = product.in_stock === false;
  const thumbnail = resolveProductDetailImage(product);
  const previousPrice = extractPreviousPrice(product);
  const specsBadges = extractSpecsBadges(product);
  const isNew = product.id.startsWith("latest-") || product.featured === true;
  const discountPct =
    previousPrice && product.price_value && previousPrice > product.price_value
      ? Math.round(((previousPrice - (product.price_value as number)) / previousPrice) * 100)
      : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      image: thumbnail,
      price: product.price,
      brand: product.brand,
      rating: product.rating,
    });
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    navigate("/checkout");
  };

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group relative flex flex-col bg-card border border-border hover:border-primary/40 transition-colors duration-200 h-full"
      aria-label={`${product.name}${outOfStock ? " — out of stock" : ""}`}
    >
      {/* Image */}
      <div className="relative aspect-square bg-secondary/40 overflow-hidden">
        <SafeImage
          src={thumbnail}
          alt={product.name}
          className="h-full w-full object-contain p-3 sm:p-4"
          aspect="square"
          loading="lazy"
          width={320}
          height={320}
        />

        {/* New badge — GSMArena-style top-right */}
        {isNew && !outOfStock && (
          <div className="absolute top-2 right-2 bg-success text-success-foreground px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest leading-none">
            New
          </div>
        )}

        {/* Rating */}
        {product.rating && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-foreground/90 text-background px-2 py-0.5 text-[10px] font-semibold">
            <Star className="w-2.5 h-2.5 fill-rating-star text-rating-star" />
            {product.rating}
          </div>
        )}

        {/* Out of stock */}
        {outOfStock && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-border px-3 py-1 bg-background">
              Out of stock
            </span>
          </div>
        )}

        {/* Action overlay — translate + opacity only (Emil: GPU-composited only) */}
        {!outOfStock && (
          <div
            className="absolute inset-x-0 bottom-0 p-3 flex flex-col gap-2 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 bg-gradient-to-t from-foreground/80 to-transparent"
            style={{
              transition: "transform 250ms var(--ease-out-quart), opacity 250ms var(--ease-out-quart)",
            }}
          >
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 h-8 text-xs gap-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm border-none pressable"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-3 w-3" /> Add
              </Button>
              <Button
                size="sm"
                className="flex-1 h-8 text-xs gap-1 bg-background text-foreground hover:bg-secondary rounded-sm pressable"
                onClick={handleBuyNow}
              >
                <Zap className="h-3 w-3" /> Buy
              </Button>
            </div>
            <button
              className={cn(
                "w-full h-7 text-[10px] uppercase tracking-wider font-bold flex items-center justify-center gap-1.5",
                "border border-background/30 text-background hover:bg-background/10 transition-colors rounded-sm pressable",
                isComparing && "border-primary/60 text-primary bg-primary/10",
              )}
              onClick={handleCompare}
            >
              <GitCompare className="h-3 w-3" />
              {isComparing ? "In Comparison" : "Compare"}
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col p-3 gap-1">
        {product.brand && (
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {product.brand}
          </span>
        )}
        <h4 className="font-medium text-sm text-foreground line-clamp-2 leading-snug flex-1">
          {product.name}
        </h4>
        {/* Specs badges — GSMArena-style */}
        {specsBadges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {specsBadges.map((badge) => (
              <span key={badge} className="inline-flex items-center rounded-sm border border-border bg-secondary/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                {badge}
              </span>
            ))}
          </div>
        )}
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <p className="font-syne font-bold text-sm text-success">{product.price}</p>
              {previousPrice && (
                <span className="text-[11px] line-through text-muted-foreground">Rs. {previousPrice.toLocaleString()}</span>
              )}
            </div>
            {discountPct !== null && discountPct > 0 && (
              <span className="text-[10px] font-bold text-success">Save {discountPct}%</span>
            )}
          </div>
          {/* Mobile-visible add — hover overlay is desktop-only (skill: hover-vs-tap) */}
          {!outOfStock && (
            <button
              type="button"
              onClick={handleAddToCart}
              aria-label={`Add ${product.name} to cart`}
              className="md:hidden inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground active:scale-95 transition-transform"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Saffron sweep on hover */}
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary group-hover:w-full"
        style={{
          transition: "width 300ms var(--ease-out-quart)",
        }}
      />
    </Link>
  );
}
