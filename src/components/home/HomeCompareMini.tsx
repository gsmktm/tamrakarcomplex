import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GitCompare, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/useProducts";
import { Product } from "@/types/product";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PhoneSelectorProps {
  selected: Product | null;
  onSelect: (product: Product) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  placeholder: string;
}

export const HomeCompareMini = () => {
  const navigate = useNavigate();
  const { data: products } = useProducts();

  const [phone1, setPhone1] = useState<Product | null>(null);
  const [phone2, setPhone2] = useState<Product | null>(null);
  const [open1, setOpen1] = useState(false);
  const [open2, setOpen2] = useState(false);

  const handleCompare = () => {
    if (phone1 && phone2) {
      navigate(`/compare?phone1=${phone1.id}&phone2=${phone2.id}`);
    }
  };

  const PhoneSelector = ({ selected, onSelect, open, setOpen, placeholder }: PhoneSelectorProps) => (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-24 rounded-2xl border-2 border-dashed flex-col gap-2 hover:border-primary hover:bg-primary/5"
        >
          {selected ? (
            <div className="flex flex-col items-center gap-1">
              <span className="font-bold text-sm line-clamp-1">{selected.name}</span>
              <span className="text-xs text-muted-foreground">{selected.brand}</span>
            </div>
          ) : (
            <>
              <Plus className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs font-bold uppercase text-muted-foreground">{placeholder}</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 rounded-2xl overflow-hidden" align="start">
        <Command>
          <CommandInput placeholder="Search phone..." />
          <CommandList>
            <CommandEmpty>No phone found.</CommandEmpty>
            <CommandGroup>
              {products?.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.name}
                  onSelect={() => {
                    onSelect(product);
                    setOpen(false);
                  }}
                  className="p-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <img src={product.image} className="w-8 h-8 object-contain" alt="" />
                    <div>
                      <p className="font-bold text-sm">{product.name}</p>
                      <p className="text-[10px] text-muted-foreground">{product.brand}</p>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto bg-slate-900 rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden">
          {/* Decoration */}
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary font-bold text-xs uppercase tracking-wider">
                <GitCompare className="h-3 w-3" />
                Side-by-Side
              </div>
              <h2 className="text-4xl font-black tracking-tight">Compare Phones</h2>
              <p className="text-slate-400 text-lg">
                Confused between two models? Compare specs, features, and prices 
                to make the right decision.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <PhoneSelector 
                    selected={phone1} 
                    onSelect={setPhone1} 
                    open={open1} 
                    setOpen={setOpen1} 
                    placeholder="Select Phone 1" 
                  />
                </div>
                <div className="font-black text-muted-foreground italic">VS</div>
                <div className="flex-1">
                  <PhoneSelector 
                    selected={phone2} 
                    onSelect={setPhone2} 
                    open={open2} 
                    setOpen={setOpen2} 
                    placeholder="Select Phone 2" 
                  />
                </div>
              </div>

              <Button 
                className="w-full h-14 rounded-2xl text-lg font-black"
                disabled={!phone1 || !phone2}
                onClick={handleCompare}
              >
                Compare Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
