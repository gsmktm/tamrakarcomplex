import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, Search, Wrench, Clock } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RepairServiceManager() {
  const { user, role } = useAuth();
  const isSuperAdmin = role === "suadmin";
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // For store admins, find their store
  const { data: userStore } = useQuery({
    queryKey: ["my-store-for-repair-services", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("id")
        .or(`owner_user_id.eq.${user?.id},owner_id.eq.${user?.id}`)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && !isSuperAdmin
  });

  const activeStoreId = isSuperAdmin ? storeId : userStore?.id;

  const { data: services, isLoading } = useQuery({
    queryKey: ["store_repair_services", searchTerm, activeStoreId],
    queryFn: async () => {
      let query = supabase.from("store_repair_services").select("*");
      if (searchTerm) {
        query = query.ilike("service_name", `%${searchTerm}%`);
      }
      if (activeStoreId) {
        query = query.eq("store_id", activeStoreId);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin || !!activeStoreId
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!activeStoreId) throw new Error("Please select or assign a store first.");
      const { error } = await supabase.from("store_repair_services").insert({
        ...data,
        store_id: activeStoreId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store_repair_services"] });
      toast.success("Repair service added");
      setIsAddOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add repair service");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_repair_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store_repair_services"] });
      toast.success("Service deleted");
    }
  });

  const { data: allStores } = useQuery({
    queryKey: ["all-stores-for-repair-selector"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, name").eq("status", "active");
      return data || [];
    },
    enabled: isSuperAdmin
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Repair Services</h1>
          <p className="text-muted-foreground">Manage your store's repair offerings and pricing.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" /> Add Repair Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Repair Service</DialogTitle>
            </DialogHeader>
            <form className="space-y-4 py-4" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createMutation.mutate({
                service_name: formData.get("service_name"),
                device_type: formData.get("device_type"),
                estimated_price: parseFloat(formData.get("price") as string),
                estimated_time: formData.get("time"),
                description: formData.get("description"),
                status: "active"
              });
            }}>
              <div className="space-y-2">
                <Label>Service Name</Label>
                <Input name="service_name" placeholder="e.g. iPhone 15 Pro Screen Replacement" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Device Type</Label>
                  <Input name="device_type" placeholder="e.g. Smartphone" required />
                </div>
                <div className="space-y-2">
                  <Label>Est. Price (NPR)</Label>
                  <Input name="price" type="number" placeholder="5000" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Est. Time</Label>
                <Input name="time" placeholder="e.g. 2-3 hours" required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea name="description" placeholder="Details about the repair service..." />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Service
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search services..." 
            className="pl-8" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <Label className="whitespace-nowrap">Store:</Label>
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
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service Name</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Est. Price</TableHead>
              <TableHead>Est. Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services?.map((svc) => (
              <TableRow key={svc.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-primary" />
                    {svc.service_name}
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline">{svc.device_type}</Badge></TableCell>
                <TableCell>NPR {svc.estimated_price?.toLocaleString() || 'TBD'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="h-3 w-3" />
                    {svc.estimated_time}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={svc.status === 'active' ? "default" : "secondary"}>
                    {svc.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => {
                    if (confirm("Delete this service?")) deleteMutation.mutate(svc.id);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
