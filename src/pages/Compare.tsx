import { useCompareStore } from "@/hooks/useCompareStore";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft, ShoppingCart, Star, Check, Info, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { SafeImage } from "@/components/common/SafeImage";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";

export default function Compare() {
  const { items, removeItem, clear } = useCompareStore();
  const { addToCart } = useCart();

  const comparisonRows = [
    { label: "Price", key: "price" },
    { label: "Brand", key: "brand" },
    { label: "Rating", key: "rating" },
    { label: "Processor", value: "Octa-core / Hexa-core" },
    { label: "Display", value: "AMOLED / OLED 120Hz" },
    { label: "Battery", value: "4500mAh - 5000mAh" },
    { label: "Camera", value: "50MP+ Wide" },
    { label: "Storage", value: "128GB / 256GB" },
    { label: "5G Support", value: "Yes" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SEO title="Compare Products | Tamrakar Complex" description="Compare multiple mobile phones side-by-side to find the best deal." url="/compare" noindex />
      <Header />
      
      <main className="flex-1 bg-secondary/20 py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <Button variant="ghost" size="sm" asChild className="mb-4">
                <Link to="/buy" className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back to Shop
                </Link>
              </Button>
              <h1 className="text-4xl font-display font-bold tracking-tight">Compare Products</h1>
              <p className="text-muted-foreground mt-2">
                Showing {items.length} products side-by-side. {items.length < 4 && "Add up to 4."}
              </p>
            </div>
            {items.length > 0 && (
              <Button variant="outline" onClick={clear} className="text-destructive hover:bg-destructive/10 border-destructive/20 rounded-xl">
                Clear All Comparison
              </Button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-24 bg-background rounded-[2rem] border-2 border-dashed border-primary/10 shadow-sm">
              <div className="h-24 w-24 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-6">
                <GitCompareIcon className="h-12 w-12 text-primary/40" />
              </div>
              <h2 className="text-2xl font-bold">No products to compare</h2>
              <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                Go back to the shop and click "Compare Specs" on any product to see it here.
              </p>
              <Button asChild className="mt-8 hero-gradient rounded-xl px-8">
                <Link to="/buy">Browse Products</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 overflow-x-auto pb-8 scrollbar-hide">
              <div className="min-w-[1000px]">
                <div className="grid grid-cols-[240px_repeat(4,1fr)] gap-4">
                  {/* Headers / Images */}
                  <div className="flex items-end pb-4 font-bold text-lg text-muted-foreground">Specifications</div>
                  {items.map((product) => (
                    <Card key={product.id} className="relative group border-primary/5 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 rounded-2xl bg-background">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-white z-10 shadow-sm"
                        onClick={() => removeItem(product.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <CardContent className="p-6 flex flex-col items-center text-center">
                        <div className="h-40 w-full mb-6 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                          <SafeImage src={product.image} alt={product.name} className="max-h-full object-contain" />
                        </div>
                        <h3 className="font-bold text-sm line-clamp-2 h-10 mb-2 group-hover:text-primary transition-colors">{product.name}</h3>
                        <div className="text-xl font-display font-bold text-primary mb-6">{product.price}</div>
                        <Button className="w-full h-10 rounded-xl gap-2 shadow-lg shadow-primary/20" onClick={() => addToCart(product as any)}>
                          <ShoppingCart className="h-4 w-4" /> Add to Cart
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  {/* Empty slots */}
                  {[...Array(Math.max(0, 4 - items.length))].map((_, i) => (
                    <div key={`empty-${i}`} className="rounded-2xl border-2 border-dashed border-primary/10 flex flex-col items-center justify-center p-8 text-muted-foreground/20 hover:text-primary/40 hover:border-primary/30 transition-all duration-300">
                      <div className="h-16 w-16 rounded-full border-2 border-dashed border-current flex items-center justify-center mb-4">
                        <Plus className="h-8 w-8" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-[0.2em]">Add to Compare</span>
                      <Button variant="ghost" size="sm" asChild className="mt-6 rounded-lg border border-current">
                        <Link to="/buy">Browse</Link>
                      </Button>
                    </div>
                  ))}

                  <div className="col-span-full h-8" />

                  {/* Comparison Rows */}
                  {comparisonRows.map((row, idx) => (
                    <div key={idx} className="contents group/row">
                      <div className={cn(
                        "p-5 font-bold text-sm flex items-center border-b transition-colors group-hover/row:bg-primary/5",
                        idx % 2 === 0 ? "bg-background/50" : "bg-background"
                      )}>
                        {row.label}
                      </div>
                      {items.map((product) => (
                        <div key={product.id} className={cn(
                          "p-5 text-sm flex items-center justify-center border-b text-center transition-colors group-hover/row:bg-primary/5",
                          idx % 2 === 0 ? "bg-background/50" : "bg-background"
                        )}>
                          {row.key ? (
                            row.key === "rating" ? (
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rating-star/10 text-rating-star font-bold">
                                <Star className="h-4 w-4 fill-current" />
                                <span>{(product as any)[row.key] || "4.5"}</span>
                              </div>
                            ) : (
                              <span className="font-semibold text-foreground">{(product as any)[row.key] || "N/A"}</span>
                            )
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center mb-1">
                                <Check className="h-4 w-4 text-green-600" />
                              </div>
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{row.value}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {[...Array(Math.max(0, 4 - items.length))].map((_, i) => (
                        <div key={`empty-row-${i}`} className={cn(
                          "p-5 border-b opacity-20",
                          idx % 2 === 0 ? "bg-background/50" : "bg-background"
                        )} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function GitCompareIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="18" cy="18" r="3"></circle>
      <circle cx="6" cy="6" r="3"></circle>
      <path d="M13 6h3a2 2 0 0 1 2 2v7"></path>
      <path d="M11 18H8a2 2 0 0 1-2-2V9"></path>
    </svg>
  );
}
