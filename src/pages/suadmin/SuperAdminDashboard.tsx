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
  database: "connected" | "check required";
  api: "not monitored";
  storage: "not monitored";
  uptime: null;
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
    return null;
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
        unreadMessages,
        pendingOrders,
        pendingLeads,
        openStaffTasks,
        orders24h,
        listings24h,
        repairs24h,
      ] = await Promise.all([
        countTable("products"),
        countTable("orders"),
        countTable("community_listings"),
        countTable("repair_requests"),
        countTable("unlock_requests"),
        countTable("stores"),
        countTable("profiles"),
        countTable("repair_requests", (q) => q.in("status", ["new", "pending", "assigned", "inspection", "repairing", "in_progress"])),
        countTable("unlock_requests", (q) => q.in("status", ["pending", "processing"])),
        countTable("store_applications", (q) => q.eq("status", "pending")),
        countTable("contact_messages", (q) => q.eq("is_read", false)),
        countTable("orders", (q) => q.in("order_status", ["pending", "confirmed", "processing", "packed", "shipped"])),
        countTable("sell_phone_leads", (q) => q.eq("status", "new")),
        countTable("admin_tasks", (q) => q.eq("assigned_role_type", "staffadmin").in("status", ["pending", "in_progress", "overdue"])),
        countTable("orders", (q) => q.gte("created_at", new Date(Date.now() - 86_400_000).toISOString())),
        countTable("community_listings", (q) => q.gte("created_at", new Date(Date.now() - 86_400_000).toISOString())),
        countTable("repair_requests", (q) => q.gte("created_at", new Date(Date.now() - 86_400_000).toISOString())),
      ]);

      // A successful database query proves data access, not platform-wide uptime.
      // API availability, storage health, and uptime require server-side monitors.
      const systemHealth: SystemHealth = {
        database: productsCount === null ? "check required" : "connected",
        api: "not monitored",
        storage: "not monitored",
        uptime: null,
      };
      const dataAccessErrors = [
        productsCount, ordersCount, listingsCount, repairsCount, unlocksCount,
        storesCount, profilesCount, pendingRepairs, pendingUnlocks,
        pendingApplications, unreadMessages, pendingOrders, pendingLeads,
        openStaffTasks, orders24h, listings24h, repairs24h,
      ].some((value) => value === null);

      const metrics = [
        { title: "Total Products", value: productsCount ?? 0, link: "/suadmin/catalog?tab=products", icon: Package, error: productsCount === null },
        { title: "Total Orders", value: ordersCount ?? 0, link: "/suadmin/commerce?tab=orders", icon: ShoppingBag, error: ordersCount === null },
        { title: "Active Listings", value: listingsCount ?? 0, link: "/suadmin/commerce?tab=listings", icon: TrendingUp, error: listingsCount === null },
        { title: "Repair Requests", value: repairsCount ?? 0, link: "/suadmin/service-desk?tab=repairs", icon: Wrench, error: repairsCount === null },
        { title: "Unlocking Requests", value: unlocksCount ?? 0, link: "/suadmin/service-desk?tab=unlocking", icon: Unlock, error: unlocksCount === null },
        { title: "Active Stores", value: storesCount ?? 0, link: "/suadmin/store-network?tab=stores", icon: Store, error: storesCount === null },
        { title: "Registered Users", value: profilesCount ?? 0, link: "/suadmin/customers?tab=users", icon: Users, error: profilesCount === null },
        { title: "Pending Stores", value: pendingApplications ?? 0, link: "/suadmin/store-network?tab=applications", icon: FileText, error: pendingApplications === null },
        { title: "Open Staff Tasks", value: openStaffTasks ?? 0, link: "/suadmin/team-access?tab=tasks", icon: ShieldAlert, error: openStaffTasks === null },
      ] satisfies DashboardMetric[];

      return {
        metrics,
        recentActivity: { orders24h, listings24h, repairs24h },
        alerts: { unreadMessages, pendingRepairs, pendingOrders, pendingUnlocks, pendingLeads },
        dataAccessErrors,
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

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="rounded-full bg-green-500/10 p-2">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Database Access</CardTitle>
              <p className="text-sm text-muted-foreground">{data?.systemHealth.database ?? "not checked"}</p>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="rounded-full bg-blue-500/10 p-2">
              <Activity className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Monitoring Coverage</CardTitle>
              <p className="text-sm text-muted-foreground">API, storage and uptime monitors not configured</p>
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
                {data?.dataAccessErrors ? "Some queues could not be checked" : alertTotal > 0 ? `${alertTotal} items need attention` : "No open alerts in monitored queues"}
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
            <CardTitle className="text-3xl">Live Operational Queues</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Database-backed counts for catalog, orders, stores, service cases and team tasks. Unavailable data is shown as an error, never as an invented zero.
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity (24h)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">New Orders</span>
              <Badge variant="secondary">{data?.recentActivity.orders24h ?? "Unavailable"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">New Listings</span>
              <Badge variant="secondary">{data?.recentActivity.listings24h ?? "Unavailable"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Repair Requests</span>
              <Badge variant="secondary">{data?.recentActivity.repairs24h ?? "Unavailable"}</Badge>
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

      {/* Observed state only: do not invent uptime or storage health. */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Server className="h-5 w-5 text-primary" />
            Monitoring & Data Integrity
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Database query", value: data?.systemHealth.database ?? "not checked" },
            { label: "API monitoring", value: "not monitored" },
            { label: "Storage monitoring", value: "not monitored" },
            { label: "Uptime monitoring", value: "not monitored" },
          ].map((check) => (
            <div key={check.label} className="flex items-center justify-between gap-3 rounded-xl border p-4">
              <span className="text-sm font-medium">{check.label}</span>
              <Badge variant={check.value === "connected" ? "secondary" : "outline"}>{check.value}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;
