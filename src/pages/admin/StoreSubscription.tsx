import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStoreMembership } from "@/hooks/useStoreMembership";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, Check, ShieldCheck,
  ArrowRight, CreditCard, Package, Users, Store, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { Link, useSearchParams } from "react-router-dom";
import { getStorePackageMeta, STORE_SUBSCRIPTION_PACKAGES } from "@/lib/storePackages";
import { cn } from "@/lib/utils";
import { resolveStorePackageContext } from "@/lib/storePackageRuntime";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";



// --- COMPONENTS ---

const formatLimitValue = (value: number) => {
  if (value >= 10000) return "Unlimited";
  return value.toLocaleString();
};

export default function StoreSubscription() {
  const { user, role } = useAuth();
  const [searchParams] = useSearchParams();
  const storeIdParam = searchParams.get("storeId");
  const isSuperAdmin = role === "suadmin";
  const queryClient = useQueryClient();
  const { storeIds: myStoreIds } = useStoreMembership(user?.id);
  const [requestedPlan, setRequestedPlan] = useState("silver");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [paymentMethod, setPaymentMethod] = useState("esewa");
  const [transactionReference, setTransactionReference] = useState("");

  const { data: storeWithSub, isLoading } = useQuery({
    queryKey: ["store-subscription", user?.id, role, storeIdParam],
    queryFn: async () => {
      let query = supabase
        .from("stores")
        .select(`
          *,
          package:store_packages (*),
          store_subscriptions (*)
        `);

      if (isSuperAdmin && storeIdParam) {
        query = query.eq("id", storeIdParam);
      } else if (isSuperAdmin && !storeIdParam) {
        query = query.limit(1);
      } else {
        // Fetch stores where user is an admin/owner
        if (myStoreIds.length === 0) return null;

        query = query.in("id", myStoreIds).limit(1);
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
      };
    },
    enabled: !!user?.id,
  });

  const storeId = storeWithSub?.id;
  const { data: payments = [] } = useQuery({
    queryKey: ["store-subscription-payments", storeId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("subscription_payments")
        .select("id, invoice_no, amount, status, payment_method, billing_cycle, created_at, paid_at, package:store_packages(name,slug)")
        .eq("store_id", storeId).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!storeId,
  });

  const requestPayment = useMutation({
    mutationFn: async () => {
      if (!storeId) throw new Error("Store not found");
      const { data, error } = await (supabase.rpc as any)("request_store_subscription_payment", {
        p_store_id: storeId,
        p_package_slug: requestedPlan,
        p_billing_cycle: billingCycle,
        p_payment_method: paymentMethod,
        p_transaction_reference: transactionReference || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Payment submitted for verification");
      setTransactionReference("");
      queryClient.invalidateQueries({ queryKey: ["store-subscription-payments", storeId] });
      queryClient.invalidateQueries({ queryKey: ["store-subscription", user?.id] });
    },
    onError: (error: Error) => toast.error(error.message),
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
  const packageContext = resolveStorePackageContext(storeWithSub);
  const pkg = packageContext.package;
  const packageSlug = packageContext.effectivePackageSlug;
  const builtinPackage = STORE_SUBSCRIPTION_PACKAGES.find((item) => item.slug === packageSlug) ?? STORE_SUBSCRIPTION_PACKAGES[0];
  const meta = getStorePackageMeta(packageSlug);

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
                {packageContext.isActivePaid ? pkg?.name || meta.displayName : "Basic Store"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">Rs. {(packageContext.isActivePaid ? pkg?.price ?? builtinPackage.monthly_price : 0).toLocaleString()}</span>
              <span className="text-muted-foreground">/ month</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Status</div>
                <div className={cn("flex items-center gap-1.5 font-medium capitalize", sub?.status === "active" ? "text-green-600" : "text-muted-foreground")}>
                  <ShieldCheck className="h-4 w-4" />
                  {packageContext.isActivePaid ? packageContext.subscriptionStatus : "Active (Free)"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Plan Type</div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {packageContext.isActivePaid
                    ? (packageContext.subscriptionEndDate ? format(new Date(packageContext.subscriptionEndDate), "MMM d, yyyy") : "No expiry")
                    : "Permanent Free"}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="text-sm font-semibold">Included Limits:</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-lg bg-background border flex flex-col items-center gap-1">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">{formatLimitValue(packageContext.entitlements.productListingLimit)}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">Products</span>
                </div>
                <div className="p-3 rounded-lg bg-background border flex flex-col items-center gap-1">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">{packageContext.entitlements.adminUserLimit}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">Admins</span>
                </div>
                <div className="p-3 rounded-lg bg-background border flex flex-col items-center gap-1">
                  <Store className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">{packageContext.entitlements.branchLimit}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">Branches</span>
                </div>
              </div>
            </div>

            {!packageContext.isActivePaid && (
              <Button className="w-full mt-4" asChild>
                <Link to="/stores/pricing">Compare Premium Plans</Link>
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
                {builtinPackage.features_json.length > 0 ? (
                  builtinPackage.features_json.map((feature, i) => (
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
              {payments.length === 0 ? <p className="text-sm text-muted-foreground">No invoices yet.</p> : payments.slice(0, 5).map((payment: any) => (
                <div key={payment.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div><div className="text-sm font-medium">{payment.invoice_no || "Subscription payment"}</div>
                    <div className="text-xs text-muted-foreground">NPR {Number(payment.amount).toLocaleString()} · {payment.payment_method}</div></div>
                  <Badge variant={payment.status === "completed" ? "default" : "secondary"}>{payment.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Upgrade or renew</CardTitle><CardDescription>Submit a provider reference. Admin verification activates the plan.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Package</Label><Select value={requestedPlan} onValueChange={setRequestedPlan}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STORE_SUBSCRIPTION_PACKAGES.filter(p => p.monthly_price > 0).map(p => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Billing</Label><Select value={billingCycle} onValueChange={setBillingCycle}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent></Select></div>
              </div>
              <div className="space-y-2"><Label>Payment method</Label><Select value={paymentMethod} onValueChange={setPaymentMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="esewa">eSewa</SelectItem><SelectItem value="bank_transfer">Bank transfer</SelectItem><SelectItem value="cash">Cash at office</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Transaction/reference ID</Label><Input value={transactionReference} onChange={e => setTransactionReference(e.target.value)} placeholder="Required for eSewa or bank transfer" /></div>
              <Button className="w-full" disabled={requestPayment.isPending || (paymentMethod !== "cash" && !transactionReference.trim())} onClick={() => requestPayment.mutate()}>
                {requestPayment.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}Submit payment for verification
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
