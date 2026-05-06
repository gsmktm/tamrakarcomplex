import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { RequireStaffAdmin } from "@/routes/RequireStaffAdmin";
import { RouteFallback } from "@/components/routing/RouteFallback";

const StaffAdminLayout = lazy(() => import("@/layouts/StaffAdminLayout"));
const StaffAdminDashboard = lazy(() => import("@/pages/staffadmin/StaffAdminDashboard"));
const Analytics = lazy(() => import("@/pages/admin/Analytics"));
const ProductManager = lazy(() => import("@/pages/admin/ProductManager"));
const OrderManager = lazy(() => import("@/pages/admin/OrderManager"));
const ArticleManager = lazy(() => import("@/pages/admin/ArticleManager"));
const GuideManager = lazy(() => import("@/pages/admin/GuideManager"));
const CommentManager = lazy(() => import("@/pages/admin/CommentManager"));
const ListingManager = lazy(() => import("@/pages/admin/ListingManager"));
const StoreManager = lazy(() => import("@/pages/admin/StoreManager"));
const RepairManager = lazy(() => import("@/pages/admin/RepairManager"));
const UnlockingManager = lazy(() => import("@/pages/admin/UnlockingManager"));
const ContentManager = lazy(() => import("@/pages/admin/ContentManager"));
const ContactManager = lazy(() => import("@/pages/admin/ContactManager"));
const ChatBotManager = lazy(() => import("@/pages/admin/ChatBotManager"));
const PollManager = lazy(() => import("@/pages/admin/PollManager"));
const StaffAdminProfilePage = lazy(() => import("@/pages/staffadmin/StaffAdminProfilePage"));
const ThemeManager = lazy(() => import("@/pages/admin/ThemeManager"));
const ValuationManager = lazy(() => import("@/pages/admin/ValuationManager"));
const SubscriptionManager = lazy(() => import("@/pages/admin/SubscriptionManager"));
const StoreApplicationManager = lazy(() => import("@/pages/admin/StoreApplicationManager"));
const Settings = lazy(() => import("@/pages/admin/Settings"));
const UserManager = lazy(() => import("../pages/admin/UserManager"));
const StaffAdminConsole = lazy(() => import("@/pages/console/StaffAdminConsole"));
const PriceList = lazy(() => import("@/pages/suadmin/PriceList"));
const PriceListManager = lazy(() => import("@/pages/admin/PriceListManager"));
const BrandManager = lazy(() => import("@/pages/admin/BrandManager"));
const MobileMasterManager = lazy(() => import("@/pages/admin/MobileMasterManager"));
const AccessoryManager = lazy(() => import("@/pages/admin/AccessoryManager"));
const DeviceVerificationManager = lazy(() => import("@/pages/admin/DeviceVerificationManager"));
const PayoutManager = lazy(() => import("@/pages/admin/PayoutManager"));
const LeadManager = lazy(() => import("@/pages/admin/LeadManager"));
const StaffTaskManager = lazy(() => import("@/pages/suadmin/StaffTaskManager"));
const StaffPerformanceManager = lazy(() => import("@/pages/suadmin/StaffPerformanceManager"));
const StoreThemeBuilder = lazy(() => import("@/pages/storeadmin/StoreThemeBuilder"));
const SeoManager = lazy(() => import("@/pages/admin/SeoManager"));

