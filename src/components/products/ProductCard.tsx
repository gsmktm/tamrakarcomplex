import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
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

  const isComparing = items.some(item => item.id === product.id);

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
      rating: product.rating
    });
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    navigate("/checkout");
  };

  return (
    <div className="group relative block h-full">
      <Link to={`/product/${product.slug}`} className="block h-full">
        <div className="article-card h-full flex flex-col group-hover:border-primary/50 transition-colors">
          <div className="relative aspect-square bg-secondary/35 p-4 flex items-center justify-center overflow-hidden">
            <SafeImage
              src={product.image}
              alt={product.name}
              className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-110"
              aspect="square"
            />
            
            {/* Rating Badge */}
            {product.rating && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-foreground/85 text-primary-foreground px-2 py-0.5 rounded-full text-xs border border-white/10">
                <Star className="w-3 h-3 fill-rating-star text-rating-star" />
                {product.rating}
              </div>
            )}

            {/* Hover Actions Overlay */}
            {product.in_stock !== false && (
                <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col gap-2 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                    <div className="flex gap-2">
                        <Button 
                            size="sm" 
                            className="flex-1 h-8 text-xs gap-1 bg-primary hover:bg-primary/90 text-white border-none shadow-md"
                            onClick={handleAddToCart}
                        >
                            <ShoppingCart className="h-3 w-3" /> Add
                        </Button>
                        <Button 
                            size="sm" 
                            variant="secondary"
                            className="flex-1 h-8 text-xs gap-1 bg-white text-black hover:bg-white/90 shadow-md"
                            onClick={handleBuyNow}
                        >
                            <Zap className="h-3 w-3 fill-current" /> Buy
                        </Button>
                    </div>
                    <Button 
                        size="sm" 
                        variant="outline"
                        className={cn(
                            "w-full h-8 text-[10px] uppercase tracking-wider font-bold gap-2 border-white/20 hover:border-white/50 bg-black/40 text-white hover:bg-black/60",
                            isComparing && "text-primary border-primary/50 bg-primary/10"
                        )}
                        onClick={handleCompare}
                    >
                        <GitCompare className="h-3 w-3" /> 
                        {isComparing ? "In Comparison" : "Compare Specs"}
                    </Button>
                </div>
            )}
          </div>
          
          <div className="p-3 flex-1 flex flex-col">
            {product.brand && (
              <span className="text-xs text-muted-foreground mb-1">{product.brand}</span>
            )}
            <h4 className="font-medium text-sm text-card-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
              {product.name}
            </h4>
            <div className="mt-auto flex items-center justify-between gap-2">
              <p className="text-primary font-display font-bold">
                {product.price}
              </p>
              {product.in_stock === false && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-destructive/10 text-destructive font-semibold">
                  Out of stock
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
