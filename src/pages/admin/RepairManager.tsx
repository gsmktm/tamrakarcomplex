import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Trash2, Search, CheckCircle, Clock, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RepairCatalogManager } from "@/components/admin/repair/RepairCatalogManager";
import { getEligibleRepairStores, REPAIR_STATUSES, repairStatusLabel, type RepairStatus } from "@/services/repairService";

type DbError = { code?: string; message?: string };

function isSchemaMissingError(error: DbError | null | undefined) {
  const code = (error?.code as string | undefined) ?? "";
  const message = ((error?.message as string | undefined) ?? "").toLowerCase();
  return (
    code === "PGRST200" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    code === "42703" ||
    message.includes("schema cache") ||
    message.includes("could not find the table") ||
    message.includes("could not find a relationship") ||
    message.includes("does not exist")
  );
}

const RepairManager = () => {
  const { user, role } = useAuth();
  const isStoreAdmin = role === "storeadmin";
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: repairs, isLoading } = useQuery({
    queryKey: ["admin_repairs", user?.id, role],
    queryFn: async () => {
      let query = supabase.from("repair_requests").select("*, stores(name, package_slug)");
      
      if (isStoreAdmin && user?.id) {
        // Get store IDs from store_admins or owner_id
        const { data: memberships } = await supabase
          .from("store_admins")
          .select("store_id")
          .eq("user_id", user.id)
          .eq("status", "active");
        
        const { data: ownedStores } = await supabase
          .from("stores")
          .select("id")
          .eq("owner_id", user.id);
        
        const myStoreIds = Array.from(new Set([
          ...(memberships || []).map(m => m.store_id),
          ...(ownedStores || []).map(s => s.id)
        ]));

        if (myStoreIds.length === 0) return [];
        
        query = query.in("assigned_store_id", myStoreIds);
      }

      const joined = await query.order("created_at", { ascending: false });
      if (!joined.error) return joined.data ?? [];

      // Relationship missing or schema behind: fallback to base table query
      if (isSchemaMissingError(joined.error)) {
        const base = await supabase.from("repair_requests").select("*").order("created_at", { ascending: false });
        if (base.error) throw base.error;
        return base.data ?? [];
      }

      throw joined.error;
    },
    enabled: !!user?.id
  });

  const { data: stores } = useQuery({
    queryKey: ["eligible_repair_stores"],
    queryFn: getEligibleRepairStores,
    enabled: !isStoreAdmin
  });

  const updateRepairMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: RepairStatus; assigned_store_id?: string | null; estimated_cost?: number | null; final_cost?: number | null }) => {
      if (Object.prototype.hasOwnProperty.call(updates, "assigned_store_id")) {
        const { error } = await supabase.rpc("assign_repair_to_store", {
          p_repair_id: id,
          p_store_id: updates.assigned_store_id,
        });
        if (!error) return;
        if (!isSchemaMissingError(error)) throw error;
      }

      const { error } = await supabase.from("repair_requests").update(updates).eq("id", id);
      if (!error) return;
      if (isSchemaMissingError(error)) {
        throw new Error("Repair module database is not fully configured. Apply the latest Supabase migrations.");
      }
      throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_repairs"] });
      toast.success("Repair request updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("repair_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_repairs"] });
      toast.success("Repair request deleted");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Error deleting request: ${message}`);
    },
  });

  const filteredRepairs = repairs?.filter((repair) =>
    repair.name.toLowerCase().includes(search.toLowerCase()) ||
    repair.device_model.toLowerCase().includes(search.toLowerCase()) ||
    repair.phone.includes(search) ||
    repair.tracking_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Repair Management</h1>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className={`grid w-full ${isStoreAdmin ? 'grid-cols-1 max-w-[200px]' : 'grid-cols-2 max-w-[400px]'}`}>
          <TabsTrigger value="requests">Active Requests</TabsTrigger>
          {!isStoreAdmin && (
            <TabsTrigger value="catalog" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Catalog (iFixit)
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="requests" className="space-y-6 pt-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by name, phone, device, or tracking ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
          </div>

          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Assigned Store</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Status</TableHead>
                      {!isStoreAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={isStoreAdmin ? 6 : 7} className="text-center h-24">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredRepairs?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isStoreAdmin ? 6 : 7} className="text-center h-24">
                          No repair requests found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRepairs?.map((repair) => (
                        <TableRow key={repair.id}>
                          <TableCell className="font-mono text-xs font-bold text-primary">
                            {repair.tracking_id || "-"}
                            <div className="text-[10px] text-muted-foreground font-normal">
                              {format(new Date(repair.created_at), "MMM d")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{repair.name}</span>
                              <span className="text-xs text-muted-foreground">{repair.phone}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{repair.device_model}</span>
                              <span className="text-xs text-muted-foreground capitalize">{repair.issue_type?.replace("_", " ")}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              disabled={isStoreAdmin}
                              defaultValue={repair.assigned_store_id || "unassigned"}
                              onValueChange={(val) => updateRepairMutation.mutate({ id: repair.id, assigned_store_id: val === "unassigned" ? null : val })}
                            >
                              <SelectTrigger className="w-[180px] h-8 text-xs">
                                <SelectValue placeholder="Assign Store" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {stores?.map(s => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name} ({s.package_slug})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              className="h-8 w-24 text-xs" 
                              placeholder="Est."
                              defaultValue={repair.estimated_cost}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (e.target.value === "" && repair.estimated_cost != null) {
                                  updateRepairMutation.mutate({ id: repair.id, estimated_cost: null });
                                } else if (!isNaN(val) && val !== repair.estimated_cost) {
                                  updateRepairMutation.mutate({ id: repair.id, estimated_cost: val });
                                }
                              }}
                            />
                            <Input
                              type="number"
                              className="mt-2 h-8 w-24 text-xs"
                              placeholder="Final"
                              defaultValue={repair.final_cost}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (e.target.value === "" && repair.final_cost != null) {
                                  updateRepairMutation.mutate({ id: repair.id, final_cost: null });
                                } else if (!isNaN(val) && val !== repair.final_cost) {
                                  updateRepairMutation.mutate({ id: repair.id, final_cost: val });
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              defaultValue={repair.status === "pending" ? "new" : repair.status === "in_progress" ? "repairing" : repair.status || "new"}
                              onValueChange={(val) => updateRepairMutation.mutate({ id: repair.id, status: val as RepairStatus })}
                            >
                              <SelectTrigger className="w-[130px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {REPAIR_STATUSES.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {repairStatusLabel(status)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          {!isStoreAdmin && (
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this request?")) {
                                    deleteMutation.mutate(repair.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
            </Table>
          </div>
        </TabsContent>

        {!isStoreAdmin && (
          <TabsContent value="catalog">
            <RepairCatalogManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default RepairManager;
