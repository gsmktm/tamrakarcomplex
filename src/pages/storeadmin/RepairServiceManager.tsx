import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STORE_REPAIR_SERVICES_COLUMNS } from "@/lib/supabaseColumnMaps";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, Search, Wrench, Clock, Wrench as WrenchIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMyStores } from "@/hooks/useMyStores";

type ServiceDraft = {
  id?: string;
  service_name: string;
  device_type: string;
  estimated_price: string;
  estimated_time: string;
  description: string;
  status: string;
};

const EMPTY_DRAFT: ServiceDraft = {
  service_name: "",
  device_type: "",
  estimated_price: "",
  estimated_time: "",
  description: "",
  status: "active",
};

function draftFrom(svc: Record<string, unknown>): ServiceDraft {
  return {
    id: svc.id as string,
    service_name: String(svc.service_name ?? ""),
    device_type: String(svc.device_type ?? ""),
    estimated_price: svc.estimated_price != null ? String(svc.estimated_price) : "",
    estimated_time: String(svc.estimated_time ?? ""),
    description: String(svc.description ?? ""),
    status: String(svc.status ?? "active"),
  };
}

export default function RepairServiceManager() {
  const { role } = useAuth();
  const isPlatformAdmin = role === "suadmin" || role === "staffadmin";
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draft, setDraft] = useState<ServiceDraft>(EMPTY_DRAFT);
  const [storeId, setStoreId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // For store admins, find their store
  const { data: myStores } = useMyStores();

  const activeStoreId = isPlatformAdmin ? storeId : myStores?.[0]?.id;

  const { data: services, isLoading } = useQuery({
    queryKey: ["store_repair_services", searchTerm, activeStoreId],
    queryFn: async () => {
      let query = supabase.from("store_repair_services").select(STORE_REPAIR_SERVICES_COLUMNS.join(","));
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
    enabled: isPlatformAdmin || !!activeStoreId
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ServiceDraft) => {
      if (!activeStoreId) throw new Error("Please select or assign a store first.");
      const payload = {
        service_name: data.service_name,
        device_type: data.device_type,
        estimated_price: data.estimated_price === "" ? null : parseFloat(data.estimated_price),
        estimated_time: data.estimated_time,
        description: data.description || null,
        status: data.status,
      };
      if (data.id) {
        const { error } = await supabase.from("store_repair_services").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("store_repair_services").insert({ ...payload, store_id: activeStoreId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store_repair_services"] });
      toast.success("Repair service saved");
      setIsFormOpen(false);
      setDraft(EMPTY_DRAFT);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save repair service");
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
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete service");
    }
  });

  const { data: allStores } = useQuery({
    queryKey: ["all-stores-for-repair-selector"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, name").eq("status", "active");
      return data || [];
    },
    enabled: isPlatformAdmin
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const openAdd = () => {
    setDraft(EMPTY_DRAFT);
    setIsFormOpen(true);
  };

  const openEdit = (svc: Record<string, unknown>) => {
    setDraft(draftFrom(svc));
    setIsFormOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Repair Services</h1>
          <p className="text-muted-foreground">Manage your store's repair offerings and pricing.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setDraft(EMPTY_DRAFT); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-2" /> Add Repair Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{draft.id ? "Edit Repair Service" : "Add New Repair Service"}</DialogTitle>
            </DialogHeader>
            <form className="space-y-4 py-4" onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(draft);
            }}>
              <div className="space-y-2">
                <Label htmlFor="service_name">Service Name</Label>
                <Input
                  id="service_name"
                  value={draft.service_name}
                  onChange={(e) => setDraft({ ...draft, service_name: e.target.value })}
                  placeholder="e.g. iPhone 15 Pro Screen Replacement"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="device_type">Device Type</Label>
                  <Input
                    id="device_type"
                    value={draft.device_type}
                    onChange={(e) => setDraft({ ...draft, device_type: e.target.value })}
                    placeholder="e.g. Smartphone"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Est. Price (NPR)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={draft.estimated_price}
                    onChange={(e) => setDraft({ ...draft, estimated_price: e.target.value })}
                    placeholder="5000"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Est. Time</Label>
                <Input
                  id="time"
                  value={draft.estimated_time}
                  onChange={(e) => setDraft({ ...draft, estimated_time: e.target.value })}
                  placeholder="e.g. 2-3 hours"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="h-10 w-full border rounded-md px-3"
                  value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="Details about the repair service..."
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
        {isPlatformAdmin && (
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
        {(services?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="rounded-full bg-muted p-4">
              <WrenchIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">No repair services yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm
                  ? "No services match your search. Try a different term."
                  : "Add your first service so customers can see what your store repairs and at what price."}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={openAdd} className="mt-1">
              <Plus className="mr-2 h-4 w-4" /> Add Repair Service
            </Button>
          </div>
        ) : (
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
                  <Button variant="ghost" size="sm" title="Edit service" onClick={() => openEdit(svc as Record<string, unknown>)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500" title="Delete service" onClick={() => {
                    if (confirm("Delete this service?")) deleteMutation.mutate(svc.id);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </Card>
    </div>
  );
}
