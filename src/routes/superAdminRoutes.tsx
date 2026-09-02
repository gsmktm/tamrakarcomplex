import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { RouteFallback } from "@/components/routing/RouteFallback";

const w = (C: React.ComponentType) => (
  <Suspense fallback={<RouteFallback />}>
    <C />
  </Suspense>
);

// Dashboard & Profile
const CommandCenterHub = lazy(() => import("@/pages/suadmin/SuperAdminSectionHubs").then((m) => ({ default: m.CommandCenterHub })));

// Staff control
const TeamAccessManager = lazy(() => import("@/pages/suadmin/TeamAccessManager"));
const CustomersHub = lazy(() => import("@/pages/suadmin/SuperAdminSectionHubs").then((m) => ({ default: m.CustomersHub })));
const PlatformOperationsHub = lazy(() => import("@/pages/suadmin/SuperAdminSectionHubs").then((m) => ({ default: m.PlatformOperationsHub })));
const StoreNetworkHub = lazy(() => import("@/pages/suadmin/SuperAdminSectionHubs").then((m) => ({ default: m.StoreNetworkHub })));
const BillingHub = lazy(() => import("@/pages/suadmin/SuperAdminSectionHubs").then((m) => ({ default: m.BillingHub })));
const PublishingHub = lazy(() => import("@/pages/suadmin/SuperAdminSectionHubs").then((m) => ({ default: m.PublishingHub })));
const EngagementHub = lazy(() => import("@/pages/suadmin/SuperAdminSectionHubs").then((m) => ({ default: m.EngagementHub })));
const GrowthInsightsHub = lazy(() => import("@/pages/suadmin/SuperAdminSectionHubs").then((m) => ({ default: m.GrowthInsightsHub })));
const SystemHub = lazy(() => import("@/pages/suadmin/SuperAdminSectionHubs").then((m) => ({ default: m.SystemHub })));

// User control
const UserDeepProfile = lazy(() => import("@/pages/suadmin/UserDeepProfile"));

export const superAdminRoutes = [
  { path: "/suadmin", element: w(CommandCenterHub) },
  { path: "/suadmin/me", element: w(CommandCenterHub) },

  // Staff control
  { path: "/suadmin/team-access", element: w(TeamAccessManager) },
  { path: "/suadmin/staff-admins", element: w(TeamAccessManager) },
  { path: "/suadmin/staff-permissions", element: w(TeamAccessManager) },
  { path: "/suadmin/staff-tasks", element: w(TeamAccessManager) },
  { path: "/suadmin/staff-performance", element: w(TeamAccessManager) },

  // User control
  { path: "/suadmin/customers", element: w(CustomersHub) },
  { path: "/suadmin/users", element: w(CustomersHub) },
  { path: "/suadmin/users/:id", element: w(UserDeepProfile) },
  { path: "/suadmin/user-rewards", element: w(CustomersHub) },
  { path: "/suadmin/user-risk", element: w(CustomersHub) },

  // Commerce
  { path: "/suadmin/operations", element: w(PlatformOperationsHub) },
  { path: "/suadmin/catalog", element: w(PlatformOperationsHub) },
  { path: "/suadmin/products", element: w(PlatformOperationsHub) },
  { path: "/suadmin/master-data", element: w(PlatformOperationsHub) },
  { path: "/suadmin/price-list", element: w(PlatformOperationsHub) },
  { path: "/suadmin/price-list-simple", element: w(PlatformOperationsHub) },
  { path: "/suadmin/emi-plans", element: w(PlatformOperationsHub) },
  { path: "/suadmin/brands", element: w(PlatformOperationsHub) },
  { path: "/suadmin/device-verification", element: w(PlatformOperationsHub) },

  { path: "/suadmin/store-network", element: w(StoreNetworkHub) },
  { path: "/suadmin/stores", element: w(StoreNetworkHub) },
  { path: "/suadmin/store-applications", element: w(StoreNetworkHub) },
  { path: "/suadmin/store-admins", element: w(StoreNetworkHub) },
  { path: "/suadmin/store-admin-permissions", element: w(StoreNetworkHub) },
  { path: "/suadmin/store-admin-tasks", element: w(StoreNetworkHub) },
  { path: "/suadmin/store-staff", element: w(StoreNetworkHub) },

  { path: "/suadmin/commerce", element: w(PlatformOperationsHub) },
  { path: "/suadmin/orders", element: w(PlatformOperationsHub) },
  { path: "/suadmin/leads", element: w(PlatformOperationsHub) },
  { path: "/suadmin/listings", element: w(PlatformOperationsHub) },
  { path: "/suadmin/campaigns", element: w(PlatformOperationsHub) },
  { path: "/suadmin/exchanges", element: w(PlatformOperationsHub) },

  { path: "/suadmin/billing", element: w(BillingHub) },
  { path: "/suadmin/payouts", element: w(BillingHub) },
  { path: "/suadmin/subscriptions", element: w(BillingHub) },
  { path: "/suadmin/payment-methods", element: w(BillingHub) },

  // Content
  { path: "/suadmin/publishing", element: w(PublishingHub) },
  { path: "/suadmin/articles", element: w(PublishingHub) },
  { path: "/suadmin/guides", element: w(PublishingHub) },
  { path: "/suadmin/content", element: w(PublishingHub) },

  { path: "/suadmin/engagement", element: w(EngagementHub) },
  { path: "/suadmin/messages", element: w(EngagementHub) },
  { path: "/suadmin/chatbot", element: w(EngagementHub) },
  { path: "/suadmin/polls", element: w(EngagementHub) },

  { path: "/suadmin/service-desk", element: w(PlatformOperationsHub) },
  { path: "/suadmin/repairs", element: w(PlatformOperationsHub) },
  { path: "/suadmin/unlocking", element: w(PlatformOperationsHub) },
  { path: "/suadmin/valuation", element: w(PlatformOperationsHub) },

  // Monitoring
  { path: "/suadmin/growth", element: w(GrowthInsightsHub) },
  { path: "/suadmin/analytics", element: w(GrowthInsightsHub) },
  { path: "/suadmin/seo", element: w(GrowthInsightsHub) },

  { path: "/suadmin/system", element: w(SystemHub) },
  { path: "/suadmin/audit", element: w(SystemHub) },
  { path: "/suadmin/maintenance", element: w(SystemHub) },
  { path: "/suadmin/health", element: w(SystemHub) },
  { path: "/suadmin/settings", element: w(SystemHub) },
  { path: "/suadmin/console", element: w(SystemHub) },
];
