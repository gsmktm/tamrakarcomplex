import SuperAdminDashboard from "@/pages/suadmin/SuperAdminDashboard";
import StaffAdminManager from "@/pages/suadmin/StaffAdminManager";
import PermissionMatrix from "@/pages/suadmin/PermissionMatrix";
import UserManager from "@/pages/admin/UserManager";
import StoreAdminManager from "@/pages/suadmin/StoreAdminManager";
import StoreAdminPermissionManager from "@/pages/suadmin/StoreAdminPermissionManager";
import StoreStaffManager from "@/pages/suadmin/StoreStaffManager";
import StoreManager from "@/pages/admin/StoreManager";
import StoreApplicationManager from "@/pages/admin/StoreApplicationManager";
import ProductManager from "@/pages/admin/ProductManager";
import MobileMasterManager from "@/pages/admin/MobileMasterManager";
import PriceListManager from "@/pages/admin/PriceListManager";
import BrandManager from "@/pages/admin/BrandManager";
import DeviceVerificationManager from "@/pages/admin/DeviceVerificationManager";
import OrderManager from "@/pages/admin/OrderManager";
import LeadManager from "@/pages/admin/LeadManager";
import PayoutManager from "@/pages/admin/PayoutManager";
import SubscriptionManager from "@/pages/admin/SubscriptionManager";
import SuperAdminProfilePage from "@/pages/admin/SuperAdminProfilePage";
import StaffTaskManager from "@/pages/suadmin/StaffTaskManager";
import StaffPerformance from "@/pages/suadmin/StaffPerformanceManager";
import StoreAdminTaskManager from "@/pages/suadmin/StoreAdminTaskManager";
import ArticleManager from "@/pages/admin/ArticleManager";
import GuideManager from "@/pages/admin/GuideManager";
import ContentManager from "@/pages/admin/ContentManager";
import ListingManager from "@/pages/admin/ListingManager";
import RepairManager from "@/pages/admin/RepairManager";
import UnlockingManager from "@/pages/admin/UnlockingManager";
import Analytics from "@/pages/admin/Analytics";
import SeoManager from "@/pages/admin/SeoManager";
import ValuationManager from "@/pages/admin/ValuationManager";
import AuditLogs from "@/pages/suadmin/AuditLogs";
import Maintenance from "@/pages/suadmin/Maintenance";
import PlatformHealth from "@/pages/suadmin/PlatformHealth";
import UserRewardManager from "@/pages/suadmin/UserRewardManager";
import UserRiskManager from "@/pages/suadmin/UserRiskManager";
import Settings from "@/pages/admin/Settings";
import ContactManager from "@/pages/admin/ContactManager";
import ChatBotManager from "@/pages/admin/ChatBotManager";
import PollManager from "@/pages/admin/PollManager";
import AdminConsole from "@/pages/admin/AdminConsole";
import AdminModulePlaceholder from "@/pages/admin/AdminModulePlaceholder";

export const superAdminRoutes = [
  { path: "/suadmin", element: <SuperAdminDashboard /> },
  { path: "/suadmin/me", element: <SuperAdminProfilePage /> },
  
  // Admin Control
  { path: "/suadmin/staff-admins", element: <StaffAdminManager /> },
  { path: "/suadmin/staff-permissions", element: <PermissionMatrix /> },
  { path: "/suadmin/staff-tasks", element: <StaffTaskManager /> },
  { path: "/suadmin/staff-performance", element: <StaffPerformance /> },
  { path: "/suadmin/store-admins", element: <StoreAdminManager /> },
  { path: "/suadmin/store-admin-permissions", element: <StoreAdminPermissionManager /> },
  { path: "/suadmin/store-admin-tasks", element: <StoreAdminTaskManager /> },
  { path: "/suadmin/store-staff", element: <StoreStaffManager /> },
  
  // User Control
  { path: "/suadmin/users", element: <UserManager /> },
  { path: "/suadmin/user-rewards", element: <UserRewardManager /> },
  { path: "/suadmin/user-risk", element: <UserRiskManager /> },
  
  // Commerce Control
  { path: "/suadmin/stores", element: <StoreManager /> },
  { path: "/suadmin/store-applications", element: <StoreApplicationManager /> },
  { path: "/suadmin/products", element: <ProductManager /> },
  { path: "/suadmin/master-data", element: <MobileMasterManager /> },
  { path: "/suadmin/price-list", element: <PriceListManager /> },
  { path: "/suadmin/price-list-simple", element: <PriceListManager /> },
  { path: "/suadmin/brands", element: <BrandManager /> },
  { path: "/suadmin/device-verification", element: <DeviceVerificationManager /> },
  { path: "/suadmin/orders", element: <OrderManager /> },
  { path: "/suadmin/leads", element: <LeadManager /> },
  { path: "/suadmin/payouts", element: <PayoutManager /> },
  { path: "/suadmin/subscriptions", element: <SubscriptionManager /> },
  { path: "/suadmin/articles", element: <ArticleManager /> },
  { path: "/suadmin/guides", element: <GuideManager /> },
  { path: "/suadmin/content", element: <ContentManager /> },
  { path: "/suadmin/listings", element: <ListingManager /> },
  { path: "/suadmin/repairs", element: <RepairManager /> },
  { path: "/suadmin/unlocking", element: <UnlockingManager /> },
  
  // Monitoring
  { path: "/suadmin/analytics", element: <Analytics /> },
  { path: "/suadmin/seo", element: <SeoManager /> },
  { path: "/suadmin/valuation", element: <ValuationManager /> },
  { path: "/suadmin/audit", element: <AuditLogs /> },
  { path: "/suadmin/maintenance", element: <Maintenance /> },
  { path: "/suadmin/health", element: <PlatformHealth /> },
  { path: "/suadmin/settings", element: <Settings /> },
  { path: "/suadmin/messages", element: <ContactManager /> },
  { path: "/suadmin/chatbot", element: <ChatBotManager /> },
  { path: "/suadmin/polls", element: <PollManager /> },
  { path: "/suadmin/console", element: <AdminConsole /> },
];
