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
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C49A4A]/60 hover:shadow-lg focus-within:border-primary focus-within:shadow-md">
      <Link
        to={"/product/" + product.slug}
        className="flex min-w-0 flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        aria-label={product.name + (outOfStock ? " — out of stock" : "") + " — view product details"}
      >
        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-secondary/30">
          <SafeImage
            src={thumbnail}
            alt={product.name}
            className="h-full w-full object-contain p-5 transition-transform duration-300 group-hover:scale-[1.035] motion-reduce:transform-none"
            aspect="square"
            loading="lazy"
            width={320}
            height={320}
          />
          {product.featured === true && !outOfStock && (
            <span className="absolute right-3 top-3 rounded-full border border-[#C49A4A]/50 bg-[#F7EEDC] px-2.5 py-1 text-[10px] font-bold text-[#845C1C]">
              Featured
            </span>
          )}
          {product.rating != null && product.rating > 0 && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/95 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" aria-hidden="true" />
              {product.rating}
            </span>
          )}
          {outOfStock && (
            <span className="absolute bottom-3 left-3 rounded-lg bg-background/95 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
              Out of stock
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3">
          {product.brand && (
            <span className="text-[10px] font-bold uppercase tracking-[.13em] text-muted-foreground">{product.brand}</span>
          )}
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5 text-foreground transition-colors group-hover:text-primary">
            {product.name}
          </h3>
          {specsBadges.length > 0 && (
            <div className="flex flex-wrap gap-1.5" aria-label="Specifications">
              {specsBadges.map((badge) => (
                <span key={badge} className="rounded-md border border-border bg-muted/50 px-2 py-1 text-[10px] font-medium text-muted-foreground">
                  {badge}
                </span>
              ))}
            </div>
          )}
          <div className="mt-auto pt-2">
            <p className="font-display text-base font-extrabold text-foreground">{product.price}</p>
            {previousPrice != null && product.price_value != null && previousPrice > product.price_value && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground line-through">Rs. {previousPrice.toLocaleString()}</span>
                {discountPct != null && discountPct > 0 && (
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">Save {discountPct}%</span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>

      <div className="space-y-2 border-t border-border/70 p-3">
        {outOfStock ? (
          <Link
            to={"/product/" + product.slug}
            className="flex min-h-10 items-center justify-center rounded-xl bg-secondary px-3 text-xs font-semibold text-foreground hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            View product details
          </Link>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddToCart}
              className="h-10 min-w-0 gap-1 rounded-xl px-2 text-xs"
              aria-label={"Add " + product.name + " to cart"}
            >
              <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" /> Add to cart
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleBuyNow}
              className="h-10 min-w-0 gap-1 rounded-xl bg-[#DC2626] px-2 text-xs text-white hover:bg-[#B91C1C]"
              aria-label={"Buy " + product.name + " now"}
            >
              <Zap className="h-3.5 w-3.5" aria-hidden="true" /> Buy now
            </Button>
          </div>
        )}
        <button
          type="button"
          disabled={isComparing}
          onClick={handleCompare}
          className={cn(
            "flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default disabled:opacity-65",
            isComparing && "border-primary/40 bg-primary/5 text-primary",
          )}
          aria-label={isComparing ? product.name + " added to comparison" : "Compare " + product.name}
        >
          <GitCompare className="h-3.5 w-3.5" aria-hidden="true" />
          {isComparing ? "Added to compare" : "Add to compare"}
        </button>
      </div>
    </article>
  );
}
