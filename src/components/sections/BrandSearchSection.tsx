import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/products/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Product } from "@/hooks/useProducts";
import { Smartphone, Laptop, Banknote, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const smartphoneBrands = [
  { name: "Samsung", slug: "samsung", code: "SA" },
  { name: "Apple", slug: "apple", code: "AP" },
  { name: "Xiaomi", slug: "xiaomi", code: "XI" },
  { name: "OnePlus", slug: "oneplus", code: "ON" },
  { name: "Vivo", slug: "vivo", code: "VI" },
  { name: "OPPO", slug: "oppo", code: "OP" },
  { name: "Realme", slug: "realme", code: "RE" },
  { name: "Motorola", slug: "motorola", code: "MO" },
  { name: "Nothing", slug: "nothing", code: "NO" },
  { name: "Honor", slug: "honor", code: "HO" },
  { name: "Infinix", slug: "infinix", code: "IN" },
  { name: "Tecno", slug: "tecno", code: "TE" },
];

const laptopBrands = [
  { name: "Apple", slug: "apple", code: "AP" },
  { name: "Dell", slug: "dell", code: "DE" },
  { name: "HP", slug: "hp", code: "HP" },
  { name: "Lenovo", slug: "lenovo", code: "LE" },
  { name: "ASUS", slug: "asus", code: "AS" },
  { name: "Acer", slug: "acer", code: "AC" },
  { name: "MSI", slug: "msi", code: "MS" },
  { name: "Microsoft", slug: "microsoft", code: "MI" },
];

const budgetRanges = [
  { label: "Under 20K", fullLabel: "Under Rs. 20,000", min: 0, max: 20000, color: "bg-green-100 text-green-700 hover:bg-green-200" },
  { label: "20K - 30K", fullLabel: "Rs. 20,000 - 30,000", min: 20000, max: 30000, color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
  { label: "30K - 50K", fullLabel: "Rs. 30,000 - 50,000", min: 30000, max: 50000, color: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
  { label: "50K - 80K", fullLabel: "Rs. 50,000 - 80,000", min: 50000, max: 80000, color: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
  { label: "80K - 1L", fullLabel: "Rs. 80,000 - 1 Lakh", min: 80000, max: 100000, color: "bg-pink-100 text-pink-700 hover:bg-pink-200" },
  { label: "Above 1L", fullLabel: "Above Rs. 1 Lakh", min: 100000, max: 1000000, color: "bg-rose-100 text-rose-700 hover:bg-rose-200" },
];

interface BrandSearchSectionProps {
    settings?: {
        title?: string;
        showLogos?: boolean;
    };
}

export function BrandSearchSection({ settings = {} }: BrandSearchSectionProps) {
  const { title = "Gadget Search", showLogos = true } = settings;
  const [selectedBrand, setSelectedBrand] = useState<string | null>("Samsung");
  const [selectedBudget, setSelectedBudget] = useState<{ min: number; max: number; label: string; fullLabel: string } | null>(null);
  const [activeTab, setActiveTab] = useState("smartphone");

  const { data: products, isLoading } = useQuery({
    queryKey: ["brand-showcase", selectedBrand, selectedBudget, activeTab],
    queryFn: async () => {
      let query = supabase.from("products").select("*").limit(6);

      if (activeTab === "budget" && selectedBudget) {
         query = query.gte("price_value", selectedBudget.min).lte("price_value", selectedBudget.max);
      } else if (selectedBrand) {
         query = query.eq("brand", selectedBrand);
         if (activeTab === "smartphone") query = query.ilike("category", "%Smartphone%");
         if (activeTab === "laptop") query = query.ilike("category", "%Laptop%");
      } else {
        return [];
      }

      const { data } = await query;
      return (data || []) as Product[];
    },
    // Enable if brand is selected OR (budget tab is active AND budget is selected)
    enabled: !!selectedBrand || (activeTab === "budget" && !!selectedBudget),
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "smartphone") {
        setSelectedBrand("Samsung");
        setSelectedBudget(null);
    }
    if (value === "laptop") {
        setSelectedBrand("Apple");
        setSelectedBudget(null);
    }
    if (value === "budget") {
        setSelectedBrand(null);
        // Default to first budget range
        setSelectedBudget(budgetRanges[0]); 
    }
  };

  const handleBrandClick = (brandName: string) => {
    setSelectedBrand(brandName);
    setSelectedBudget(null);
  };

  const handleBudgetClick = (range: typeof budgetRanges[0]) => {
      setSelectedBudget(range);
      setSelectedBrand(null);
  };

  return (
    <section className="py-12 bg-background">
      <div className="container">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-display font-bold">{title}</h2>
          <p className="text-muted-foreground mt-2">Find products by brand or budget</p>
        </div>

        <Tabs defaultValue="smartphone" className="w-full" onValueChange={handleTabChange}>
          <div className="flex justify-center mb-8">
            <TabsList className="bg-secondary/50 p-1 rounded-full h-auto gap-1">
              <TabsTrigger 
                value="smartphone" 
                className="rounded-full px-4 py-2 gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <Smartphone className="w-4 h-4" /> Smartphone
              </TabsTrigger>
              <TabsTrigger 
                value="laptop" 
                className="rounded-full px-4 py-2 gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <Laptop className="w-4 h-4" /> Laptop
              </TabsTrigger>
              <TabsTrigger 
                value="budget" 
                className="rounded-full px-4 py-2 gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <Banknote className="w-4 h-4" /> Budget
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="smartphone" className="space-y-8 animate-fade-in">
            {showLogos && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-3">
                {smartphoneBrands.map((brand) => (
                    <button
                    key={brand.slug}
                    onClick={() => handleBrandClick(brand.name)}
                    className={`group flex flex-col items-center gap-2 p-2 rounded-xl transition-all ${
                        selectedBrand === brand.name 
                        ? "bg-primary/10 scale-105" 
                        : "hover:bg-secondary/50"
                    }`}
                    >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-all ${
                        selectedBrand === brand.name
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-card border border-border text-muted-foreground group-hover:border-primary group-hover:text-primary"
                    }`}>
                        {brand.code}
                    </div>
                    <span className={`text-xs font-medium truncate w-full text-center ${
                        selectedBrand === brand.name ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    }`}>
                        {brand.name}
                    </span>
                    </button>
                ))}
                </div>
            )}
          </TabsContent>

          <TabsContent value="laptop" className="space-y-8 animate-fade-in">
            {showLogos && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-3">
                {laptopBrands.map((brand) => (
                    <button
                    key={brand.slug}
                    onClick={() => handleBrandClick(brand.name)}
                    className={`group flex flex-col items-center gap-2 p-2 rounded-xl transition-all ${
                        selectedBrand === brand.name 
                        ? "bg-primary/10 scale-105" 
                        : "hover:bg-secondary/50"
                    }`}
                    >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-all ${
                        selectedBrand === brand.name
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-card border border-border text-muted-foreground group-hover:border-primary group-hover:text-primary"
                    }`}>
                        {brand.code}
                    </div>
                    <span className={`text-xs font-medium truncate w-full text-center ${
                        selectedBrand === brand.name ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    }`}>
                        {brand.name}
                    </span>
                    </button>
                ))}
                </div>
            )}
          </TabsContent>

          <TabsContent value="budget" className="animate-fade-in space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {budgetRanges.map((range) => (
                <button
                  key={range.label}
                  onClick={() => handleBudgetClick(range)}
                  className={`group flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 ${
                    selectedBudget?.label === range.label
                      ? `${range.color} border-transparent shadow-md scale-105`
                      : "bg-card border-border/50 hover:border-primary/50 hover:shadow-sm"
                  }`}
                >
                  <span className={`text-sm font-bold mb-1 ${
                      selectedBudget?.label === range.label ? "" : "text-foreground"
                  }`}>
                    {range.label.split(" ")[0]}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider opacity-80">
                    {range.label.split(" ").slice(1).join(" ")}
                  </span>
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Product Showcase Area */}
        {((activeTab !== "budget" && selectedBrand) || (activeTab === "budget" && selectedBudget)) && (
          <div className="mt-12 animate-fade-in-up bg-secondary/10 rounded-3xl p-6 border border-border/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="w-1 h-6 bg-primary rounded-full"></span>
                {activeTab === "budget" 
                    ? `Top Picks ${selectedBudget?.fullLabel}` 
                    : `Top ${selectedBrand} Picks`
                }
              </h3>
              {activeTab === "budget" ? (
                  <Link to={`/buy?minPrice=${selectedBudget?.min}&maxPrice=${selectedBudget?.max}`} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                    View More <ArrowRight className="w-4 h-4" />
                  </Link>
              ) : (
                  <Link to={`/brand/${selectedBrand?.toLowerCase()}`} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                    View More <ArrowRight className="w-4 h-4" />
                  </Link>
              )}
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-square rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : products && products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No products found matching your criteria.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
