import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Package, CreditCard, Wrench, Unlock, DollarSign } from "lucide-react";

export default function StoreAnalytics() {
  const { user } = useAuth();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["store-analytics", user?.id],
    queryFn: async () => {
      const results = await Promise.allSettled([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("store_id", user?.id),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("store_id", user?.id),
        supabase.from("repair_requests").select("id", { count: "exact", head: true }).eq("store_id", user?.id),
        supabase.from("unlock_requests").select("id", { count: "exact", head: true }).eq("store_id", user?.id),
      ]);

      const getCount = (index: number): number => {
        const result = results[index];
        if (result.status !== "fulfilled") return 0;
        const response = result.value as { count: number | null; error: any };
        return response.count || 0;
      };

      return {
        products: getCount(0),
        orders: getCount(1),
        repairs: getCount(2),
        unlocks: getCount(3),
        revenue: 0, // Placeholder
      };
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <div>Loading analytics...</div>;
  }

  const metrics = [
    { title: "Total Products", value: analytics?.products || 0, icon: Package },
    { title: "Total Orders", value: analytics?.orders || 0, icon: CreditCard },
    { title: "Repair Requests", value: analytics?.repairs || 0, icon: Wrench },
    { title: "Unlock Requests", value: analytics?.unlocks || 0, icon: Unlock },
    { title: "Revenue", value: `$${analytics?.revenue || 0}`, icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Store Analytics</h1>
        <p className="text-muted-foreground">View your store's performance metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}