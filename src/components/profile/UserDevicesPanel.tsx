import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, HardDrive, Calendar, Shield } from "lucide-react";
import { format } from "date-fns";
import { safeText } from "@/lib/utils";

export function UserDevicesPanel() {
  const { user } = useAuth();

  const { data: devices, isLoading } = useQuery({
    queryKey: ["my-devices", user?.id],
    queryFn: async () => {
      const [ordersRes, repairsRes] = await Promise.all([
        supabase.from("orders").select("*, order_items(*)").eq("user_id", user!.id),
        supabase.from("repair_requests").select("*").eq("user_id", user!.id),
      ]);

      const devicesFromOrders = ordersRes.data?.flatMap(order =>
        order.order_items?.map(item => ({
          id: `order-${order.id}-${item.id}`,
          type: "purchased",
          brand: item.brand || "Unknown",
          model: item.model || "Unknown",
          purchase_date: order.created_at,
          source: "Purchase",
        })) || []
      ) || [];

      const devicesFromRepairs = repairsRes.data?.map(repair => ({
        id: `repair-${repair.id}`,
        type: "serviced",
        brand: repair.device_brand || "Unknown",
        model: repair.device_model || "Unknown",
        service_date: repair.created_at,
        source: "Repair",
      })) || [];

      return [...devicesFromOrders, ...devicesFromRepairs];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <div>Loading devices...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Devices</h2>
        <p className="text-muted-foreground">Track your owned and serviced devices</p>
      </div>

      {devices?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Smartphone className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold mb-2">No devices found</h3>
            <p className="text-sm text-muted-foreground text-center">
              Devices from your orders and repairs will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {devices?.map((device) => (
            <Card key={device.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant={device.type === "purchased" ? "default" : "secondary"}>
                    {device.source}
                  </Badge>
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg">{safeText(device.brand)} {safeText(device.model)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {device.type === "purchased" ? "Purchased" : "Serviced"} on{" "}
                      {format(new Date(device.purchase_date || device.service_date), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>Warranty active</span>
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