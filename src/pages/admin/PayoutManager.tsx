import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Loader2, Search, DollarSign, CheckCircle, XCircle, Clock,
  Banknote, CreditCard, Wallet
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";

interface Payout {
  id: string;
  store_id: string;
  amount: number;
  status: string;
  payout_method: string;
  payout_details: Record<string, unknown>;
  paid_at?: string;
  created_at: string;
  store?: { name: string };
}

interface Commission {
  id: string;
  order_id: string;
  store_id: string;
  gross_amount: number;
  commission_percent: number;
  commission_amount: number;
  store_earning: number;
  status: string;
  created_at: string;
  store?: { name: string };
}

export default function PayoutManager() {
  const { user, role } = useAuth();
  const isPlatformAdmin = role === "suadmin" || role === "staffadmin";
  const isStoreAdmin = role === "storeadmin";
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    payout_method: 'all',
    search: ''
  });

  const queryClient = useQueryClient();

  const { data: payouts, isLoading: payoutsLoading, error: payoutsError } = useQuery({
    queryKey: ["payouts", filters, user?.id, role],
    queryFn: async () => {
      try {
      let query = supabase
        .from("store_payouts")
        .select(`
          *,
          store:stores(name)
        `)
        .order("created_at", { ascending: false });

      // Store admins can only see payouts for their stores
      if (isStoreAdmin && !isPlatformAdmin && user?.id) {
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

        if (myStoreIds.length === 0) {
          return [];
        }

        query = query.in("store_id", myStoreIds);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq("status", filters.status);
      }
      if (filters.payout_method && filters.payout_method !== 'all') {
        query = query.eq("payout_method", filters.payout_method);
      }
      if (filters.search) {
        query = query.ilike("id", `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Payout[];
      } catch (err) {
        handleSupabaseError(err, "PayoutManager: Failed to fetch payouts");
        return [];
      }
    },
    retry: 1,
  });

  const { data: commissions, isLoading: commissionsLoading } = useQuery({
    queryKey: ["commissions", user?.id, role],
    queryFn: async () => {
      let query = supabase
        .from("store_commissions")
        .select(`
          *,
          store:stores(name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      // Store admins can only see commissions for their stores
      if (isStoreAdmin && !isPlatformAdmin && user?.id) {
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

        if (myStoreIds.length === 0) {
          return [];
        }

        query = query.in("store_id", myStoreIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Commission[];
    },
  });

  const updatePayoutStatusMutation = useMutation({
    mutationFn: async ({ id, status, paid_at }: {
      id: string;
      status: string;
      paid_at?: string;
    }) => {
      const updates: { status: string; paid_at?: string } = { status };
      if (paid_at) updates.paid_at = paid_at;

      const { error } = await supabase
        .from("store_payouts")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      toast.success("Payout status updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update payout status: " + error.message);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'bank': return <Banknote className="h-4 w-4" />;
      case 'esewa': return <Wallet className="h-4 w-4" />;
      case 'khalti': return <CreditCard className="h-4 w-4" />;
      case 'fonepay': return <CreditCard className="h-4 w-4" />;
      case 'cash': return <DollarSign className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const pendingCommissions = commissions?.filter(c => c.status === 'calculated') || [];
  const totalPendingAmount = pendingCommissions.reduce((sum, c) => sum + c.store_earning, 0);

  if (payoutsLoading || commissionsLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payouts?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {payouts?.filter(p => p.status === 'pending').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Rs. {payouts?.filter(p => p.status === 'paid' && new Date(p.paid_at || '').getMonth() === new Date().getMonth()).reduce((sum, p) => sum + p.amount, 0).toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              Rs. {totalPendingAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commissions Section */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Commissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Gross Amount</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Store Earning</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions?.slice(0, 10).map((commission) => (
                <TableRow key={commission.id}>
                  <TableCell>{commission.store?.name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {commission.order_id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>Rs. {commission.gross_amount.toLocaleString()}</TableCell>
                  <TableCell>Rs. {commission.commission_amount.toLocaleString()}</TableCell>
                  <TableCell>Rs. {commission.store_earning.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={commission.status === 'calculated' ? "default" : "secondary"}>
                      {commission.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payouts Section */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Management</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Search by payout ID..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.payout_method || 'all'} onValueChange={(value) => setFilters({ ...filters, payout_method: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="esewa">eSewa</SelectItem>
                <SelectItem value="khalti">Khalti</SelectItem>
                <SelectItem value="fonepay">fonepay</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payout ID</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Paid At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts?.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell className="font-mono text-sm">
                    {payout.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>{payout.store?.name}</TableCell>
                  <TableCell>Rs. {payout.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getMethodIcon(payout.payout_method)}
                      <span className="capitalize">{payout.payout_method}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(payout.status)}>
                      {payout.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(payout.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {payout.paid_at ? new Date(payout.paid_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPayout(payout);
                          setShowPayoutDialog(true);
                        }}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                      {payout.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updatePayoutStatusMutation.mutate({
                            id: payout.id,
                            status: 'processing'
                          })}
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                      )}
                      {payout.status === 'processing' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updatePayoutStatusMutation.mutate({
                            id: payout.id,
                            status: 'paid',
                            paid_at: new Date().toISOString()
                          })}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payout Details Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payout Details - {selectedPayout?.id.slice(0, 8)}...</DialogTitle>
          </DialogHeader>
          {selectedPayout && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Store</h4>
                  <p>{selectedPayout.store?.name}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Amount</h4>
                  <p className="text-lg font-bold">Rs. {selectedPayout.amount.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Payment Method</h4>
                  <div className="flex items-center gap-2">
                    {getMethodIcon(selectedPayout.payout_method)}
                    <span className="capitalize">{selectedPayout.payout_method}</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold">Status</h4>
                  <Badge className={getStatusColor(selectedPayout.status)}>
                    {selectedPayout.status}
                  </Badge>
                </div>
              </div>

              {selectedPayout.payout_details && (
                <div>
                  <h4 className="font-semibold">Payment Details</h4>
                  <pre className="text-sm bg-muted p-2 rounded">
                    {JSON.stringify(selectedPayout.payout_details, null, 2)}
                  </pre>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Created</h4>
                  <p>{new Date(selectedPayout.created_at).toLocaleString()}</p>
                </div>
                {selectedPayout.paid_at && (
                  <div>
                    <h4 className="font-semibold">Paid At</h4>
                    <p>{new Date(selectedPayout.paid_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}