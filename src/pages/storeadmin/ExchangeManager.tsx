import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EXCHANGE_REQUESTS_COLUMNS } from "@/lib/supabaseColumnMaps";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Eye, Phone, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ExchangeManager() {
  const { user, role } = useAuth();
  const isPlatformAdmin = role === "suadmin" || role === "staffadmin";
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // For store admins, find their store
  const { data: userStore } = useQuery({
    queryKey: ["my-store-for-exchange", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("id")
        .or(`owner_user_id.eq.${user?.id},owner_id.eq.${user?.id}`)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && !isPlatformAdmin
  });

  const activeStoreId = isPlatformAdmin ? storeId : userStore?.id;

  const { data: requests, isLoading } = useQuery({
    queryKey: ["exchange_requests", searchTerm, activeStoreId],
    queryFn: async () => {
      let query = supabase.from("exchange_requests").select(EXCHANGE_REQUESTS_COLUMNS.join(","));
      if (searchTerm) {
        query = query.or(`customer_name.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%`);
      }
      
      // Store admins see only their store's requests
      // Platform admins see all requests with store_id (store-specific) or store_id IS NULL (official)
      if (activeStoreId) {
        query = query.eq("store_id", activeStoreId);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isPlatformAdmin || !!activeStoreId
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("exchange_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchange_requests"] });
      toast.success("Request status updated");
    }
  });

  const { data: allStores } = useQuery({
    queryKey: ["all-stores-for-exchange-selector"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, name").eq("status", "active");
      return data || [];
    },
    enabled: isPlatformAdmin
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exchange Requests</h1>
          <p className="text-muted-foreground">Manage trade-in and exchange inquiries from customers.</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or phone..." 
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Expected Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests?.map((req) => (
              <TableRow key={req.id}>
                <TableCell>
                  <div className="font-medium">{req.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{req.customer_phone}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-blue-500" />
                    {req.device_brand} {req.device_model}
                  </div>
                  <Badge variant="outline" className="mt-1">{req.device_condition}</Badge>
                </TableCell>
                <TableCell>NPR {req.expected_value?.toLocaleString() || 'N/A'}</TableCell>
                <TableCell>
                  <Select
                    value={req.request_status}
                    onValueChange={(val) => updateStatusMutation.mutate({ id: req.id, status: val })}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="inspected">Inspected</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(req.created_at), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(req)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exchange Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Customer</Label>
                  <p className="font-medium">{selectedRequest.customer_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="h-3 w-3" /> <span className="text-sm">{selectedRequest.customer_phone}</span>
                  </div>
                  {selectedRequest.customer_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" /> <span className="text-sm">{selectedRequest.customer_email}</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Device</Label>
                  <p className="font-medium">{selectedRequest.device_brand} {selectedRequest.device_model}</p>
                  <p className="text-sm">Condition: {selectedRequest.device_condition}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Expected Value</Label>
                  <p className="font-medium text-blue-600">NPR {selectedRequest.expected_value?.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Offered Value</Label>
                  <p className="font-medium text-green-600">NPR {selectedRequest.offered_value?.toLocaleString() || 'Not offered'}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Customer Notes</Label>
                <p className="text-sm border p-2 rounded bg-muted/50 mt-1">{selectedRequest.notes || 'No notes provided'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
