import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { RouteFallback } from "@/components/routing/RouteFallback";
import StoreAdminLayout from "@/layouts/StoreAdminLayout";
import { RequireStaffAdmin } from "@/routes/RequireStaffAdmin";

const StaffDashboard = lazy(() => import("@/pages/staffadmin/StaffDashboard"));
const ProductManager = lazy(() => import("@/pages/admin/ProductManager"));
const AccessoryManager = lazy(() => import("@/pages/admin/AccessoryManager"));
const RepairServiceManager = lazy(() => import("@/pages/storeadmin/RepairServiceManager"));
const RepairManager = lazy(() => import("@/pages/admin/RepairManager"));
const ExchangeManager = lazy(() => import("@/pages/storeadmin/ExchangeManager"));
const StoreLeadManager = lazy(() => import("@/pages/storeadmin/StoreLeadManager"));

export const staffRoutes = (
  <Route
    path="/staff"
    element={
      <RequireStaffAdmin>
        <Suspense fallback={<RouteFallback />}>
          <StoreAdminLayout />
        </Suspense>
      </RequireStaffAdmin>
    }
  >
    <Route index element={<Suspense fallback={<RouteFallback />}><StaffDashboard /></Suspense>} />
    <Route path="products" element={<Suspense fallback={<RouteFallback />}><ProductManager /></Suspense>} />
    <Route path="accessories" element={<Suspense fallback={<RouteFallback />}><AccessoryManager /></Suspense>} />
    <Route path="repairs" element={<Suspense fallback={<RouteFallback />}><RepairManager /></Suspense>} />
    <Route path="repair-services" element={<Suspense fallback={<RouteFallback />}><RepairServiceManager /></Suspense>} />
    <Route path="exchange" element={<Suspense fallback={<RouteFallback />}><ExchangeManager /></Suspense>} />
    <Route path="leads" element={<Suspense fallback={<RouteFallback />}><StoreLeadManager /></Suspense>} />
  </Route>
);
