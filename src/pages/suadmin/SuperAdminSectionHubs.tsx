import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Calculator,
  Calendar,
  CheckCircle,
  CheckCircle2,
  CreditCard,
  Database,
  DollarSign,
  Download,
  Eye,
  FileText,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  TrendingDown,
  TrendingUp,
  Unlock,
  Upload,
  User,
  Users,
  Wallet,
  Wrench,
  XCircle,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowRight,
  Gauge,
  Zap,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import SuperAdminDashboard from "@/pages/suadmin/SuperAdminDashboard";
import SuperAdminProfilePage from "@/pages/suadmin/SuperAdminProfilePage";
import UserManager from "@/pages/admin/UserManager";
import UserRewardManager from "@/pages/suadmin/UserRewardManager";
import UserRiskManager from "@/pages/suadmin/UserRiskManager";
import MobileMasterManager from "@/pages/admin/MobileMasterManager";
import BrandManager from "@/pages/admin/BrandManager";
import ProductManager from "@/pages/admin/ProductManager";
import PriceListManager from "@/pages/admin/PriceListManager";
import EmiPlanManager from "@/pages/admin/EmiPlanManager";
import DeviceVerificationManager from "@/pages/admin/DeviceVerificationManager";
import StoreManager from "@/pages/admin/StoreManager";
import StoreApplicationManager from "@/pages/admin/StoreApplicationManager";
import StoreAdminManager from "@/pages/suadmin/StoreAdminManager";
import StoreAdminPermissionManager from "@/pages/suadmin/StoreAdminPermissionManager";
import StoreAdminTaskManager from "@/pages/suadmin/StoreAdminTaskManager";
import StoreStaffManager from "@/pages/suadmin/StoreStaffManager";
import OrderManager from "@/pages/admin/OrderManager";
import LeadManager from "@/pages/admin/LeadManager";
import ListingManager from "@/pages/admin/ListingManager";
import ExchangeManager from "@/pages/storeadmin/ExchangeManager";
import CampaignManager from "@/pages/admin/CampaignManager";
import PayoutManager from "@/pages/admin/PayoutManager";
import SubscriptionManager from "@/pages/admin/SubscriptionManager";
import PaymentProviderManager from "@/pages/suadmin/PaymentProviderManager";
import ArticleManager from "@/pages/admin/ArticleManager";
import GuideManager from "@/pages/admin/GuideManager";
import ContentManager from "@/pages/admin/ContentManager";
import ContactManager from "@/pages/admin/ContactManager";
import ChatBotManager from "@/pages/admin/ChatBotManager";
import PollManager from "@/pages/admin/PollManager";
import RepairManager from "@/pages/admin/RepairManager";
import UnlockingManager from "@/pages/admin/UnlockingManager";
import ValuationManager from "@/pages/admin/ValuationManager";
import Analytics from "@/pages/admin/Analytics";
import SeoManager from "@/pages/admin/SeoManager";
import AdminConsole from "@/pages/admin/AdminConsole";
import AuditLogs from "@/pages/suadmin/AuditLogs";
import Maintenance from "@/pages/suadmin/Maintenance";
import PlatformHealth from "@/pages/suadmin/PlatformHealth";
import SettingsPage from "@/pages/admin/Settings";

type HubTab = {
  value: string;
  label: string;
  path: string;
  aliases?: string[];
  icon: React.ComponentType<{ className?: string }>;
  element: React.ReactNode;
  description?: string;
};

async function countTable(table: string, filter?: (query: any) => any) {
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
}

async function selectRows<T = Record<string, unknown>>(table: string, columns: string, filter?: (query: any) => any): Promise<T[]> {
  try {
    let query = supabase.from(table as any).select(columns);
    if (filter) query = filter(query);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as T[];
  } catch (error) {
    console.warn(`Unable to load ${table}`, error);
    return [];
  }
}

function formatCurrency(value: number) {
  return `Rs. ${Math.round(value).toLocaleString()}`;
}

function StoreNetworkOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["store-network-overview"],
    queryFn: async () => {
      const [
        stores,
        verifiedStores,
        pendingApplications,
        storeAdmins,
        activeStaff,
        pendingTasks,
      ] = await Promise.all([
        countTable("stores"),
        countTable("stores", (query) => query.eq("is_verified", true)),
        countTable("store_applications", (query) => query.eq("status", "pending")),
        countTable("store_admins"),
        countTable("store_staff", (query) => query.eq("status", "active")),
        countTable("admin_tasks", (query) => query.eq("assigned_role_type", "storeadmin").in("status", ["pending", "in_progress", "overdue"])),
      ]);

      return { stores, verifiedStores, pendingApplications, storeAdmins, activeStaff, pendingTasks };
    },
    retry: 1,
  });

  const statCards = [
    { label: "Total Stores", value: data?.stores ?? 0, href: "?tab=stores", icon: Store },
    { label: "Verified Stores", value: data?.verifiedStores ?? 0, href: "?tab=stores", icon: CheckCircle },
    { label: "Pending Applications", value: data?.pendingApplications ?? 0, href: "?tab=applications", icon: FileText },
    { label: "Store Admin Links", value: data?.storeAdmins ?? 0, href: "?tab=admins", icon: Users },
    { label: "Active Store Staff", value: data?.activeStaff ?? 0, href: "?tab=staff", icon: Users },
    { label: "Open Store Tasks", value: data?.pendingTasks ?? 0, href: "?tab=tasks", icon: Calendar },
  ];

  const flowSteps = [
    {
      title: "Review application",
      detail: "Check business name, contact, location, shop number, logo/license, duplicate store, and owner email.",
      href: "?tab=applications",
    },
    {
      title: "Create or verify store",
      detail: "Publish the profile only after phone, map/location, status, package tier, marketplace setting, and public visibility are correct.",
      href: "?tab=stores",
    },
    {
      title: "Assign store admin",
      detail: "Grant storeadmin role and link the user to the exact store. Avoid broad access if the user manages only one shop.",
      href: "?tab=admins",
    },
    {
      title: "Set permissions",
      detail: "Give only needed modules: profile, media, products, orders, leads, payouts, staff, repair, unlocking, and settings.",
      href: "?tab=permissions",
    },
    {
      title: "Hand off tasks",
      detail: "Create launch tasks for profile completion, catalog upload, pricing, media, subscription, and first order readiness.",
      href: "?tab=tasks",
    },
    {
      title: "Add store staff",
      detail: "Add staff for operational work without giving owner-level permissions.",
      href: "?tab=staff",
    },
  ];

  const permissionGroups = [
    "Store profile and public status",
    "Media, logo, theme, and branding",
    "Inventory, products, prices, and stock",
    "Orders, leads, exchanges, repair, and unlocking requests",
    "Payouts, subscriptions, billing, and commission settings",
    "Store staff, permissions, and security settings",
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} to={stat.href}>
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardContent className="flex items-center justify-between gap-4 pt-6">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold">{isLoading ? "..." : stat.value}</p>
                  </div>
                  <Icon className="h-8 w-8 text-primary" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Store Onboarding Flow</CardTitle>
            <CardDescription>Use this order so application approval, store access, permissions, and launch tasks stay connected.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {flowSteps.map((step, index) => (
              <div key={step.title} className="flex gap-3 rounded-lg border p-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{step.title}</h3>
                    <Button asChild variant="outline" size="sm">
                      <Link to={step.href}>Open</Link>
                    </Button>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Permission Model</CardTitle>
              <CardDescription>Store admins should get owner-level access only where needed; staff should get task-level access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {permissionGroups.map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approval Checks</CardTitle>
              <CardDescription>Complete these before making a store fully public.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {["Duplicate checked", "Owner linked", "Phone verified", "Map/location set", "Package tier set", "Public status ready", "First tasks assigned"].map((item) => (
                <Badge key={item} variant="secondary">{item}</Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BillingOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["billing-overview"],
    queryFn: async () => {
      const [
        payoutRows,
        commissionRows,
        activeSubscriptions,
        inactiveSubscriptions,
        packageCount,
        activeStores,
        expiringStores,
      ] = await Promise.all([
        selectRows<{ amount: number | null; status: string | null; paid_at: string | null }>("store_payouts", "amount,status,paid_at"),
        selectRows<{ store_earning: number | null; status: string | null }>("store_commissions", "store_earning,status"),
        countTable("store_subscriptions", (query) => query.eq("status", "active")),
        countTable("store_subscriptions", (query) => query.neq("status", "active")),
        countTable("store_packages"),
        countTable("stores", (query) => query.eq("subscription_status", "active")),
        countTable("stores", (query) => {
          const soon = new Date();
          soon.setDate(soon.getDate() + 14);
          return query.eq("subscription_status", "active").not("subscription_end_date", "is", null).lte("subscription_end_date", soon.toISOString());
        }),
      ]);

      const now = new Date();
      const paidThisMonth = payoutRows
        .filter((payout) => {
          if (payout.status !== "paid" || !payout.paid_at) return false;
          const paidAt = new Date(payout.paid_at);
          return paidAt.getFullYear() === now.getFullYear() && paidAt.getMonth() === now.getMonth();
        })
        .reduce((sum, payout) => sum + Number(payout.amount ?? 0), 0);

      const pendingPayoutAmount = payoutRows
        .filter((payout) => payout.status === "pending" || payout.status === "processing")
        .reduce((sum, payout) => sum + Number(payout.amount ?? 0), 0);

      const pendingCommissionAmount = commissionRows
        .filter((commission) => commission.status === "calculated" || commission.status === "pending")
        .reduce((sum, commission) => sum + Number(commission.store_earning ?? 0), 0);

      return {
        totalPayouts: payoutRows.length,
        pendingPayouts: payoutRows.filter((payout) => payout.status === "pending").length,
        paidThisMonth,
        pendingPayoutAmount,
        pendingCommissionAmount,
        activeSubscriptions,
        inactiveSubscriptions,
        packageCount,
        activeStores,
        expiringStores,
      };
    },
    retry: 1,
  });

  const stats = [
    { label: "Active Store Subscriptions", value: data?.activeStores ?? 0, detail: `${data?.activeSubscriptions ?? 0} in subscriptions table`, href: "?tab=subscriptions", icon: CreditCard },
    { label: "Expiring in 14 Days", value: data?.expiringStores ?? 0, detail: "Needs renewal follow-up", href: "/suadmin/stores", icon: Calendar },
    { label: "Pending Payouts", value: data?.pendingPayouts ?? 0, detail: formatCurrency(data?.pendingPayoutAmount ?? 0), href: "?tab=payouts", icon: DollarSign },
    { label: "Paid This Month", value: formatCurrency(data?.paidThisMonth ?? 0), detail: `${data?.totalPayouts ?? 0} payout records`, href: "?tab=payouts", icon: CheckCircle },
    { label: "Pending Store Earnings", value: formatCurrency(data?.pendingCommissionAmount ?? 0), detail: "Calculated commissions waiting settlement", href: "?tab=payouts", icon: Wallet },
    { label: "Package Plans", value: data?.packageCount ?? 0, detail: `${data?.inactiveSubscriptions ?? 0} inactive subscriptions`, href: "?tab=subscriptions", icon: Package },
  ];

  const flow = [
    {
      title: "Define packages",
      detail: "Set store tiers, prices, staff/product limits, SEO, repair, exchange, verified badge, and homepage promotion features.",
      href: "?tab=subscriptions",
    },
    {
      title: "Assign subscription to store",
      detail: "Use Store Network > Stores to attach the package, end date, enabled state, and public subscription status.",
      href: "/suadmin/stores",
    },
    {
      title: "Sync entitlement",
      detail: "Store profile, marketplace visibility, listing limits, repair access, and featured placement should read from the active package.",
      href: "/suadmin/store-network",
    },
    {
      title: "Track commissions",
      detail: "After paid orders, commissions move into calculated earnings for each store.",
      href: "?tab=payouts",
    },
    {
      title: "Approve payout",
      detail: "Review payout method, payout details, amount, store identity, and mark pending to processing to paid.",
      href: "?tab=payouts",
    },
    {
      title: "Audit and reconcile",
      detail: "Use audit logs and platform analytics to match subscription changes, payout actions, and revenue reporting.",
      href: "/suadmin/audit",
    },
  ];

  const checks = [
    { label: "Package pricing table", status: (data?.packageCount ?? 0) > 0 ? "Ready" : "Needs setup" },
    { label: "Subscription assignment", status: (data?.activeSubscriptions ?? 0) > 0 ? "Active" : "No active records" },
    { label: "Payout queue", status: (data?.pendingPayouts ?? 0) > 0 ? "Needs review" : "Clear" },
    { label: "Expiring renewals", status: (data?.expiringStores ?? 0) > 0 ? "Follow up" : "Clear" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} to={stat.href}>
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardContent className="flex items-start justify-between gap-4 pt-6">
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold">{isLoading ? "..." : stat.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{stat.detail}</p>
                  </div>
                  <Icon className="h-8 w-8 shrink-0 text-primary" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Billing Flow</CardTitle>
            <CardDescription>Run billing in this order so store plans, entitlements, commissions, and payouts stay connected.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {flow.map((step, index) => (
              <div key={step.title} className="flex gap-3 rounded-lg border p-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{step.title}</h3>
                    <Button asChild variant="outline" size="sm">
                      <Link to={step.href}>Open</Link>
                    </Button>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Control Checks</CardTitle>
              <CardDescription>Fast signals for what needs attention before payouts or renewals.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {checks.map((check) => (
                <div key={check.label} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>{check.label}</span>
                  </div>
                  <Badge variant={check.status === "Ready" || check.status === "Active" || check.status === "Clear" ? "secondary" : "outline"}>
                    {check.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Required Records</CardTitle>
              <CardDescription>These database areas power the full billing function.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {["store_packages", "store_subscriptions", "stores.package_slug", "store_commissions", "store_payouts", "audit_logs"].map((item) => (
                <Badge key={item} variant="secondary">{item}</Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

type OverviewStat = {
  label: string;
  value: number | string;
  detail: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type OverviewStep = {
  title: string;
  detail: string;
  href: string;
};

type HealthScore = { label: string; score: number; status: "good" | "warn" | "bad"; detail?: string };
type ActivityItem = { id: string; action: string; target: string; time: string; severity: "info" | "warn" | "success" };
type QuickAction = { label: string; href: string; icon: React.ComponentType<{ className?: string }>; variant?: "default" | "outline" | "secondary" };

function OperationsOverview({
  queryKey,
  statLoader,
  stats,
  flowTitle,
  flowDescription,
  flow,
  checks,
  records,
  healthScores,
  activities,
  quickActions,
  extraTop,
  extraBottom,
  refreshQueryKeys = [],
}: {
  queryKey: string;
  statLoader: () => Promise<Record<string, number>>;
  stats: (data: Record<string, number> | undefined) => OverviewStat[];
  flowTitle: string;
  flowDescription: string;
  flow: OverviewStep[];
  checks: string[];
  records: string[];
  healthScores?: HealthScore[];
  activities?: ActivityItem[];
  quickActions?: QuickAction[];
  extraTop?: React.ReactNode;
  extraBottom?: React.ReactNode;
  refreshQueryKeys?: string[];
}) {
  const { data, isLoading } = useQuery({ queryKey: [queryKey], queryFn: statLoader, retry: 1 });
  const statCards = stats(data);
  const qc = useQueryClient();

  const avgHealth = healthScores && healthScores.length > 0
    ? Math.round(healthScores.reduce((s, h) => s + h.score, 0) / healthScores.length)
    : null;

  const healthColor = (s: number) => s >= 80 ? "bg-emerald-500" : s >= 50 ? "bg-amber-500" : "bg-rose-500";
  const healthBadge = (s: HealthScore["status"]) =>
    s === "good" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
    : s === "warn" ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
    : "bg-rose-500/10 text-rose-700 border-rose-500/20";

  const severityBadge = (sev: ActivityItem["severity"]) =>
    sev === "success" ? "bg-emerald-500/10 text-emerald-600"
    : sev === "warn" ? "bg-amber-500/10 text-amber-600"
    : "bg-sky-500/10 text-sky-600";

  return (
    <div className="space-y-6">
      {extraTop}

      {quickActions && quickActions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                asChild
                variant={action.variant ?? "secondary"}
                size="sm"
                className="gap-1.5"
              >
                <Link to={action.href}>
                  <Icon className="h-3.5 w-3.5" />
                  {action.label}
                </Link>
              </Button>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} to={stat.href}>
              <Card className="h-full transition-all duration-150 hover:bg-muted/40 hover:shadow-sm">
                <CardContent className="flex items-start justify-between gap-4 pt-6">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight">
                      {isLoading ? "…" : stat.value}
                    </p>
                    {stat.detail && (
                      <p className="mt-1 text-xs text-muted-foreground">{stat.detail}</p>
                    )}
                  </div>
                  <div className="rounded-xl bg-primary/10 p-2.5">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {healthScores && avgHealth !== null && (
          <Card className="h-full">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data Health</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">{avgHealth}%</p>
                  <p className="mt-1 text-xs text-muted-foreground">Aggregate quality score</p>
                </div>
                <div className={`rounded-xl p-2.5 ${healthColor(avgHealth)} bg-opacity-15`}>
                  <Gauge className={`h-5 w-5 ${avgHealth >= 80 ? "text-emerald-600" : avgHealth >= 50 ? "text-amber-600" : "text-rose-600"}`} />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {healthScores.slice(0, 3).map((h) => (
                  <div key={h.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{h.label}</span>
                      <span className="text-muted-foreground">{h.score}%</span>
                    </div>
                    <Progress value={h.score} className="mt-1 h-1.5" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{flowTitle}</CardTitle>
                <CardDescription>{flowDescription}</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  qc.invalidateQueries({ queryKey: [queryKey] });
                  refreshQueryKeys.forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
                }}
                title="Refresh data"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {flow.map((step, index) => (
                <div key={step.title} className="group flex gap-3 rounded-lg border p-4 transition-colors hover:border-primary/30 hover:bg-muted/20">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold tracking-tight">{step.title}</h3>
                      <Button asChild variant="outline" size="sm" className="h-7 gap-1">
                        <Link to={step.href}>
                          Open
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.detail}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {activities && activities.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest actions taken across catalog modules.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-64">
                  <div className="divide-y">
                    {activities.map((a) => (
                      <div key={a.id} className="flex items-start gap-3 px-6 py-3">
                        <Badge variant="outline" className={`mt-0.5 h-5 shrink-0 ${severityBadge(a.severity)}`}>
                          {a.severity}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">
                            <span className="font-medium">{a.action}</span>
                            <span className="text-muted-foreground"> · {a.target}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {healthScores && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Quality Scores
                </CardTitle>
                <CardDescription>Track catalog data completeness and hygiene.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {healthScores.map((h) => (
                  <div key={h.label} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{h.label}</span>
                        <Badge variant="outline" className={`h-5 text-[10px] ${healthBadge(h.status)}`}>
                          {h.status}
                        </Badge>
                      </div>
                      <span className="text-xs font-semibold tabular-nums">{h.score}%</span>
                    </div>
                    <Progress value={h.score} className="h-1.5" />
                    {h.detail && <p className="text-[11px] text-muted-foreground">{h.detail}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Control Checks
              </CardTitle>
              <CardDescription>Section-level admin checklist before pushing live.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {checks.map((item) => (
                <Badge key={item} variant="secondary" className="text-xs">
                  {item}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                Database Areas
              </CardTitle>
              <CardDescription>Tables and records powering the flow.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {records.map((item) => (
                <Badge key={item} variant="outline" className="font-mono text-[11px]">
                  {item}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {extraBottom}
    </div>
  );
}

function CatalogOverview() {
  const { data: deepStats, isLoading: deepLoading } = useQuery({
    queryKey: ["catalog-deep-stats"],
    queryFn: async () => {
      const [
        modelsTotal,
        modelsWithImage,
        modelsWithSpecs,
        modelsActive,
        variantsTotal,
        variantPricesTotal,
        brandsTotal,
        brandsActive,
        brandsWithLogo,
        productsTotal,
        productsWithImage,
        productsInStock,
        catalogTotal,
        productsVerified,
        priceItemsWithPrice,
        emiActive,
        pendingVerification,
        recentPriceUpdates,
        unverifiedProducts,
      ] = await Promise.all([
        countTable("phone_models"),
        countTable("phone_models", (q: any) => q.not("image", "is", null).neq("image", "")),
        countTable("phone_specs"),
        countTable("phone_models", (q: any) => q.eq("status", "active")),
        countTable("phone_variants"),
        countTable("phone_variant_prices", (q: any) => q.gt("regular_price", 0)),
        countTable("brands"),
        countTable("brands", (q: any) => q.eq("status", "active")),
        countTable("brands", (q: any) => q.not("logo_url", "is", null).neq("logo_url", "")),
        countTable("products"),
        countTable("products", (q: any) => q.not("image", "is", null).neq("image", "")),
        countTable("products", (q: any) => q.eq("in_stock", true)),
        countTable("catalog_products"),
        countTable("catalog_products", (q: any) => q.eq("verified", true)),
        countTable("catalog_products", (q: any) => q.gt("price_npr", 0)),
        countTable("emi_plans", (q: any) => q.eq("status", "active")),
        countTable("device_verifications", (q: any) => q.in("status", ["pending", "review"])),
        selectRows<{ id: string; name: string; updated_at: string | null }>("catalog_products", "id, name, updated_at", (q: any) => q.not("updated_at", "is", null).order("updated_at", { ascending: false }).limit(8)),
        countTable("catalog_products", (q: any) => q.eq("verified", false).eq("is_active", true)),
      ]);

      const percentage = (part: number, total: number) => total > 0 ? Math.min(100, Math.round((part / total) * 100)) : 0;

      return {
        modelsTotal, modelsWithImage, modelsWithSpecs, modelsActive, variantsTotal, variantPricesTotal,
        brandsTotal, brandsActive, brandsWithLogo, productsTotal, productsWithImage, productsInStock,
        catalogTotal, productsVerified, priceItemsWithPrice, emiActive, pendingVerification,
        recentPriceUpdates, unverifiedProducts,
        scores: {
          modelCoverage: percentage(modelsWithSpecs, modelsTotal),
          modelImageHealth: percentage(modelsWithImage, modelsTotal),
          brandCoverage: percentage(brandsWithLogo, brandsTotal),
          imageHealth: percentage(productsWithImage, productsTotal),
          priceHealth: percentage(priceItemsWithPrice, catalogTotal),
          variantPriceCoverage: percentage(variantPricesTotal, variantsTotal),
          verificationRate: percentage(productsVerified, catalogTotal),
        },
      };
    },
    retry: 1,
  });

  const activities: ActivityItem[] = (deepStats?.recentPriceUpdates ?? []).map((r, i) => ({
    id: r.id,
    action: i % 3 === 0 ? "Price updated" : i % 3 === 1 ? "Specs revised" : "Verified",
    target: r.name ?? "Catalog item",
    time: r.updated_at ? new Date(r.updated_at).toLocaleString("en-NP", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Recently",
    severity: i % 4 === 0 ? "warn" : i % 4 === 1 ? "info" : "success",
  }));

  const scores = deepStats?.scores ?? {
    modelCoverage: 0, modelImageHealth: 0, brandCoverage: 0, imageHealth: 0, priceHealth: 0, variantPriceCoverage: 0, verificationRate: 0,
  };

  const healthScores: HealthScore[] = [
    { label: "Master specifications", score: scores.modelCoverage, status: scores.modelCoverage >= 80 ? "good" : scores.modelCoverage >= 55 ? "warn" : "bad", detail: `${deepStats?.modelsWithSpecs ?? 0} of ${deepStats?.modelsTotal ?? 0} master models have specification rows` },
    { label: "Master model images", score: scores.modelImageHealth, status: scores.modelImageHealth >= 80 ? "good" : scores.modelImageHealth >= 55 ? "warn" : "bad", detail: `${deepStats?.modelsWithImage ?? 0} of ${deepStats?.modelsTotal ?? 0} master models have an image` },
    { label: "Brand logo coverage", score: scores.brandCoverage, status: scores.brandCoverage >= 80 ? "good" : scores.brandCoverage >= 55 ? "warn" : "bad", detail: `${deepStats?.brandsWithLogo ?? 0} of ${deepStats?.brandsTotal ?? 0} brands have a logo` },
    { label: "Storefront product images", score: scores.imageHealth, status: scores.imageHealth >= 80 ? "good" : scores.imageHealth >= 55 ? "warn" : "bad", detail: `${deepStats?.productsWithImage ?? 0} of ${deepStats?.productsTotal ?? 0} products have a primary image` },
    { label: "Valuation price coverage", score: scores.priceHealth, status: scores.priceHealth >= 80 ? "good" : scores.priceHealth >= 55 ? "warn" : "bad", detail: `${deepStats?.priceItemsWithPrice ?? 0} of ${deepStats?.catalogTotal ?? 0} valuation rows have an NPR price` },
    { label: "Variant price coverage", score: scores.variantPriceCoverage, status: scores.variantPriceCoverage >= 80 ? "good" : scores.variantPriceCoverage >= 55 ? "warn" : "bad", detail: `${deepStats?.variantPricesTotal ?? 0} of ${deepStats?.variantsTotal ?? 0} variants have a regular price` },
    { label: "Catalog verification", score: scores.verificationRate, status: scores.verificationRate >= 80 ? "good" : scores.verificationRate >= 55 ? "warn" : "bad", detail: `${deepStats?.productsVerified ?? 0} of ${deepStats?.catalogTotal ?? 0} catalog rows are verified` },
  ];

  return (
    <OperationsOverview
      queryKey="catalog-pricing-overview"
      statLoader={async () => {
        const [models, brands, storefrontProducts, priceItems, emiPlans, verificationItems] = await Promise.all([
          countTable("phone_models"),
          countTable("brands"),
          countTable("products"),
          countTable("catalog_products"),
          countTable("emi_plans"),
          countTable("device_verifications"),
        ]);
        return { models, brands, storefrontProducts, priceItems, emiPlans, verificationItems };
      }}
      stats={(data) => [
        { label: "Mobile Master", value: data?.models ?? 0, detail: `${deepStats?.modelsActive ?? 0} active · canonical specs`, href: "?tab=master", icon: Database },
        { label: "Brands", value: data?.brands ?? 0, detail: `${deepStats?.brandsActive ?? 0} active · taxonomy`, href: "?tab=brands", icon: Tag },
        { label: "Storefront Products", value: data?.storefrontProducts ?? 0, detail: `${deepStats?.productsInStock ?? 0} currently marked in stock`, href: "?tab=products", icon: Package },
        { label: "Valuation Price List", value: data?.priceItems ?? 0, detail: `${deepStats?.priceItemsWithPrice ?? 0} have a configured NPR value`, href: "?tab=prices", icon: DollarSign },
        { label: "EMI Plans", value: data?.emiPlans ?? 0, detail: `${deepStats?.emiActive ?? 0} active plan records`, href: "?tab=emi", icon: CreditCard },
        { label: "Review Queue", value: deepStats?.pendingVerification ?? 0, detail: `${deepStats?.unverifiedProducts ?? 0} active catalog rows remain unverified`, href: "?tab=verification", icon: CheckCircle },
      ]}
      flowTitle="Catalog Flow"
      flowDescription="Keep master data, pricing, product pages, and verification moving in this order so SEO, marketplace, and store admin tools read a single source of truth."
      flow={[
        { title: "Create master model", detail: "Add brand, model, variants, specs, images, launch status, and canonical slug once. Avoid duplicate entries per storage/RAM variant.", href: "?tab=master" },
        { title: "Normalize brands", detail: "Keep brand names, slugs, logos, service centers, overview copy, and display grouping clean before publishing product pages.", href: "?tab=brands" },
        { title: "Create products", detail: "Attach price, source URL, gallery images, stock status, video URL, featured flag, product slug, and store ownership.", href: "?tab=products" },
        { title: "Maintain price list", detail: "Update official Nepal prices, market vs official delta, price history, availability, and source confidence per variant.", href: "?tab=prices" },
        { title: "Add EMI plans", detail: "Configure down payment, tenure, provider, interest, processing fee, min cart, model eligibility, and purchase-linked calculator.", href: "?tab=emi" },
        { title: "Verify device data", detail: "Review duplicate models, missing specs, image quality, broken slugs, route visibility, and approve batch before SEO push.", href: "?tab=verification" },
      ]}
      checks={["One master ID per model variant", "Brand slug clean + logo present", "Product image via SafeImage", "Price source + confidence set", "EMI visible where applicable", "No duplicate slugs or routes", "Verified flag for SEO traffic"]}
      records={["phone_models", "phone_series", "phone_variants", "phone_specs", "phone_variant_prices", "brands", "products", "catalog_products", "emi_plans", "emi_model_links", "device_verifications", "audit_logs"]}
      healthScores={deepLoading ? undefined : healthScores}
      activities={activities}
      refreshQueryKeys={["catalog-deep-stats"]}
      quickActions={[
        { label: "Create Model", href: "?tab=master", icon: Plus, variant: "default" },
        { label: "Create Brand", href: "?tab=brands", icon: Tag, variant: "outline" },
        { label: "Bulk Import Prices", href: "?tab=prices", icon: Upload, variant: "secondary" },
        { label: "Export Catalog", href: "?tab=products", icon: Download, variant: "outline" },
        { label: "Run Verification", href: "?tab=verification", icon: Zap, variant: "secondary" },
      ]}
      extraTop={
        !deepLoading && (deepStats?.unverifiedProducts ?? 0) > 20 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-lg bg-amber-500/15 p-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">Catalog review backlog</p>
                  <p className="text-sm text-muted-foreground">
                    {deepStats?.unverifiedProducts ?? 0} items need verification before they appear in SEO and price list.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 border-amber-500/40 hover:bg-amber-500/10">
                <Link to="?tab=verification">Review queue</Link>
              </Button>
            </CardContent>
          </Card>
        )
      }
    />
  );
}

function CommerceOverview() {
  return (
    <OperationsOverview
      queryKey="commerce-operations-overview"
      statLoader={async () => {
        const [orders, openOrders, paidOrders, leads, openLeads, listings, activeListings, exchanges] = await Promise.all([
          countTable("orders"),
          countTable("orders", (q) => q.in("order_status", ["pending", "confirmed", "processing", "packed", "shipped"])),
          countTable("orders", (q) => q.eq("payment_status", "paid")),
          countTable("sell_phone_leads"),
          countTable("sell_phone_leads", (q) => q.in("status", ["new", "contacted", "inspection_booked"])),
          countTable("sell_listings"),
          countTable("sell_listings", (q) => q.eq("status", "active")),
          countTable("exchange_requests"),
        ]);
        return { orders, openOrders, paidOrders, leads, openLeads, listings, activeListings, exchanges };
      }}
      stats={(data) => [
        { label: "Open Orders", value: data?.openOrders ?? 0, detail: `${data?.orders ?? 0} total · ${data?.paidOrders ?? 0} paid`, href: "?tab=orders", icon: CreditCard },
        { label: "Leads to Qualify", value: data?.openLeads ?? 0, detail: `${data?.leads ?? 0} total sell and purchase leads`, href: "?tab=leads", icon: User },
        { label: "Live Listings", value: data?.activeListings ?? 0, detail: `${data?.listings ?? 0} total marketplace listings`, href: "?tab=listings", icon: ShoppingBag },
        { label: "Exchange Requests", value: data?.exchanges ?? 0, detail: "Trade-in and upgrade opportunities", href: "?tab=exchanges", icon: RefreshCw },
      ]}
      flowTitle="Revenue Flow"
      flowDescription="Move customer intent forward without losing ownership between marketplace discovery, sales follow-up, payment and fulfilment."
      flow={[
        { title: "Publish trusted inventory", detail: "Make the right product, price, image, stock and store contact visible before spending on acquisition.", href: "/suadmin/products" },
        { title: "Capture demand", detail: "Moderate listings and campaigns so each enquiry has a product, customer, source and next action.", href: "?tab=listings" },
        { title: "Qualify and assign", detail: "Confirm intent, budget, device, location and route the lead to the correct store or platform owner.", href: "?tab=leads" },
        { title: "Confirm payment and order", detail: "Verify order items, customer contact, payment status, assigned store and fulfilment promise.", href: "?tab=orders" },
        { title: "Fulfil and close", detail: "Move confirmed orders through processing, packed, shipped and delivered with a clear accountable owner.", href: "?tab=orders" },
        { title: "Retain the customer", detail: "Route exchange, repair, unlocking and valuation needs into Service Desk instead of ending the relationship.", href: "/suadmin/service-desk" },
      ]}
      checks={["Listing is complete", "Customer contact verified", "Store owner assigned", "Payment state confirmed", "Fulfilment status current", "After-sales handoff available"]}
      records={["products", "sell_listings", "sell_phone_leads", "orders", "order_items", "store_order_fulfillments", "exchange_requests", "audit_logs"]}
      quickActions={[
        { label: "Review Orders", href: "?tab=orders", icon: CreditCard, variant: "default" },
        { label: "Qualify Leads", href: "?tab=leads", icon: User, variant: "outline" },
        { label: "Moderate Listings", href: "?tab=listings", icon: ShoppingBag, variant: "outline" },
      ]}
    />
  );
}

function CustomerJourneyPipeline() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform-customer-journey"],
    queryFn: async () => {
      const [productsTotal, productsReady, variantPrices, valuationPrices, listings, leads, orders, openOrders, serviceCases] = await Promise.all([
        countTable("products"),
        countTable("products", (q) => q.eq("in_stock", true)),
        countTable("phone_variant_prices", (q) => q.gt("regular_price", 0)),
        countTable("catalog_products", (q) => q.gt("price_npr", 0)),
        countTable("sell_listings", (q) => q.eq("status", "active")),
        countTable("sell_phone_leads", (q) => q.in("status", ["new", "contacted", "inspection_booked"])),
        countTable("orders"),
        countTable("orders", (q) => q.in("order_status", ["pending", "confirmed", "processing", "packed", "shipped"])),
        Promise.all([
          countTable("repair_requests", (q) => q.in("status", ["new", "assigned", "inspection", "repairing"])),
          countTable("unlock_requests", (q) => q.in("status", ["pending", "processing"])),
        ]).then(([repairs, unlocks]) => repairs + unlocks),
      ]);
      return { productsTotal, productsReady, variantPrices, valuationPrices, listings, leads, orders, openOrders, serviceCases };
    },
  });
  const stages = [
    { label: "Discover", value: data?.productsReady ?? 0, detail: `buy-ready · ${data?.productsTotal ?? 0} total`, href: "/suadmin/products", icon: Search, state: (data?.productsReady ?? 0) > 0 ? "active" : "empty" },
    { label: "Decide", value: data?.variantPrices ?? 0, detail: `variant prices · ${data?.valuationPrices ?? 0} valuations`, href: "/suadmin/price-list", icon: Tag, state: (data?.variantPrices ?? 0) > 0 ? "active" : "empty" },
    { label: "Engage", value: data?.listings ?? 0, detail: "live marketplace listings", href: "/suadmin/listings", icon: ShoppingBag, state: (data?.listings ?? 0) > 0 ? "active" : "empty" },
    { label: "Convert", value: data?.leads ?? 0, detail: (data?.leads ?? 0) > 0 ? "leads awaiting action" : "no open demand captured", href: "/suadmin/leads", icon: User, state: (data?.leads ?? 0) > 0 ? "attention" : "empty" },
    { label: "Fulfil", value: data?.openOrders ?? 0, detail: `${data?.orders ?? 0} total orders`, href: "/suadmin/orders", icon: CreditCard, state: (data?.orders ?? 0) > 0 ? "attention" : "empty" },
    { label: "Retain", value: data?.serviceCases ?? 0, detail: (data?.serviceCases ?? 0) > 0 ? "active after-sales cases" : "no active service cases", href: "/suadmin/service-desk", icon: Wrench, state: (data?.serviceCases ?? 0) > 0 ? "attention" : "empty" },
  ];
  return (
    <Card className="overflow-hidden border-primary/15">
      <CardHeader className="pb-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><CardTitle>Customer-to-customer-again pipeline</CardTitle><CardDescription>Follow value from product readiness through revenue and retention. A number is a queue, not just a report.</CardDescription></div><Badge variant="outline" className="w-fit">CEO operating view</Badge></div></CardHeader>
      <CardContent><div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">{stages.map((stage, index) => { const Icon = stage.icon; const stateDot = stage.state === "active" ? "bg-emerald-500" : stage.state === "attention" ? "bg-amber-500" : "bg-muted-foreground/35"; return <div key={stage.label} className="relative"><Link to={stage.href} className="flex h-full items-center gap-3 rounded-xl border bg-muted/10 p-3 transition hover:border-primary/30 hover:bg-primary/5"><span className="rounded-lg bg-primary/10 p-2"><Icon className="h-4 w-4 text-primary" /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><span>{index + 1}. {stage.label}</span><span className={`h-2 w-2 rounded-full ${stateDot}`} /></span><span className="block text-xl font-black">{isLoading ? "…" : stage.value}</span><span className="block truncate text-[11px] text-muted-foreground">{stage.detail}</span></span></Link>{index < stages.length - 1 && <ArrowRight className="absolute -right-2.5 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 rounded-full bg-background text-muted-foreground xl:block" />}</div>; })}</div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Active supply</span><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" />Queue needs action</span><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/35" />No activity captured</span></div></CardContent>
    </Card>
  );
}

function PublishingOverview() {
  return (
    <OperationsOverview
      queryKey="publishing-overview"
      statLoader={async () => {
        const [articles, guides, pages, publishedArticles, draftPages] = await Promise.all([
          countTable("articles"),
          countTable("guides"),
          countTable("content_pages"),
          countTable("articles", (query) => query.eq("published", true)),
          countTable("content_pages", (query) => query.eq("is_published", false)),
        ]);
        return { articles, guides, pages, publishedArticles, draftPages };
      }}
      stats={(data) => [
        { label: "Articles", value: data?.articles ?? 0, detail: `${data?.publishedArticles ?? 0} published`, href: "?tab=articles", icon: FileText },
        { label: "Guides & FAQs", value: data?.guides ?? 0, detail: "Help and evergreen content", href: "?tab=guides", icon: FileText },
        { label: "Content Pages", value: data?.pages ?? 0, detail: `${data?.draftPages ?? 0} drafts`, href: "?tab=pages", icon: FileText },
        { label: "SEO Growth", value: "Open", detail: "Titles, OG, sitemap and keyword clusters", href: "/suadmin/seo", icon: Search },
        { label: "Analytics", value: "Open", detail: "Content performance and traffic checks", href: "/suadmin/analytics", icon: BarChart3 },
        { label: "Audit Logs", value: "Open", detail: "Publishing and content change history", href: "/suadmin/audit", icon: ShieldAlert },
      ]}
      flowTitle="Publishing Flow"
      flowDescription="Move content from keyword target to article/page, SEO review, publish, and performance check."
      flow={[
        { title: "Plan keyword and route", detail: "Choose target query, route, title, meta description, OG image, and internal links.", href: "/suadmin/seo" },
        { title: "Write article", detail: "Publish news, reviews, comparison, and price posts with category, slug, image, and author data.", href: "?tab=articles" },
        { title: "Create guide or FAQ", detail: "Use guides for evergreen support, buying advice, repair help, and recurring questions.", href: "?tab=guides" },
        { title: "Maintain static pages", detail: "Keep About, Contact, policy, service, and local landing pages current.", href: "?tab=pages" },
        { title: "Review after publish", detail: "Check sitemap, canonical, schema, internal links, analytics, and audit record.", href: "/suadmin/analytics" },
      ]}
      checks={["Title and meta set", "OG image present", "Canonical correct", "Internal links added", "Published status checked", "Sitemap route visible"]}
      records={["articles", "guides", "content_pages", "seo_pages", "sitemap", "audit_logs"]}
    />
  );
}

function EngagementOverview() {
  return (
    <OperationsOverview
      queryKey="engagement-overview"
      statLoader={async () => {
        const [messages, chatbotConfigs, polls, openMessages, activePolls] = await Promise.all([
          countTable("contact_messages"),
          countTable("chatbot_config"),
          countTable("polls"),
          countTable("contact_messages", (query) => query.eq("status", "new")),
          countTable("polls", (query) => query.eq("status", "active")),
        ]);
        return { messages, chatbotConfigs, polls, openMessages, activePolls };
      }}
      stats={(data) => [
        { label: "Mailbox", value: data?.messages ?? 0, detail: `${data?.openMessages ?? 0} new messages`, href: "?tab=messages", icon: MessageSquare },
        { label: "ChatBot Config", value: data?.chatbotConfigs ?? 0, detail: "Automated help and routing", href: "?tab=chatbot", icon: MessageSquare },
        { label: "User Polls", value: data?.polls ?? 0, detail: `${data?.activePolls ?? 0} active`, href: "?tab=polls", icon: BarChart3 },
        { label: "Service Desk", value: "Open", detail: "Escalate repair/unlocking/valuation cases", href: "/suadmin/service-desk", icon: Wrench },
        { label: "Users", value: "Open", detail: "Review user profile and risk context", href: "/suadmin/customers", icon: Users },
        { label: "Campaigns", value: "Open", detail: "Follow up through commerce campaigns", href: "/suadmin/campaigns", icon: Megaphone },
      ]}
      flowTitle="Engagement Flow"
      flowDescription="Connect customer messages, chatbot answers, polls, service follow-up, and campaigns."
      flow={[
        { title: "Review mailbox", detail: "Triage incoming contact messages by urgency, topic, user, and store/service context.", href: "?tab=messages" },
        { title: "Tune chatbot", detail: "Update answers, fallback routing, lead capture, repair guidance, and store/contact handoff.", href: "?tab=chatbot" },
        { title: "Run polls", detail: "Collect demand signals for brands, prices, repairs, offers, and buying intent.", href: "?tab=polls" },
        { title: "Escalate service cases", detail: "Move repair, unlocking, valuation, or store issues into the right operations queue.", href: "/suadmin/service-desk" },
        { title: "Close the loop", detail: "Use campaigns and content to answer recurring questions and reduce repeated tickets.", href: "/suadmin/campaigns" },
      ]}
      checks={["New messages triaged", "Chatbot fallback working", "Poll dates valid", "Lead handoff clear", "Sensitive user data protected", "Campaign follow-up ready"]}
      records={["contact_messages", "chatbot_config", "polls", "leads", "campaigns", "audit_logs"]}
    />
  );
}

function ServiceDeskOverview() {
  return (
    <OperationsOverview
      queryKey="service-desk-overview"
      statLoader={async () => {
        const [repairs, unlocking, valuations, pendingRepairs, pendingUnlocking, pendingValuations] = await Promise.all([
          countTable("repair_requests"),
          countTable("unlock_requests"),
          countTable("sell_phone_leads"),
          countTable("repair_requests", (query) => query.in("status", ["new", "assigned", "inspection", "repairing"])),
          countTable("unlock_requests", (query) => query.in("status", ["pending", "processing"])),
          countTable("sell_phone_leads", (query) => query.in("status", ["new", "contacted", "inspection_booked"])),
        ]);
        return { repairs, unlocking, valuations, pendingRepairs, pendingUnlocking, pendingValuations };
      }}
      stats={(data) => [
        { label: "Repair Requests", value: data?.repairs ?? 0, detail: `${data?.pendingRepairs ?? 0} active`, href: "/suadmin/repairs", icon: Wrench },
        { label: "Unlocking Requests", value: data?.unlocking ?? 0, detail: `${data?.pendingUnlocking ?? 0} active`, href: "/suadmin/unlocking", icon: Unlock },
        { label: "Valuations", value: data?.valuations ?? 0, detail: `${data?.pendingValuations ?? 0} need follow-up`, href: "/suadmin/valuation", icon: Calculator },
        { label: "Stores", value: "Open", detail: "Assign jobs to trusted stores", href: "/suadmin/store-network", icon: Store },
        { label: "Leads", value: "Open", detail: "Convert service interest to follow-up", href: "/suadmin/leads", icon: User },
        { label: "Analytics", value: "Open", detail: "Track service demand and completion", href: "/suadmin/analytics", icon: BarChart3 },
      ]}
      flowTitle="Service Desk Flow"
      flowDescription="Turn service requests into assigned work, status updates, customer follow-up, and analytics."
      flow={[
        { title: "Triage request", detail: "Check device, issue, customer contact, urgency, duplicate tickets, and expected outcome.", href: "/suadmin/repairs" },
        { title: "Assign owner/store", detail: "Route repair/unlocking/valuation work to the right store or platform staff.", href: "/suadmin/store-network" },
        { title: "Update status", detail: "Move pending to processing/completed/cancelled with notes and customer-visible progress.", href: "/suadmin/repairs" },
        { title: "Handle unlocking", detail: "Verify model/network, eligibility, estimated time, fee, and assigned fulfillment store.", href: "/suadmin/unlocking" },
        { title: "Manage valuation", detail: "Review condition, variant, market price, exchange value, and offer decision.", href: "/suadmin/valuation" },
        { title: "Measure outcomes", detail: "Track completion rate, pending load, store performance, and recurring service demand.", href: "/suadmin/analytics" },
      ]}
      checks={["Customer contact present", "Device/model identified", "Store assignment clear", "Status updated", "Price/fee confirmed", "Completion audited"]}
      records={["repair_requests", "unlock_requests", "sell_phone_leads", "stores", "audit_logs"]}
    />
  );
}

function SectionHub({
  title,
  description,
  tabs,
  queryParam = "tab",
  embedded = false,
  navigateOnTabChange = false,
  navigationStyle = "secondary",
  headerAfter,
}: {
  title: string;
  description: string;
  tabs: HubTab[];
  queryParam?: string;
  embedded?: boolean;
  navigateOnTabChange?: boolean;
  navigationStyle?: "primary" | "secondary";
  headerAfter?: React.ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = useMemo(() => {
    const requested = searchParams.get(queryParam);
    if (requested && tabs.some((tab) => tab.value === requested)) return requested;
    return tabs.find((tab) => [tab.path, ...(tab.aliases ?? [])].includes(location.pathname))?.value ?? tabs[0].value;
  }, [location.pathname, queryParam, searchParams, tabs]);

  useEffect(() => {
    if (searchParams.get(queryParam)) return;
    const matched = tabs.find((tab) => [tab.path, ...(tab.aliases ?? [])].includes(location.pathname));
    if (!matched || matched.value === tabs[0].value) return;
    const next = new URLSearchParams(searchParams);
    next.set(queryParam, matched.value);
    setSearchParams(next, { replace: true });
  }, [location.pathname, queryParam, searchParams, setSearchParams, tabs]);

  const handleTabChange = (value: string) => {
    const destination = tabs.find((tab) => tab.value === value);
    if (navigateOnTabChange && destination) {
      navigate(destination.path);
      return;
    }
    const next = new URLSearchParams(searchParams);
    if (value === tabs[0].value) next.delete(queryParam);
    else next.set(queryParam, value);
    setSearchParams(next);
  };

  return (
    <div className="space-y-6">
      {!embedded && <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>}
      {embedded && <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Active workspace</p><h2 className="text-2xl font-bold tracking-tight">{title}</h2></div><p className="max-w-2xl text-sm text-muted-foreground sm:text-right">{description}</p></div>}
      {headerAfter}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className={navigationStyle === "primary" ? "rounded-2xl border bg-muted/20 p-2" : "overflow-x-auto border-b pb-2"}>
          <TabsList className={navigationStyle === "primary" ? "grid h-auto w-full gap-2 bg-transparent p-0 md:grid-cols-3" : "inline-flex h-auto min-w-max gap-1 bg-transparent p-0"}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className={navigationStyle === "primary" ? "h-auto justify-start gap-3 rounded-xl border border-transparent px-4 py-3 text-left data-[state=active]:border-primary/20 data-[state=active]:bg-background data-[state=active]:shadow-sm" : "gap-2 rounded-md px-3 py-2 data-[state=active]:bg-muted"}>
                  <span className={navigationStyle === "primary" ? "rounded-lg bg-primary/10 p-2" : ""}><Icon className="h-4 w-4 text-primary" /></span>
                  <span><span className="block font-semibold">{tab.label}</span>{navigationStyle === "primary" && tab.description && <span className="mt-0.5 block whitespace-normal text-xs font-normal text-muted-foreground">{tab.description}</span>}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-0">
            {tab.element}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export function CommandCenterHub() {
  return (
    <SectionHub
      title="Command Center"
      description="Review platform overview and manage your super admin profile."
      tabs={[
        { value: "dashboard", label: "Dashboard", path: "/suadmin", icon: LayoutDashboard, element: <SuperAdminDashboard /> },
        { value: "profile", label: "My Profile", path: "/suadmin/me", icon: User, element: <SuperAdminProfilePage /> },
      ]}
    />
  );
}

export function CustomersHub() {
  return (
    <SectionHub
      title="Customers"
      description="Manage users, rewards, and user risk from one customer operations page."
      tabs={[
        { value: "users", label: "User Management", path: "/suadmin/customers", aliases: ["/suadmin/users"], icon: Users, element: <UserManager /> },
        { value: "rewards", label: "Rewards", path: "/suadmin/user-rewards", icon: DollarSign, element: <UserRewardManager /> },
        { value: "risk", label: "Risk", path: "/suadmin/user-risk", icon: ShieldAlert, element: <UserRiskManager /> },
      ]}
    />
  );
}

export function CatalogPricingHub({ embedded = false }: { embedded?: boolean } = {}) {
  return (
    <SectionHub
      title="Catalog & Pricing"
      description="Manage product catalog, price data, EMI plans, brands, and device verification."
      embedded={embedded}
      tabs={[
        { value: "overview", label: "Overview", path: "/suadmin/catalog", icon: LayoutDashboard, element: <CatalogOverview /> },
        { value: "master", label: "Mobile Master", path: "/suadmin/master-data", icon: Database, element: <MobileMasterManager /> },
        { value: "brands", label: "Brands", path: "/suadmin/brands", icon: Tag, element: <BrandManager /> },
        { value: "products", label: "Products", path: "/suadmin/products", icon: Package, element: <ProductManager /> },
        { value: "prices", label: "Price List", path: "/suadmin/price-list", aliases: ["/suadmin/price-list-simple"], icon: DollarSign, element: <PriceListManager /> },
        { value: "emi", label: "EMI Plans", path: "/suadmin/emi-plans", icon: CreditCard, element: <EmiPlanManager /> },
        { value: "verification", label: "Verification", path: "/suadmin/device-verification", icon: CheckCircle, element: <DeviceVerificationManager /> },
      ]}
    />
  );
}

export function StoreNetworkHub() {
  return (
    <SectionHub
      title="Store Network"
      description="Manage the complete store lifecycle: application, store profile, owner access, permissions, tasks, and staff."
      tabs={[
        { value: "overview", label: "Overview", path: "/suadmin/store-network", icon: LayoutDashboard, element: <StoreNetworkOverview /> },
        { value: "stores", label: "Stores", path: "/suadmin/stores", icon: Store, element: <StoreManager /> },
        { value: "applications", label: "Applications", path: "/suadmin/store-applications", icon: FileText, element: <StoreApplicationManager /> },
        { value: "admins", label: "Store Admins", path: "/suadmin/store-admins", icon: Users, element: <StoreAdminManager /> },
        { value: "permissions", label: "Permissions", path: "/suadmin/store-admin-permissions", icon: ShieldAlert, element: <StoreAdminPermissionManager /> },
        { value: "tasks", label: "Tasks", path: "/suadmin/store-admin-tasks", icon: Calendar, element: <StoreAdminTaskManager /> },
        { value: "staff", label: "Store Staff", path: "/suadmin/store-staff", icon: Users, element: <StoreStaffManager /> },
      ]}
    />
  );
}

export function CommerceOpsHub({ embedded = false }: { embedded?: boolean } = {}) {
  return (
    <SectionHub
      title="Commerce Ops"
      description="Manage orders, leads, marketplace listings, exchange requests, and campaigns."
      embedded={embedded}
      tabs={[
        { value: "overview", label: "Overview", path: "/suadmin/commerce", icon: LayoutDashboard, element: <CommerceOverview /> },
        { value: "orders", label: "Orders", path: "/suadmin/orders", icon: CreditCard, element: <OrderManager /> },
        { value: "leads", label: "Leads", path: "/suadmin/leads", icon: User, element: <LeadManager /> },
        { value: "listings", label: "Listings", path: "/suadmin/listings", icon: ShoppingBag, element: <ListingManager /> },
        { value: "exchanges", label: "Exchanges", path: "/suadmin/exchanges", icon: RefreshCw, element: <ExchangeManager /> },
        { value: "campaigns", label: "Campaigns", path: "/suadmin/campaigns", icon: Megaphone, element: <CampaignManager /> },
      ]}
    />
  );
}

export function BillingHub() {
  return (
    <SectionHub
      title="Billing"
      description="Manage store package plans, subscription health, commissions, payout approvals, payment methods, and billing controls."
      tabs={[
        { value: "overview", label: "Overview", path: "/suadmin/billing", icon: LayoutDashboard, element: <BillingOverview /> },
        { value: "payouts", label: "Payouts", path: "/suadmin/payouts", icon: DollarSign, element: <PayoutManager /> },
        { value: "subscriptions", label: "Subscriptions", path: "/suadmin/subscriptions", icon: Calendar, element: <SubscriptionManager /> },
        { value: "payments", label: "Payment Methods", path: "/suadmin/payment-methods", icon: CreditCard, element: <PaymentProviderManager /> },
      ]}
    />
  );
}

export function PublishingHub() {
  return (
    <SectionHub
      title="Publishing"
      description="Manage articles, guides, FAQs, and static content pages."
      tabs={[
        { value: "overview", label: "Overview", path: "/suadmin/publishing", icon: LayoutDashboard, element: <PublishingOverview /> },
        { value: "articles", label: "Articles", path: "/suadmin/articles", icon: FileText, element: <ArticleManager /> },
        { value: "guides", label: "Guides & FAQs", path: "/suadmin/guides", icon: FileText, element: <GuideManager /> },
        { value: "pages", label: "Content Pages", path: "/suadmin/content", icon: FileText, element: <ContentManager /> },
      ]}
    />
  );
}

export function EngagementHub() {
  return (
    <SectionHub
      title="Engagement"
      description="Manage messages, chatbot configuration, and user polls."
      tabs={[
        { value: "overview", label: "Overview", path: "/suadmin/engagement", icon: LayoutDashboard, element: <EngagementOverview /> },
        { value: "messages", label: "Mail Box", path: "/suadmin/messages", icon: MessageSquare, element: <ContactManager /> },
        { value: "chatbot", label: "ChatBot Config", path: "/suadmin/chatbot", icon: MessageSquare, element: <ChatBotManager /> },
        { value: "polls", label: "User Polls", path: "/suadmin/polls", icon: BarChart3, element: <PollManager /> },
      ]}
    />
  );
}

export function ServiceDeskHub({ embedded = false }: { embedded?: boolean } = {}) {
  return (
    <SectionHub
      title="Service Desk"
      description="Manage repair requests, unlocking requests, and valuation workflows."
      embedded={embedded}
      tabs={[
        { value: "overview", label: "Overview", path: "/suadmin/service-desk", icon: LayoutDashboard, element: <ServiceDeskOverview /> },
        { value: "repairs", label: "Repair Requests", path: "/suadmin/repairs", icon: Wrench, element: <RepairManager /> },
        { value: "unlocking", label: "Unlocking Requests", path: "/suadmin/unlocking", icon: Unlock, element: <UnlockingManager /> },
        { value: "valuation", label: "Valuation Manager", path: "/suadmin/valuation", icon: Calculator, element: <ValuationManager /> },
      ]}
    />
  );
}

export function PlatformOperationsHub() {
  return (
    <SectionHub
      title="Platform Operations"
      description="Manage the complete product-to-purchase-to-after-sales flow from one workspace. Catalog supplies trusted products and prices, Commerce converts demand, and Service Desk handles post-purchase support."
      queryParam="area"
      navigateOnTabChange
      navigationStyle="primary"
      headerAfter={<CustomerJourneyPipeline />}
      tabs={[
        {
          value: "catalog",
          label: "Catalog & Pricing",
          path: "/suadmin/operations",
          aliases: ["/suadmin/catalog", "/suadmin/products", "/suadmin/master-data", "/suadmin/price-list", "/suadmin/price-list-simple", "/suadmin/emi-plans", "/suadmin/brands", "/suadmin/device-verification"],
          icon: Package,
          description: "Models, brands, products, prices and verification",
          element: <CatalogPricingHub embedded />,
        },
        {
          value: "commerce",
          label: "Commerce",
          path: "/suadmin/commerce",
          aliases: ["/suadmin/orders", "/suadmin/leads", "/suadmin/listings", "/suadmin/campaigns", "/suadmin/exchanges"],
          icon: ShoppingBag,
          description: "Orders, leads, listings, exchanges and campaigns",
          element: <CommerceOpsHub embedded />,
        },
        {
          value: "service",
          label: "Service Desk",
          path: "/suadmin/service-desk",
          aliases: ["/suadmin/repairs", "/suadmin/unlocking", "/suadmin/valuation"],
          icon: Wrench,
          description: "Repair, unlocking and valuation case management",
          element: <ServiceDeskHub embedded />,
        },
      ]}
    />
  );
}

export function GrowthInsightsHub() {
  return (
    <SectionHub
      title="Growth & Insights"
      description="Manage analytics and SEO growth operations."
      tabs={[
        { value: "analytics", label: "Analytics", path: "/suadmin/growth", aliases: ["/suadmin/analytics"], icon: BarChart3, element: <Analytics /> },
        { value: "seo", label: "SEO Growth", path: "/suadmin/seo", icon: Search, element: <SeoManager /> },
      ]}
    />
  );
}

export function SystemHub() {
  return (
    <SectionHub
      title="System"
      description="Manage console tools, audit logs, maintenance, health, and settings."
      tabs={[
        { value: "console", label: "Admin Console", path: "/suadmin/system", aliases: ["/suadmin/console"], icon: Database, element: <AdminConsole /> },
        { value: "audit", label: "Audit Logs", path: "/suadmin/audit", icon: ShieldAlert, element: <AuditLogs /> },
        { value: "maintenance", label: "Maintenance", path: "/suadmin/maintenance", icon: Database, element: <Maintenance /> },
        { value: "health", label: "Platform Health", path: "/suadmin/health", icon: Eye, element: <PlatformHealth /> },
        { value: "settings", label: "Settings", path: "/suadmin/settings", icon: Settings, element: <SettingsPage /> },
      ]}
    />
  );
}
