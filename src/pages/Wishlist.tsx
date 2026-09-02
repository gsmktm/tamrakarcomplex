import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SEO } from "@/components/common/SEO";
import { SafeImage } from "@/components/common/SafeImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/hooks/useWishlist";

export default function Wishlist() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { items, clearWishlist, removeItem } = useWishlist();
  const itemPath = (product: (typeof items)[number]) => product.source_type === "store_product"
    ? `/marketplace/listing/${product.store_product_id || product.id}`
    : `/product/${product.slug}`;

  const handleMoveToCart = (productId: string) => {
    const product = items.find((entry) => entry.id === productId);
    if (!product) {
      return;
    }

    addToCart(product);
    removeItem(productId);
    toast.success("Moved to cart");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEO
        title="Wishlist"
        description="Save devices you want to compare, revisit, or buy later."
        url="/wishlist"
        noindex
      />
      <Header />

      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/25 py-12">
          <div className="container">
            <div className="max-w-2xl space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Saved Devices</div>
              <h1 className="font-display text-4xl font-bold tracking-tight">Your Wishlist</h1>
              <p className="text-lg text-muted-foreground">
                Keep shortlisted products in one place, then jump back into checkout whenever you are ready.
              </p>
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="container">
            {items.length === 0 ? (
              <div className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-dashed border-border/70 bg-card/60 px-6 py-16 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Heart className="h-7 w-7" />
                </div>
                <h2 className="font-display text-2xl font-bold">Nothing saved yet</h2>
                <p className="mt-3 text-muted-foreground">
                  Save phones, laptops, and accessories from the product page to build your shortlist.
                </p>
                <Button className="mt-6 hero-gradient" onClick={() => navigate("/buy")}>
                  Browse Gadgets
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-card/70 p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Saved products</div>
                    <div className="font-display text-2xl font-bold">{items.length} items in wishlist</div>
                  </div>
                  <Button variant="outline" className="gap-2" onClick={clearWishlist}>
                    <Trash2 className="h-4 w-4" />
                    Clear Wishlist
                  </Button>
                </div>

                <div className="grid gap-4">
                  {items.map((product) => (
                    <Card key={product.id} className="overflow-hidden border-border/60 bg-card/70">
                      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
                        <Link to={itemPath(product)} className="shrink-0">
                          <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-secondary/40 p-4">
                            <SafeImage src={product.image} alt={product.name} className="h-full w-full object-contain" aspect="square" />
                          </div>
                        </Link>

                        <div className="min-w-0 flex-1 space-y-2">
                          {product.brand ? <div className="text-sm text-muted-foreground">{product.brand}</div> : null}
                          <Link to={itemPath(product)} className="block font-display text-xl font-semibold transition-colors hover:text-primary">
                            {product.name}
                          </Link>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span>{product.category}</span>
                            {product.in_stock === false ? <span className="text-destructive">Out of stock</span> : <span className="text-primary">In stock</span>}
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 md:min-w-[220px]">
                          <div className="font-display text-2xl font-bold text-primary">{product.price}</div>
                          <Button className="gap-2" onClick={() => handleMoveToCart(product.id)} disabled={product.in_stock === false}>
                            <ShoppingCart className="h-4 w-4" />
                            Move to Cart
                          </Button>
                          <Button variant="outline" onClick={() => removeItem(product.id)}>
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
