import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VISITOR_LOGS_COLUMNS } from "@/lib/supabaseColumnMaps";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from "recharts";
import { 
  TrendingUp, TrendingDown, Users, ShoppingBag, Store, CreditCard, 
  ArrowUpRight, ArrowDownRight, Activity, Calendar, Download,
  ExternalLink, ArrowRight, Globe, MapPin, MousePointer2, Clock, ShieldCheck, AlertCircle
} from "lucide-react";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useLocation } from "react-router-dom";
import { getPublicStorePath } from "@/lib/storeRoutes";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

interface VisitorStatsItem {
  period: string;
  total_visits: number;
  unique_visitors: number;
}

interface CountryStatsItem {
  name: string;
  value: number;
}

interface VisitorLogItem {
  id: string;
  created_at: string;
  ip_address: string;
  country: string | null;
  city: string | null;
  url: string;
  referrer: string;
  is_unique: boolean;
}

interface SubPieDataItem {
  name: string;
  value: number;
}

interface RecentOrderItem {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  profiles: {
    display_name: string | null;
  } | null;
}

interface TopStoreItem {
  id: string;
  name: string;
  slug?: string | null;
  seo_slug?: string | null;
  logo_url: string | null;
}

export default function Analytics() {
  const location = useLocation();
  const ordersPath = location.pathname.startsWith("/staffadmin")
    ? "/staffadmin/orders"
    : "/suadmin/orders";
  const [visitorPeriod, setVisitorPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  
  const { data: stats, isLoading, error: statsError } = useQuery({
    queryKey: ["admin-analytics", visitorPeriod],
    queryFn: async () => {
      try {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const sixtyDaysAgo = subDays(new Date(), 60).toISOString();

      const [
        { data: revenueData },
        { data: ordersData },
        { data: storesData },
        { data: usersData },
        { data: listingsData },
        { data: topStores },
        { data: recentOrders },
        { data: totalVisitors },
        { data: uniqueVisitorsToday },
        { data: visitorStatsData },
        { data: recentVisitorLogs },
        { data: countriesGrouped },
        { data: prevRevenueData },
        { data: prevOrdersData },
        { data: prevUsersData },
      ] = await Promise.all([
        supabase.from("orders").select("total_amount, created_at").gte("created_at", thirtyDaysAgo),
        supabase.from("orders").select("id, created_at").gte("created_at", thirtyDaysAgo),
        supabase.from("stores").select("id, created_at, package_slug, subscription_status"),
        supabase.from("profiles").select("id, created_at"),
        supabase.from("sell_listings").select("id, created_at"),
        supabase.from("stores").select("id, name, slug, seo_slug, logo_url").limit(5),
        supabase.from("orders").select("id, total_amount, status, created_at, profiles(display_name)").order("created_at", { ascending: false }).limit(5),
        supabase.from("visitor_logs").select("*", { count: "exact", head: true }),
        supabase.from("visitor_logs").select("*", { count: "exact", head: true }).eq("is_unique", true).gte("created_at", startOfDay(new Date()).toISOString()),
        supabase.rpc("get_visitor_stats", { p_period: visitorPeriod }),
        supabase.from("visitor_logs").select(VISITOR_LOGS_COLUMNS.join(",")).order("created_at", { ascending: false }).limit(10),
        supabase.rpc("get_top_visitor_countries", { p_limit: 5 }),
        supabase.from("orders").select("total_amount").gte("created_at", sixtyDaysAgo).lt("created_at", thirtyDaysAgo),
        supabase.from("orders").select("id").gte("created_at", sixtyDaysAgo).lt("created_at", thirtyDaysAgo),
        supabase.from("profiles").select("id").gte("created_at", sixtyDaysAgo).lt("created_at", thirtyDaysAgo),
      ]);

      // Process visitor stats for chart
      const visitorChartData = Array.isArray(visitorStatsData) ? (visitorStatsData as any[]).map((item) => ({
        date: visitorPeriod === 'daily' ? format(new Date(item.label || item.period), "HH:00") : format(new Date(item.label || item.period), "MMM dd"),
        total: item.total_visits || 0,
        unique: item.unique_visits || item.unique_visitors || 0
      })) : [];

      // Aggregate revenue by day
      const dailyRevenue: Record<string, number> = {};
      (revenueData || []).forEach(order => {
        const date = format(new Date(order.created_at), "MMM dd");
        dailyRevenue[date] = (dailyRevenue[date] || 0) + Number(order.total_amount);
      });

      const revenueChartData = Object.entries(dailyRevenue).map(([date, amount]) => ({
        date,
        amount
      }));

      // Aggregate orders by day
      const dailyOrders: Record<string, number> = {};
      (ordersData || []).forEach(order => {
        const date = format(new Date(order.created_at), "MMM dd");
        dailyOrders[date] = (dailyOrders[date] || 0) + 1;
      });

      const ordersChartData = Object.entries(dailyOrders).map(([date, count]) => ({
        date,
        count
      }));

      // Subscription distribution
      const subTiers: Record<string, number> = {};
      (storesData || []).forEach(store => {
        const tier = store.subscription_status === 'active' ? (store.package_slug || "free") : "free";
        subTiers[tier] = (subTiers[tier] || 0) + 1;
      });

      const subPieData: SubPieDataItem[] = Object.entries(subTiers).map(([name, value]) => ({
        name: name.toUpperCase(),
        value
      }));

      const currentRevenue = (revenueData || []).reduce((acc, curr) => acc + Number(curr.total_amount), 0);
      const prevRevenue = (prevRevenueData || []).reduce((acc, curr) => acc + Number(curr.total_amount), 0);
      const currentOrders = (ordersData || []).length;
      const prevOrders = (prevOrdersData || []).length;
      const currentUsers = (usersData || []).length;
      const prevUsers = (prevUsersData || []).length;

      const calcGrowth = (curr: number, prev: number): string => {
        if (prev === 0) return curr > 0 ? "+100%" : "—";
        const pct = ((curr - prev) / prev) * 100;
        return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
      };

      return {
        totalRevenue: currentRevenue,
        totalOrders: currentOrders,
        totalStores: (storesData || []).length || 0,
        totalUsers: currentUsers,
        totalListings: (listingsData || []).length || 0,
        revenueGrowth: calcGrowth(currentRevenue, prevRevenue),
        ordersGrowth: calcGrowth(currentOrders, prevOrders),
        usersGrowth: calcGrowth(currentUsers, prevUsers),
        revenueChartData,
        ordersChartData,
        subPieData,
        topStores: (topStores || []) as TopStoreItem[],
        recentOrders: (recentOrders || []) as unknown as RecentOrderItem[],
        visitorStats: {
          totalVisitors: (totalVisitors as { count: number | null })?.count || 0,
          uniqueVisitorsToday: (uniqueVisitorsToday as { count: number | null })?.count || 0,
          chartData: visitorChartData,
          recentLogs: (recentVisitorLogs || []) as VisitorLogItem[],
          topCountries: Array.isArray(countriesGrouped) ? countriesGrouped as CountryStatsItem[] : []
        }
      };
      } catch (err) {
        handleSupabaseError(err, "Analytics: Failed to fetch analytics data");
        throw err;
      }
    },
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  if (statsError || !stats) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="flex justify-center">
          <AlertCircle className="h-8 w-8 text-amber-500" />
        </div>
        <div>
          <p className="font-medium text-sm">Unable to load analytics</p>
          <p className="text-xs text-muted-foreground mt-1">Database connection issue. Please try again.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Analytics</h1>
          <p className="text-muted-foreground">Comprehensive insights into marketplace performance and growth.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Last 30 Days
          </Button>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {stats?.totalRevenue.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              {stats?.revenueGrowth ?? "—"} vs last 30d
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats?.totalOrders}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              {stats?.ordersGrowth ?? "—"} vs last 30d
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Daily Unique Visitors</CardTitle>
            <MousePointer2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats?.visitorStats?.uniqueVisitorsToday}</div>
            <div className="flex items-center text-xs text-blue-500 mt-1">
              <Activity className="h-3 w-3 mr-1" />
              Real-time tracking
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Registered Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats?.totalUsers}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              {stats?.usersGrowth ?? "—"} vs last 30d
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Stores</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStores}</div>
            <div className="flex items-center text-xs text-blue-500 mt-1">
              <Activity className="h-3 w-3 mr-1" />
              Steady growth
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="visitors">Visitor Analytics</TabsTrigger>
          <TabsTrigger value="stores">Store Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>Daily revenue generated from marketplace sales.</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.revenueChartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.1}/>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} tickFormatter={(val) => `Rs.${val/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--primary))' }}
                    />
                    <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Store Tiers</CardTitle>
                <CardDescription>Distribution of stores across subscription plans.</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.subPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats?.subPieData.map((entry: SubPieDataItem, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {stats?.subPieData.map((entry: SubPieDataItem, index: number) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-xs font-medium">{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Marketplace Orders</CardTitle>
                  <CardDescription>The latest transactions across all stores.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={ordersPath}>View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.recentOrders?.map((order: RecentOrderItem) => (
                    <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <ShoppingBag className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{order.profiles?.display_name || "Guest Customer"}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), "MMM dd, yyyy")}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">Rs. {order.total_amount.toLocaleString()}</p>
                        <p className={`text-[10px] uppercase font-bold ${order.status === 'completed' ? 'text-green-500' : 'text-amber-500'}`}>
                          {order.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performing Stores</CardTitle>
                <CardDescription>Based on recent activity.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.topStores?.map((store: TopStoreItem) => (
                    <div key={store.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
                          {store.logo_url ? (
                            <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
                          ) : (
                            <Store className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{store.name}</p>
                          <p className="text-xs text-muted-foreground">Premium Partner</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={getPublicStorePath(store)}><ExternalLink className="h-4 w-4" /></Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="visitors" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Visitor Traffic</CardTitle>
                  <CardDescription>Total visits vs unique visitors over time.</CardDescription>
                </div>
                <div className="flex gap-1">
                  {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((period) => (
                    <Button
                      key={period}
                      variant={visitorPeriod === period ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVisitorPeriod(period)}
                      className="capitalize h-7 text-[10px]"
                    >
                      {period}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats?.visitorStats?.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.1}/>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Total Visits" />
                    <Line type="monotone" dataKey="unique" stroke="#10b981" strokeWidth={2} dot={false} name="Unique Visitors" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Top Locations</CardTitle>
                <CardDescription>Visitor distribution by country.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {stats?.visitorStats?.topCountries?.length > 0 ? (
                    stats.visitorStats.topCountries.map((country: CountryStatsItem) => (
                      <div key={country.name} className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Globe className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{country.name || "Unknown"}</span>
                            <span className="text-muted-foreground">{country.value} visits</span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all" 
                              style={{ width: `${(country.value / stats.visitorStats.totalVisitors) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                      <Globe className="h-12 w-12 mb-2 opacity-20" />
                      <p>No location data available yet.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Live Visitor Log</CardTitle>
              <CardDescription>Real-time stream of visitors and their technical details.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative w-full overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="h-10 px-4 text-left font-medium">Time</th>
                      <th className="h-10 px-4 text-left font-medium">IP Address</th>
                      <th className="h-10 px-4 text-left font-medium">Location</th>
                      <th className="h-10 px-4 text-left font-medium">Page Path</th>
                      <th className="h-10 px-4 text-left font-medium">Referrer</th>
                      <th className="h-10 px-4 text-left font-medium">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.visitorStats?.recentLogs?.map((log: VisitorLogItem) => (
                      <tr key={log.id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(log.created_at), "HH:mm:ss")}
                          </div>
                        </td>
                        <td className="p-4 font-mono text-xs">{log.ip_address}</td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-medium">{log.country || "Unknown"}</span>
                            <span className="text-xs text-muted-foreground">{log.city || "Unknown City"}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 text-xs max-w-[200px] truncate">
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            {log.url?.replace(window.location.origin, '') || '/'}
                          </div>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground max-w-[150px] truncate">
                          {log.referrer === 'direct' ? 'Direct Entry' : log.referrer}
                        </td>
                        <td className="p-4">
                          {log.is_unique ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              UNIQUE
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              REPEAT
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
