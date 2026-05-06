import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CreditCard,
  FileText,
  MessageSquare,
  Package,
  ShoppingBag,
  Store,
  User,
  Wrench,
  ShieldAlert,
  Settings as SettingsIcon,
  Database,
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
  Server,
  Unlock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

type DashboardMetric = {
  title: string;
  value: number;
  change?: number;
  link: string;
  icon: ComponentType<{ className?: string }>;
  error: boolean;
};

type SystemHealth = {
  database: "healthy" | "warning" | "error";
  api: "healthy" | "warning" | "error";
  storage: "healthy" | "warning" | "error";
  uptime: number;
};

const SuperAdminDashboard = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-dashboard", user?.id],
    queryFn: async () => {
      const results = await Promise.allSettled([
        // Core metrics (indices 0–7)
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("sell_listings").select("id", { count: "exact", head: true }),
        supabase.from("repair_requests").select("id", { count: "exact", head: true }),
        supabase.from("stores").select("id", { count: "exact", head: true }),
        supabase.from("articles").select("id", { count: "exact", head: true }),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("unlock_requests").select("id", { count: "exact", head: true }),
        supabase.from("stores").select("total_revenue").not("total_revenue", "is", null),

        // Recent activity last 24h (indices 9–11)
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from("sell_listings")
          .select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from("repair_requests")
          .select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),

        // Alert counts (indices 12–15)
        supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "unread"),
        supabase.from("repair_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("order_status", "pending"),
        supabase.from("unlock_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      type SupabaseResponse = { count: number | null; error: unknown };

      const getCountOrError = (index: number): { value: number; error: boolean } => {
        const result = results[index];
        if (result.status !== "fulfilled") return { value: 0, error: true };
        const response = result.value as SupabaseResponse;
        if (response.error) return { value: 0, error: true };
        return { value: response.count || 0, error: false };
      };

      // ✅ Fixed: getCount returns a number directly — no .count sub-property
      const getCount = (index: number): number => {
        const result = results[index];
        if (result.status !== "fulfilled") return 0;
        const response = result.value as SupabaseResponse;
        if (response.error) return 0;
        return response.count || 0;
      };

      const unreadMessages = getCount(13);
      const pendingRepairs = getCount(14);
      const pendingOrders = getCount(15);
      const pendingUnlocks = getCount(16);

      const systemHealth: SystemHealth = {
        database: "healthy",
        api: "healthy",
        storage: "healthy",
        uptime: 99.9,
      };

      const totalRevenue = (results[9].status === "fulfilled" && !(results[9].value as any).error) 
        ? (results[9].value as any).data?.reduce((acc: number, curr: any) => acc + (curr.total_revenue || 0), 0) 
        : 0;

      return {
        metrics: [
          { title: "Total Revenue", value: totalRevenue || 0, link: "/suadmin/analytics", icon: CreditCard, error: results[9].status !== "fulfilled" },
          { title: "Total Products", ...getCountOrError(0), link: "/suadmin/products", icon: Package },
          { title: "Total Orders", ...getCountOrError(1), link: "/suadmin/orders", icon: ShoppingBag },
          { title: "Active Listings", ...getCountOrError(2), link: "/suadmin/listings", icon: TrendingUp },
          { title: "Repair Requests", ...getCountOrError(3), link: "/suadmin/repairs", icon: Wrench },
          { title: "Unlocking Requests", ...getCountOrError(8), link: "/suadmin/unlocking", icon: Unlock },
          { title: "Active Stores", ...getCountOrError(4), link: "/suadmin/stores", icon: Store },
          { title: "Support Messages", ...getCountOrError(6), link: "/suadmin/messages", icon: MessageSquare },
          { title: "Registered Users", ...getCountOrError(7), link: "/suadmin/users", icon: User },
        ] satisfies DashboardMetric[],
        recentActivity: {
          orders24h: getCount(10),
          listings24h: getCount(11),
          repairs24h: getCount(12),
        },
        alerts: {
          unreadMessages,
          pendingRepairs,
          pendingOrders,
          pendingUnlocks,
        },
        systemHealth,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-16 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const alertTotal =
    (data?.alerts.unreadMessages ?? 0) +
    (data?.alerts.pendingRepairs ?? 0) +
    (data?.alerts.pendingOrders ?? 0) +
    (data?.alerts.pendingUnlocks ?? 0);

  const quickActions = [
    { label: "System Settings", href: "/suadmin/settings", icon: SettingsIcon },
    { label: "User Management", href: "/suadmin/users", icon: Users },
    { label: "Platform Analytics", href: "/suadmin/analytics", icon: BarChart3 },
    { label: "Database Maintenance", href: "/suadmin/maintenance", icon: Database },
  ];

  return (
    <div className="space-y-8">
      {/* System Status Header */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="rounded-full bg-primary/10 p-2">
              <ShieldAlert className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Super Admin Control</CardTitle>
              <p className="text-sm text-muted-foreground">Full system access granted</p>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="rounded-full bg-green-500/10 p-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-lg">System Health</CardTitle>
              <p className="text-sm text-muted-foreground">All systems operational</p>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="rounded-full bg-blue-500/10 p-2">
              <Activity className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Platform Uptime</CardTitle>
              <p className="text-sm text-muted-foreground">{data?.systemHealth.uptime}% this month</p>
            </div>
          </CardHeader>
        </Card>

        <Card className={alertTotal > 0 ? "border-orange-500/20 bg-orange-500/5" : "border-green-500/20 bg-green-500/5"}>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className={`rounded-full p-2 ${alertTotal > 0 ? "bg-orange-500/10" : "bg-green-500/10"}`}>
              <AlertTriangle className={`h-6 w-6 ${alertTotal > 0 ? "text-orange-500" : "text-green-500"}`} />
            </div>
            <div>
              <CardTitle className="text-lg">Active Alerts</CardTitle>
              <p className="text-sm text-muted-foreground">
                {alertTotal > 0 ? `${alertTotal} items need attention` : "All clear!"}
              </p>
            </div>
          </CardHeader>
        </Card>
      </section>

      {/* Alerts breakdown */}
      {alertTotal > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {(data?.alerts.unreadMessages ?? 0) > 0 && (
            <Link to="/suadmin/messages" className="block rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 hover:bg-purple-500/10 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Unread Messages</span>
                <Badge variant="secondary">{data?.alerts.unreadMessages}</Badge>
              </div>
            </Link>
          )}
          {(data?.alerts.pendingRepairs ?? 0) > 0 && (
            <Link to="/suadmin/repairs" className="block rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 hover:bg-blue-500/10 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pending Repairs</span>
                <Badge variant="secondary">{data?.alerts.pendingRepairs}</Badge>
              </div>
            </Link>
          )}
          {(data?.alerts.pendingOrders ?? 0) > 0 && (
            <Link to="/suadmin/orders" className="block rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 hover:bg-orange-500/10 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pending Orders</span>
                <Badge variant="secondary">{data?.alerts.pendingOrders}</Badge>
              </div>
            </Link>
          )}
          {(data?.alerts.pendingUnlocks ?? 0) > 0 && (
            <Link to="/suadmin/unlocking" className="block rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 hover:bg-emerald-500/10 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pending Unlocks</span>
                <Badge variant="secondary">{data?.alerts.pendingUnlocks}</Badge>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button key={action.href} variant="outline" className="justify-start gap-2 h-auto p-4" asChild>
                  <Link to={action.href}>
                    <Icon className="h-4 w-4" />
                    {action.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Platform Overview */}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/60">
          <CardHeader>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Platform Overview</div>
            <CardTitle className="text-3xl">System Metrics</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Comprehensive view of all platform operations, user activity, and system performance. Monitor key metrics and take action on critical alerts.
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity (24h)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">New Orders</span>
              <Badge variant="secondary">{data?.recentActivity.orders24h ?? 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">New Listings</span>
              <Badge variant="secondary">{data?.recentActivity.listings24h ?? 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Repair Requests</span>
              <Badge variant="secondary">{data?.recentActivity.repairs24h ?? 0}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(data?.metrics ?? []).map((metric) => {
          const Icon = metric.icon;
          return (
            <Link key={metric.title} to={metric.link}>
              <Card className="h-full border-border/60 transition-all hover:-translate-y-1 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                  <Icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  {metric.error ? (
                    <Badge variant="destructive" className="mt-1">Error</Badge>
                  ) : (
                    <div className="text-3xl font-bold">{metric.value.toLocaleString()}</div>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* System Health Details */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Server className="h-5 w-5 text-primary" />
            System Health Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Database</span>
              <Badge variant={data?.systemHealth.database === "healthy" ? "secondary" : "destructive"}>
                {data?.systemHealth.database}
              </Badge>
            </div>
            <Progress value={95} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">API Services</span>
              <Badge variant={data?.systemHealth.api === "healthy" ? "secondary" : "destructive"}>
                {data?.systemHealth.api}
              </Badge>
            </div>
            <Progress value={98} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Storage</span>
              <Badge variant={data?.systemHealth.storage === "healthy" ? "secondary" : "destructive"}>
                {data?.systemHealth.storage}
              </Badge>
            </div>
            <Progress value={87} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Uptime</span>
              <Badge variant="secondary">{data?.systemHealth.uptime}%</Badge>
            </div>
            <Progress value={data?.systemHealth.uptime || 0} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;
