import { lazy, Suspense } from "react";
import { Navigate, Route } from "react-router-dom";
import { RequireSuperAdmin } from "@/routes/RequireSuperAdmin";
import { RouteFallback } from "@/components/routing/RouteFallback";

// Layout & Dashboard
const SuperAdminLayout = lazy(() => import("@/layouts/SuperAdminLayout"));
const SuperAdminDashboard = lazy(() => import("@/pages/suadmin/SuperAdminDashboard"));

// User Management
const UserManager = lazy(() => import("@/pages/admin/UserManager"));
const UserDeepProfile = lazy(() => import("@/pages/suadmin/UserDeepProfile"));
const UserRewardManager = lazy(() => import("@/pages/suadmin/UserRewardManager"));
const UserRiskManager = lazy(() => import("@/pages/suadmin/UserRiskManager"));

// Staff Management
const StaffAdminManager = lazy(() => import("@/pages/suadmin/StaffAdminManager"));
const StaffTaskManager = lazy(() => import("@/pages/suadmin/StaffTaskManager"));
const StaffPerformanceManager = lazy(() => import("@/pages/suadmin/StaffPerformanceManager"));
const PermissionMatrix = lazy(() => import("@/pages/suadmin/PermissionMatrix"));

// Store Management
const StoreManager = lazy(() => import("@/pages/admin/StoreManager"));
const StoreAdminManager = lazy(() => import("@/pages/suadmin/StoreAdminManager"));
const StoreAdminPermissionManager = lazy(() => import("@/pages/suadmin/StoreAdminPermissionManager"));
const StoreAdminTaskManager = lazy(() => import("@/pages/suadmin/StoreAdminTaskManager"));
const StoreStaffManager = lazy(() => import("@/pages/suadmin/StoreStaffManager"));
const StoreApplicationManager = lazy(() => import("@/pages/admin/StoreApplicationManager"));
const StoreThemeBuilder = lazy(() => import("@/pages/storeadmin/StoreThemeBuilder"));

// Commerce & Products
const ProductManager = lazy(() => import("@/pages/admin/ProductManager"));
const CategoryManager = lazy(() => import("@/pages/admin/CategoryManager"));
const OrderManager = lazy(() => import("@/pages/admin/OrderManager"));
const ListingManager = lazy(() => import("@/pages/admin/ListingManager"));
const PriceListManager = lazy(() => import("@/pages/admin/PriceListManager"));
const PriceList = lazy(() => import("@/pages/suadmin/PriceList"));
const BrandManager = lazy(() => import("@/pages/admin/BrandManager"));
const DeviceVerificationManager = lazy(() => import("@/pages/admin/DeviceVerificationManager"));
const SubscriptionManager = lazy(() => import("@/pages/admin/SubscriptionManager"));

// Service & Support
const RepairManager = lazy(() => import("@/pages/admin/RepairManager"));
const UnlockingManager = lazy(() => import("@/pages/admin/UnlockingManager"));
const LeadManager = lazy(() => import("@/pages/admin/LeadManager"));
const PayoutManager = lazy(() => import("@/pages/admin/PayoutManager"));
const ValuationManager = lazy(() => import("@/pages/admin/ValuationManager"));
const ContactManager = lazy(() => import("@/pages/admin/ContactManager"));

// Content & Platform
const ArticleManager = lazy(() => import("@/pages/admin/ArticleManager"));
const GuideManager = lazy(() => import("@/pages/admin/GuideManager"));
const ContentManager = lazy(() => import("@/pages/admin/ContentManager"));
const ChatBotManager = lazy(() => import("@/pages/admin/ChatBotManager"));
const CampaignManager = lazy(() => import("@/pages/admin/CampaignManager"));
const PollManager = lazy(() => import("@/pages/admin/PollManager"));
const SeoManager = lazy(() => import("@/pages/admin/SeoManager"));
const ThemeManager = lazy(() => import("@/pages/admin/ThemeManager"));

// System & Monitoring
const Analytics = lazy(() => import("@/pages/admin/Analytics"));
const AuditLogs = lazy(() => import("@/pages/suadmin/AuditLogs"));
const Maintenance = lazy(() => import("@/pages/suadmin/Maintenance"));
const PlatformHealth = lazy(() => import("@/pages/suadmin/PlatformHealth"));
const Settings = lazy(() => import("@/pages/admin/Settings"));
const SystemSettings = lazy(() => import("@/pages/suadmin/SystemSettings"));
const SuperAdminConsole = lazy(() => import("@/pages/console/SuperAdminConsole"));

