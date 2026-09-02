import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2, Search, Eye, User, Phone, Mail, MessageSquare, CheckCircle, XCircle, Clock, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStoreMembership } from "@/hooks/useStoreMembership";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";

interface Lead {
  id: string;
  brand: string;
  model: string;
  storage: string;
  condition: string;
  defects: string[];
  age_months: number;
  quoted_value: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  imei?: string;
  status: string;
  source: string;
  assigned_store_id?: string;
  created_at: string;
  assigned_store?: { name: string };
}

export default function LeadManager() {
  const { user, role } = useAuth();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const isSuperAdmin = role === "suadmin";
  const isStoreAdmin = role === "storeadmin";
  const { storeIds: myStoreIds } = useStoreMembership(user?.id);

  const [showLeadDialog, setShowLeadDialog] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });

  const queryClient = useQueryClient();

  const { data: leads, isLoading, error: leadsError } = useQuery({
    queryKey: ["sell-phone-leads", filters, user?.id, role],
    queryFn: async () => {
      try {
        let query = supabase
          .from("sell_phone_leads")
          .select(`
            *,
            assigned_store:stores(name)
          `)
          .order("created_at", { ascending: false });

        if (isStoreAdmin && !isSuperAdmin) {
          if (myStoreIds.length === 0) {
            return [];
          }
          query = query.in("assigned_store_id", myStoreIds);
        }

        if (filters.status && filters.status !== 'all') {
          query = query.eq("status", filters.status);
        }
        if (filters.search) {
          query = query.ilike("customer_name", `%${filters.search}%`)
            .or(`customer_phone.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as Lead[];
      } catch (err) {
        handleSupabaseError(err, "LeadManager: Failed to fetch leads");
        return [];
      }
    },
    retry: 1,
  });

  const { data: stores } = useQuery({
    queryKey: ["stores-for-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, package_slug")
        .eq("status", "active")
        .order("package_slug", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Lead> }) => {
      const { error } = await supabase
        .from("sell_phone_leads")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sell-phone-leads"] });
      toast.success("Lead updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update lead: " + error.message);
    },
  });

  const assignStoreMutation = useMutation({
    mutationFn: async ({ leadId, storeId }: { leadId: string; storeId?: string }) => {
      const { error } = await supabase.rpc("assign_lead_to_store", {
        p_lead_id: leadId,
        p_preferred_store_id: storeId
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sell-phone-leads"] });
      toast.success("Lead assigned successfully");
    },
    onError: (error) => {
      toast.error("Failed to assign lead: " + error.message);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'contacted': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'inspection_booked': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'cancelled': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {leads?.filter(l => l.status === 'new').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {leads?.filter(l => l.status === 'completed').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {leads?.filter(l => l.quoted_value >= 50000).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sell Phone Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Search by name, phone, or email..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="max-w-sm"
            />
            <Select value={filters.status || 'all'} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="inspection_booked">Inspection Booked</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Quote</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads?.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{lead.customer_name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {lead.customer_phone}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {lead.customer_email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{lead.brand} {lead.model}</p>
                      <p className="text-sm text-muted-foreground">
                        {lead.storage} • {lead.condition} • {lead.age_months} months
                      </p>
                      {lead.defects?.length > 0 && (
                        <p className="text-sm text-red-600">
                          Issues: {lead.defects.join(', ')}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">Rs. {lead.quoted_value.toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(lead.status)}>
                      {lead.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lead.assigned_store?.name || 'Platform'}
                  </TableCell>
                  <TableCell>
                    {new Date(lead.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedLead(lead);
                          setShowLeadDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {lead.status === 'new' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateLeadMutation.mutate({
                            id: lead.id,
                            updates: { status: 'contacted' }
                          })}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                      {lead.status === 'contacted' && (
                        <Button
                          size="sm"
                          variant="outline"
                          title="Book Inspection"
                          onClick={() => updateLeadMutation.mutate({
                            id: lead.id,
                            updates: { status: 'inspection_booked' }
                          })}
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                      )}
                      {lead.status === 'inspection_booked' && (
                        <Button
                          size="sm"
                          variant="outline"
                          title="Mark Completed"
                          onClick={() => updateLeadMutation.mutate({
                            id: lead.id,
                            updates: { status: 'completed' }
                          })}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => {
                          if (confirm("Cancel this lead?")) {
                            updateLeadMutation.mutate({
                              id: lead.id,
                              updates: { status: 'cancelled' }
                            });
                          }
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Lead Details Dialog */}
      <Dialog open={showLeadDialog} onOpenChange={setShowLeadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Customer Information</h4>
                  <p><strong>Name:</strong> {selectedLead.customer_name}</p>
                  <p><strong>Phone:</strong> {selectedLead.customer_phone}</p>
                  <p><strong>Email:</strong> {selectedLead.customer_email}</p>
                  {selectedLead.imei && <p><strong>IMEI:</strong> {selectedLead.imei}</p>}
                </div>
                <div>
                  <h4 className="font-semibold">Device Information</h4>
                  <p><strong>Device:</strong> {selectedLead.brand} {selectedLead.model}</p>
                  <p><strong>Storage:</strong> {selectedLead.storage}</p>
                  <p><strong>Condition:</strong> {selectedLead.condition}</p>
                  <p><strong>Age:</strong> {selectedLead.age_months} months</p>
                  <p><strong>Quote:</strong> Rs. {selectedLead.quoted_value.toLocaleString()}</p>
                </div>
              </div>

              {selectedLead.defects?.length > 0 && (
                <div>
                  <h4 className="font-semibold">Defects</h4>
                  <p>{selectedLead.defects.join(', ')}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Status</h4>
                  <Badge className={getStatusColor(selectedLead.status)}>
                    {selectedLead.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-semibold">Assigned Store</h4>
                  <p>{selectedLead.assigned_store?.name || 'Platform'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold">Assign to Store</h4>
                <Select
                  value={selectedLead.assigned_store_id || "platform"}
                  onValueChange={(value) => assignStoreMutation.mutate({
                    leadId: selectedLead.id,
                    storeId: value === "platform" ? undefined : value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform">Platform</SelectItem>
                    {stores?.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name} ({store.package_slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}