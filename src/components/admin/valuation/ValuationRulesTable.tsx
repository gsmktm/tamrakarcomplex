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
import type { DeviceCatalogRow, ValuationRuleInsert, ValuationRuleRow } from "@/types/app";

type ValuationRuleView = ValuationRuleRow & {
  canonical_slug: string;
};

export const ValuationRulesTable = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ValuationRuleView | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  type DeviceCatalogLookup = Pick<DeviceCatalogRow, "id" | "brand" | "model" | "canonical_slug">;

  const { data: devices = [] } = useQuery<DeviceCatalogLookup[]>({
    queryKey: ["admin-device-catalog", "lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_catalog")
        .select("id, brand, model, canonical_slug")
        .order("brand", { ascending: true });

      if (error) throw error;
      return (data ?? []) as DeviceCatalogLookup[];
    },
  });

  const { data: rules, isLoading } = useQuery<ValuationRuleView[]>({
    queryKey: ["admin-valuation-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("valuation_rules")
        .select("*")
        .order("last_updated", { ascending: false });
      
      if (error) throw error;
      return (data ?? []).map((rule) => ({
        ...rule,
        canonical_slug: devices.find((device) => device.id === rule.device_id)?.canonical_slug || "",
      }));
    },
    enabled: devices.length > 0,
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: ValuationRuleInsert) => {
      const { error } = await supabase
        .from("valuation_rules")
        .upsert(values)
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
      const device = devices.find((item) => item.canonical_slug === canonicalSlug);
      if (!device) {
        throw new Error("Select a valid device slug from the device catalog first.");
      }

      const updates: ValuationRuleInsert = {
        device_id: device.id,
        base_price: Number(formData.get("base_price")),
        demand_factor: formData.get("demand_factor") ? Number(formData.get("demand_factor")) : null,
        age_depreciation: JSON.parse(String(formData.get("age_depreciation") || "{}")) as Json,
        condition_factors: JSON.parse(String(formData.get("condition_factors") || "{}")) as Json,
        defect_adjustments: JSON.parse(String(formData.get("defect_adjustments") || "{}")) as Json,
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
                <Label>Device Slug (e.g. apple-iphone-13)</Label>
                <Input name="canonical_slug" list="device-slugs" defaultValue={editingItem?.canonical_slug || ""} required />
                <datalist id="device-slugs">
                  {devices.map((device) => (
                    <option key={device.id} value={device.canonical_slug || ""}>
                      {device.brand} {device.model}
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
                <Input name="demand_factor" type="number" step="0.01" defaultValue={editingItem?.demand_factor ?? 1} />
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
                <TableCell className="font-mono">{rule.canonical_slug || rule.device_id}</TableCell>
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
