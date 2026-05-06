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
import { storeAdminRoutes } from "@/routes/storeAdminRoutes";
import ScrollToTop from "@/components/ScrollToTop";
import { OfflineBanner } from "@/components/system/OfflineBanner";
import { FrontendLiveEditor } from "@/components/system/FrontendLiveEditor";
import { SiteSettingsHydrator } from "@/components/system/SiteSettingsHydrator";
import { DynamicFavicon } from "@/components/system/DynamicFavicon";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import { MaintenanceGate } from "@/components/system/MaintenanceGate";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import "@/styles/dynamic-theme.css";

const queryClient = new QueryClient();

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
      <WhatsAppButton />
      <ErrorBoundary>
        <MaintenanceGate>
          <Routes>
            {publicRoutes}
            {adminRoutes}
            {staffAdminRoutes}
            {superAdminRoutes}
            {storeAdminRoutes}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MaintenanceGate>
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
