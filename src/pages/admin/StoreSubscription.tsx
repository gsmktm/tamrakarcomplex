import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, Check, ShieldCheck, Zap, 
  ArrowRight, CreditCard, Package, Users, Store, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { Link, useSearchParams } from "react-router-dom";
import { getStorePackageMeta } from "@/lib/storePackages";
import { cn } from "@/lib/utils";
import type { StoreRow, StoreSubscriptionRow, PackageRow } from "@/types/app";



// --- COMPONENTS ---

const StatusBadge = ({ status, enabled }: { status: string; enabled: boolean }) => {
  if (!enabled) return <Badge variant="destructive">Disabled by Admin</Badge>;
  
  switch (status) {
    case "active": return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
    case "pending": return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending Payment</Badge>;
    case "expired": return <Badge variant="destructive">Expired</Badge>;
    case "suspended": return <Badge variant="destructive">Suspended</Badge>;
    case "cancelled": return <Badge variant="secondary">Cancelled</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

const UsageBar = ({ label, current, max }: { label: string; current: number; max: number }) => {
  const percentage = Math.min((current / max) * 100, 100);
  const isCritical = percentage > 90;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-medium", isCritical && "text-red-500")}>
          {current} / {max === 10000 ? "Unl." : max}
        </span>
      </div>
      <Progress value={percentage} className={cn("h-2", isCritical && "bg-red-100")} />
    </div>
  );
};

const formatLimitValue = (value: number) => {
  if (value >= 10000) return "Unlimited";
  return value.toLocaleString();
};

export default function StoreSubscription() {
  const { user, role } = useAuth();
  const [searchParams] = useSearchParams();
  const storeIdParam = searchParams.get("storeId");
  const isSuperAdmin = role === "suadmin";

  const { data: storeWithSub, isLoading } = useQuery({
    queryKey: ["store-subscription", user?.id, role, storeIdParam],
    queryFn: async () => {
      let query = supabase
        .from("stores")
        .select(`
          *,
          store_subscriptions (
            *,
            packages (*)
          )
        `);

      if (isSuperAdmin && storeIdParam) {
        query = query.eq("id", storeIdParam);
      } else if (isSuperAdmin && !storeIdParam) {
        query = query.limit(1);
      } else {
        // Fetch stores where user is an admin/owner
        const { data: memberships } = await supabase
          .from("store_admins")
          .select("store_id")
          .eq("user_id", user?.id)
          .eq("status", "active");
        
        const storeIds = memberships?.map(m => m.store_id) || [];
        
        // Also check legacy owner_id
        const { data: ownedStores } = await supabase
          .from("stores")
          .select("id")
          .eq("owner_id", user?.id);
        
        const allStoreIds = Array.from(new Set([...storeIds, ...(ownedStores?.map(s => s.id) || [])]));

        if (allStoreIds.length === 0) return null;
        query = query.in("id", allStoreIds).limit(1);
      }

      const { data: store, error: storeError } = await query.maybeSingle();

      if (storeError) throw storeError;
      if (!store) return null;

      // Extract the first active subscription if it exists as an array
      const subscriptions = store.store_subscriptions as any[];
      const activeSub = subscriptions && subscriptions.length > 0 ? subscriptions[0] : null;

      return {
        ...store,
        store_subscriptions: activeSub
      } as StoreRow & { 
        store_subscriptions: (StoreSubscriptionRow & { packages: PackageRow }) | null 
      };
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!storeWithSub) {
    return (
      <div className="p-8 text-center">
        <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">No Store Found</h2>
        <p className="text-muted-foreground mt-2">You need an active store to manage subscriptions.</p>
        <Button className="mt-4" asChild>
          <Link to="/contact-us">Contact Support</Link>
        </Button>
      </div>
    );
  }

  const sub = storeWithSub.store_subscriptions;
  const pkg = sub?.packages;
  const meta = getStorePackageMeta(pkg?.slug || "free");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Subscription</h1>
        <p className="text-muted-foreground">Manage your plan and billing details for {storeWithSub.name}.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Plan Card */}
        <Card className={`relative overflow-hidden ${meta?.accentClassName || ""}`}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">Current Plan</CardTitle>
                <CardDescription>Your store's active subscription</CardDescription>
              </div>
              <Badge className={meta?.badgeClassName}>
                {pkg?.name || "Basic Store"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">Rs. {(pkg?.monthly_price || 0).toLocaleString()}</span>
              <span className="text-muted-foreground">/ month</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Status</div>
                <div className={cn("flex items-center gap-1.5 font-medium capitalize", sub?.status === "active" ? "text-green-600" : "text-muted-foreground")}>
                  <ShieldCheck className="h-4 w-4" />
                  {sub?.status || "Active (Free)"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Plan Type</div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {pkg ? (sub?.end_date ? format(new Date(sub.end_date), "MMM d, yyyy") : "No expiry") : "Permanent Free"}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="text-sm font-semibold">Included Limits:</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-lg bg-background border flex flex-col items-center gap-1">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">{formatLimitValue(pkg?.product_limit || 10)}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">Products</span>
                </div>
                <div className="p-3 rounded-lg bg-background border flex flex-col items-center gap-1">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">{pkg?.admin_limit || 1}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">Admins</span>
                </div>
                <div className="p-3 rounded-lg bg-background border flex flex-col items-center gap-1">
                  <Store className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">{pkg?.branch_limit || 1}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">Branches</span>
                </div>
              </div>
            </div>

            {!pkg && (
              <Button className="w-full mt-4" asChild>
                <Link to="/contact-us">Upgrade to Premium</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Features & Billing */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plan Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {pkg ? (
                  (pkg.features_json as string[]).map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      {feature}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-muted-foreground italic">No features available for your current plan.</li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Billing History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Automatic Renewal</div>
                    <div className="text-xs text-muted-foreground">{sub?.auto_renew ? "Enabled" : "Disabled"}</div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-xs">Update</Button>
              </div>
              
              <Button variant="outline" className="w-full gap-2" asChild>
                <Link to="/contact-us">
                  View Invoices <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
