import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Store as StoreIcon, ChevronRight, Info, Search, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { STORES } from "@/data/storeData";

const FLOORS = [
  { id: "floor-5", label: "5th Floor", description: "Service Centers & Admin" },
  { id: "floor-4", label: "4th Floor", description: "Wholesale & Gaming Zone" },
  { id: "floor-3", label: "3rd Floor", description: "Laptops & Accessories" },
  { id: "floor-2", label: "2nd Floor", description: "Smartphones & Gadgets" },
  { id: "floor-1", label: "1st Floor", description: "Flagship Showrooms" },
  { id: "floor-g", label: "Ground Floor", description: "Quick Fix & Entry Level" },
];

export default function ComplexMap() {
  const [selectedFloor, setSelectedFloor] = useState("floor-1");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStores = STORES.filter(s => 
    s.floor === selectedFloor && 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen flex-col">
      <SEO title="Interactive Complex Map | Tamrakar Complex" description="Navigate through the floors of Tamrakar Complex and find your favorite stores." url="/map" />
      <Header />

      <main className="flex-1 bg-secondary/10 py-12">
        <div className="container">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar - Floor Selector */}
            <div className="w-full lg:w-80 space-y-6">
              <div>
                <h1 className="text-3xl font-display font-bold">Complex Map</h1>
                <p className="text-muted-foreground mt-2">Find stores by floor and shop number.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold tracking-widest text-muted-foreground ml-1">Select Floor</Label>
                {FLOORS.map((floor) => (
                  <button
                    key={floor.id}
                    onClick={() => setSelectedFloor(floor.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 border-2",
                      selectedFloor === floor.id 
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]" 
                        : "bg-background border-transparent hover:border-primary/20"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Layers className={cn("h-5 w-5", selectedFloor === floor.id ? "text-white" : "text-primary")} />
                      <div className="text-left">
                        <div className="font-bold text-sm">{floor.label}</div>
                        <div className={cn("text-[10px]", selectedFloor === floor.id ? "text-white/70" : "text-muted-foreground")}>
                          {floor.description}
                        </div>
                      </div>
                    </div>
                    {selectedFloor === floor.id && <ChevronRight className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Map Area */}
            <div className="flex-1 space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  className="pl-12 h-14 rounded-2xl bg-background border-none shadow-sm focus-visible:ring-primary"
                  placeholder="Search store name in this floor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Visual Map Placeholder */}
              <Card className="rounded-[2rem] overflow-hidden border-none shadow-xl bg-background aspect-[16/9] relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
                
                {/* Mock Shop Grid */}
                <div className="absolute inset-0 p-8 grid grid-cols-4 grid-rows-3 gap-4">
                  {[...Array(12)].map((_, i) => {
                    const shopNo = `${selectedFloor.split('-')[1].toUpperCase()}${String(i + 1).padStart(2, '0')}`;
                    const store = STORES.find(s => s.floor === selectedFloor && s.shop_no.endsWith(String(i + 1).padStart(2, '0')));
                    const storeUrl = store ? `/${(store as any).slug || (store as any).id}` : "#";
                    
                    return (
                      <div
                        key={i}
                        className={cn(
                          "relative group flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all cursor-pointer",
                          store ? "border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10" : "border-slate-800 bg-slate-900/50"
                        )}
                      >
                        <div className="text-[10px] font-mono text-muted-foreground mb-1">{shopNo}</div>
                        {store ? (
                          <Link to={storeUrl} className="flex flex-col items-center">
                            <StoreIcon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                            <div className="text-[10px] font-bold text-center line-clamp-1 mt-1">{store.name}</div>
                          </Link>
                        ) : (
                          <div className="text-[8px] text-slate-700 uppercase font-black tracking-tighter">Empty</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="absolute bottom-6 right-6 bg-background/80 backdrop-blur-md p-4 rounded-2xl border shadow-lg flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                    <span className="text-xs font-bold">Occupied</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border-2 border-dashed border-muted-foreground/30" />
                    <span className="text-xs font-bold text-muted-foreground">Available</span>
                  </div>
                </div>
              </Card>

              {/* Floor Store List */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Stores on {FLOORS.find(f => f.id === selectedFloor)?.label}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredStores.map((store) => (
                    <Card key={store.id} className="rounded-2xl hover:border-primary/50 transition-colors group">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                            <StoreIcon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm">{store.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-[9px] uppercase tracking-tighter">
                                Shop #{store.shop_no}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{store.category}</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/stores/inside/${store.shop_no}`}>
                            <ChevronRight className="h-5 w-5" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredStores.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-background rounded-2xl border-2 border-dashed border-muted/20">
                      <Info className="h-8 w-8 mx-auto text-muted-foreground/20 mb-3" />
                      <p className="text-muted-foreground text-sm">No stores matching your search on this floor.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={className}>
      {children}
    </span>
  );
}
