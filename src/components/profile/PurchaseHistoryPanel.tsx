import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Eye, FileText } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { OrderItemRow } from "@/types/app";

export function PurchaseHistoryPanel() {
  const { user } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <div>Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Purchase History</h2>
        <p className="text-muted-foreground">Track your orders and purchases</p>
      </div>

      {orders?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold mb-2">No orders yet</h3>
            <p className="text-sm text-muted-foreground text-center">
              Your purchase history will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders?.map((order) => (
            <Card key={safeId(order.id)}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Order #{order.id.slice(-8)}</CardTitle>
                  <Badge variant={order.payment_status === "paid" ? "default" : "secondary"}>
                    {order.payment_status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(order.created_at), "PPP")}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {order.order_items?.map((item: OrderItemRow) => (
                    <div key={safeId(item.id)} className="flex justify-between items-center">
                      <span>{safeText(item.title)}</span>
                      <span>Rs. {safeText(item.price)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>Rs. {safeText(order.total_amount)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/order/${order.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Invoice
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}