import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Package,
  ShoppingBag,
  Wrench,
  CircleDollarSign,
  ArrowRight,
  Copy,
  Check,
  Share2,
  Gift,
  History,
  TrendingUp,
  User as UserIcon,
  Plus,
  Users,
  Unlock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/common/SEO";
import { toast } from "sonner";
import { safeText } from "@/lib/utils";
import type { LeadQuoteRow, OrderRow, RepairRequestRow, SellListingRow } from "@/types/app";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserHistoryCenter from "./user/UserHistoryCenter";

function parseDeviceInfo(ua: string) {
  const browser =
    /Chrome/.test(ua) ? "Chrome" :
    /Safari/.test(ua) && !/Chrome/.test(ua) ? "Safari" :
    /Firefox/.test(ua) ? "Firefox" :
    /Edge/.test(ua) ? "Edge" : "Unknown";
  const os =
    /Windows/.test(ua) ? "Windows" :
    /Mac OS X/.test(ua) ? "macOS" :
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad|iPod/.test(ua) ? "iOS" : "Unknown";
  return { browser, os };
}

export default function UserDashboard() {
  const { user, session } = useAuth();
  const ua = navigator.userAgent;
  const device = useMemo(() => parseDeviceInfo(ua), [ua]);
  const [copied, setCopied] = useState(false);
  // ✅ Fixed: ref for tab control so "View reward history" navigates to stats tab
  const tabsRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("activity");

  const { data, isLoading } = useQuery<{
    listings: SellListingRow[];
    orders: OrderRow[];
    repairs: RepairRequestRow[];
    quotes: LeadQuoteRow[];
    profile: { referral_code: string | null; referral_points: number | null } | null;
  }>({
    queryKey: ["user-dashboard", user?.id],
    queryFn: async () => {
      if (!user) {
        return { listings: [], orders: [], repairs: [], quotes: [], profile: null };
      }

      const [listingsResult, ordersResult, repairsResult, quotesResult, profileResult] = await Promise.allSettled([
        supabase.from("sell_listings").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("repair_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("leads_quotes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("profiles").select("referral_code, referral_points").eq("user_id", user.id).single(),
      ]);

      const getRows = <TRow,>(
        result: PromiseSettledResult<{ data: TRow[] | null; error: unknown }>,
        label: string,
      ): TRow[] => {
        if (result.status === "rejected") {
          console.warn(`User dashboard ${label} request failed`, result.reason);
          return [];
        }
        if (result.value.error) {
          console.warn(`User dashboard ${label} query error`, result.value.error);
          return [];
        }
        return result.value.data ?? [];
      };

      const getProfile = (
        result: PromiseSettledResult<{ data: { referral_code: string | null; referral_points: number | null } | null; error: unknown }>,
      ) => {
        if (result.status === "rejected") return null;
        if (result.value.error) return null;
        return result.value.data;
      };

      return {
        listings: getRows<SellListingRow>(listingsResult, "listings"),
        orders: getRows<OrderRow>(ordersResult, "orders"),
        repairs: getRows<RepairRequestRow>(repairsResult, "repairs"),
        quotes: getRows<LeadQuoteRow>(quotesResult, "quotes"),
        profile: getProfile(profileResult as PromiseSettledResult<{ data: { referral_code: string | null; referral_points: number | null } | null; error: unknown }>),
      };
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const userMetadata = session?.user?.user_metadata as { full_name?: string; name?: string } | undefined;
  const myListings = data?.listings ?? [];
  const myOrders = data?.orders ?? [];
  const myRepairs = data?.repairs ?? [];
  const myQuotes = data?.quotes ?? [];

  const recentActivity = [
    ...myOrders.map((order) => ({
      id: `order-${order.id}`,
      title: `Order ${order.status || "pending"}`,
      subtitle: `Rs. ${Number(order.total_amount).toLocaleString()}`,
      href: "/user/orders",
      createdAt: order.created_at || "",
      badge: order.payment_status || "unpaid",
    })),
    ...myRepairs.map((repair) => ({
      id: `repair-${repair.id}`,
      title: `${repair.device_brand} ${repair.device_model}`,
      subtitle: `Repair: ${repair.issue_type}`,
      href: "/user/repairs",
      createdAt: repair.created_at || "",
      badge: repair.status || "pending",
    })),
    ...myQuotes.map((quote) => ({
      id: `quote-${quote.id}`,
      title: `${quote.type === "exchange" ? "Exchange" : "Sell"} request`,
      subtitle: `Quoted: Rs. ${Number(quote.quoted_value || 0).toLocaleString()}`,
      href: quote.type === "exchange" ? "/user/unlocking" : "/user/listings",
      createdAt: quote.created_at || "",
      badge: quote.status || "pending",
    })),
    ...myListings.map((listing) => ({
      id: `listing-${listing.id}`,
      title: listing.title,
      subtitle: `Listing: Rs. ${Number(listing.price).toLocaleString()}`,
      href: "/user/listings",
      createdAt: listing.created_at || "",
      badge: listing.status || "draft",
    })),
  ]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, 6);

  const summaryCards = [
    { label: "Orders", value: myOrders.length, icon: Package, href: "/buy" },
    { label: "Listings", value: myListings.length, icon: ShoppingBag, href: "/marketplace/sell" },
    { label: "Repairs", value: myRepairs.length, icon: Wrench, href: "/repair" },
    { label: "Quotes", value: myQuotes.length, icon: CircleDollarSign, href: "/sell-your-phone" },
  ];

  const handleCopyReferral = (code: string) => {
    const url = `${window.location.origin}/auth?ref=${code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Referral link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <SEO title="My Dashboard" description="Manage your account, listings, and activity." url="/user" noindex />
      <Header />
      <div className="container py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <UserIcon className="h-8 w-8 text-primary" />
              Welcome, {safeText(userMetadata?.full_name) || safeText(userMetadata?.name) || "User"}
            </h1>
            <p className="text-muted-foreground mt-1">Track your activity, manage listings, and earn rewards.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/user/me">Edit Profile</Link>
            </Button>
            <Button asChild>
              <Link to="/marketplace/sell">Post a Listing</Link>
            </Button>
          </div>
        </div>

        {/* Refer & Earn Section */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Gift className="h-32 w-32 rotate-12" />
          </div>
          <CardContent className="p-6 md:p-8 relative">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 space-y-4 text-center md:text-left">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0 px-3 py-1">
                  Refer & Earn Program
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Invite friends and earn points!</h2>
                <p className="text-muted-foreground max-w-lg">
                  Share your unique referral link with friends. When they sign up, you'll earn{" "}
                  <strong>100 points</strong> that can be redeemed for discounts at Tamrakar Complex stores.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <div className="flex-1 bg-muted/50 rounded-lg px-4 py-2 font-mono text-sm flex items-center justify-between border">
                    <span className="truncate">
                      {window.location.origin}/auth?ref={data?.profile?.referral_code || "..."}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleCopyReferral(data?.profile?.referral_code || "")}
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button className="gap-2" onClick={() => handleCopyReferral(data?.profile?.referral_code || "")}>
                    <Share2 className="h-4 w-4" /> Share Link
                  </Button>
                </div>
              </div>
              <div className="w-full md:w-auto flex flex-col items-center justify-center p-6 bg-background/80 backdrop-blur rounded-2xl border shadow-sm">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Your Rewards</div>
                <div className="text-4xl font-bold text-primary flex items-center gap-2">
                  <Gift className="h-8 w-8" />
                  {data?.profile?.referral_points || 0}
                </div>
                <div className="text-xs text-muted-foreground mt-2">Points available to redeem</div>
                {/* ✅ Fixed: actually navigates to stats tab */}
                <Button
                  variant="link"
                  className="text-primary mt-2 h-auto p-0 text-xs"
                  onClick={() => {
                    setActiveTab("stats");
                    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  View reward history →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label} className="hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground font-medium">{card.label}</div>
                        <div className="text-2xl font-bold">{card.value}</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" asChild className="rounded-full">
                      <Link to={card.href}>
                        <ArrowRight className="h-5 w-5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div ref={tabsRef}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="activity" className="rounded-lg gap-2">
                <History className="h-4 w-4" /> Activity History
              </TabsTrigger>
              <TabsTrigger value="listings" className="rounded-lg gap-2">
                <ShoppingBag className="h-4 w-4" /> My Listings
              </TabsTrigger>
              <TabsTrigger value="stats" className="rounded-lg gap-2">
                <TrendingUp className="h-4 w-4" /> Stats & Insights
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <History className="h-5 w-5 text-primary" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription>Track your orders, repairs, and valuation requests.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-16 rounded-xl" />
                        ))}
                      </div>
                    ) : recentActivity.length === 0 ? (
                      <div className="text-center py-12 px-4 border-2 border-dashed rounded-2xl">
                        <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">No activity yet. Start exploring Tamrakar Complex!</p>
                        <Button variant="link" asChild className="mt-2">
                          <Link to="/buy">Browse gadgets</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentActivity.map((item) => (
                          <Link
                            key={item.id}
                            to={item.href}
                            className="flex items-center justify-between rounded-xl border border-border p-4 transition-all hover:border-primary/30 hover:bg-secondary/20 group"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold group-hover:text-primary transition-colors">{item.title}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                {item.subtitle}
                                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                {new Date(item.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="capitalize text-[10px] font-bold tracking-wider">
                                {item.badge}
                              </Badge>
                              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quick Access</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button className="w-full justify-between h-12 rounded-xl" asChild>
                        <Link to="/marketplace/sell">Post a Listing <ArrowRight className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="outline" className="w-full justify-between h-12 rounded-xl" asChild>
                        <Link to="/sell-your-phone">Sell Your Phone <ArrowRight className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="outline" className="w-full justify-between h-12 rounded-xl" asChild>
                        <Link to="/exchange-your-phone">Start Exchange <ArrowRight className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="outline" className="w-full justify-between h-12 rounded-xl" asChild>
                        <Link to="/repair">Book Repair <ArrowRight className="h-4 w-4" /></Link>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Need Help?</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Our support team is available 10 AM – 8 PM to assist with your orders and repairs.
                      </p>
                      <Button variant="outline" className="w-full rounded-xl" asChild>
                        <Link to="/contact-us">Contact Support</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="listings">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">My Marketplace Listings</CardTitle>
                    <CardDescription>Manage items you've posted for sale.</CardDescription>
                  </div>
                  <Button size="sm" asChild>
                    <Link to="/marketplace/sell">
                      <Plus className="h-4 w-4 mr-1" /> New Listing
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-40 rounded-2xl" />
                      ))}
                    </div>
                  ) : (myListings?.length ?? 0) === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-2xl">
                      <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">You haven't posted any listings yet.</p>
                      <Button asChild className="mt-4">
                        <Link to="/marketplace/sell">Start Selling</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {myListings?.map((listing) => (
                        <div key={listing.id} className="rounded-2xl border border-border p-5 space-y-4 hover:shadow-lg transition-shadow bg-card">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <h3 className="font-bold truncate text-lg">{listing.title}</h3>
                              <p className="text-sm text-muted-foreground">{listing.brand} {listing.model}</p>
                            </div>
                            <Badge variant="outline" className="capitalize shrink-0">{listing.status}</Badge>
                          </div>
                          <div className="text-xl font-bold text-primary">Rs. {Number(listing.price).toLocaleString()}</div>
                          <div className="flex gap-2 pt-2">
                            <Button asChild variant="outline" size="sm" className="flex-1 rounded-lg">
                              <Link to={`/marketplace/listing/${listing.id}`}>View</Link>
                            </Button>
                            <Button asChild variant="secondary" size="sm" className="flex-1 rounded-lg">
                              <Link to={`/marketplace/edit/${listing.id}`}>Edit</Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <UserHistoryCenter />
            </TabsContent>

            <TabsContent value="stats">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Spending Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                      <span className="text-sm font-medium">Total Orders</span>
                      <span className="font-bold text-lg">{myOrders.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                      <span className="text-sm font-medium">Total Spent</span>
                      <span className="font-bold text-lg text-primary">
                        Rs. {myOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                      <span className="text-sm font-medium">Active Listings</span>
                      <span className="font-bold text-lg">{myListings.filter(l => l.status === "active").length}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Referral Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                      <span className="text-sm font-medium">Your Referral Code</span>
                      <span className="font-mono font-bold text-primary">{data?.profile?.referral_code || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                      <span className="text-sm font-medium">Points Earned</span>
                      <span className="font-bold text-lg text-primary">{data?.profile?.referral_points || 0}</span>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleCopyReferral(data?.profile?.referral_code || "")}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Copy Referral Link
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </>
  );
}
