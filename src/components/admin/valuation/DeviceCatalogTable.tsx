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
import { Edit, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import type { DeviceCatalogInsert, DeviceCatalogRow } from "@/types/app";

export const DeviceCatalogTable = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DeviceCatalogRow | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: devices, isLoading } = useQuery<DeviceCatalogRow[]>({
    queryKey: ["admin-device-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_catalog")
        .select("*")
        .order("brand", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: DeviceCatalogInsert) => {
      const { error } = await supabase
        .from("device_catalog")
        .upsert(values)
        .select();
      
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
      const { error } = await supabase
        .from("device_catalog")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-device-catalog"] });
      toast({ title: "Success", description: "Device deleted" });
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

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Device Catalog</h2>
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
                <Input name="brand" defaultValue={editingItem?.brand} required />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input name="model" defaultValue={editingItem?.model} required />
              </div>
              <div className="space-y-2">
                <Label>Variant</Label>
                <Input name="variant" defaultValue={editingItem?.variant || ""} />
              </div>
              <div className="space-y-2">
                <Label>Storage</Label>
                <Input name="storage" defaultValue={editingItem?.storage || ""} />
              </div>
              <div className="space-y-2">
                <Label>RAM</Label>
                <Input name="ram" defaultValue={editingItem?.ram || ""} />
              </div>
              <div className="space-y-2">
                <Label>Release Year</Label>
                <Input name="release_year" type="number" defaultValue={editingItem?.release_year || ""} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Canonical Slug</Label>
                <Input name="canonical_slug" defaultValue={editingItem?.canonical_slug} required />
              </div>
              <Button type="submit" className="col-span-2" disabled={upsertMutation.isPending}>
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
              <TableHead>Brand</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>Specs</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices?.map((device) => (
              <TableRow key={device.id}>
                <TableCell>{device.brand}</TableCell>
                <TableCell>{device.model}</TableCell>
                <TableCell>{device.variant || "-"}</TableCell>
                <TableCell>{[device.storage, device.ram].filter(Boolean).join(" / ")}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{device.canonical_slug}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => {
                    setEditingItem(device);
                    setIsOpen(true);
                  }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                    if (confirm("Delete this device?")) deleteMutation.mutate(device.id);
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
