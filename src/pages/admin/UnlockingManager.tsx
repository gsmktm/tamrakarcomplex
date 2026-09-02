import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";
import { UNLOCK_REQUESTS_COLUMNS } from "@/lib/supabaseColumnMaps";
import { AlertCircle, Loader2, Trash2, Search, CheckCircle, Clock, Smartphone, Key, Cpu, RefreshCw, Zap, Pencil, ShieldCheck } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function isSchemaMissingError(error: unknown) {
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

const UnlockingManager = () => {
  const { user, role } = useAuth();
  const isSuperAdmin = role === "suadmin";
  const isStoreAdmin = role === "storeadmin";
  const { storeIds: myStoreIds } = useStoreMembership(user?.id);
  const [search, setSearch] = useState("");
  const [editingRequest, setEditingRequest] = useState<any | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>( {} );
  const queryClient = useQueryClient();

  const { data: requests, isLoading, error: requestsError } = useQuery({
    queryKey: ["admin_unlock_requests", user?.id, role],
    queryFn: async () => {
      try {
        let query = supabase.from("unlock_requests").select("*, stores(name)");
        
         if (isStoreAdmin && !isSuperAdmin) {
           if (myStoreIds.length === 0) {
             return [];
           }
           query = query.in("assigned_store_id", myStoreIds);
         }

        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) {
          if (isSchemaMissingError(error)) {
            // Fallback to base table if relationship fails
            const { data: baseData, error: baseError } = await supabase
              .from("unlock_requests")
              .select(UNLOCK_REQUESTS_COLUMNS.join(","))
              .order("created_at", { ascending: false });
            if (baseError) return [];
            return baseData ?? [];
          }
          throw error;
        }
        return data ?? [];
      } catch (err) {
        handleSupabaseError(err, "UnlockingManager: Failed to fetch requests");
        return [];
      }
    },
    retry: 1,
    enabled: !!user?.id
  });

  const { data: stores } = useQuery({
    queryKey: ["admin_stores_minimal"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name").eq("status", "active");
      if (error) {
        if (isSchemaMissingError(error)) return [];
        throw error;
      }
      return data ?? [];
    }
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; assigned_store_id?: string | null; notes?: string | null; quoted_price_npr?: number | null; payment_status?: string; urgency?: string }) => {
      const { error } = await supabase.rpc("update_unlock_request_status", {
        p_request_id: id,
        p_status: updates.status ?? null,
        p_notes: updates.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_unlock_requests"] });
      toast.success("Request updated successfully");
      setEditingRequest(null);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to update request";
      toast.error(message);
    }
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("update_unlock_request_status", {
        p_request_id: id,
        p_status: "cancelled",
        p_notes: "Cancelled from unlock administration",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_unlock_requests"] });
      toast.success("Request cancelled and retained for audit");
    }
  });

  const filteredRequests = (requests || []).filter((request) => {
    const query = search.trim().toLowerCase();
    return !query || [request.customer_name, request.customer_phone, request.customer_email, request.model, request.brand, request.service_type, request.imei, request.serial_number]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "processing": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Processing</Badge>;
      case "completed": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case "cancelled": return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getServiceIcon = (service: string) => {
    const s = String(service || "").toLowerCase();
    if (s.includes("frp")) return <Key className="h-4 w-4 text-red-500" />;
    if (s.includes("imei")) return <Cpu className="h-4 w-4 text-blue-500" />;
    if (s.includes("network") || s.includes("unlock")) return <RefreshCw className="h-4 w-4 text-emerald-500" />;
    if (s.includes("root")) return <Zap className="h-4 w-4 text-amber-500" />;
    return <Smartphone className="h-4 w-4 text-slate-400" />;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Unlocking Requests</h1>
          <p className="text-muted-foreground">Manage device unlocking service requests from customers.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search requests..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{requests?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-yellow-600">
              {requests?.filter(r => r.status === "pending").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-600">
              {requests?.filter(r => r.status === "processing").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-green-600">
              {requests?.filter(r => r.status === "completed").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {requestsError && <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertCircle className="h-5 w-5 shrink-0" /><span>Unlocking requests could not be loaded. Check database connectivity and permissions, then retry.</span></div>}

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="font-bold">Customer</TableHead>
              <TableHead className="font-bold">Device</TableHead>
              <TableHead className="font-bold">Service</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold">Assigned To</TableHead>
              <TableHead className="font-bold">Date</TableHead>
              <TableHead className="text-right font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredRequests.length > 0 ? (
              filteredRequests.map((request) => (
                <TableRow key={request.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="font-bold">{request.customer_name || "Unnamed customer"}</div>
                    <div className="text-xs text-muted-foreground">{request.customer_phone || "No phone"}</div>
                    {request.customer_email && <div className="text-[10px] text-muted-foreground">{request.customer_email}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase">{request.brand || request.device_brand || "Device"}</Badge>
                      <span className="font-medium">{request.model || request.device_model || "Not specified"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getServiceIcon(request.service_type)}
                      <span className="text-sm font-medium">{request.service_type || "Unlock assessment"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={request.status} 
                      onValueChange={(val) => updateRequestMutation.mutate({ id: request.id, status: val })}
                    >
                      <SelectTrigger className="h-8 w-[130px] text-xs font-bold border-none bg-transparent hover:bg-slate-100 p-0 shadow-none">
                        <SelectValue>{getStatusBadge(request.status)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {isSuperAdmin ? (
                      <Select 
                        value={request.assigned_store_id || "unassigned"} 
                        onValueChange={(val) => updateRequestMutation.mutate({ id: request.id, assigned_store_id: val === "unassigned" ? null : val })}
                      >
                        <SelectTrigger className="h-8 w-[150px] text-xs">
                          <SelectValue placeholder="Assign Store" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {stores?.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">
                        {request.stores?.name || "Unassigned"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(request.created_at), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${request.brand} ${request.model} unlock request`}
                      onClick={() => {
                        setEditingRequest(request);
                        setEditDraft({
                          status: request.status || "pending",
                          assigned_store_id: request.assigned_store_id || "unassigned",
                          quoted_price_npr: request.quoted_price_npr == null ? "" : String(request.quoted_price_npr),
                          payment_status: request.payment_status || "pending",
                          urgency: request.urgency || "standard",
                          notes: request.notes || "",
                        });
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm("Cancel this unlocking request? The record will be retained for audit.")) {
                          deleteRequestMutation.mutate(request.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No requests found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingRequest} onOpenChange={(open) => !open && setEditingRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Edit unlocking case</DialogTitle>
            <DialogDescription>{editingRequest?.customer_name} · {editingRequest?.brand} {editingRequest?.model}. Confirm ownership and lawful eligibility before processing.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Status</Label><Select value={editDraft.status} onValueChange={(value) => setEditDraft((draft) => ({ ...draft, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="processing">Processing</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Assigned store</Label><Select value={editDraft.assigned_store_id} onValueChange={(value) => setEditDraft((draft) => ({ ...draft, assigned_store_id: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{stores?.map((store) => <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Quoted fee (NPR)</Label><Input type="number" min={0} max={1000000} value={editDraft.quoted_price_npr} onChange={(event) => setEditDraft((draft) => ({ ...draft, quoted_price_npr: event.target.value }))} /></div>
            <div className="space-y-2"><Label>Payment status</Label><Select value={editDraft.payment_status} onValueChange={(value) => setEditDraft((draft) => ({ ...draft, payment_status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="failed">Failed</SelectItem><SelectItem value="refunded">Refunded</SelectItem></SelectContent></Select></div>
            <div className="space-y-2 sm:col-span-2"><Label>Urgency</Label><Select value={editDraft.urgency} onValueChange={(value) => setEditDraft((draft) => ({ ...draft, urgency: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="standard">Standard</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
            <div className="space-y-2 sm:col-span-2"><Label>Internal case notes</Label><Textarea rows={5} maxLength={2000} value={editDraft.notes} onChange={(event) => setEditDraft((draft) => ({ ...draft, notes: event.target.value }))} placeholder="Eligibility evidence, carrier response, customer follow-up and completion details…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRequest(null)}>Cancel</Button>
            <Button disabled={updateRequestMutation.isPending} onClick={() => {
              const fee = editDraft.quoted_price_npr === "" ? null : Number(editDraft.quoted_price_npr);
              if (fee !== null && (!Number.isFinite(fee) || fee < 0 || fee > 1000000)) { toast.error("Enter a valid fee between Rs. 0 and Rs. 1,000,000"); return; }
              updateRequestMutation.mutate({ id: editingRequest.id, status: editDraft.status, assigned_store_id: editDraft.assigned_store_id === "unassigned" ? null : editDraft.assigned_store_id, quoted_price_npr: fee, payment_status: editDraft.payment_status, urgency: editDraft.urgency, notes: editDraft.notes.trim() || null });
            }}>{updateRequestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save case</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnlockingManager;
