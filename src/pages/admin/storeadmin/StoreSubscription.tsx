/**
 * Store Admin - Subscription Management Page
 * 
 * Displays current package, usage, and upgrade options
 */

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getStoreEntitlements, resolveEffectiveStorePackage } from "@/lib/storeEntitlements";
import { STORE_SUBSCRIPTION_PACKAGES } from "@/lib/storePackages";
import type { Store } from "@/types/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Crown,
  Gem,
  Loader2,
  Lock,
  Package,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PackageUpgradeCard {
  slug: string;
  name: string;
  price: number;
  icon: React.ReactNode;
  color: string;
  highlight?: boolean;
}

const UPGRADE_PACKAGES: PackageUpgradeCard[] = [
  {
    slug: "silver",
    name: "Silver",
    price: 4999,
    icon: <Star className="h-6 w-6" />,
    color: "from-slate-400 to-slate-500",
  },
  {
    slug: "gold",
    name: "Gold",
    price: 9999,
    icon: <Sparkles className="h-6 w-6" />,
    color: "from-amber-400 to-yellow-500",
    highlight: true,
  },
  {
    slug: "diamond",
    name: "Diamond",
    price: 17999,
    icon: <Crown className="h-6 w-6" />,
    color: "from-cyan-400 to-blue-500",
  },
];

