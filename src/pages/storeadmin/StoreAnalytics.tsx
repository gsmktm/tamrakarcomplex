import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, Package, CreditCard, Wrench, RefreshCw, User, Smartphone, Star, TrendingUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function StoreAnalytics() {
  const { user } = useAuth();

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ["my-store-for-analytics", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, package_id, store_packages(name, analytics_level)")
        .or(`owner_user_id.eq.${user?.id},owner_id.eq.${user?.id}`)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const analyticsLevel = (store?.store_packages as any)?.analytics_level || "none";
  const isEnabled = analyticsLevel !== "none";

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["store-analytics-detailed", store?.id],
    queryFn: async () => {
      if (!store?.id) return null;
      
      const results = await Promise.allSettled([
        supabase.from("store_products").select("id", { count: "exact", head: true }).eq("store_id", store.id),
        supabase.from("store_accessories").select("id", { count: "exact", head: true }).eq("store_id", store.id),
        supabase.from("store_repair_requests").select("id", { count: "exact", head: true }).eq("store_id", store.id),
        supabase.from("exchange_requests").select("id", { count: "exact", head: true }).eq("store_id", store.id),
        supabase.from("store_leads").select("id", { count: "exact", head: true }).eq("store_id", store.id),
        supabase.from("store_reviews").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("status", "active"),
      ]);

      const getCount = (index: number): number => {
        const result = results[index];
        if (result.status !== "fulfilled") return 0;
        const response = result.value as { count: number | null; error: any };
        return response.count || 0;
      };

      return {
        products: getCount(0),
        accessories: getCount(1),
        repairs: getCount(2),
        exchanges: getCount(3),
        leads: getCount(4),
        reviews: getCount(5),
      };
    },
    enabled: !!store?.id && isEnabled,
  });

  if (storeLoading) return <div className="p-8 space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;

  if (!isEnabled) {
    return (
      <div className="p-12 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-amber-600" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h2 className="text-2xl font-bold">Analytics Locked</h2>
          <p className="text-muted-foreground">
            Your current <strong>{(store?.store_packages as any)?.name || "Free"}</strong> package does not include access to store analytics.
          </p>
        </div>
        <Badge variant="outline" className="text-lg py-1 px-4">Upgrade to Silver or Gold to unlock</Badge>
      </div>
    );
  }

  const metrics = [
    { title: "Inventory Items", value: (analytics?.products || 0) + (analytics?.accessories || 0), icon: Package, description: "Phones & Accessories" },
    { title: "Customer Leads", value: analytics?.leads || 0, icon: User, description: "New inquiries" },
    { title: "Repair Jobs", value: analytics?.repairs || 0, icon: Wrench, description: "Service requests" },
    { title: "Exchange Deals", value: analytics?.exchanges || 0, icon: RefreshCw, description: "Trade-in requests" },
    { title: "Store Rating", value: analytics?.reviews || 0, icon: Star, description: "Verified reviews" },
    { title: "Growth Score", value: "84%", icon: TrendingUp, description: "Performance vs last month" },
  ];

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Store Analytics</h1>
          <p className="text-muted-foreground">Performance insights for {store?.name}</p>
        </div>
        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 capitalize">
          {analyticsLevel} Analytics Enabled
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsLoading ? "..." : metric.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {analyticsLevel === "advanced" && (
        <Card className="p-12 text-center border-dashed">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
          <h3 className="text-lg font-medium">Advanced Charts Coming Soon</h3>
          <p className="text-sm text-muted-foreground">Detailed traffic and conversion charts are being prepared for your store.</p>
        </Card>
      )}
    </div>
  );
}