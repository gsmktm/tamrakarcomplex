import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  ShoppingCart,
  Users,
  Store,
  FileText,
  Wrench,
  Unlock,
  Smartphone,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ChevronRight,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type DashboardMetric = {
  title: string;
  value: number;
  change?: number;
  link: string;
  icon: ComponentType<{ className?: string }>;
  error: boolean;
};

export default function StaffAdminDashboard() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["staff-dashboard", user?.id],
    queryFn: async () => {
      const results = await Promise.allSettled([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("sell_listings").select("id", { count: "exact", head: true }),
        supabase.from("repair_requests").select("id", { count: "exact", head: true }),
        supabase.from("stores").select("id", { count: "exact", head: true }),
        supabase.from("articles").select("id", { count: "exact", head: true }),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }),
        supabase.from("unlock_requests").select("id", { count: "exact", head: true }),
        supabase.from("sell_phone_leads").select("id", { count: "exact", head: true }),

        // Pending items requiring attention
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("order_status", "pending"),
        supabase.from("repair_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "unread"),
        supabase.from("sell_listings").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("unlock_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("sell_phone_leads").select("id", { count: "exact", head: true }).eq("status", "new"),
      ]);

      const getCountOrError = (index: number): { value: number; error: boolean } => {
        const result = results[index];
        if (result.status !== "fulfilled") return { value: 0, error: true };
        const response = result.value as { count: number | null; error: PostgrestError | null };
        if (response.error) return { value: 0, error: true };
        return { value: response.count || 0, error: false };
      };

      return {
        metrics: [
          { title: "Products", ...getCountOrError(0), link: "/staffadmin/products", icon: Package },
          { title: "Orders", ...getCountOrError(1), link: "/staffadmin/orders", icon: ShoppingCart },
          { title: "Listings", ...getCountOrError(2), link: "/staffadmin/listings", icon: Users },
          { title: "Repairs", ...getCountOrError(3), link: "/staffadmin/repairs", icon: Wrench },
          { title: "Stores", ...getCountOrError(4), link: "/staffadmin/stores", icon: Store },
          { title: "Articles", ...getCountOrError(5), link: "/staffadmin/articles", icon: FileText },
          { title: "Messages", ...getCountOrError(6), link: "/staffadmin/messages", icon: Users },
          { title: "Unlocking", ...getCountOrError(7), link: "/staffadmin/unlocking", icon: Unlock },
          { title: "Sell Leads", ...getCountOrError(8), link: "/staffadmin/leads", icon: Smartphone },
        ] satisfies DashboardMetric[],
        pendingItems: {
          orders: getCountOrError(9).value,
          repairs: getCountOrError(10).value,
          messages: getCountOrError(11).value,
          listings: getCountOrError(12).value,
          unlocking: getCountOrError(13).value,
          sellLeads: getCountOrError(14).value,
        },
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const pendingCount = Object.values(data?.pendingItems || {}).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Operations Dashboard</h1>
          </div>
          <p className="text-muted-foreground mt-1">Platform-wide overview and management.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/staffadmin/console">
              <Settings className="mr-2 h-4 w-4" />
              Console
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={cn("border-l-4", pendingCount > 0 ? "border-l-orange-500" : "border-l-green-500")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            {pendingCount > 0 ? (
              <AlertCircle className="h-4 w-4 text-orange-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              {pendingCount > 0 ? "Items require immediate attention" : "No pending items"}
            </p>
          </CardContent>
        </Card>

        {data?.metrics.slice(0, 3).map((metric) => (
          <Link key={metric.title} to={metric.link}>
            <Card className="hover:shadow-md transition-all cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <metric.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="flex items-center text-xs text-primary mt-1">
                  View details <ArrowUpRight className="ml-1 h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {data?.metrics.slice(3).map((metric) => (
          <Link key={metric.title} to={metric.link}>
            <Card className="hover:shadow-md transition-all cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <metric.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="flex items-center text-xs text-primary mt-1">
                  View details <ArrowUpRight className="ml-1 h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
