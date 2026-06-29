import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { RouteFallback } from "@/components/routing/RouteFallback";

const w = (C: React.ComponentType) => (
  <Suspense fallback={<RouteFallback />}>
    <C />
  </Suspense>
);

// Dashboard & Profile
const SuperAdminDashboard = lazy(() => import("@/pages/suadmin/SuperAdminDashboard"));
const SuperAdminProfilePage = lazy(() => import("@/pages/suadmin/SuperAdminProfilePage"));

// Staff control
const StaffAdminManager = lazy(() => import("@/pages/suadmin/StaffAdminManager"));
const PermissionMatrix = lazy(() => import("@/pages/suadmin/PermissionMatrix"));
const StaffTaskManager = lazy(() => import("@/pages/suadmin/StaffTaskManager"));
const StaffPerformance = lazy(() => import("@/pages/suadmin/StaffPerformanceManager"));

// Exchange oversight
const ExchangeManager = lazy(() => import("@/pages/storeadmin/ExchangeManager"));

// Store admin control
const StoreAdminManager = lazy(() => import("@/pages/suadmin/StoreAdminManager"));
const StoreAdminPermissionManager = lazy(() => import("@/pages/suadmin/StoreAdminPermissionManager"));
const StoreAdminTaskManager = lazy(() => import("@/pages/suadmin/StoreAdminTaskManager"));
const StoreStaffManager = lazy(() => import("@/pages/suadmin/StoreStaffManager"));

// User control
const UserManager = lazy(() => import("@/pages/admin/UserManager"));
const UserRewardManager = lazy(() => import("@/pages/suadmin/UserRewardManager"));
const UserRiskManager = lazy(() => import("@/pages/suadmin/UserRiskManager"));

// Commerce
const StoreManager = lazy(() => import("@/pages/admin/StoreManager"));
const StoreApplicationManager = lazy(() => import("@/pages/admin/StoreApplicationManager"));
const ProductManager = lazy(() => import("@/pages/admin/ProductManager"));
const MobileMasterManager = lazy(() => import("@/pages/admin/MobileMasterManager"));
const PriceListManager = lazy(() => import("@/pages/admin/PriceListManager"));
const EmiPlanManager = lazy(() => import("@/pages/admin/EmiPlanManager"));
const BrandManager = lazy(() => import("@/pages/admin/BrandManager"));
const DeviceVerificationManager = lazy(() => import("@/pages/admin/DeviceVerificationManager"));
const OrderManager = lazy(() => import("@/pages/admin/OrderManager"));
const LeadManager = lazy(() => import("@/pages/admin/LeadManager"));
const PayoutManager = lazy(() => import("@/pages/admin/PayoutManager"));
const SubscriptionManager = lazy(() => import("@/pages/admin/SubscriptionManager"));

// Content
const ArticleManager = lazy(() => import("@/pages/admin/ArticleManager"));
const GuideManager = lazy(() => import("@/pages/admin/GuideManager"));
const ContentManager = lazy(() => import("@/pages/admin/ContentManager"));
const ListingManager = lazy(() => import("@/pages/admin/ListingManager"));
const RepairManager = lazy(() => import("@/pages/admin/RepairManager"));
const UnlockingManager = lazy(() => import("@/pages/admin/UnlockingManager"));
const CampaignManager = lazy(() => import("@/pages/admin/CampaignManager"));

// Monitoring & Settings
const Analytics = lazy(() => import("@/pages/admin/Analytics"));
const SeoManager = lazy(() => import("@/pages/admin/SeoManager"));
const ValuationManager = lazy(() => import("@/pages/admin/ValuationManager"));
const AuditLogs = lazy(() => import("@/pages/suadmin/AuditLogs"));
const Maintenance = lazy(() => import("@/pages/suadmin/Maintenance"));
const PlatformHealth = lazy(() => import("@/pages/suadmin/PlatformHealth"));
const Settings = lazy(() => import("@/pages/admin/Settings"));
const ContactManager = lazy(() => import("@/pages/admin/ContactManager"));
const ChatBotManager = lazy(() => import("@/pages/admin/ChatBotManager"));
const PollManager = lazy(() => import("@/pages/admin/PollManager"));
const AdminConsole = lazy(() => import("@/pages/admin/AdminConsole"));

export const superAdminRoutes = [
  { path: "/suadmin", element: w(SuperAdminDashboard) },
  { path: "/suadmin/me", element: w(SuperAdminProfilePage) },

  // Staff control
  { path: "/suadmin/staff-admins", element: w(StaffAdminManager) },
  { path: "/suadmin/staff-permissions", element: w(PermissionMatrix) },
  { path: "/suadmin/staff-tasks", element: w(StaffTaskManager) },
  { path: "/suadmin/staff-performance", element: w(StaffPerformance) },
  { path: "/suadmin/store-admins", element: w(StoreAdminManager) },
  { path: "/suadmin/store-admin-permissions", element: w(StoreAdminPermissionManager) },
  { path: "/suadmin/store-admin-tasks", element: w(StoreAdminTaskManager) },
  { path: "/suadmin/store-staff", element: w(StoreStaffManager) },

  // User control
  { path: "/suadmin/users", element: w(UserManager) },
  { path: "/suadmin/user-rewards", element: w(UserRewardManager) },
  { path: "/suadmin/user-risk", element: w(UserRiskManager) },

  // Commerce
  { path: "/suadmin/stores", element: w(StoreManager) },
  { path: "/suadmin/store-applications", element: w(StoreApplicationManager) },
  { path: "/suadmin/products", element: w(ProductManager) },
  { path: "/suadmin/master-data", element: w(MobileMasterManager) },
  { path: "/suadmin/price-list", element: w(PriceListManager) },
  { path: "/suadmin/price-list-simple", element: w(PriceListManager) },
  { path: "/suadmin/emi-plans", element: w(EmiPlanManager) },
  { path: "/suadmin/brands", element: w(BrandManager) },
  { path: "/suadmin/device-verification", element: w(DeviceVerificationManager) },
  { path: "/suadmin/orders", element: w(OrderManager) },
  { path: "/suadmin/leads", element: w(LeadManager) },
  { path: "/suadmin/payouts", element: w(PayoutManager) },
  { path: "/suadmin/subscriptions", element: w(SubscriptionManager) },
  { path: "/suadmin/campaigns", element: w(CampaignManager) },
  { path: "/suadmin/exchanges", element: w(ExchangeManager) },

  // Content
  { path: "/suadmin/articles", element: w(ArticleManager) },
  { path: "/suadmin/guides", element: w(GuideManager) },
  { path: "/suadmin/content", element: w(ContentManager) },
  { path: "/suadmin/listings", element: w(ListingManager) },
  { path: "/suadmin/repairs", element: w(RepairManager) },
  { path: "/suadmin/unlocking", element: w(UnlockingManager) },

  // Monitoring
  { path: "/suadmin/analytics", element: w(Analytics) },
  { path: "/suadmin/seo", element: w(SeoManager) },
  { path: "/suadmin/valuation", element: w(ValuationManager) },
  { path: "/suadmin/audit", element: w(AuditLogs) },
  { path: "/suadmin/maintenance", element: w(Maintenance) },
  { path: "/suadmin/health", element: w(PlatformHealth) },
  { path: "/suadmin/settings", element: w(Settings) },
  { path: "/suadmin/messages", element: w(ContactManager) },
  { path: "/suadmin/chatbot", element: w(ChatBotManager) },
  { path: "/suadmin/polls", element: w(PollManager) },
  { path: "/suadmin/console", element: w(AdminConsole) },
];