export default function StoreSubscription() {
  const { storeId } = useParams<{ storeId: string }>();
  const { user } = useAuth();
  const [selectedUpgrade, setSelectedUpgrade] = useState<string | null>(null);

  // Fetch store
  const { data: store, isLoading } = useQuery<Store>({
    queryKey: ["store-subscription", storeId],
    queryFn: async () => {
      if (!storeId) throw new Error("No store ID");

      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("id", storeId)
        .eq("owner_id", user?.id)
        .single();

      if (error) throw error;
      return data as Store;
    },
    enabled: !!user && !!storeId,
  });

  // Fetch usage counts
  const { data: usage } = useQuery({
    queryKey: ["store-usage", storeId],
    queryFn: async () => {
      const [productsRes, adminsRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("store_id", storeId),
        supabase.from("store_admins").select("id", { count: "exact", head: true }).eq("store_id", storeId),
      ]);
      return {
        products: productsRes.count || 0,
        admins: adminsRes.count || 0,
      };
    },
    enabled: !!storeId,
  });

  const packageSlug = store ? resolveEffectiveStorePackage(store) : "free";
  const entitlements = getStoreEntitlements(packageSlug);
  const currentPackage = STORE_SUBSCRIPTION_PACKAGES.find((p) => p.slug === packageSlug);

  const productCount = usage?.products || 0;
  const adminCount = usage?.admins || 0;
  const branchCount = 1;

  const productUsage = (productCount / entitlements.productListingLimit) * 100;
  const adminUsage = (adminCount / entitlements.adminUserLimit) * 100;
  const branchUsage = (branchCount / entitlements.branchLimit) * 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Subscription & Billing</h1>
          <p className="text-muted-foreground">Manage your package and upgrade anytime</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Current Plan Info */}
          <div className="lg:col-span-1">
            <Card className="border-primary/30 bg-primary/5 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Current Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Package</div>
                  <div className="flex items-center gap-3">
                    <Badge className="text-lg px-3 py-1">
                      {store?.package_slug?.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge variant={store?.subscription_status === "active" ? "default" : "outline"}>
                    {store?.subscription_status || "Inactive"}
                  </Badge>
                </div>

                {store?.subscription_end_date && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Expires</div>
                    <div className="font-mono text-sm">
                      {new Date(store.subscription_end_date).toLocaleDateString()}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="text-sm text-muted-foreground mb-2">Monthly Price</div>
                  <div className="text-2xl font-bold">
                    ₹{currentPackage?.monthly_price?.toLocaleString() || "Free"}
                    <span className="text-base text-muted-foreground font-normal">/month</span>
                  </div>
                </div>

                <Button className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Renew Now
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Usage Statistics */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Your Usage
                </CardTitle>
                <CardDescription>How you're using your plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Product Listings */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold">Product Listings</label>
                    <span className="text-sm text-muted-foreground">
                      {productCount} / {entitlements.productListingLimit}
                    </span>
                  </div>
                  <Progress value={productUsage} className="h-2" />
                </div>

                {/* Admin Users */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold">Admin Users</label>
                    <span className="text-sm text-muted-foreground">
                      {adminCount} / {entitlements.adminUserLimit}
                    </span>
                  </div>
                  <Progress value={adminUsage} className="h-2" />
                </div>

                {/* Branches */}
                {entitlements.branchLimit > 1 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold">Branches</label>
                      <span className="text-sm text-muted-foreground">
                        {branchCount} / {entitlements.branchLimit}
                      </span>
                    </div>
                    <Progress value={branchUsage} className="h-2" />
                  </div>
                )}

                {/* Feature Summary */}
                <div className="pt-4 border-t space-y-3">
                  <h4 className="font-semibold">Key Features</h4>
                  <ul className="space-y-2 text-sm">
                    {entitlements.canShowPhonePublic && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Public contact details
                      </li>
                    )}
                    {entitlements.canEnableMarketplace && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Marketplace enabled
                      </li>
                    )}
                    {entitlements.canAccessAnalytics && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Advanced analytics
                      </li>
                    )}
                    {entitlements.canBeFeatured && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Featured placement
                      </li>
                    )}
                    {entitlements.canCustomizeDesign && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Custom themes
                      </li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Upgrade Options */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Upgrade Your Plan</h2>

          <div className="grid gap-6 md:grid-cols-3">
            {UPGRADE_PACKAGES.map((pkg) => {
              const isCurrentPlan = store?.package_slug === pkg.slug;
              const canUpgrade =
                (store?.package_slug === "free" && ["silver", "gold", "diamond"].includes(pkg.slug)) ||
                (store?.package_slug === "silver" && ["gold", "diamond"].includes(pkg.slug)) ||
                (store?.package_slug === "gold" && pkg.slug === "diamond");

              return (
                <Card
                  key={pkg.slug}
                  className={cn(
                    "relative overflow-hidden transition-all duration-300",
                    pkg.highlight ? "border-2 border-primary shadow-lg" : "",
                    isCurrentPlan ? "opacity-60" : "",
                  )}
                >
                  {pkg.highlight && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-500" />
                  )}

                  <CardHeader>
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn(
                        "p-3 rounded-lg",
                        pkg.slug === "silver" ? "bg-slate-500/10 text-slate-600" :
                        pkg.slug === "gold" ? "bg-amber-500/10 text-amber-600" :
                        "bg-cyan-500/10 text-cyan-600"
                      )}>
                        {pkg.icon}
                      </div>
                      {pkg.highlight && (
                        <Badge className="bg-amber-500">Most Popular</Badge>
                      )}
                      {isCurrentPlan && (
                        <Badge variant="outline">Current</Badge>
                      )}
                    </div>

                    <CardTitle>{pkg.name}</CardTitle>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-bold">₹{pkg.price?.toLocaleString()}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Features */}
                    <ul className="space-y-3">
                      {pkg.slug === "silver" && (
                        <>
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>200 product listings</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>Public contact (after login)</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>Repair service listing</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>2 admin users</span>
                          </li>
                        </>
                      )}

                      {pkg.slug === "gold" && (
                        <>
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>2,000 product listings</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>Public contact details</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>Verified badge</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>Featured placement</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>Advanced analytics</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>5 admin users</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>3 branches</span>
                          </li>
                        </>
                      )}

                      {pkg.slug === "diamond" && (
                        <>
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>Unlimited product listings</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>All contact visibility options</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>Premium verified badge</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>Top placement priority</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>Custom store design</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>20 admin users</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>10 branches</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>Priority lead access</span>
                          </li>
                        </>
                      )}
                    </ul>

                    {/* Button */}
                    <Button
                      className="w-full"
                      disabled={isCurrentPlan || !canUpgrade}
                      onClick={() => setSelectedUpgrade(pkg.slug)}
                    >
                      {isCurrentPlan ? "Current Plan" : canUpgrade ? "Upgrade" : "Not Available"}
                      {canUpgrade && !isCurrentPlan && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Help section */}
        <Card className="mt-12 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Zap className="h-5 w-5" />
              Need help choosing a plan?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-900">
            <p>
              Our team is ready to help you find the perfect plan for your store. Contact us at{" "}
              <a href="mailto:support@tamrakarcomplex.com" className="font-semibold underline">
                support@tamrakarcomplex.com
              </a>
              {" "}or call{" "}
              <a href="tel:+9771234567890" className="font-semibold underline">
                +977 1 234 567 890
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
