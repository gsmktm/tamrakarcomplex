import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Search, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { mobileMasterService, PhoneModel } from "@/services/mobileMasterService";
import { useQuery } from "@tanstack/react-query";

interface ModelPickerProps {
  value?: string;
  onSelect: (model: PhoneModel) => void;
  placeholder?: string;
}

export function ModelPicker({ value, onSelect, placeholder = "Select phone model..." }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModel, setSelectedModel] = useState<PhoneModel | null>(null);

  const { data: results, isLoading } = useQuery({
    queryKey: ["model_search", searchTerm],
    queryFn: () => mobileMasterService.searchModels(searchTerm),
    enabled: searchTerm.length > 1,
  });

  // Fetch initial model if value is provided
  useEffect(() => {
    if (value && !selectedModel) {
      // In a real app, we might need a getModelById method
      // For now, we'll assume it's part of the search results or handled by the parent
    }
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedModel ? (
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              <span>{selectedModel.name}</span>
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Type model name (e.g. iPhone 17)..." 
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {isLoading && <div className="p-4 text-center text-sm">Searching...</div>}
            {!isLoading && searchTerm.length > 0 && results?.length === 0 && (
              <CommandEmpty>No model found. <Button variant="link" size="sm" className="p-0 h-auto">Create new?</Button></CommandEmpty>
            )}
            {!isLoading && searchTerm.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">Start typing to search models</div>
            )}
            <CommandGroup>
              {results?.map((model) => (
                <CommandItem
                  key={model.id}
                  value={model.id}
                  onSelect={() => {
                    setSelectedModel(model);
                    onSelect(model);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === model.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{model.name}</span>
                    <span className="text-xs text-muted-foreground">{(model as any).brands?.name} • {model.model_number || "No model no."}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