// Profile
const SuperAdminProfilePage = lazy(() => import("@/pages/suadmin/SuperAdminProfilePage"));
const MyProfile = lazy(() => import("@/pages/suadmin/MyProfile"));

export const superAdminRoutes = (
  <Route
    path="/suadmin"
    element={
      <RequireSuperAdmin>
        <Suspense fallback={<RouteFallback />}>
          <SuperAdminLayout />
        </Suspense>
      </RequireSuperAdmin>
    }
  >
    {/* Overview */}
    <Route index element={<Suspense fallback={<RouteFallback />}><SuperAdminDashboard /></Suspense>} />
    <Route path="me" element={<Suspense fallback={<RouteFallback />}><SuperAdminProfilePage /></Suspense>} />
    <Route path="me/*" element={<Suspense fallback={<RouteFallback />}><SuperAdminProfilePage /></Suspense>} />
    <Route path="profile" element={<Suspense fallback={<RouteFallback />}><MyProfile /></Suspense>} />

    {/* User Control */}
    <Route path="users" element={<Suspense fallback={<RouteFallback />}><UserManager /></Suspense>} />
    <Route path="users/:id" element={<Suspense fallback={<RouteFallback />}><UserDeepProfile /></Suspense>} />
    <Route path="user-rewards" element={<Suspense fallback={<RouteFallback />}><UserRewardManager /></Suspense>} />
    <Route path="user-risk" element={<Suspense fallback={<RouteFallback />}><UserRiskManager /></Suspense>} />

    {/* Admin Control */}
    <Route path="staff-admins" element={<Suspense fallback={<RouteFallback />}><StaffAdminManager /></Suspense>} />
    <Route path="staff-permissions" element={<Suspense fallback={<RouteFallback />}><PermissionMatrix /></Suspense>} />
    <Route path="staff-tasks" element={<Suspense fallback={<RouteFallback />}><StaffTaskManager /></Suspense>} />
    <Route path="staff-performance" element={<Suspense fallback={<RouteFallback />}><StaffPerformanceManager /></Suspense>} />
    
    {/* Store Control */}
    <Route path="store-admins" element={<Suspense fallback={<RouteFallback />}><StoreAdminManager /></Suspense>} />
    <Route path="store-admin-permissions" element={<Suspense fallback={<RouteFallback />}><StoreAdminPermissionManager /></Suspense>} />
    <Route path="store-admin-tasks" element={<Suspense fallback={<RouteFallback />}><StoreAdminTaskManager /></Suspense>} />
    <Route path="store-staff" element={<Suspense fallback={<RouteFallback />}><StoreStaffManager /></Suspense>} />
    <Route path="store-applications" element={<Suspense fallback={<RouteFallback />}><StoreApplicationManager /></Suspense>} />
    <Route path="stores" element={<Suspense fallback={<RouteFallback />}><StoreManager /></Suspense>} />
    <Route path="stores/:id/theme" element={<Suspense fallback={<RouteFallback />}><StoreThemeBuilder /></Suspense>} />

    {/* Commerce Control */}
    <Route path="products" element={<Suspense fallback={<RouteFallback />}><ProductManager /></Suspense>} />
    <Route path="categories" element={<Suspense fallback={<RouteFallback />}><CategoryManager /></Suspense>} />
    <Route path="price-list" element={<Suspense fallback={<RouteFallback />}><PriceListManager /></Suspense>} />
    <Route path="price-list-simple" element={<Suspense fallback={<RouteFallback />}><PriceList /></Suspense>} />
    <Route path="brands" element={<Suspense fallback={<RouteFallback />}><BrandManager /></Suspense>} />
    <Route path="device-verification" element={<Suspense fallback={<RouteFallback />}><DeviceVerificationManager /></Suspense>} />
    <Route path="orders" element={<Suspense fallback={<RouteFallback />}><OrderManager /></Suspense>} />
    <Route path="leads" element={<Suspense fallback={<RouteFallback />}><LeadManager /></Suspense>} />
    <Route path="payouts" element={<Suspense fallback={<RouteFallback />}><PayoutManager /></Suspense>} />
    <Route path="subscriptions" element={<Suspense fallback={<RouteFallback />}><SubscriptionManager /></Suspense>} />
    <Route path="listings" element={<Suspense fallback={<RouteFallback />}><ListingManager /></Suspense>} />
    <Route path="articles" element={<Suspense fallback={<RouteFallback />}><ArticleManager /></Suspense>} />
    <Route path="guides" element={<Suspense fallback={<RouteFallback />}><GuideManager /></Suspense>} />
    <Route path="content" element={<Suspense fallback={<RouteFallback />}><ContentManager /></Suspense>} />
    <Route path="repairs" element={<Suspense fallback={<RouteFallback />}><RepairManager /></Suspense>} />
    <Route path="unlocking" element={<Suspense fallback={<RouteFallback />}><UnlockingManager /></Suspense>} />

    {/* Monitoring & Settings */}
    <Route path="analytics" element={<Suspense fallback={<RouteFallback />}><Analytics /></Suspense>} />
    <Route path="seo" element={<Suspense fallback={<RouteFallback />}><SeoManager /></Suspense>} />
    <Route path="valuation" element={<Suspense fallback={<RouteFallback />}><ValuationManager /></Suspense>} />
    <Route path="audit" element={<Suspense fallback={<RouteFallback />}><AuditLogs /></Suspense>} />
    <Route path="maintenance" element={<Suspense fallback={<RouteFallback />}><Maintenance /></Suspense>} />
    <Route path="health" element={<Suspense fallback={<RouteFallback />}><PlatformHealth /></Suspense>} />
    <Route path="settings" element={<Suspense fallback={<RouteFallback />}><Settings /></Suspense>} />
    <Route path="system-settings" element={<Suspense fallback={<RouteFallback />}><SystemSettings /></Suspense>} />
    <Route path="messages" element={<Suspense fallback={<RouteFallback />}><ContactManager /></Suspense>} />
    <Route path="chatbot" element={<Suspense fallback={<RouteFallback />}><ChatBotManager /></Suspense>} />
    <Route path="campaigns" element={<Suspense fallback={<RouteFallback />}><CampaignManager /></Suspense>} />
    <Route path="polls" element={<Suspense fallback={<RouteFallback />}><PollManager /></Suspense>} />
    <Route path="themes" element={<Suspense fallback={<RouteFallback />}><ThemeManager /></Suspense>} />
    <Route path="console" element={<Suspense fallback={<RouteFallback />}><SuperAdminConsole /></Suspense>} />
    <Route path="console/*" element={<Suspense fallback={<RouteFallback />}><SuperAdminConsole /></Suspense>} />

    {/* Redirects for backward compatibility / menu consistency */}
    <Route path="admin-control" element={<Navigate to="/suadmin/staff-admins" replace />} />
    <Route path="store-permissions" element={<Navigate to="/suadmin/store-admin-permissions" replace />} />
    <Route path="store-tasks" element={<Navigate to="/suadmin/store-admin-tasks" replace />} />
    <Route path="guides-faqs" element={<Navigate to="/suadmin/guides" replace />} />
    <Route path="content-pages" element={<Navigate to="/suadmin/content" replace />} />
    <Route path="community-listings" element={<Navigate to="/suadmin/listings" replace />} />
    <Route path="repair-requests" element={<Navigate to="/suadmin/repairs" replace />} />
    <Route path="unlocking-requests" element={<Navigate to="/suadmin/unlocking" replace />} />
    <Route path="seo-growth" element={<Navigate to="/suadmin/seo" replace />} />
    <Route path="valuation-manager" element={<Navigate to="/suadmin/valuation" replace />} />
    <Route path="audit-logs" element={<Navigate to="/suadmin/audit" replace />} />
    <Route path="platform-health" element={<Navigate to="/suadmin/health" replace />} />
    <Route path="mailbox" element={<Navigate to="/suadmin/messages" replace />} />
    <Route path="chatbot-config" element={<Navigate to="/suadmin/chatbot" replace />} />
    <Route path="user-polls" element={<Navigate to="/suadmin/polls" replace />} />
    <Route path="admin-console" element={<Navigate to="/suadmin/console" replace />} />
  </Route>
);
