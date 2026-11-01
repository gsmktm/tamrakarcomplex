import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, User, Store, Package, CreditCard, ArrowRight, X, Plus, BarChart, Settings, Home, Wrench, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export function AdminGlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { role } = useAuth();

  const isSuAdmin = role === 'suadmin';
  const isStoreAdmin = role === 'storeadmin';

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc("admin_global_search", {
          p_query: query,
        });
        if (error) throw error;
        setResults(data || []);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (link: string) => {
    setOpen(false);
    navigate(link);
  };

  const getIcon = (category: string) => {
    switch (category) {
      case "user": return <User className="h-4 w-4" />;
      case "store": return <Store className="h-4 w-4" />;
      case "product": return <Package className="h-4 w-4" />;
      case "order": return <CreditCard className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:w-64 lg:w-80"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Search everything...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Search users, stores, products, orders..."
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus-visible:ring-0"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isLoading && <Loader2 className="h-4 w-4 animate-spin opacity-50" />}
        </div>
        <CommandList className="scrollbar-hide">
          <CommandEmpty>No results found for "{query}".</CommandEmpty>
          
          {!query && (
            <>
              <CommandGroup heading="Quick Actions">
                {isSuAdmin && (
                  <>
                    <CommandItem onSelect={() => handleSelect("/suadmin")} className="gap-3 px-3 py-2 cursor-pointer">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500"><Home className="h-4 w-4" /></div>
                      <span className="font-medium">SuAdmin Dashboard</span>
                    </CommandItem>
                    <CommandItem onSelect={() => handleSelect("/suadmin/users")} className="gap-3 px-3 py-2 cursor-pointer">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500"><User className="h-4 w-4" /></div>
                      <span className="font-medium">Manage All Users</span>
                    </CommandItem>
                    <CommandItem onSelect={() => handleSelect("/suadmin/analytics")} className="gap-3 px-3 py-2 cursor-pointer">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-500"><BarChart className="h-4 w-4" /></div>
                      <span className="font-medium">View Platform Analytics</span>
                    </CommandItem>
                  </>
                )}
                {isStoreAdmin && (
                  <>
                    <CommandItem onSelect={() => handleSelect("/storeadmin")} className="gap-3 px-3 py-2 cursor-pointer">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500"><Home className="h-4 w-4" /></div>
                      <span className="font-medium">Store Dashboard</span>
                    </CommandItem>
                    <CommandItem onSelect={() => handleSelect("/storeadmin/products")} className="gap-3 px-3 py-2 cursor-pointer">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500"><Plus className="h-4 w-4" /></div>
                      <span className="font-medium">Add New Product</span>
                    </CommandItem>
                  </>
                )}
                <CommandItem onSelect={() => handleSelect(isSuAdmin ? "/suadmin/settings" : "/storeadmin/settings")} className="gap-3 px-3 py-2 cursor-pointer">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-500/10 text-gray-500"><Settings className="h-4 w-4" /></div>
                  <span className="font-medium">Account Settings</span>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Services">
                <CommandItem onSelect={() => handleSelect(isSuAdmin ? "/suadmin/repairs" : "/storeadmin/repairs")} className="gap-3 px-3 py-2 cursor-pointer">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500"><Wrench className="h-4 w-4" /></div>
                  <span className="font-medium">Repair Requests</span>
                </CommandItem>
                <CommandItem onSelect={() => handleSelect(isSuAdmin ? "/suadmin/unlocking" : "/storeadmin/unlocking")} className="gap-3 px-3 py-2 cursor-pointer">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-500"><Unlock className="h-4 w-4" /></div>
                  <span className="font-medium">Unlocking Service</span>
                </CommandItem>
              </CommandGroup>
            </>
          )}

          {results.length > 0 && (
            <div className="p-2">
              {['user', 'store', 'product', 'order'].map((cat) => {
                const catResults = results.filter(r => r.category === cat);
                if (catResults.length === 0) return null;

                return (
                  <CommandGroup key={cat} heading={cat.charAt(0).toUpperCase() + cat.slice(1) + 's'}>
                    {catResults.map((item) => (
                      <CommandItem
                        key={item.id}
                        onSelect={() => handleSelect(item.link)}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          {getIcon(item.category)}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{item.title}</span>
                            {item.status !== 'active' && item.status !== 'published' && (
                              <Badge variant="outline" className="text-[10px] h-4">
                                {item.status}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {item.subtitle}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </div>
          )}

          {!query && (
            <div className="p-8 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
              <p className="text-sm text-muted-foreground">
                Type at least 2 characters to search across the entire platform.
              </p>
            </div>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
