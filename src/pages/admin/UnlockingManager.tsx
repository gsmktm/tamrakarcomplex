import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Trash2, Search, CheckCircle, Clock, Smartphone, Key, Cpu, RefreshCw, Zap } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin_unlock_requests", user?.id, role],
    queryFn: async () => {
      let query = supabase.from("unlock_requests").select("*, stores(name)");
      
      if (isStoreAdmin && !isSuperAdmin && user?.id) {
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
        
        query = query.in("assigned_store_id", myStoreIds);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) {
        if (isSchemaMissingError(error)) {
          // Fallback to base table if relationship fails
          const { data: baseData, error: baseError } = await supabase
            .from("unlock_requests")
            .select("*")
            .order("created_at", { ascending: false });
          if (baseError) return [];
          return baseData ?? [];
        }
        throw error;
      }
      return data ?? [];
    },
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
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; assigned_store_id?: string }) => {
      const { error } = await supabase.from("unlock_requests").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_unlock_requests"] });
      toast.success("Request updated successfully");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to update request";
      toast.error(message);
    }
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("unlock_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_unlock_requests"] });
      toast.success("Request deleted");
    }
  });

  const filteredRequests = (requests || []).filter(r => 
    r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    r.model.toLowerCase().includes(search.toLowerCase()) ||
    r.brand.toLowerCase().includes(search.toLowerCase()) ||
    r.service_type.toLowerCase().includes(search.toLowerCase())
  );

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
    const s = service.toLowerCase();
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

      <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
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
                <TableRow key={request.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <div className="font-bold">{request.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{request.customer_phone}</div>
                    {request.customer_email && <div className="text-[10px] text-muted-foreground">{request.customer_email}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase">{request.brand}</Badge>
                      <span className="font-medium">{request.model}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getServiceIcon(request.service_type)}
                      <span className="text-sm font-medium">{request.service_type}</span>
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
                      <span className="text-sm font-medium text-slate-600">
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
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this request?")) {
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
    </div>
  );
};

export default UnlockingManager;
