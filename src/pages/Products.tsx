import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useProductsQuery, useBrandsByCategory } from "@/hooks/useProducts";
import type { ProductSortKey } from "@/hooks/useProducts";
import { ProductCard } from "@/components/products/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FilterSidebar } from "@/components/products/FilterSidebar";
import { SEO } from "@/components/common/SEO";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Filter, ChevronDown, ArrowUpDown, X, Search, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const productCategories = ["All", "Smartphones", "Laptops", "Tablets", "Earbuds", "Smartwatches", "Gaming", "Drones"];

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // URL State
  const categoryParam = searchParams.get("category") || "All";
  const page = Number(searchParams.get("page")) || 1;
  const sort = (searchParams.get("sort") as ProductSortKey | null) || "created_at";
  const order = (searchParams.get("order") as "asc" | "desc") || "desc";
  const brandParam = searchParams.get("brand");
  const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
  const search = searchParams.get("q") || "";

  // Local State
  const [activeCategory, setActiveCategory] = useState(categoryParam);
  const [searchQuery, setSearchQuery] = useState(search);
  const [priceRange, setPriceRange] = useState<[number, number]>([minPrice || 0, maxPrice || 300000]);
  const [compareList, setCompareList] = useState<string[]>([]);

  // Sync URL with Local State
  useEffect(() => {
    setActiveCategory(categoryParam);
    setSearchQuery(search);
  }, [categoryParam, search]);

  // Data Fetching
  const { data: productsData, isLoading } = useProductsQuery({
    category: activeCategory,
    page,
    pageSize: 20,
    sort,
    order,
    brand: brandParam || undefined,
    minPrice,
    maxPrice,
    search: searchQuery,
  });

  const { data: brands } = useBrandsByCategory(activeCategory);

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

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    updateParam("category", category);
    // Reset brand when changing category as brands might differ
    const newParams = new URLSearchParams(searchParams);
    newParams.set("category", category);
    newParams.delete("brand");
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam("q", searchQuery);
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
    setActiveCategory("All");
    setSearchQuery("");
    setPriceRange([0, 300000]);
  };

  const toggleCompare = (id: string) => {
    setCompareList(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id].slice(0, 3)
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title="Buy Gadgets in Nepal - Tamrakar Complex"
        description="Buy the latest smartphones, laptops, and gadgets at the best prices in Nepal. Explore verified listings from Tamrakar Complex stores."
        url="/buy"
      />
      <Header />
      
      <main className="flex-1">
        {/* Page Header */}
        <div className="bg-secondary/25 py-12 border-b border-border/60">
          <div className="container">
            <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">
              Marketplace
            </div>
            <h1 className="font-display text-4xl font-bold mb-4 flex items-center gap-3">
              <span className="w-1.5 h-10 rounded-full hero-gradient" />
              Buy Gadgets
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mb-6">
              Find and buy the latest tech from verified stores in Tamrakar Complex.
            </p>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search products..." 
                className="pl-9 h-11 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>
        </div>

        <section className="py-8">
          <div className="container">
            
            <div className="flex flex-col lg:flex-row gap-8">
               {/* Desktop Sidebar */}
               <aside className="hidden lg:block w-64 shrink-0 space-y-8">
                  <FilterSidebar 
                    brands={brands || []} 
                    selectedBrand={brandParam} 
                    onBrandChange={(b) => updateParam("brand", b === brandParam ? null : b)}
                    priceRange={priceRange}
                    setPriceRange={setPriceRange}
                    onPriceApply={handlePriceApply}
                  />
               </aside>

               {/* Main Content */}
               <div className="flex-1">
                  {/* Category Tabs & Mobile Filter */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-start sm:items-center">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full sm:w-auto">
                      {productCategories.map((category) => (
                        <button
                          key={category}
                          onClick={() => handleCategoryChange(category)}
                          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                            activeCategory === category
                              ? "hero-gradient text-primary-foreground shadow-glow border-transparent"
                              : "bg-card hover:bg-secondary text-foreground border-border/60"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                    
                    <div className="lg:hidden w-full sm:w-auto">
                        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-auto gap-2">
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
                                onBrandChange={(b) => updateParam("brand", b === brandParam ? null : b)}
                                priceRange={priceRange}
                                setPriceRange={setPriceRange}
                                onPriceApply={handlePriceApply}
                            />
                            </div>
                        </SheetContent>
                        </Sheet>
                    </div>
                  </div>

                  {/* Toolbar */}
                  <div className="flex items-center justify-between mb-6 bg-card p-3 rounded-lg border shadow-sm">
                    <div className="text-sm font-medium">
                      Showing <span className="text-primary">{productsData?.items.length || 0}</span> of <span className="text-primary">{productsData?.total || 0}</span> results
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
                    ) : productsData && productsData.items.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {productsData.items.map((product) => (
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
                        {productsData.total > 20 && (
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
                                Page {page} of {Math.ceil(productsData.total / 20)}
                            </div>
                            <Button
                                variant="outline"
                                disabled={page >= Math.ceil(productsData.total / 20)}
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
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">No products found.</p>
                        <Button variant="link" onClick={clearFilters}>Reset Filters</Button>
                    </div>
                    )}
               </div>
            </div>
          </div>
        </section>
      </main>

      {/* Sticky Compare Bar */}
      {compareList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300">
          <div className="container flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-bold text-sm hidden sm:inline">Compare ({compareList.length}/3):</span>
              <div className="flex gap-2">
                {productsData?.items.filter(p => compareList.includes(p.id)).map(p => (
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
