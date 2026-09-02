import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ACCESSORIES_COLUMNS } from "@/lib/supabaseColumnMaps";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Tag, Pencil, Trash2, Smartphone, Search, Filter, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ModelPicker } from "@/components/admin/ModelPicker";

import { useAuth } from "@/hooks/useAuth";

export default function AccessoryManager() {
  const { user, role } = useAuth();
  const isSuperAdmin = role === "suadmin";
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCompOpen, setIsCompOpen] = useState(false);
  const [selectedAccessory, setSelectedAccessory] = useState<any>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // For store admins, find their store
  const { data: userStore } = useQuery({
    queryKey: ["my-store-for-accessories", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("id")
        .eq("owner_user_id", user?.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && !isSuperAdmin
  });

  const activeStoreId = isSuperAdmin ? storeId : userStore?.id;

  const { data: storeWithPackage } = useQuery({
    queryKey: ["store-with-package-acc", activeStoreId],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("id, name, package_id, store_packages(name, accessory_limit)")
        .eq("id", activeStoreId)
        .maybeSingle();
      return data;
    },
    enabled: !!activeStoreId
  });

  const { data: accessories, isLoading, error: accessoriesError } = useQuery({
    queryKey: ["admin_accessories", searchTerm, activeStoreId],
    queryFn: async () => {
      try {
         let query = supabase.from("store_accessories").select(ACCESSORIES_COLUMNS.join(","));
        if (searchTerm) {
          query = query.ilike("title", `%${searchTerm}%`);
        }
        if (activeStoreId) {
          query = query.eq("store_id", activeStoreId);
        }
        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) throw error;
        return data;
      } catch (err) {
        handleSupabaseError(err, "AccessoryManager: Failed to fetch accessories");
        return [];
      }
    },
    retry: 1,
    enabled: isSuperAdmin || !!activeStoreId
  });

  const accessoryLimit = (storeWithPackage?.store_packages as any)?.accessory_limit ?? -1;
  const currentAccessoryCount = accessories?.length || 0;
  const isAtLimit = accessoryLimit >= 0 && currentAccessoryCount >= accessoryLimit;

  const createAccessory = useMutation({
    mutationFn: async (data: any) => {
      if (!activeStoreId) throw new Error("Please select or assign a store first.");
      const { error } = await supabase.from("store_accessories").insert({
        ...data,
        store_id: activeStoreId,
        slug: (data.title || "accessory").toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.random().toString(36).substring(2, 7)
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_accessories"] });
      toast.success("Accessory created");
      setIsAddOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create accessory");
    }
  });

  const { data: allStores } = useQuery({
    queryKey: ["all-stores-for-selector"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, name").eq("status", "active");
      return data || [];
    },
    enabled: isSuperAdmin
  });

  const addCompatibility = useMutation({
    mutationFn: async ({ accessoryId, modelId }: { accessoryId: string, modelId: string }) => {
      const { error } = await supabase.from("accessory_compatibility").insert({
        accessory_id: accessoryId,
        model_id: modelId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Compatibility linked");
      setIsCompOpen(false);
    }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accessory Manager</h1>
          <p className="text-muted-foreground">Manage phone cases, chargers, and tempered glass.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Accessory
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search accessories..." 
            className="pl-8" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <Label className="whitespace-nowrap">Filter by Store:</Label>
            <select 
              className="h-10 border rounded-md px-3 min-w-[200px]"
              value={storeId || ""}
              onChange={(e) => setStoreId(e.target.value || null)}
            >
              <option value="">All Stores</option>
              {allStores?.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Accessory Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accessories?.map((acc) => (
              <TableRow key={acc.id}>
                <TableCell className="font-medium">{acc.title}</TableCell>
                <TableCell><Badge variant="outline">{acc.category}</Badge></TableCell>
                <TableCell>NPR {acc.price.toLocaleString()}</TableCell>
                <TableCell>{acc.stock_quantity}</TableCell>
                <TableCell>
                  <Badge variant={acc.status === 'active' ? "default" : "secondary"}>
                    {acc.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setSelectedAccessory(acc);
                    setIsCompOpen(true);
                  }}>
                    <Smartphone className="h-4 w-4 mr-1" /> Link Models
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Add Accessory Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Accessory</DialogTitle>
          </DialogHeader>
          <form className="space-y-4 py-4" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            createAccessory.mutate({
              title: formData.get("title"),
              category: formData.get("category"),
              price: parseInt(formData.get("price") as string),
              stock_quantity: parseInt(formData.get("stock") as string),
              status: "active"
            });
          }}>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input name="title" placeholder="e.g. iPhone 17 Pro Silicone Case" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <select name="category" className="w-full h-10 border rounded-md px-3">
                  <option value="Cover">Cover / Case</option>
                  <option value="Charger">Charger</option>
                  <option value="Glass">Tempered Glass</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Price (NPR)</Label>
                <Input name="price" type="number" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Stock Quantity</Label>
              <Input name="stock" type="number" placeholder="10" required />
            </div>

            {isAtLimit && (
              <div className="bg-destructive/10 p-3 rounded-md flex items-start gap-2 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Accessory Limit Reached</p>
                  <p>Your plan is limited to {accessoryLimit} accessories. Upgrade to add more.</p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={createAccessory.isPending || isAtLimit}>
                {createAccessory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Accessory
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Compatibility Dialog */}
      <Dialog open={isCompOpen} onOpenChange={setIsCompOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link {selectedAccessory?.name} to Models</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label>Select Compatible Model</Label>
            <ModelPicker onSelect={(model) => {
              addCompatibility.mutate({
                accessoryId: selectedAccessory.id,
                modelId: model.id
              });
            }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
