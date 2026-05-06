import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SEO } from "@/components/common/SEO";
import { Button } from "@/components/ui/button";
import { readAppSettings } from "@/lib/siteSettings";
import { useAuth } from "@/hooks/useAuth";
import { isAdminRole } from "@/lib/roles";

function MaintenanceScreen() {
  const settings = readAppSettings();

  return (
    <div className="flex min-h-screen flex-col">
      <SEO title="Maintenance Mode" description="The site is temporarily unavailable while we apply updates." noindex />
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-3xl border border-border/60 bg-card p-8 text-center shadow-card">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Maintenance Mode</div>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">We’re updating the platform</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {settings.site_info.description || "The site is temporarily unavailable while admin changes are being applied."}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/contact-us">Contact Support</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/auth">Admin Login</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { user, role } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState(readAppSettings().site_info.maintenance_mode);

  useEffect(() => {
    const sync = () => setMaintenanceMode(readAppSettings().site_info.maintenance_mode);

    sync();
    window.addEventListener("app-settings-update", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("app-settings-update", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const canBypassMaintenance = 
    pathname.startsWith("/suadmin") || 
    pathname.startsWith("/staffadmin") || 
    pathname.startsWith("/storeadmin") || 
    pathname.startsWith("/admin") || 
    pathname === "/auth" || 
    isAdminRole(role);

  if (maintenanceMode && !canBypassMaintenance) {
    return <MaintenanceScreen />;
  }

  return <>{children}</>;
}
