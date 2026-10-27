import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";
import { AlertCircle, Loader2, Trash2, Search, CheckCircle, Clock, Wrench, Pencil, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useStoreMembership } from "@/hooks/useStoreMembership";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { REPAIR_REQUESTS_COLUMNS, PAGINATION } from "@/lib/supabaseColumnMaps";
import { RepairCatalogManager } from "@/components/admin/repair/RepairCatalogManager";
import { getEligibleRepairStores, REPAIR_STATUSES, repairStatusLabel, type RepairStatus } from "@/services/repairService";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  const { storeIds: myStoreIds } = useStoreMembership(user?.id);
  const [search, setSearch] = useState("");
  const [editingRepair, setEditingRepair] = useState<any | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  const { data: repairs, isLoading, error: repairsError } = useQuery({
    queryKey: ["admin_repairs", user?.id, role, myStoreIds.join(","), page, search],
    queryFn: async () => {
      try {
        const from = page * PAGINATION.PAGE_SIZE_SMALL;
        const to = from + PAGINATION.PAGE_SIZE_SMALL - 1;
        const cols = REPAIR_REQUESTS_COLUMNS.join(",");

        // Do not inner-join stores: new or unassigned repairs must remain visible.
        // Scope every store-admin request before it leaves the browser.
        if (isStoreAdmin && myStoreIds.length === 0) return [];
        let query = supabase
          .from("repair_requests")
          .select(cols)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (isStoreAdmin) query = query.in("assigned_store_id", myStoreIds);

        const { data, error } = await query;
        if (error) throw error;
        return data ?? [];
      } catch (err) {
        handleSupabaseError(err, "RepairManager: Failed to fetch repairs");
        // The UI must distinguish database failure from a genuinely empty queue.
        throw err;
      }
    },
    retry: 1,
    enabled: !!user?.id,
  });

  const { data: stores } = useQuery({
    queryKey: ["eligible_repair_stores"],
    queryFn: getEligibleRepairStores,
    enabled: !isStoreAdmin
  });

  const updateRepairMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: RepairStatus; assigned_store_id?: string | null; estimated_cost?: number | null; final_cost?: number | null; internal_notes?: string | null; urgency?: string }) => {
      if (Object.prototype.hasOwnProperty.call(updates, "assigned_store_id")) {
        const { error } = await supabase.rpc("assign_repair_to_store", {
          p_repair_id: id,
          p_store_id: updates.assigned_store_id,
        });
        if (error && !isSchemaMissingError(error)) throw error;
        if (!error) delete updates.assigned_store_id;
      }

      if (updates.status) {
        const status = updates.status;
        delete updates.status;
        const { error } = await supabase.rpc("transition_repair_status", {
          p_repair_id: id,
          p_to_status: status,
          p_note: updates.internal_notes ?? null,
        });
        if (error) throw error;
      }

      if (Object.keys(updates).length === 0) return;
      const { error } = await supabase.rpc("update_repair_admin_fields", {
        p_repair_id: id,
        p_estimated_cost: updates.estimated_cost ?? null,
        p_final_cost: updates.final_cost ?? null,
        p_internal_notes: updates.internal_notes ?? null,
        p_urgency: updates.urgency ?? null,
      });
      if (!error) return;
      if (isSchemaMissingError(error)) {
        throw new Error("Repair module database is not fully configured. Apply the latest Supabase migrations.");
      }
      throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_repairs"] });
      toast.success("Repair request updated");
      setEditingRepair(null);
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Unable to update repair request"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("transition_repair_status", {
        p_repair_id: id,
        p_to_status: "cancelled",
        p_note: "Cancelled from repair administration",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_repairs"] });
      toast.success("Repair request cancelled and retained for audit");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Error cancelling request: ${message}`);
    },
  });

  const filteredRepairs = repairs?.filter((repair) => {
    const query = search.trim().toLowerCase();
    return !query || [repair.name, repair.device_model, repair.phone, repair.tracking_id || (repair as { tracking_code?: string }).tracking_code, repair.issue_type]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

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
          {repairsError && <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertCircle className="h-5 w-5 shrink-0" /><span>Repair requests could not be loaded. Check database connectivity and permissions, then retry.</span></div>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(() => {
              const normalize = (s: string | null | undefined) => s === "pending" ? "new" : s === "in_progress" ? "repairing" : s ?? "new";
              return [{ label: "Total", value: repairs?.length ?? 0 }, { label: "New", value: repairs?.filter((item) => normalize(item.status) === "new").length ?? 0 }, { label: "In progress", value: repairs?.filter((item) => ["assigned", "inspection", "repairing"].includes(normalize(item.status) as string)).length ?? 0 }, { label: "Ready", value: repairs?.filter((item) => normalize(item.status) === "ready").length ?? 0 }].map((stat) => <div key={stat.label} className="rounded-2xl border bg-card p-4"><div className="text-2xl font-black">{stat.value}</div><div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</div></div>);
            })()}
          </div>
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
                            {repair.tracking_id || (repair as { tracking_code?: string }).tracking_code || "-"}
                            <div className="text-[10px] text-muted-foreground font-normal">
                              {format(new Date(repair.created_at), "MMM d")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{repair.name || "Unnamed customer"}</span>
                              <span className="text-xs text-muted-foreground">{repair.phone || "No phone"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{repair.device_model || "Device not specified"}</span>
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
                                aria-label={`Edit repair ${repair.tracking_id || repair.id}`}
                                onClick={() => {
                                  setEditingRepair(repair);
                                  setEditDraft({
                                    status: repair.status || "new",
                                    assigned_store_id: repair.assigned_store_id || "unassigned",
                                    estimated_cost: repair.estimated_cost == null ? "" : String(repair.estimated_cost),
                                    final_cost: repair.final_cost == null ? "" : String(repair.final_cost),
                                    urgency: repair.urgency || "normal",
                                    internal_notes: repair.internal_notes || "",
                                  });
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => {
                                  if (confirm("Cancel this repair request? The record will be retained for audit.")) {
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

            {filteredRepairs && filteredRepairs.length === PAGINATION.PAGE_SIZE_SMALL && (
              <div className="flex justify-center mt-4">
                <nav aria-label="Repair pagination">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          aria-disabled={page === 0}
                          tabIndex={page === 0 ? -1 : undefined}
                          onClick={() => page > 0 && setPage(page - 1)}
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink isActive aria-label={`Current page, page ${page + 1}`}>
                          Page {page + 1}
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          aria-disabled={filteredRepairs.length < PAGINATION.PAGE_SIZE_SMALL}
                          tabIndex={filteredRepairs.length < PAGINATION.PAGE_SIZE_SMALL ? -1 : undefined}
                          onClick={() => filteredRepairs.length === PAGINATION.PAGE_SIZE_SMALL && setPage(page + 1)}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </nav>
              </div>
            )}
          </TabsContent>

        {!isStoreAdmin && (
          <TabsContent value="catalog">
            <RepairCatalogManager />
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={!!editingRepair} onOpenChange={(open) => !open && setEditingRepair(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" /> Edit repair case</DialogTitle>
            <DialogDescription>{editingRepair?.tracking_id} · {editingRepair?.name} · {editingRepair?.device_model}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Status</Label><Select value={editDraft.status} onValueChange={(value) => setEditDraft((draft) => ({ ...draft, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{REPAIR_STATUSES.map((status) => <SelectItem key={status} value={status}>{repairStatusLabel(status)}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Assigned store</Label><Select value={editDraft.assigned_store_id} onValueChange={(value) => setEditDraft((draft) => ({ ...draft, assigned_store_id: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{stores?.map((store) => <SelectItem key={store.id} value={store.id}>{store.name} ({store.package_slug})</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Estimated cost (NPR)</Label><Input type="number" min={0} max={10000000} value={editDraft.estimated_cost} onChange={(event) => setEditDraft((draft) => ({ ...draft, estimated_cost: event.target.value }))} /></div>
            <div className="space-y-2"><Label>Final cost (NPR)</Label><Input type="number" min={0} max={10000000} value={editDraft.final_cost} onChange={(event) => setEditDraft((draft) => ({ ...draft, final_cost: event.target.value }))} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Urgency</Label><Select value={editDraft.urgency} onValueChange={(value) => setEditDraft((draft) => ({ ...draft, urgency: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="emergency">Emergency</SelectItem></SelectContent></Select></div>
            <div className="space-y-2 sm:col-span-2"><Label>Internal repair notes</Label><Textarea rows={5} maxLength={3000} value={editDraft.internal_notes} onChange={(event) => setEditDraft((draft) => ({ ...draft, internal_notes: event.target.value }))} placeholder="Diagnosis, parts, technician updates and customer communication…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRepair(null)}>Cancel</Button>
            <Button disabled={updateRepairMutation.isPending} onClick={() => {
              const estimated = editDraft.estimated_cost === "" ? null : Number(editDraft.estimated_cost);
              const finalCost = editDraft.final_cost === "" ? null : Number(editDraft.final_cost);
              if ([estimated, finalCost].some((value) => value !== null && (!Number.isFinite(value) || value < 0 || value > 10000000))) { toast.error("Enter valid costs between Rs. 0 and Rs. 10,000,000"); return; }
              updateRepairMutation.mutate({ id: editingRepair.id, status: editDraft.status as RepairStatus, assigned_store_id: editDraft.assigned_store_id === "unassigned" ? null : editDraft.assigned_store_id, estimated_cost: estimated, final_cost: finalCost, urgency: editDraft.urgency, internal_notes: editDraft.internal_notes.trim() || null });
            }}>{updateRepairMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save repair</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RepairManager;
