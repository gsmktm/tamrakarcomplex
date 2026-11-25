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
import { staffAdminRoutes } from "@/routes/staffAdminRoutes";
import { superAdminRoutes } from "@/routes/superAdminRoutes";
import { RequireSuperAdmin } from "@/routes/RequireSuperAdmin";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import { storeAdminRoutes } from "@/routes/storeAdminRoutes";
import { staffRoutes } from "@/routes/staffRoutes";
import { Navigate } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import { OfflineBanner } from "@/components/system/OfflineBanner";
import { BottomNav } from "@/components/layout/BottomNav";
import { FrontendLiveEditor } from "@/components/system/FrontendLiveEditor";
import { SiteSettingsHydrator } from "@/components/system/SiteSettingsHydrator";
import { DynamicFavicon } from "@/components/system/DynamicFavicon";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import { MaintenanceGate } from "@/components/system/MaintenanceGate";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { WildcardRedirect } from "@/components/routing/WildcardRedirect";

import "@/styles/dynamic-theme.css";
import "@/styles/design-system.css";

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

/**
 * Skip-to-content link for keyboard & screen-reader users.
 * Works on every route regardless of whether the page author added
 * `id="main-content"` to its <main> element.
 */
const SkipToContent = () => {
  return (
    <a
      href="#main-content"
      onClick={(event) => {
        // Prefer the real <main> landmark when the page has one; fall back
        // to a global anchor so focus always lands in viewport content.
        event.preventDefault();
        const main = document.querySelector("main");
        if (main) {
          const el = main as HTMLElement;
          if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
          el.focus({ preventScroll: true });
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        const anchor = document.getElementById("main-content");
        if (anchor) {
          const el = anchor as HTMLElement;
          if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
          el.focus({ preventScroll: true });
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[9999] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
    >
      Skip to content
    </a>
  );
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
      <SkipToContent />
      <VisitorTracker />
      <SiteSettingsHydrator />
      <DynamicFavicon />
      <OfflineBanner />
      {enableLiveEditor && <FrontendLiveEditor />}
      <ScrollToTop />
      <ChatWidget />
      <ErrorBoundary>
        <MaintenanceGate>
          <Routes>
            {publicRoutes}
            {staffAdminRoutes}
            {/* Redirect from legacy /admin to /staffadmin */}
            <Route path="/admin" element={<Navigate to="/staffadmin" replace />} />
            <Route path="/admin/*" element={<WildcardRedirect from="/admin" to="/staffadmin" />} />
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
