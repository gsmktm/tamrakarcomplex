import { Filter } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface FilterSidebarProps {
  brands: string[];
  selectedBrand: string | null;
  onBrandChange: (brand: string) => void;
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  onPriceApply: () => void;
  onClear?: () => void;
  maxPriceLimit?: number;
}

export function FilterSidebar({
  brands,
  selectedBrand,
  onBrandChange,
  priceRange,
  setPriceRange,
  onPriceApply,
  maxPriceLimit = 300000,
}: FilterSidebarProps) {
  return (
    <div className="space-y-8">
      {/* Brand Filter */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Filter className="h-4 w-4" /> Brands
        </h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {brands.map((brand) => (
            <div key={brand} className="flex items-center gap-2">
              <Checkbox
                id={`brand-${brand}`}
                checked={selectedBrand === brand}
                onCheckedChange={() => onBrandChange(brand)}
              />
              <label
                htmlFor={`brand-${brand}`}
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer w-full py-1"
              >
                {brand}
              </label>
            </div>
          ))}
          {brands.length === 0 && (
            <div className="text-sm text-muted-foreground">No brands found</div>
          )}
        </div>
      </div>

      <Separator />

      {/* Price Filter */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">Price Range</h3>
        <div className="space-y-4">
          <Slider
            defaultValue={[0, maxPriceLimit]}
            max={maxPriceLimit}
            step={1000}
            value={priceRange}
            onValueChange={(val) => setPriceRange(val as [number, number])}
            className="my-6"
          />
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={priceRange[0]}
              onChange={(e) =>
                setPriceRange([Number(e.target.value), priceRange[1]])
              }
              className="h-8 text-xs"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              value={priceRange[1]}
              onChange={(e) =>
                setPriceRange([priceRange[0], Number(e.target.value)])
              }
              className="h-8 text-xs"
            />
          </div>
          <Button size="sm" className="w-full" onClick={onPriceApply}>
            Apply Price
          </Button>
        </div>
      </div>
    </div>
  );
}
