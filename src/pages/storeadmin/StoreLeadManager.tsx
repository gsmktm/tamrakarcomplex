import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, Eye, Phone, Mail, MessageSquare, User, Store } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function StoreLeadManager() {
  const { user, role } = useAuth();
  const isSuperAdmin = role === "suadmin";
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // For store admins, find their store
  const { data: userStore } = useQuery({
    queryKey: ["my-store-for-general-leads", user?.id],
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

  const { data: leads, isLoading } = useQuery({
    queryKey: ["store_leads", searchTerm, statusFilter, activeStoreId],
    queryFn: async () => {
      let query = supabase.from("store_leads").select(`
        *,
        store:stores(name)
      `);
      
      if (searchTerm) {
        query = query.or(`customer_name.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%`);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("store_leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store_leads"] });
      toast.success("Lead status updated");
    }
  });

  const { data: allStores } = useQuery({
    queryKey: ["all-stores-for-leads-selector"],
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
          <h1 className="text-3xl font-bold tracking-tight">Customer Leads</h1>
          <p className="text-muted-foreground">General inquiries and messages from your store profile.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search leads..." 
            className="pl-8" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
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
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No leads found.</TableCell></TableRow>
            ) : leads?.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <div className="font-medium">{lead.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{lead.customer_phone}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{lead.lead_type}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Store className="h-3 w-3" />
                    {lead.store?.name || 'Unknown'}
                  </div>
                </TableCell>
                <TableCell>
                  <Select 
                    defaultValue={lead.status} 
                    onValueChange={(val) => updateStatusMutation.mutate({ id: lead.id, status: val })}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(lead.created_at), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedLead(lead)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lead Inquiry Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-6 pt-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg">{selectedLead.customer_name}</h3>
                  <div className="flex flex-wrap gap-3">
                    <a href={`tel:${selectedLead.customer_phone}`} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                      <Phone className="h-3.5 w-3.5" /> {selectedLead.customer_phone}
                    </a>
                    {selectedLead.customer_email && (
                      <a href={`mailto:${selectedLead.customer_email}`} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                        <Mail className="h-3.5 w-3.5" /> {selectedLead.customer_email}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Lead Type</div>
                  <div className="mt-1 font-medium capitalize">{selectedLead.lead_type}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Source Page</div>
                  <div className="mt-1 text-sm truncate">{selectedLead.source_page || 'Store Profile'}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Message Content
                </div>
                <div className="p-4 rounded-xl border bg-card italic text-sm leading-relaxed">
                  "{selectedLead.message || 'No message content provided.'}"
                </div>
              </div>

              <div className="pt-4 border-t flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  Received on {format(new Date(selectedLead.created_at), "PPPP 'at' p")}
                </div>
                <Button variant="outline" size="sm" asChild>
                   <a href={`https://wa.me/${selectedLead.customer_phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">
                     Reply on WhatsApp
                   </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
