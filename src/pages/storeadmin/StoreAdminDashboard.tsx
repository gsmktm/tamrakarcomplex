import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { REPAIR_REQUESTS_COLUMNS, UNLOCK_REQUESTS_COLUMNS, SELL_PHONE_LEADS_COLUMNS } from "@/lib/supabaseColumnMaps";
import { useAuth } from "@/hooks/useAuth";
import { useStoreMembership } from "@/hooks/useStoreMembership";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Store, Package, CreditCard,
  ExternalLink, Settings, CheckCircle2, Plus, ArrowRight, Wrench, Unlock, Smartphone,
  RefreshCw, Clock, Gem, Award, Building2, ShieldCheck, Zap,
  TrendingUp, Users, Search, Filter, MoreVertical, ArrowUpRight
} from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import MobileInventoryManager from "@/components/admin/storeadmin/MobileInventoryManager";
import LeadManager from "@/pages/admin/LeadManager";
import { getStoreEntitlements } from "@/lib/storePackages";
import { getPublicStorePath } from "@/lib/storeRoutes";
import { resolveStorePackageContext } from "@/lib/storePackageRuntime";

export default function StoreAdminDashboard() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = role === "suadmin";
  const { storeIds: myStoreIds } = useStoreMembership(user?.id);
  const [selectedManagedStoreId, setSelectedManagedStoreId] = useState<string | null>(null);

  const { data: stores, isLoading: isStoresLoading } = useQuery({
    queryKey: ["my-stores", user?.id, role],
    queryFn: async () => {
      // If super admin, fetch all stores
      if (isSuperAdmin) {
        const { data, error } = await supabase
          .from("stores")
          .select(`
            *,
            package:store_packages (*),
            store_subscriptions (*)
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return (data || []).map(store => ({
          ...store,
          store_subscriptions: (store.store_subscriptions as any)?.[0] || null
        }));
      }

      // If store admin, fetch stores where user is an admin or owner
      if (myStoreIds.length === 0) return [];

      const { data, error } = await supabase
        .from("stores")
        .select(`
          *,
          package:store_packages (*),
          store_subscriptions (*)
        `)
        .in("id", myStoreIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map(store => ({
        ...store,
        store_subscriptions: (store.store_subscriptions as any)?.[0] || null
      }));
    },
    enabled: !!user?.id,
  });

  const storeIds = stores?.map(s => s.id) || [];

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["my-store-stats", storeIds],
    queryFn: async () => {
      if (storeIds.length === 0) return null;

      // Get product count
      const { count: productCount } = await supabase
        .from("products")
        .select("*", { count: 'exact', head: true })
        .in("store_id", storeIds);

      // Get accessories count
      const { count: accessoryCount } = await supabase
        .from("store_accessories")
        .select("*", { count: 'exact', head: true })
        .in("store_id", storeIds);

      // Get repair services count
      const { count: repairServiceCount } = await supabase
        .from("store_repair_services")
        .select("*", { count: 'exact', head: true })
        .in("store_id", storeIds);

      // Get exchange requests count
      const { count: exchangeRequestCount } = await supabase
        .from("exchange_requests")
        .select("*", { count: 'exact', head: true })
        .in("store_id", storeIds);

      // Get repair request count
      const { count: repairCount } = await supabase
        .from("repair_requests")
        .select("*", { count: 'exact', head: true })
        .in("assigned_store_id", storeIds);

      // Get unlock request count
      const { count: unlockCount } = await supabase
        .from("unlock_requests")
        .select("*", { count: 'exact', head: true })
        .in("assigned_store_id", storeIds);

      const { count: sellLeadCount } = await supabase
        .from("sell_phone_leads")
        .select("*", { count: 'exact', head: true })
        .in("assigned_store_id", storeIds);
      
      return {
        productCount: productCount || 0,
        accessoryCount: accessoryCount || 0,
        repairServiceCount: repairServiceCount || 0,
        exchangeRequestCount: exchangeRequestCount || 0,
        repairCount: repairCount || 0,
        unlockCount: unlockCount || 0,
        sellLeadCount: sellLeadCount || 0,
        revenue: stores?.reduce((acc, s) => acc + (s.total_revenue || 0), 0) || 0,
        orderCount: stores?.reduce((acc, s) => acc + (s.total_sales || 0), 0) || 0,
      };
    },
    enabled: storeIds.length > 0,
  });

  const { data: repairs, isLoading: repairsLoading } = useQuery({
    queryKey: ["my-store-repairs", storeIds],
    queryFn: async () => {
      if (storeIds.length === 0) return [];
      const { data, error } = await supabase
        .from("repair_requests")
        .select(REPAIR_REQUESTS_COLUMNS.join(","))
        .in("assigned_store_id", storeIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: storeIds.length > 0,
  });

  const { data: unlocks, isLoading: unlocksLoading } = useQuery({
    queryKey: ["my-store-unlocks", storeIds],
    queryFn: async () => {
      if (storeIds.length === 0) return [];
      const { data, error } = await supabase
        .from("unlock_requests")
        .select(UNLOCK_REQUESTS_COLUMNS.join(","))
        .in("assigned_store_id", storeIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: storeIds.length > 0,
  });

  const { data: sellLeads, isLoading: sellLeadsLoading } = useQuery({
    queryKey: ["my-store-sell-leads", storeIds],
    queryFn: async () => {
      if (storeIds.length === 0) return [];
      const { data, error } = await supabase
        .from("sell_phone_leads")
        .select(SELL_PHONE_LEADS_COLUMNS.join(","))
        .in("assigned_store_id", storeIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: storeIds.length > 0,
  });

  const updateRepairMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; internal_notes?: string }) => {
      if (updates.status) {
        const status = updates.status === "pending" ? "new" : updates.status === "in_progress" ? "repairing" : updates.status;
        delete updates.status;
        const { error } = await supabase.rpc("transition_repair_status", {
          p_repair_id: id,
          p_to_status: status,
          p_note: updates.internal_notes ?? null,
        });
        if (error) throw error;
      }
      if (updates.internal_notes) {
        const { error } = await supabase.rpc("update_repair_admin_fields", {
          p_repair_id: id,
          p_internal_notes: updates.internal_notes ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-store-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["my-store-stats"] });
      toast.success("Repair request updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update repair");
    }
  });

  const updateUnlockMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status?: string; notes?: string }) => {
      const { error } = await supabase.rpc("update_unlock_request_status", {
        p_request_id: id,
        p_status: status ?? null,
        p_notes: notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-store-unlocks"] });
      queryClient.invalidateQueries({ queryKey: ["my-store-stats"] });
      toast.success("Unlock request updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update unlock request");
    }
  });

  const updateSellLeadMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status?: string; notes?: string }) => {
      const { error } = await supabase.rpc("update_sell_lead_status", {
        p_lead_id: id,
        p_status: status ?? null,
        p_notes: notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-store-sell-leads"] });
      queryClient.invalidateQueries({ queryKey: ["my-store-stats"] });
      toast.success("Sell request updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update sell request");
    }
  });

  if (isStoresLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const primaryStore = stores?.find(s => s.id === selectedManagedStoreId) || stores?.[0];
  const packageContext = resolveStorePackageContext(primaryStore ?? {});
  const primaryPackage = packageContext.effectivePackageSlug;
  const entitlements = getStoreEntitlements(primaryPackage);
  
  // Comprehensive Completion Logic
  const completionCriteria = [
    { label: "Store Name", value: !!primaryStore?.name },
    { label: "Description", value: !!primaryStore?.description },
    { label: "Logo", value: !!primaryStore?.logo_url },
    { label: "Banner", value: !!primaryStore?.banner_url },
    { label: "Phone", value: !!primaryStore?.phone },
    { label: "WhatsApp", value: !!primaryStore?.whatsapp },
    { label: "Floor & Block", value: !!(primaryStore?.floor && primaryStore?.block) },
    { label: "Shop Number", value: !!(primaryStore?.shop_number || primaryStore?.shop_no) },
    { label: "SEO Slug", value: !!(primaryStore?.seo_slug || primaryStore?.slug) },
    { label: "Inventory", value: (stats?.productCount || 0) > 0 },
  ];
  
  const completionScore = Math.round((completionCriteria.filter(c => c.value).length / completionCriteria.length) * 100);
  const pendingTasks = completionCriteria.filter(c => !c.value);
  const productUsage = stats?.productCount || 0;
  const accessoryUsage = stats?.accessoryCount || 0;
  const limitLabel = (limit: number) => (limit >= 100000 ? "Unlimited" : limit.toLocaleString());
  const productLimitReached = entitlements.productLimit < 100000 && productUsage >= entitlements.productLimit;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Store Dashboard</h1>
          <p className="text-muted-foreground">Manage your shops and products at Tamrakar Complex.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {(stores?.length ?? 0) > 1 && (
            <Select value={primaryStore?.id} onValueChange={setSelectedManagedStoreId}>
              <SelectTrigger className="w-[200px] h-10 rounded-xl">
                <SelectValue placeholder="Switch Store" />
              </SelectTrigger>
              <SelectContent>
                {stores?.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.store_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" asChild className="rounded-xl">
            <Link to="/contact-us">Help & Support</Link>
          </Button>
          <Button asChild className="rounded-xl">
            <Link to="/storeadmin/products">
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Link>
          </Button>
        </div>
      </div>

      {primaryStore && (
        <Card>
          <CardContent className="grid gap-5 p-5 md:grid-cols-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Profile Completion
                <span className={completionScore === 100 ? "text-green-600" : "text-amber-600"}>{completionScore}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${completionScore === 100 ? "bg-green-500" : "bg-primary"}`} 
                  style={{ width: `${completionScore}%` }} 
                />
              </div>
              {pendingTasks.length > 0 && (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Pending: {pendingTasks.slice(0, 2).map(t => t.label).join(", ")}
                  {pendingTasks.length > 2 && "..."}
                </p>
              )}
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Active Package</div>
              <div className="mt-2 text-2xl font-bold capitalize">{primaryPackage}</div>
              <p className="mt-1 text-xs text-muted-foreground">{entitlements.analytics ? "Analytics enabled" : "Analytics unavailable"}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Package Usage</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Products</span>
                  <span className={productLimitReached ? "text-red-500 font-bold" : ""}>{productUsage} / {limitLabel(entitlements.productLimit)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Accessories</span>
                  <span>{accessoryUsage} / {limitLabel(entitlements.accessoriesLimit)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild size="sm">
                <Link to="/storeadmin/profile">Quick Edit Profile</Link>
              </Button>
              <Button asChild size="sm" variant={productLimitReached ? "destructive" : "outline"}>
                <Link to={productLimitReached ? "/storeadmin/my-subscription" : "/storeadmin/products"}>
                  {productLimitReached ? "Upgrade Package" : "Add Product"}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Stores</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stores?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stores?.filter(s => s.status === 'active').length || 0} online now
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.productCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Live in marketplace</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Accessories</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.accessoryCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Stock items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Exchange Requests</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.exchangeRequestCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Trade-in leads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Repair Services</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.repairServiceCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Active offerings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repairs</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.repairCount || 0}</div>
            <p className="text-xs text-muted-foreground">Assigned to your stores</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unlocks</CardTitle>
            <Unlock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.unlockCount || 0}</div>
            <p className="text-xs text-muted-foreground">Unlocking service requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sell Requests</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.sellLeadCount || 0}</div>
            <p className="text-xs text-muted-foreground">Customer buyback leads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {stats?.revenue?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Marketplace sales</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sell-leads">Sell Leads</TabsTrigger>
          <TabsTrigger value="exchange">Exchange</TabsTrigger>
          <TabsTrigger value="repairs">Repairs</TabsTrigger>
          <TabsTrigger value="repair-services">Services</TabsTrigger>
          <TabsTrigger value="unlocks">Unlocks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {stores?.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">You don't have any stores registered yet.</p>
                      <Button asChild>
                        <Link to="/contact-us">Contact Admin to Register</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  stores?.map((store) => (
                    <Card key={store.id} className="overflow-hidden group hover:border-primary/50 transition-all">
                      <div className="flex flex-col md:flex-row">
                        <div className="w-full md:w-40 h-40 bg-muted relative">
                          {store.logo_url ? (
                            <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Store className="h-10 w-10 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2 flex flex-col gap-1">
                            {!store.is_verified && (
                              <Badge variant="destructive" className="text-[10px]">Pending Verification</Badge>
                            )}
                            {store.is_featured && (
                              <Badge className="bg-amber-500 text-white text-[10px]">Featured</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 p-5 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold">{store.name}</h3>
                                {store.is_verified && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
                              </div>
                              <p className="text-sm text-muted-foreground">{store.location} • Shop #{store.shop_no}</p>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="outline" size="sm" asChild>
                                <Link to={getPublicStorePath(store)} target="_blank">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                              <Button size="sm" asChild>
                                <Link to={`/storeadmin/manage/${store.id}`}>
                                  <Settings className="h-3.5 w-3.5 mr-1.5" /> Manage
                                </Link>
                              </Button>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="secondary" className="text-[9px] uppercase tracking-wider">
                                {resolveStorePackageContext(store).package?.name || "Basic"}
                              </Badge>
                              {store.status !== 'active' && (
                                <Badge variant="outline" className="text-[9px] uppercase text-red-500 border-red-200">
                                  {store.status}
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Created {format(new Date(store.created_at), "MMM d, yyyy")}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Quick Setup</h2>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Complete your profile</CardTitle>
                  <CardDescription>Improve your visibility in the marketplace.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center ${primaryStore?.logo_url ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                      {primaryStore?.logo_url ? <CheckCircle2 className="h-3.5 w-3.5" /> : <div className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Upload Store Logo</p>
                      <p className="text-xs text-muted-foreground">Make your brand recognizable.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center ${primaryStore?.description ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                      {primaryStore?.description ? <CheckCircle2 className="h-3.5 w-3.5" /> : <div className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Add Description</p>
                      <p className="text-xs text-muted-foreground">Tell customers what you specialize in.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center ${stats?.productCount > 0 ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                      {stats?.productCount > 0 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <div className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">List Marketplace Items</p>
                      <p className="text-xs text-muted-foreground">Add used phones, accessories or services.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <Button variant="outline" size="sm" className="text-[10px] h-8" asChild>
                      <Link to="/storeadmin/products">Phones</Link>
                    </Button>
                    <Button variant="outline" size="sm" className="text-[10px] h-8" asChild>
                      <Link to="/storeadmin/repair-services">Repair Catalog</Link>
                    </Button>
                    <Button variant="outline" size="sm" className="text-[10px] h-8" asChild>
                      <Link to="/storeadmin/accessories">Accessories</Link>
                    </Button>
                    <Button variant="outline" size="sm" className="text-[10px] h-8" asChild>
                      <Link to="/storeadmin/exchange">Exchanges</Link>
                    </Button>
                  </div>

                  <Button variant="outline" className="w-full mt-4 group" asChild>
                    <Link to={primaryStore ? `/storeadmin/manage/${primaryStore.id}` : "#"}>
                      Edit Primary Store <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base">Subscription Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  {packageContext.isActivePaid ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{packageContext.package?.name || primaryPackage}</span>
                        <Badge variant="outline" className="bg-card/50 border-primary/20">Active</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {packageContext.subscriptionEndDate
                          ? `Renews or expires on ${format(new Date(packageContext.subscriptionEndDate), "MMM d, yyyy")}`
                          : "Active until changed by your subscription administrator"}
                      </p>
                      <Button variant="link" className="px-0 h-auto text-xs" asChild>
                        <Link to="/storeadmin/my-subscription">View Billing Details</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 text-center py-2">
                      <p className="text-sm">You are on the <span className="font-bold">Basic Free</span> plan.</p>
                      <Button size="sm" className="w-full mt-2" asChild>
                        <Link to="/storeadmin/my-subscription">Upgrade Now</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sell-leads" className="pt-6">
          <LeadManager />
        </TabsContent>

        <TabsContent value="repairs" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Repair Requests</CardTitle>
              <CardDescription>Manage devices assigned to your store for repair.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Est. Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repairsLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : repairs?.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No repairs assigned to your stores yet.</TableCell></TableRow>
                    ) : repairs?.map((repair) => (
                      <TableRow key={repair.id}>
                        <TableCell className="font-mono text-xs font-bold text-primary">{repair.tracking_id}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs">
                            <span className="font-medium">{repair.name}</span>
                            <span>{repair.phone}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs">
                            <span className="font-medium">{repair.device_model}</span>
                            <span className="text-muted-foreground">{repair.issue_type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-bold">
                          {repair.estimated_cost ? `Rs. ${repair.estimated_cost}` : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Select
                            defaultValue={repair.status}
                            onValueChange={(val) => updateRepairMutation.mutate({ id: repair.id, status: val })}
                          >
                            <SelectTrigger className="h-8 w-32 text-[10px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inspection">Inspection</SelectItem>
                              <SelectItem value="quote_pending">Quote Pending</SelectItem>
                              <SelectItem value="quote_approved">Quote Approved</SelectItem>
                              <SelectItem value="repairing">In Repair</SelectItem>
                              <SelectItem value="quality_check">Quality Check</SelectItem>
                              <SelectItem value="ready">Ready</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input 
                            className="h-8 text-[10px]" 
                            placeholder="Add internal notes..."
                            defaultValue={repair.internal_notes}
                            onBlur={(e) => {
                              if (e.target.value !== repair.internal_notes) {
                                updateRepairMutation.mutate({ id: repair.id, internal_notes: e.target.value });
                              }
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unlocks" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Unlocking Requests</CardTitle>
              <CardDescription>Manage device unlocking requests assigned to your store.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unlocksLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : unlocks?.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No unlock requests assigned to your stores yet.</TableCell></TableRow>
                    ) : unlocks?.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex flex-col text-xs">
                            <span className="font-medium">{request.customer_name}</span>
                            <span>{request.customer_phone}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs">
                            <span className="font-medium">{request.brand} {request.model}</span>
                            <span className="text-muted-foreground">{request.service_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{request.service_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            defaultValue={request.status}
                            onValueChange={(val) => updateUnlockMutation.mutate({ id: request.id, status: val })}
                          >
                            <SelectTrigger className="h-8 w-32 text-[10px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="processing">Processing</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input 
                            className="h-8 text-[10px]" 
                            placeholder="Add notes..."
                            defaultValue={request.notes}
                            onBlur={(e) => {
                              if (e.target.value !== request.notes) {
                                updateUnlockMutation.mutate({ id: request.id, notes: e.target.value });
                              }
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exchange" className="pt-6">
          {primaryStore ? (
             <div className="p-4 bg-muted/20 rounded-lg text-center border">
               <RefreshCw className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
               <h3 className="text-lg font-medium">Manage Exchanges</h3>
               <p className="text-sm text-muted-foreground mb-4">View and process trade-in requests for your store.</p>
               <Button asChild>
                 <Link to="/storeadmin/exchange">Open Exchange Manager</Link>
               </Button>
             </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground">Please select a store.</div>
          )}
        </TabsContent>

        <TabsContent value="repair-services" className="pt-6">
          {primaryStore ? (
             <div className="p-4 bg-muted/20 rounded-lg text-center border">
               <Wrench className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
               <h3 className="text-lg font-medium">Repair Catalog</h3>
               <p className="text-sm text-muted-foreground mb-4">Manage your repair services and estimated pricing.</p>
               <Button asChild>
                 <Link to="/storeadmin/repair-services">Open Repair Service Manager</Link>
               </Button>
             </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground">Please select a store.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
