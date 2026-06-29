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
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Search, Eye, Truck, CheckCircle, XCircle, RefreshCw,
  DollarSign, Package, User, Store, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/utils";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
  variant_name?: string;
}

interface Order {
  id: string;
  user_id?: string;
  store_id?: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  shipping_address: Record<string, string | number | boolean | null>;
  contact_info: Record<string, string | number | boolean | null>;
  created_at: string;
  order_items?: OrderItem[];
  store?: { name: string };
}

export default function OrderManager() {
  const { user, role } = useAuth();
  const isPlatformAdmin = role === "suadmin" || role === "staffadmin";
  const isStoreAdmin = role === "storeadmin";
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [filters, setFilters] = useState({
    payment_status: 'all',
    order_status: 'all',
    search: ''
  });

  const queryClient = useQueryClient();

  const { data: orders, isLoading, error: ordersError } = useQuery({
    queryKey: ["orders", filters, user?.id, role],
    queryFn: async () => {
      try {
        let query = supabase
          .from("orders")
          .select(`
            *,
            order_items(*),
            store:stores(name)
          `)
          .order("created_at", { ascending: false });

        // Store admins can only see orders from their stores
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
            // Store admin has no stores - return empty
            return [];
          }

          // Filter orders where any order_item.store_id is in myStoreIds
          const { data: relevantOrderIds, error: orderError } = await supabase
            .from("order_items")
            .select("order_id")
            .in("store_id", myStoreIds);

          if (orderError || !relevantOrderIds?.length) {
            return [];
          }

          const orderIds = [...new Set(relevantOrderIds.map(oi => oi.order_id))];
          query = query.in("id", orderIds);
        }

        if (filters.payment_status && filters.payment_status !== 'all') {
          query = query.eq("payment_status", filters.payment_status);
        }
        if (filters.order_status && filters.order_status !== 'all') {
          query = query.eq("order_status", filters.order_status);
        }
        if (filters.search) {
          query = query.ilike("id", `%${filters.search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as Order[];
      } catch (err) {
        handleSupabaseError(err, "OrderManager: Failed to fetch orders list");
        return [];
      }
    },
    retry: 1,
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, order_status, payment_status }: {
      id: string;
      order_status?: string;
      payment_status?: string;
    }) => {
      const updates: { order_status?: string; payment_status?: string } = {};
      if (order_status) updates.order_status = order_status;
      if (payment_status) updates.payment_status = payment_status;

      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order updated successfully");
    },
    onError: (error: unknown) => {
      toast.error("Failed to update order: " + getErrorMessage(error));
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'pending_payment': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-teal-100 text-teal-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'packed': return 'bg-amber-100 text-amber-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (ordersError || !orders) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="flex justify-center">
          <AlertCircle className="h-8 w-8 text-amber-500" />
        </div>
        <div>
          <p className="font-medium text-sm">Unable to load orders</p>
          <p className="text-xs text-muted-foreground mt-1">Database connection issue. Please try again.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {orders?.filter(o => o.payment_status === 'pending').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {orders?.filter(o => o.order_status === 'processing').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {orders?.filter(o => o.order_status === 'completed').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Management</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Search by order ID..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="max-w-sm"
            />
            <Select value={filters.payment_status || 'all'} onValueChange={(value) => setFilters({ ...filters, payment_status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Payment status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.order_status || 'all'} onValueChange={(value) => setFilters({ ...filters, order_status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Order status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Order Status</SelectItem>
                <SelectItem value="pending_payment">Pending Payment</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="packed">Packed</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Order Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">
                    {order.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    {order.contact_info?.name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {order.store?.name || 'Direct'}
                  </TableCell>
                  <TableCell>Rs. {order.total_amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={getPaymentStatusColor(order.payment_status)}>
                      {order.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.order_status)}>
                      {order.order_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {order.order_status === 'paid' && (
                        <Button
                          size="sm"
                          variant="outline"
                          title="Confirm order"
                          onClick={() => updateOrderStatusMutation.mutate({
                            id: order.id,
                            order_status: 'confirmed'
                          })}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {order.order_status === 'confirmed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          title="Mark processing"
                          onClick={() => updateOrderStatusMutation.mutate({
                            id: order.id,
                            order_status: 'processing'
                          })}
                        >
                          <Truck className="h-4 w-4" />
                        </Button>
                      )}
                      {order.order_status === 'processing' && (
                        <Button
                          size="sm"
                          variant="outline"
                          title="Mark packed"
                          onClick={() => updateOrderStatusMutation.mutate({
                            id: order.id,
                            order_status: 'packed'
                          })}
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                      )}
                      {order.order_status === 'packed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          title="Mark shipped"
                          onClick={() => updateOrderStatusMutation.mutate({
                            id: order.id,
                            order_status: 'shipped'
                          })}
                        >
                          <Truck className="h-4 w-4" />
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

      {/* Order Details Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.id.slice(0, 8)}...</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Customer Information</h4>
                  <p>Name: {selectedOrder.contact_info?.name}</p>
                  <p>Phone: {selectedOrder.contact_info?.phone}</p>
                  <p>Email: {selectedOrder.contact_info?.email}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Shipping Address</h4>
                  <p>{selectedOrder.shipping_address?.street}</p>
                  <p>{selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.state}</p>
                  <p>{selectedOrder.shipping_address?.country} {selectedOrder.shipping_address?.postal_code}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold">Order Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.order_items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>Rs. {item.unit_price}</TableCell>
                        <TableCell>Rs. {item.total_price}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">Total: Rs. {selectedOrder.total_amount.toLocaleString()}</p>
                  <p>Payment: {selectedOrder.payment_method} - {selectedOrder.payment_status}</p>
                </div>
                <div className="flex gap-2">
                  {selectedOrder.order_status === 'pending' && (
                    <Button
                      onClick={() => updateOrderStatusMutation.mutate({
                        id: selectedOrder.id,
                        order_status: 'confirmed'
                      })}
                    >
                      Confirm Order
                    </Button>
                  )}
                  {selectedOrder.order_status === 'confirmed' && selectedOrder.payment_status === 'paid' && (
                    <Button
                      onClick={() => updateOrderStatusMutation.mutate({
                        id: selectedOrder.id,
                        order_status: 'processing'
                      })}
                    >
                      Start Processing
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
