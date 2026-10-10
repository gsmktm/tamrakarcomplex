import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useProductSearch } from "@/hooks/useProductSearch";
import { Product } from "@/types/product";
import { Skeleton } from "@/components/ui/skeleton";

const BRANDS = [
  "All Brands",
  "Ai+",
  "Apple",
  "Honor",
  "Infinix",
  "Motorola",
  "Nothing",
  "OPPO",
  "OnePlus",
  "POCO",
  "Realme",
  "Samsung",
  "Tecno",
  "Vivo",
  "Xiaomi",
  "ZTE",
];
const BUDGETS = [
  { label: "Any Budget", min: 0, max: 1000000 },
  { label: "Under 20k", min: 0, max: 20000 },
  { label: "20k - 50k", min: 20000, max: 50000 },
  { label: "50k - 100k", min: 50000, max: 100000 },
  { label: "Above 100k", min: 100000, max: 1000000 },
];
const CATEGORIES = ["All Categories", "Smartphones", "Laptops", "Tablets", "Accessories"];

export const HomePriceFinder = () => {
  const navigate = useNavigate();
  const [brand, setBrand] = useState("All Brands");
  const [budget, setBudget] = useState("Any Budget");
  const [category, setCategory] = useState("All Categories");

  const selectedBudget = BUDGETS.find(b => b.label === budget) || BUDGETS[0];
  
  const { data: products, isLoading } = useProductSearch({
    brand: brand === "All Brands" ? undefined : brand,
    minPrice: selectedBudget.min,
    maxPrice: selectedBudget.max,
    category: category === "All Categories" ? undefined : category,
    limit: 4
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (brand !== "All Brands") params.append("brand", brand);
    if (selectedBudget.min > 0) params.append("minPrice", selectedBudget.min.toString());
    if (selectedBudget.max < 1000000) params.append("maxPrice", selectedBudget.max.toString());
    if (category !== "All Categories") params.append("category", category);
    
    navigate(`/cat/mobiles?tab=buy${params.toString() ? "&" + params.toString() : ""}`);
  };

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="bg-background rounded-3xl shadow-2xl border p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-end gap-6 mb-12">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3 text-primary">
                <SlidersHorizontal className="h-6 w-6" />
                <h2 className="text-2xl font-bold tracking-tight">Live Price Finder</h2>
              </div>
              <p className="text-muted-foreground">Find the best device within your budget instantly.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Brand</label>
                  <Select value={brand} onValueChange={setBrand}>
                    <SelectTrigger className="rounded-xl h-12">
                      <SelectValue placeholder="Select Brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Budget</label>
                  <Select value={budget} onValueChange={setBudget}>
                    <SelectTrigger className="rounded-xl h-12">
                      <SelectValue placeholder="Select Budget" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUDGETS.map(b => <SelectItem key={b.label} value={b.label}>{b.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="rounded-xl h-12">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <Button size="lg" className="h-12 px-10 rounded-xl" onClick={handleSearch}>
              <Search className="h-5 w-5 mr-2" />
              View Results
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-square rounded-2xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))
            ) : products && products.length > 0 ? (
              products.map((product: Product) => (
                <div 
                  key={product.id} 
                  className="group cursor-pointer space-y-3"
                  onClick={() => navigate(`/product/${product.slug}`)}
                >
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-2 right-2">
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-lg uppercase">
                        {product.brand}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-primary font-bold">{product.price}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No products found matching your criteria.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
