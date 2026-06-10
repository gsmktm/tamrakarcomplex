import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { CartProvider } from "@/contexts/CartContext";
import NotFound from "./pages/NotFound";
import { publicRoutes } from "@/routes/publicRoutes";
import { adminRoutes } from "@/routes/adminRoutes";
import { staffAdminRoutes } from "@/routes/staffAdminRoutes";
import { superAdminRoutes } from "@/routes/superAdminRoutes";
import { RequireSuperAdmin } from "@/routes/RequireSuperAdmin";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import { storeAdminRoutes } from "@/routes/storeAdminRoutes";
import { staffRoutes } from "@/routes/staffRoutes";
import ScrollToTop from "@/components/ScrollToTop";
import { OfflineBanner } from "@/components/system/OfflineBanner";
import { BottomNav } from "@/components/layout/BottomNav";
import { FrontendLiveEditor } from "@/components/system/FrontendLiveEditor";
import { SiteSettingsHydrator } from "@/components/system/SiteSettingsHydrator";
import { DynamicFavicon } from "@/components/system/DynamicFavicon";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import { MaintenanceGate } from "@/components/system/MaintenanceGate";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";

import StoreRedirect from "@/components/routing/StoreRedirect";
import "@/styles/dynamic-theme.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data considered fresh for 5 minutes — no refetch on remount within this window
      staleTime: 5 * 60 * 1000,
      // Keep unused query data in memory for 15 minutes
      gcTime: 15 * 60 * 1000,
      // Do not refetch just because user switched tabs
      refetchOnWindowFocus: false,
      // Only retry once on network error
      retry: 1,
      retryDelay: 1500,
    },
  },
});

const VisitorTracker = () => {
  useVisitorTracking();
  return null;
};

const AppContent = () => {
  const [enableLiveEditor, setEnableLiveEditor] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("theme-settings");
      const parsed = raw ? JSON.parse(raw) : {};
      setEnableLiveEditor(!!parsed.enableLiveEditor);
    } catch {
      setEnableLiveEditor(false);
    }
  }, []);

  return (
    <BrowserRouter>
      <VisitorTracker />
      <SiteSettingsHydrator />
      <DynamicFavicon />
      <OfflineBanner />
      {enableLiveEditor && <FrontendLiveEditor />}
      <ScrollToTop />
      <ErrorBoundary>
        <MaintenanceGate>
          <Routes>
            {publicRoutes}
            {adminRoutes}
            {staffAdminRoutes}
            <Route
              path="/suadmin"
              element={
                <RequireSuperAdmin>
                  <SuperAdminLayout />
                </RequireSuperAdmin>
              }
            >
              {superAdminRoutes.map((route) => {
                const relativePath = route.path.replace("/suadmin", "").replace(/^\//, "");
                return (
                  <Route
                    key={route.path}
                    index={!relativePath}
                    path={relativePath || undefined}
                    element={route.element}
                  />
                );
              })}
            </Route>
            {storeAdminRoutes}
            {staffRoutes}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MaintenanceGate>
        <BottomNav />
      </ErrorBoundary>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <TooltipProvider>
                <Toaster />
                <AppContent />
              </TooltipProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
};

export default App;
