import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Smartphone, Store, Wrench, RefreshCw, ShoppingBag, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const HomeSearchBox = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim()) {
      navigate(`/cat/mobiles?tab=buy&q=${encodeURIComponent(query.trim())}`);
    }
  };

  const quickLinks = [
    { label: "Check Mobile Price", href: "/mobile-price", icon: Smartphone },
    { label: "Sell Phone", href: "/sell-your-phone", icon: PlusCircle },
    { label: "Book Repair", href: "/repair", icon: Wrench },
    { label: "Marketplace", href: "/marketplace", icon: ShoppingBag },
    { label: "Find Store", href: "/stores", icon: Store },
    { label: "Join as Store", href: "/stores/apply", icon: PlusCircle },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <form onSubmit={handleSearch} className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
        </div>
        <Input
          type="text"
          placeholder="Search iPhone, Samsung, repair, store, used phone..."
          className="w-full h-16 pl-14 pr-32 text-lg rounded-2xl border-2 border-primary/20 focus:border-primary shadow-xl bg-background/95 backdrop-blur-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button 
          type="submit" 
          className="absolute right-2 top-2 bottom-2 px-8 rounded-xl"
        >
          Search
        </Button>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickLinks.map((link) => (
          <Button
            key={link.label}
            variant="outline"
            size="sm"
            className="h-auto py-3 flex-col gap-2 rounded-xl bg-background/50 backdrop-blur-sm hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all border-dashed"
            onClick={() => navigate(link.href)}
          >
            <link.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{link.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
