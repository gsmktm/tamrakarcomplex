import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { RequireStoreAdmin } from "@/routes/RequireStoreAdmin";
import { RequireStoreModule } from "@/routes/RequireStoreModule";
import { RouteFallback } from "@/components/routing/RouteFallback";

// Layout & Dashboard
const StoreAdminLayout = lazy(() => import("@/layouts/StoreAdminLayout"));
const StoreAdminDashboard = lazy(() => import("@/pages/storeadmin/StoreAdminDashboard"));
const StoreAdminConsole = lazy(() => import("@/pages/console/StoreAdminConsole"));

// Store Management
const StoreProfilePage = lazy(() => import("@/pages/storeadmin/StoreProfilePage"));
const StoreSettings = lazy(() => import("@/pages/storeadmin/StoreSettings"));
const StoreThemeBuilder = lazy(() => import("@/pages/storeadmin/StoreThemeBuilder"));
const StoreManage = lazy(() => import("@/pages/StoreManage"));
const StoreAnalytics = lazy(() => import("@/pages/storeadmin/StoreAnalytics"));
const StoreMediaManager = lazy(() => import("@/pages/storeadmin/StoreMediaManager"));
const ReviewManager = lazy(() => import("@/pages/storeadmin/ReviewManager"));

// Team & Security
const StoreTeamManager = lazy(() => import("@/pages/storeadmin/StoreTeamManager"));
const StoreSecurity = lazy(() => import("@/pages/storeadmin/StoreSecurity"));
const NotificationSettings = lazy(() => import("@/pages/storeadmin/NotificationSettings"));

// Commerce & Operations
const ProductManager = lazy(() => import("@/pages/admin/ProductManager"));
const OrderManager = lazy(() => import("@/pages/admin/OrderManager"));
const ListingManager = lazy(() => import("@/pages/admin/ListingManager"));
const RepairManager = lazy(() => import("@/pages/admin/RepairManager"));
const UnlockingManager = lazy(() => import("@/pages/admin/UnlockingManager"));
const LeadManager = lazy(() => import("@/pages/admin/LeadManager"));
const StoreLeadManager = lazy(() => import("@/pages/storeadmin/StoreLeadManager"));
const ContactManager = lazy(() => import("@/pages/admin/ContactManager"));
const AccessoryManager = lazy(() => import("@/pages/admin/AccessoryManager"));
const RepairServiceManager = lazy(() => import("@/pages/storeadmin/RepairServiceManager"));
const ExchangeManager = lazy(() => import("@/pages/storeadmin/ExchangeManager"));

// Financials & Subscription
const PayoutManager = lazy(() => import("@/pages/admin/PayoutManager"));
const PayoutSettings = lazy(() => import("@/pages/storeadmin/PayoutSettings"));
const StoreSubscription = lazy(() => import("@/pages/admin/StoreSubscription"));

// Account
const StoreAdminAccountPage = lazy(() => import("@/pages/storeadmin/StoreAdminAccountPage"));

