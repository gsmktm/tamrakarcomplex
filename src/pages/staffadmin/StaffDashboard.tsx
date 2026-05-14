import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Package, 
  Smartphone, 
  Wrench, 
  RefreshCw, 
  User, 
  LayoutDashboard,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function StaffDashboard() {
  const { user } = useAuth();

  // Find the staff record for this user
  const { data: staffRecord, isLoading: staffLoading } = useQuery({
    queryKey: ["my-staff-record", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_staff")
        .select(`
          *,
          store:stores(id, name, logo_url)
        `)
        .eq("user_id", user?.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const permissions = (staffRecord?.permissions as string[]) || [];
  const store = staffRecord?.store;

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["staff-dashboard-stats", store?.id],
    queryFn: async () => {
      if (!store?.id) return null;
      const results = await Promise.allSettled([
        supabase.from("store_products").select("id", { count: "exact", head: true }).eq("store_id", store.id),
        supabase.from("store_repair_requests").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("repair_status", "new"),
        supabase.from("exchange_requests").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("status", "pending"),
        supabase.from("store_leads").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("status", "new"),
      ]);

      const getCount = (index: number): number => {
        const result = results[index];
        if (result.status !== "fulfilled") return 0;
        return (result.value as any).count || 0;
      };

      return {
        products: getCount(0),
        newRepairs: getCount(1),
        newExchanges: getCount(2),
        newLeads: getCount(3),
      };
    },
    enabled: !!store?.id,
  });

  if (staffLoading) return <div className="p-8 space-y-6"><Skeleton className="h-12 w-64" /><div className="grid grid-cols-1 md:grid-cols-4 gap-6"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div></div>;

  if (!staffRecord) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <ShieldCheck className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
        <h2 className="text-2xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground max-w-sm mt-2">
          You are not currently assigned as a staff member to any store. Please contact your store manager.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link to="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  const modules = [
    { id: "manage_products", label: "Inventory", icon: Package, href: "/staff/products", count: stats?.products },
    { id: "manage_accessories", label: "Accessories", icon: Smartphone, href: "/staff/accessories" },
    { id: "manage_repairs", label: "Repair Jobs", icon: Wrench, href: "/staff/repairs", count: stats?.newRepairs, badge: "New" },
    { id: "manage_exchange", label: "Exchanges", icon: RefreshCw, href: "/staff/exchange", count: stats?.newExchanges, badge: "New" },
    { id: "manage_leads", label: "Inquiries", icon: User, href: "/staff/leads", count: stats?.newLeads, badge: "New" },
  ];

  const allowedModules = modules.filter(m => permissions.includes(m.id as any));

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border">
            {store?.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="h-8 w-8 object-contain" />
            ) : (
              <LayoutDashboard className="h-6 w-6 text-primary" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Staff Portal: {store?.name}</h1>
            <p className="text-sm text-muted-foreground">Logged in as {staffRecord.role}</p>
          </div>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          Active Session
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-blue-50/50 border-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 uppercase tracking-wider">New Leads</p>
                <h3 className="text-3xl font-bold mt-1">{stats?.newLeads || 0}</h3>
              </div>
              <User className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/50 border-emerald-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600 uppercase tracking-wider">New Repairs</p>
                <h3 className="text-3xl font-bold mt-1">{stats?.newRepairs || 0}</h3>
              </div>
              <Wrench className="h-8 w-8 text-emerald-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50/50 border-purple-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 uppercase tracking-wider">Exchanges</p>
                <h3 className="text-3xl font-bold mt-1">{stats?.newExchanges || 0}</h3>
              </div>
              <RefreshCw className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50 border-amber-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600 uppercase tracking-wider">Inventory</p>
                <h3 className="text-3xl font-bold mt-1">{stats?.products || 0}</h3>
              </div>
              <Package className="h-8 w-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Your Permitted Modules
        </h2>
        
        {allowedModules.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <p className="text-muted-foreground">You don't have any module permissions yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allowedModules.map((module) => {
              const Icon = module.icon;
              return (
                <Link key={module.id} to={module.href}>
                  <Card className="hover:border-primary transition-colors cursor-pointer group">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold">{module.label}</div>
                          {module.badge && (
                            <Badge className="h-4 text-[9px] px-1 bg-red-500">{module.badge}</Badge>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y">
                {[1,2,3].map(i => (
                  <div key={i} className="p-4 flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <span className="font-medium text-blue-600">New Repair</span> request received from customer 10 mins ago.
                    </div>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg">Staff Notice</CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-sm leading-relaxed">
               Please ensure all repair requests are updated with estimated completion times within 2 hours of receipt. 
               For exchange valuations, refer to the platform's price list before making an offer.
             </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