export const staffAdminRoutes = (
  <Route
    path="/staffadmin"
    element={
      <RequireStaffAdmin>
        <Suspense fallback={<RouteFallback />}>
          <StaffAdminLayout />
        </Suspense>
      </RequireStaffAdmin>
    }
  >
    <Route
      index
      element={
        <RequireStaffAdmin module="analytics" action="view">
          <Suspense fallback={<RouteFallback />}>
            <StaffAdminDashboard />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="products"
      element={
        <RequireStaffAdmin module="marketplace" action="view">
          <Suspense fallback={<RouteFallback />}>
            <ProductManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="price-list"
      element={
        <RequireStaffAdmin module="price_list" action="view">
          <Suspense fallback={<RouteFallback />}>
            <PriceListManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="price-list-simple"
      element={
        <RequireStaffAdmin module="price_list" action="view">
          <Suspense fallback={<RouteFallback />}>
            <PriceList />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="brands"
      element={
        <RequireStaffAdmin module="brands" action="view">
          <Suspense fallback={<RouteFallback />}>
            <BrandManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="mobile-master"
      element={
        <RequireStaffAdmin module="brands" action="view">
          <Suspense fallback={<RouteFallback />}>
            <MobileMasterManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="accessories"
      element={
        <RequireStaffAdmin module="brands" action="view">
          <Suspense fallback={<RouteFallback />}>
            <AccessoryManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="device-verification"
      element={
        <RequireStaffAdmin module="device_verification" action="view">
          <Suspense fallback={<RouteFallback />}>
            <DeviceVerificationManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="payouts"
      element={
        <RequireStaffAdmin module="payouts" action="view">
          <Suspense fallback={<RouteFallback />}>
            <PayoutManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="leads"
      element={
        <RequireStaffAdmin module="valuation" action="view">
          <Suspense fallback={<RouteFallback />}>
            <LeadManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="orders"
      element={
        <RequireStaffAdmin module="orders" action="view">
          <Suspense fallback={<RouteFallback />}>
            <OrderManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="articles"
      element={
        <RequireStaffAdmin module="content" action="view">
          <Suspense fallback={<RouteFallback />}>
            <ArticleManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="guides"
      element={
        <RequireStaffAdmin module="content" action="view">
          <Suspense fallback={<RouteFallback />}>
            <GuideManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="comments"
      element={
        <RequireStaffAdmin module="content" action="view">
          <Suspense fallback={<RouteFallback />}>
            <CommentManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="listings"
      element={
        <RequireStaffAdmin module="marketplace" action="view">
          <Suspense fallback={<RouteFallback />}>
            <ListingManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="stores"
      element={
        <RequireStaffAdmin module="stores" action="view">
          <Suspense fallback={<RouteFallback />}>
            <StoreManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="stores/:id/theme"
      element={
        <RequireStaffAdmin module="stores" action="edit">
          <Suspense fallback={<RouteFallback />}>
            <StoreThemeBuilder />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="repairs"
      element={
        <RequireStaffAdmin module="repairs" action="view">
          <Suspense fallback={<RouteFallback />}>
            <RepairManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="unlocking"
      element={
        <RequireStaffAdmin module="unlocking" action="view">
          <Suspense fallback={<RouteFallback />}>
            <UnlockingManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="content"
      element={
        <RequireStaffAdmin module="content" action="view">
          <Suspense fallback={<RouteFallback />}>
            <ContentManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="messages"
      element={
        <RequireStaffAdmin module="content" action="view">
          <Suspense fallback={<RouteFallback />}>
            <ContactManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="store-applications"
      element={
        <RequireStaffAdmin module="stores" action="view">
          <Suspense fallback={<RouteFallback />}>
            <StoreApplicationManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="chatbot"
      element={
        <RequireStaffAdmin module="content" action="view">
          <Suspense fallback={<RouteFallback />}>
            <ChatBotManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="polls"
      element={
        <RequireStaffAdmin module="content" action="view">
          <Suspense fallback={<RouteFallback />}>
            <PollManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="analytics"
      element={
        <RequireStaffAdmin module="analytics" action="view">
          <Suspense fallback={<RouteFallback />}>
            <Analytics />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="seo"
      element={
        <RequireStaffAdmin module="content" action="edit">
          <Suspense fallback={<RouteFallback />}>
            <SeoManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="me"
      element={
        <RequireStaffAdmin module="settings" action="view">
          <Suspense fallback={<RouteFallback />}>
            <StaffAdminProfilePage />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="me/*"
      element={
        <RequireStaffAdmin module="settings" action="view">
          <Suspense fallback={<RouteFallback />}>
            <StaffAdminProfilePage />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="themes"
      element={
        <RequireStaffAdmin module="content" action="view">
          <Suspense fallback={<RouteFallback />}>
            <ThemeManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="valuation"
      element={
        <RequireStaffAdmin module="valuation" action="view">
          <Suspense fallback={<RouteFallback />}>
            <ValuationManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="subscriptions"
      element={
        <RequireStaffAdmin module="subscriptions" action="view">
          <Suspense fallback={<RouteFallback />}>
            <SubscriptionManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="settings"
      element={
        <RequireStaffAdmin module="settings" action="view">
          <Suspense fallback={<RouteFallback />}>
            <Settings />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="users"
      element={
        <RequireStaffAdmin module="users" action="view">
          <Suspense fallback={<RouteFallback />}>
            <UserManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="console"
      element={
        <RequireStaffAdmin module="settings" action="view">
          <Suspense fallback={<RouteFallback />}>
            <StaffAdminConsole />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="console/*"
      element={
        <RequireStaffAdmin module="settings" action="view">
          <Suspense fallback={<RouteFallback />}>
            <StaffAdminConsole />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="tasks"
      element={
        <RequireStaffAdmin module="settings" action="view">
          <Suspense fallback={<RouteFallback />}>
            <StaffTaskManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
    <Route
      path="performance"
      element={
        <RequireStaffAdmin module="analytics" action="view">
          <Suspense fallback={<RouteFallback />}>
            <StaffPerformanceManager />
          </Suspense>
        </RequireStaffAdmin>
      }
    />
  </Route>
);