export const storeAdminRoutes = (
  <Route
    path="/storeadmin"
    element={
      <RequireStoreAdmin>
        <Suspense fallback={<RouteFallback />}>
          <StoreAdminLayout />
        </Suspense>
      </RequireStoreAdmin>
    }
  >
    {/* Overview */}
    <Route index element={<Suspense fallback={<RouteFallback />}><StoreAdminDashboard /></Suspense>} />
    <Route path="analytics" element={<Suspense fallback={<RouteFallback />}><StoreAnalytics /></Suspense>} />
    <Route path="console" element={<Suspense fallback={<RouteFallback />}><StoreAdminConsole /></Suspense>} />
    <Route path="console/*" element={<Suspense fallback={<RouteFallback />}><StoreAdminConsole /></Suspense>} />

    {/* Store Operations */}
    <Route path="profile" element={<Suspense fallback={<RouteFallback />}><RequireStoreModule moduleKey="settings"><StoreProfilePage /></RequireStoreModule></Suspense>} />
    <Route path="media" element={<Suspense fallback={<RouteFallback />}><RequireStoreModule moduleKey="branding"><StoreMediaManager /></RequireStoreModule></Suspense>} />
    <Route path="settings" element={<Suspense fallback={<RouteFallback />}><RequireStoreModule moduleKey="settings"><StoreSettings /></RequireStoreModule></Suspense>} />
    <Route path="theme" element={<Suspense fallback={<RouteFallback />}><RequireStoreModule moduleKey="branding"><StoreThemeBuilder /></RequireStoreModule></Suspense>} />
    <Route path="products" element={<Suspense fallback={<RouteFallback />}><RequireStoreModule moduleKey="products"><ProductManager /></RequireStoreModule></Suspense>} />
    <Route path="accessories" element={<Suspense fallback={<RouteFallback />}><RequireStoreModule moduleKey="products"><AccessoryManager /></RequireStoreModule></Suspense>} />
    <Route path="listings" element={<Suspense fallback={<RouteFallback />}><RequireStoreModule moduleKey="products"><ListingManager /></RequireStoreModule></Suspense>} />
    <Route path="orders" element={<Suspense fallback={<RouteFallback />}><RequireStoreModule moduleKey="orders"><OrderManager /></RequireStoreModule></Suspense>} />
    <Route path="leads" element={<Suspense fallback={<RouteFallback />}><RequireStoreModule moduleKey="leads"><LeadManager /></RequireStoreModule></Suspense>} />
    <Route path="store-leads" element={<Suspense fallback={<RouteFallback />}><RequireStoreModule moduleKey="leads"><StoreLeadManager /></RequireStoreModule></Suspense>} />
    <Route path="exchange" element={<Suspense fallback={<RouteFallback />}><RequireStoreModule moduleKey="orders"><ExchangeManager /></RequireStoreModule></Suspense>} />
    <Route path="reviews" element={<Suspense fallback={<RouteFallback />}><RequireStoreModule moduleKey="orders"><ReviewManager /></RequireStoreModule></Suspense>} />
    <Route path="repairs" element={<Suspense fallback={<RouteFallback />}><RequireStoreModule moduleKey="orders"><RepairManager /></RequireStoreModule></Suspense>} />
    <Route path="repair-services" element={<Suspense fallback={<RouteFallback />}><RequireStoreModule moduleKey="orders"><RepairServiceManager /></RequireStoreModule></Suspense>} />
    <Route path="unlocking" element={<Suspense fallback={<RouteFallback />}><RequireStoreModule moduleKey="orders"><UnlockingManager /></RequireStoreModule></Suspense>} />
    <Route path="messages" element={<Suspense fallback={<RouteFallback />}><RequireStoreModule moduleKey="leads"><ContactManager /></RequireStoreModule></Suspense>} />

    {/* Financials & Subscription */}
    <Route path="payouts" element={<Suspense fallback={<RouteFallback />}><RequireStoreModule moduleKey="payouts"><PayoutManager /></RequireStoreModule></Suspense>} />
    <Route path="payout-settings" element={<Suspense fallback={<RouteFallback />}><RequireStoreModule moduleKey="payouts"><PayoutSettings /></RequireStoreModule></Suspense>} />
    <Route path="my-subscription" element={<Suspense fallback={<RouteFallback />}><StoreSubscription /></Suspense>} />
    <Route path="subscription" element={<Suspense fallback={<RouteFallback />}><StoreSubscription /></Suspense>} />

    {/* Team & Account */}
    <Route path="staff" element={<Suspense fallback={<RouteFallback />}><RequireStoreModule moduleKey="staff"><StoreTeamManager /></RequireStoreModule></Suspense>} />
    <Route path="team" element={<Suspense fallback={<RouteFallback />}><RequireStoreModule moduleKey="staff"><StoreTeamManager /></RequireStoreModule></Suspense>} />
    <Route path="notifications" element={<Suspense fallback={<RouteFallback />}><NotificationSettings /></Suspense>} />
    <Route path="security" element={<Suspense fallback={<RouteFallback />}><StoreSecurity /></Suspense>} />
    <Route path="me" element={<Suspense fallback={<RouteFallback />}><StoreAdminAccountPage /></Suspense>} />
    <Route path="me/*" element={<Suspense fallback={<RouteFallback />}><StoreAdminAccountPage /></Suspense>} />

    {/* Misc */}
    <Route path="manage/:id" element={<Suspense fallback={<RouteFallback />}><StoreManage /></Suspense>} />
  </Route>
);
