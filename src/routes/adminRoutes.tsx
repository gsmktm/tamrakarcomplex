import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { RequireAdmin } from "@/routes/RequireAdmin";
import { RouteFallback } from "@/components/routing/RouteFallback";

const AdminLayout = lazy(() => import("@/layouts/StaffAdminLayout"));
const AdminDashboard = lazy(() => import("@/pages/staffadmin/StaffAdminDashboard"));
const ProductManager = lazy(() => import("@/pages/admin/ProductManager"));
const OrderManager = lazy(() => import("@/pages/admin/OrderManager"));
const StoreManager = lazy(() => import("@/pages/admin/StoreManager"));
const UserManager = lazy(() => import("@/pages/admin/UserManager"));
const Settings = lazy(() => import("@/pages/admin/Settings"));
const Analytics = lazy(() => import("@/pages/admin/Analytics"));
const ArticleManager = lazy(() => import("@/pages/admin/ArticleManager"));
const RepairManager = lazy(() => import("@/pages/admin/RepairManager"));
const ListingManager = lazy(() => import("@/pages/admin/ListingManager"));
const ContactManager = lazy(() => import("@/pages/admin/ContactManager"));
const SubscriptionManager = lazy(() => import("@/pages/admin/SubscriptionManager"));
const StoreApplicationManager = lazy(() => import("@/pages/admin/StoreApplicationManager"));
const LeadManager = lazy(() => import("@/pages/admin/LeadManager"));

export const adminRoutes = (
  <Route
    path="/admin"
    element={
      <RequireAdmin>
        <Suspense fallback={<RouteFallback />}>
          <AdminLayout />
        </Suspense>
      </RequireAdmin>
    }
  >
    <Route index element={<Suspense fallback={<RouteFallback />}><AdminDashboard /></Suspense>} />
    <Route path="products" element={<Suspense fallback={<RouteFallback />}><ProductManager /></Suspense>} />
    <Route path="orders" element={<Suspense fallback={<RouteFallback />}><OrderManager /></Suspense>} />
    <Route path="stores" element={<Suspense fallback={<RouteFallback />}><StoreManager /></Suspense>} />
    <Route path="stores/:id" element={<Suspense fallback={<RouteFallback />}><StoreManager /></Suspense>} />
    <Route path="packages" element={<Suspense fallback={<RouteFallback />}><SubscriptionManager /></Suspense>} />
    <Route path="store-requests" element={<Suspense fallback={<RouteFallback />}><StoreApplicationManager /></Suspense>} />
    <Route path="store-leads" element={<Suspense fallback={<RouteFallback />}><LeadManager /></Suspense>} />
    <Route path="users" element={<Suspense fallback={<RouteFallback />}><UserManager /></Suspense>} />
    <Route path="analytics" element={<Suspense fallback={<RouteFallback />}><Analytics /></Suspense>} />
    <Route path="repairs" element={<Suspense fallback={<RouteFallback />}><RepairManager /></Suspense>} />
    <Route path="listings" element={<Suspense fallback={<RouteFallback />}><ListingManager /></Suspense>} />
    <Route path="messages" element={<Suspense fallback={<RouteFallback />}><ContactManager /></Suspense>} />
    <Route path="subscriptions" element={<Suspense fallback={<RouteFallback />}><SubscriptionManager /></Suspense>} />
    <Route path="settings" element={<Suspense fallback={<RouteFallback />}><Settings /></Suspense>} />
    <Route path="articles" element={<Suspense fallback={<RouteFallback />}><ArticleManager /></Suspense>} />
  </Route>
);
