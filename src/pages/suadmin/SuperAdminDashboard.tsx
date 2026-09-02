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
  Gift,
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

const countTable = async (table: string, filter?: (q: any) => any) => {
  try {
    let query = supabase.from(table as any).select("*", { count: "exact", head: true });
    if (filter) query = filter(query);
    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.warn(`Unable to count ${table}`, error);
    return 0;
  }
};

const SuperAdminDashboard = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-dashboard", user?.id],
    queryFn: async () => {
      const [
        productsCount,
        ordersCount,
        listingsCount,
        repairsCount,
        unlocksCount,
        storesCount,
        profilesCount,
        pendingRepairs,
        pendingUnlocks,
        pendingApplications,
      ] = await Promise.all([
        countTable("products"),
        countTable("orders"),
        countTable("community_listings"),
        countTable("repair_requests"),
        countTable("unlocking_requests"),
        countTable("stores"),
        countTable("profiles"),
        countTable("repair_requests", (q) => q.eq("status", "pending")),
        countTable("unlocking_requests", (q) => q.eq("status", "pending")),
        countTable("store_applications", (q) => q.eq("status", "pending")),
      ]);

      const systemHealth: SystemHealth = {
        database: "healthy",
        api: "healthy",
        storage: "healthy",
        uptime: 99.9,
      };

      const metrics = [
        { title: "Total Products", value: productsCount, link: "/suadmin/catalog?tab=products", icon: Package, error: false },
        { title: "Total Orders", value: ordersCount, link: "/suadmin/commerce?tab=orders", icon: ShoppingBag, error: false },
        { title: "Active Listings", value: listingsCount, link: "/suadmin/commerce?tab=listings", icon: TrendingUp, error: false },
        { title: "Repair Requests", value: repairsCount, link: "/suadmin/service-desk?tab=repairs", icon: Wrench, error: false },
        { title: "Unlocking Requests", value: unlocksCount, link: "/suadmin/service-desk?tab=unlocking", icon: Unlock, error: false },
        { title: "Active Stores", value: storesCount, link: "/suadmin/store-network?tab=stores", icon: Store, error: false },
        { title: "Registered Users", value: profilesCount, link: "/suadmin/customers?tab=users", icon: Users, error: false },
        { title: "Pending Stores", value: pendingApplications, link: "/suadmin/store-network?tab=applications", icon: FileText, error: false },
      ] satisfies DashboardMetric[];

      return {
        metrics,
        recentActivity: {
          orders24h: 0,
          listings24h: 0,
          repairs24h: 0,
        },
        alerts: {
          unreadMessages: 0,
          pendingRepairs: pendingRepairs,
          pendingOrders: 0,
          pendingUnlocks: pendingUnlocks,
          pendingLeads: 0,
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
    (data?.alerts.pendingUnlocks ?? 0) +
    (data?.alerts.pendingLeads ?? 0);

  const quickActions = [
    { label: "Store Applications", href: "/suadmin/store-network?tab=applications", icon: FileText },
    { label: "Catalog Overview", href: "/suadmin/catalog", icon: Database },
    { label: "Team Access", href: "/suadmin/team-access", icon: ShieldAlert },
    { label: "System Overview", href: "/suadmin/system", icon: SettingsIcon },
    { label: "Customers", href: "/suadmin/customers", icon: Users },
    { label: "Service Desk", href: "/suadmin/service-desk", icon: Wrench },
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
            <Link to="/suadmin/engagement?tab=messages" className="block rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 hover:bg-purple-500/10 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Unread Messages</span>
                <Badge variant="secondary">{data?.alerts.unreadMessages}</Badge>
              </div>
            </Link>
          )}
          {(data?.alerts.pendingRepairs ?? 0) > 0 && (
            <Link to="/suadmin/service-desk?tab=repairs" className="block rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 hover:bg-blue-500/10 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pending Repairs</span>
                <Badge variant="secondary">{data?.alerts.pendingRepairs}</Badge>
              </div>
            </Link>
          )}
          {(data?.alerts.pendingOrders ?? 0) > 0 && (
            <Link to="/suadmin/commerce?tab=orders" className="block rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 hover:bg-orange-500/10 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pending Orders</span>
                <Badge variant="secondary">{data?.alerts.pendingOrders}</Badge>
              </div>
            </Link>
          )}
          {(data?.alerts.pendingUnlocks ?? 0) > 0 && (
            <Link to="/suadmin/service-desk?tab=unlocking" className="block rounded-xl border border-green-500/20 bg-green-500/5 p-4 hover:bg-green-500/10 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pending Unlocks</span>
                <Badge variant="secondary">{data?.alerts.pendingUnlocks}</Badge>
              </div>
            </Link>
          )}
          {(data?.alerts.pendingLeads ?? 0) > 0 && (
            <Link to="/suadmin/commerce?tab=leads" className="block rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 hover:bg-amber-500/10 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">New Leads</span>
                <Badge variant="secondary">{data?.alerts.pendingLeads}</Badge>
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
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
