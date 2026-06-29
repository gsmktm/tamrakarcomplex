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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Edit, Plus, Trash2, Loader2, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";

interface DeviceCatalogRow {
  id: string;
  brand: string;
  model: string;
  variant?: string | null;
  storage?: string | null;
  ram?: string | null;
  release_year?: number | null;
  canonical_slug: string;
}

type DeviceCatalogInsert = Omit<DeviceCatalogRow, "id"> & { id?: string };

interface DeviceWithPrice extends DeviceCatalogRow {
  base_price?: number | null;
  rule_id?: string | null;
}

export const DeviceCatalogTable = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DeviceCatalogRow | null>(null);
  const [editingPrice, setEditingPrice] = useState<{ id: string; price: string } | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: devices, isLoading } = useQuery<DeviceWithPrice[]>({
    queryKey: ["admin-device-catalog"],
    queryFn: async () => {
      const [catalogResult, rulesResult] = await Promise.all([
        (supabase as any).from("device_catalog").select("*").order("brand", { ascending: true }),
        supabase.from("valuation_rules").select("id, device_id, base_price"),
      ]);

      if (catalogResult.error) throw catalogResult.error;

      const ruleMap = new Map(
        (rulesResult.data ?? []).map((r) => [r.device_id, { id: r.id, base_price: r.base_price }])
      );

      return (catalogResult.data ?? []).map((d) => ({
        ...d,
        base_price: ruleMap.get(d.id)?.base_price ?? null,
        rule_id: ruleMap.get(d.id)?.id ?? null,
      }));
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: DeviceCatalogInsert) => {
      const { error } = await (supabase as any).from("device_catalog").upsert(values).select();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-device-catalog"] });
      setIsOpen(false);
      setEditingItem(null);
      toast({ title: "Success", description: "Device catalog updated" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("device_catalog").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-device-catalog"] });
      toast({ title: "Success", description: "Device deleted" });
    },
  });

  const savePriceMutation = useMutation({
    mutationFn: async ({ deviceId, ruleId, price }: { deviceId: string; ruleId: string | null | undefined; price: number }) => {
      const payload = {
        device_id: deviceId,
        base_price: price,
        demand_factor: 1.0,
        age_depreciation: { perMonth: 0.01, capMonths: 48 },
        condition_factors: { new: 1.0, like_new: 0.85, used: 0.7, fair: 0.5 },
        defect_adjustments: {
          screen_crack: 8000,
          battery_weak: 4000,
          camera_issue: 5000,
          face_id_fail: 6000,
          speaker_issue: 2000,
          buttons_issue: 1500,
        },
      };

      if (ruleId) {
        const { error } = await supabase
          .from("valuation_rules")
          .update({ base_price: price })
          .eq("id", ruleId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("valuation_rules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-device-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["admin-valuation-rules"] });
      setEditingPrice(null);
      toast({ title: "Price saved" });
    },
    onError: (error: unknown) => {
      toast({ title: "Error saving price", description: getErrorMessage(error), variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updates: DeviceCatalogInsert = {
      brand: String(formData.get("brand") || ""),
      model: String(formData.get("model") || ""),
      variant: String(formData.get("variant") || "").trim() || null,
      storage: String(formData.get("storage") || "").trim() || null,
      ram: String(formData.get("ram") || "").trim() || null,
      release_year: formData.get("release_year") ? Number(formData.get("release_year")) : null,
      canonical_slug: String(formData.get("canonical_slug") || ""),
    };

    if (editingItem) {
      updates.id = editingItem.id;
    }

    upsertMutation.mutate(updates);
  };

  const filtered = (devices ?? []).filter((d) =>
    !search ||
    d.brand.toLowerCase().includes(search.toLowerCase()) ||
    d.model.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Device Catalog</h2>
          <Badge variant="secondary">{devices?.length ?? 0} devices</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search brand or model…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 h-9"
          />
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setEditingItem(null);
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Device</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Device" : "Add Device"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Input name="brand" defaultValue={editingItem?.brand ?? ""} required />
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input name="model" defaultValue={editingItem?.model ?? ""} required />
                </div>
                <div className="space-y-2">
                  <Label>Variant</Label>
                  <Input name="variant" defaultValue={editingItem?.variant ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label>Storage</Label>
                  <Input name="storage" defaultValue={editingItem?.storage ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label>RAM</Label>
                  <Input name="ram" defaultValue={editingItem?.ram ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label>Release Year</Label>
                  <Input name="release_year" type="number" defaultValue={editingItem?.release_year ?? ""} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Canonical Slug</Label>
                  <Input name="canonical_slug" defaultValue={editingItem?.canonical_slug ?? ""} required />
                </div>
                <Button type="submit" className="col-span-2" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Set a <strong>Sell Price</strong> per device to enable accurate valuation quotes in the sell wizard.
        Click any price cell to edit inline.
      </p>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Specs</TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  Sell Base Price (NPR)
                </div>
              </TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((device) => (
              <TableRow key={device.id}>
                <TableCell className="font-medium">{device.brand}</TableCell>
                <TableCell>{device.model}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {[device.storage, device.ram].filter(Boolean).join(" / ") || "—"}
                </TableCell>
                <TableCell>
                  {editingPrice?.id === device.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="h-8 w-32 text-sm"
                        value={editingPrice.price}
                        onChange={(e) =>
                          setEditingPrice({ id: device.id, price: e.target.value })
                        }
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setEditingPrice(null);
                          if (e.key === "Enter") {
                            const price = Number(editingPrice.price);
                            if (price > 0) {
                              savePriceMutation.mutate({
                                deviceId: device.id,
                                ruleId: device.rule_id,
                                price,
                              });
                            }
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-8 px-2 text-xs"
                        disabled={savePriceMutation.isPending}
                        onClick={() => {
                          const price = Number(editingPrice.price);
                          if (price > 0) {
                            savePriceMutation.mutate({
                              deviceId: device.id,
                              ruleId: device.rule_id,
                              price,
                            });
                          }
                        }}
                      >
                        {savePriceMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        onClick={() => setEditingPrice(null)}
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <button
                      className={`text-sm font-medium px-2 py-1 rounded hover:bg-muted transition-colors ${
                        device.base_price
                          ? "text-emerald-700"
                          : "text-muted-foreground border border-dashed"
                      }`}
                      onClick={() =>
                        setEditingPrice({
                          id: device.id,
                          price: String(device.base_price ?? ""),
                        })
                      }
                      title="Click to set valuation base price"
                    >
                      {device.base_price
                        ? `Rs. ${device.base_price.toLocaleString()}`
                        : "+ Set price"}
                    </button>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                  {device.canonical_slug}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingItem(device);
                      setIsOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Delete this device?")) deleteMutation.mutate(device.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  {search ? "No devices match your search." : "No devices in catalog. Use the Import tab to add models."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
