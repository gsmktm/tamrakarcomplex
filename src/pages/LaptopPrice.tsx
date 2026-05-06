import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useBrandsByCategory, useProductsByCategoryQuery } from "@/hooks/useProducts";
import type { ProductSortKey } from "@/hooks/useProducts";
import { ProductCard } from "@/components/products/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Laptop, Filter, ChevronDown, ArrowUpDown, X, SlidersHorizontal, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { FilterSidebar } from "@/components/products/FilterSidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SEO } from "@/components/common/SEO";

export default function LaptopPrice() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // URL State
  const page = Number(searchParams.get("page")) || 1;
  const sort = (searchParams.get("sort") as ProductSortKey | null) || "created_at";
  const order = (searchParams.get("order") as "asc" | "desc") || "desc";
  const brandParam = searchParams.get("brand");
  const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
  const search = searchParams.get("q") || "";

  // Local State
  const [priceRange, setPriceRange] = useState<[number, number]>([minPrice || 0, maxPrice || 400000]);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(search);

  // Data Fetching
  const pageSize = 20;
  const { data, isLoading, isError, error } = useProductsByCategoryQuery("Laptops", {
    search: searchQuery,
    brand: brandParam || undefined,
    sort,
    order,
    page,
    pageSize,
    inStockOnly: false, // Show all items, not just in-stock
    minPrice,
    maxPrice,
  });

  const { data: brands } = useBrandsByCategory("Laptops");

  // Handlers
  const updateParam = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === null) {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handleBrandChange = (brand: string) => {
    if (brandParam === brand) {
      updateParam("brand", null);
    } else {
      updateParam("brand", brand);
    }
  };

  const handlePriceApply = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("minPrice", priceRange[0].toString());
    newParams.set("maxPrice", priceRange[1].toString());
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
    setPriceRange([0, 400000]);
    setSearchQuery("");
  };

  const toggleCompare = (id: string) => {
    setCompareList(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id].slice(0, 3)
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam("q", searchQuery);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title="Laptop Price in Nepal 2026 - Latest Models"
        description="Find the latest laptop prices in Nepal including Gaming, Ultrabooks, MacBooks, and more. Compare specs and get the best deals at Tamrakar Complex."
        url="/laptop-price"
      />
      <Header />
      
      <main className="flex-1">
        {/* Page Header */}
        <div className="bg-category-laptop/10 py-12 border-b border-category-laptop/20">
          <div className="container">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  <Link to="/" className="hover:text-primary">Home</Link> / Laptop Price
                </div>
                <h1 className="font-display text-3xl font-bold flex items-center gap-3 text-category-laptop">
                  <Laptop className="h-8 w-8" />
                  Laptop Price in Nepal
                </h1>
                <p className="text-muted-foreground mt-2 max-w-2xl">
                   Discover the best laptops for gaming, programming, and office work. 
                   Official warranty and best price guarantee.
                </p>
              </div>
              
              {/* Mobile Filter Toggle */}
              <div className="md:hidden">
                <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" /> Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px] sm:w-[400px] overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <FilterSidebar 
                        brands={brands || []} 
                        selectedBrand={brandParam} 
                        onBrandChange={handleBrandChange}
                        priceRange={priceRange}
                        setPriceRange={setPriceRange}
                        onPriceApply={handlePriceApply}
                        maxPriceLimit={400000}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

             {/* Search Bar */}
             <form onSubmit={handleSearchSubmit} className="max-w-md relative mt-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search laptops (e.g. MacBook Pro, Legion 5)..." 
                className="pl-9 h-11 bg-background border-category-laptop/30 focus-visible:ring-category-laptop"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>
        </div>

        <div className="container py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-64 shrink-0">
              <FilterSidebar 
                brands={brands || []} 
                selectedBrand={brandParam} 
                onBrandChange={handleBrandChange}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                onPriceApply={handlePriceApply}
                maxPriceLimit={400000}
              />
            </aside>

            {/* Main Content */}
            <div className="flex-1">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-6 bg-card p-3 rounded-lg border shadow-sm">
                <div className="text-sm font-medium">
                  Showing <span className="text-primary">{data?.items.length || 0}</span> of <span className="text-primary">{data?.total || 0}</span> results
                </div>
                
                <div className="flex items-center gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 h-9">
                        <ArrowUpDown className="h-3.5 w-3.5" />
                        Sort: {sort === 'price_value' ? (order === 'asc' ? 'Price: Low to High' : 'Price: High to Low') : 'Newest'}
                        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { updateParam("sort", "created_at"); updateParam("order", "desc"); }}>
                        Newest Arrivals
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { updateParam("sort", "price_value"); updateParam("order", "asc"); }}>
                        Price: Low to High
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { updateParam("sort", "price_value"); updateParam("order", "desc"); }}>
                        Price: High to Low
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { updateParam("sort", "name"); updateParam("order", "asc"); }}>
                        Name: A to Z
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Applied Filters Tags */}
              {(brandParam || minPrice || maxPrice || (search && search.trim())) && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {brandParam && (
                    <Badge variant="secondary" className="gap-1 px-3 py-1">
                      Brand: {brandParam}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => updateParam("brand", null)} />
                    </Badge>
                  )}
                  {(minPrice || maxPrice) && (
                    <Badge variant="secondary" className="gap-1 px-3 py-1">
                      Price: Rs.{minPrice || 0} - Rs.{maxPrice || 'Max'}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete("minPrice");
                        newParams.delete("maxPrice");
                        setSearchParams(newParams);
                      }} />
                    </Badge>
                  )}
                   {search && (
                    <Badge variant="secondary" className="gap-1 px-3 py-1">
                      Search: {search}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => updateParam("q", null)} />
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={clearFilters}>
                    Clear All
                  </Button>
                </div>
              )}

              {isError ? (
                <Alert variant="destructive" className="mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Failed to load laptops</AlertTitle>
                    <AlertDescription>
                    {(error as Error | undefined)?.message || "Please check your Supabase connection and RLS policies."}
                    </AlertDescription>
                </Alert>
                ) : null}

              {/* Product Grid */}
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="article-card">
                      <Skeleton className="aspect-square" />
                      <div className="p-3 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-6 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : data && data.items.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {data.items.map((product) => (
                      <div key={product.id} className="relative group">
                        <ProductCard product={product} />
                        {/* Compare Checkbox Overlay */}
                        <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-background/90 backdrop-blur border rounded-md p-1.5 shadow-sm flex items-center gap-2">
                            <Checkbox 
                              id={`compare-${product.id}`}
                              checked={compareList.includes(product.id)}
                              onCheckedChange={() => toggleCompare(product.id)}
                            />
                            <label htmlFor={`compare-${product.id}`} className="text-xs font-medium cursor-pointer">
                              Compare
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {data.total > pageSize && (
                    <div className="mt-12 flex justify-center gap-2">
                      <Button
                        variant="outline"
                        disabled={page <= 1}
                        onClick={() => {
                          updateParam("page", (page - 1).toString());
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center px-4 font-medium text-sm border rounded-md">
                        Page {page} of {Math.ceil(data.total / pageSize)}
                      </div>
                      <Button
                        variant="outline"
                        disabled={page >= Math.ceil(data.total / pageSize)}
                        onClick={() => {
                          updateParam("page", (page + 1).toString());
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-24 border rounded-xl bg-card/50 border-dashed">
                  <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Laptop className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">No laptops found</h3>
                  <p className="text-muted-foreground mb-4">Try adjusting your filters or search criteria.</p>
                  <Button onClick={clearFilters}>Clear All Filters</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Compare Bar */}
      {compareList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300">
          <div className="container flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-bold text-sm hidden sm:inline">Compare ({compareList.length}/3):</span>
              <div className="flex gap-2">
                {data?.items.filter(p => compareList.includes(p.id)).map(p => (
                   <div key={p.id} className="relative bg-secondary/50 px-3 py-1 rounded-full text-xs flex items-center gap-2 border">
                      <span className="truncate max-w-[100px]">{p.name}</span>
                      <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => toggleCompare(p.id)} />
                   </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" size="sm" onClick={() => setCompareList([])}>Clear</Button>
              <Button size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" /> Compare Now
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
