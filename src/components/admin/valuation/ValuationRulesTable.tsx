import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Edit, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";
import { getErrorMessage } from "@/lib/utils";
type ValuationRuleView = {
  id: string;
  catalog_product_id: string;
  base_price: number;
  demand_factor: number | null;
  age_depreciation: Json | null;
  condition_factors: Json | null;
  defect_adjustments: Json | null;
  canonical_slug: string;
};

export const ValuationRulesTable = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ValuationRuleView | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  type DeviceCatalogLookup = { id: string; name: string; slug: string; brand?: { name?: string | null } | null };

  const { data: devices = [] } = useQuery<DeviceCatalogLookup[]>({
    queryKey: ["admin-live-catalog", "valuation-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_products")
        .select("id, name, slug, brand:brands(name)")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as DeviceCatalogLookup[];
    },
  });

  const { data: rules, isLoading } = useQuery<ValuationRuleView[]>({
    queryKey: ["admin-valuation-rules"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("valuation_rules")
        .select("*")
        .not("catalog_product_id", "is", null)
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return (data ?? []).map((rule: any) => ({
        ...rule,
        canonical_slug: devices.find((device) => device.id === rule.catalog_product_id)?.slug || "",
      }));
    },
    enabled: devices.length > 0,
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { error } = await (supabase as any)
        .from("valuation_rules")
        .upsert(values, { onConflict: "catalog_product_id" })
        .select();
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-valuation-rules"] });
      setIsOpen(false);
      setEditingItem(null);
      toast({ title: "Success", description: "Rule updated" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("valuation_rules")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-valuation-rules"] });
      toast({ title: "Success", description: "Rule deleted" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const canonicalSlug = String(formData.get("canonical_slug") || "");
      const device = devices.find((item) => item.slug === canonicalSlug);
      if (!device) {
        throw new Error("Select a valid device slug from the device catalog first.");
      }

      const basePrice = Number(formData.get("base_price"));
      const demandFactor = Number(formData.get("demand_factor") || 1);
      if (!Number.isFinite(basePrice) || basePrice < 5000 || basePrice > 2000000) throw new Error("Base price must be between Rs. 5,000 and Rs. 2,000,000.");
      if (!Number.isFinite(demandFactor) || demandFactor < 0.5 || demandFactor > 1.5) throw new Error("Demand factor must be between 0.50 and 1.50.");
      const updates: Record<string, unknown> = {
        catalog_product_id: device.id,
        base_price: Number(formData.get("base_price")),
        demand_factor: demandFactor,
        age_depreciation: JSON.parse(String(formData.get("age_depreciation") || "{}")) as Json,
        condition_factors: JSON.parse(String(formData.get("condition_factors") || "{}")) as Json,
        defect_adjustments: JSON.parse(String(formData.get("defect_adjustments") || "{}")) as Json,
        active: true,
        updated_at: new Date().toISOString(),
      };

      if (editingItem) {
        updates.id = editingItem.id;
      }

      upsertMutation.mutate(updates);
    } catch (error: unknown) {
      toast({ title: "Invalid configuration", description: getErrorMessage(error, "Check the selected device and JSON format."), variant: "destructive" });
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Valuation Rules</h2>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setEditingItem(null);
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Rule</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Rule" : "Add Rule"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Live product slug</Label>
                <Input name="canonical_slug" list="device-slugs" defaultValue={editingItem?.canonical_slug || ""} required />
                <datalist id="device-slugs">
                  {devices.map((device) => (
                    <option key={device.id} value={device.slug || ""}>
                      {device.brand?.name} {device.name}
                    </option>
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Base Price</Label>
                <Input name="base_price" type="number" defaultValue={editingItem?.base_price} required />
              </div>
              <div className="space-y-2">
                <Label>Demand Factor</Label>
                <Input name="demand_factor" type="number" min="0.5" max="1.5" step="0.01" defaultValue={editingItem?.demand_factor ?? 1} />
                <p className="text-xs text-muted-foreground">1.00 = neutral. &gt;1.00 increases quotes. &lt;1.00 decreases quotes.</p>
              </div>
              <div className="space-y-2">
                <Label>Age Depreciation (JSON)</Label>
                <Textarea
                  name="age_depreciation"
                  className="font-mono text-xs"
                  defaultValue={JSON.stringify(editingItem?.age_depreciation || { perMonth: 0.01, capMonths: 48 }, null, 2)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Condition Factors (JSON)</Label>
                <Textarea 
                  name="condition_factors" 
                  className="font-mono text-xs"
                  defaultValue={JSON.stringify(editingItem?.condition_factors || { new: 1.0, like_new: 0.85, used: 0.7, fair: 0.5 }, null, 2)} 
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Defect Adjustments (JSON)</Label>
                <Textarea 
                  name="defect_adjustments" 
                  className="font-mono text-xs"
                  defaultValue={JSON.stringify(editingItem?.defect_adjustments || {
                    screen_crack: 8000,
                    battery_weak: 4000,
                    camera_issue: 5000,
                    face_id_fail: 6000,
                    speaker_issue: 2000,
                    buttons_issue: 1500,
                  }, null, 2)} 
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">Use NPR amounts (not percentages). The estimator subtracts these from the condition-adjusted base.</p>
              </div>
              <Button type="submit" className="w-full" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Base Price</TableHead>
              <TableHead>Conditions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules?.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-mono">{rule.canonical_slug || rule.catalog_product_id}</TableCell>
                <TableCell>Rs. {rule.base_price.toLocaleString()}</TableCell>
                <TableCell className="text-xs max-w-[200px] truncate">
                  {JSON.stringify(rule.condition_factors)}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => {
                    setEditingItem(rule);
                    setIsOpen(true);
                  }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                    if (confirm("Delete this rule?")) deleteMutation.mutate(rule.id);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
