import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Tag, Pencil, Trash2, Smartphone, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { ModelPicker } from "@/components/admin/ModelPicker";

export default function AccessoryManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCompOpen, setIsCompOpen] = useState(false);
  const [selectedAccessory, setSelectedAccessory] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: accessories, isLoading } = useQuery({
    queryKey: ["admin_accessories", searchTerm],
    queryFn: async () => {
      let query = supabase.from("accessories").select("*");
      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const createAccessory = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("accessories").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_accessories"] });
      toast.success("Accessory created");
      setIsAddOpen(false);
    }
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
                <TableCell className="font-medium">{acc.name}</TableCell>
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
              name: formData.get("name"),
              category: formData.get("category"),
              price: parseInt(formData.get("price") as string),
              stock_quantity: parseInt(formData.get("stock") as string),
            });
          }}>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input name="name" placeholder="e.g. iPhone 17 Pro Silicone Case" required />
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
              <Label>Initial Stock</Label>
              <Input name="stock" type="number" defaultValue="0" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createAccessory.isPending}>Create Accessory</Button>
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
