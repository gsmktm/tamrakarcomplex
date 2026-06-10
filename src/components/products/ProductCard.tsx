import { useNavigate, Link } from "react-router-dom";
import { Star, ShoppingCart, Zap, GitCompare } from "lucide-react";
import { Product } from "@/hooks/useProducts";
import { SafeImage } from "@/components/common/SafeImage";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useCompareStore } from "@/hooks/useCompareStore";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { addItem, items } = useCompareStore();
  const navigate = useNavigate();

  const isComparing = items.some((item) => item.id === product.id);
  const outOfStock = product.in_stock === false;

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
      image: product.image,
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
          src={product.image}
          alt={product.name}
          className="h-full w-full object-contain p-5"
          aspect="square"
          loading="lazy"
        />

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
        <p className="font-syne font-bold text-sm text-foreground mt-1">{product.price}</p>
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
