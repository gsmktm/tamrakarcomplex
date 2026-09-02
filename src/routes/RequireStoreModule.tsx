import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * Route-level module gate for storeadmin pages.
 *
 * Mirrors the sidebar gating (panelNavigation requiredModule) so direct URL
 * access is denied the same way menu items are hidden. Tri-state safe:
 * while grants are still loading we render the page (no lockout flash);
 * once loaded and the module is not granted we show a friendly deny screen.
 */
export function RequireStoreModule({ moduleKey, children }: { moduleKey: string; children: ReactNode }) {
  const { role, storeAdminPermissions, storeAdminPermissionsLoaded } = usePermissions();
  const location = useLocation();

  if (role !== "storeadmin") {
    // Other roles are filtered by their own route guards.
    return <>{children}</>;
  }

  if (!storeAdminPermissionsLoaded) {
    // Grants still loading — do not lock the user out on a flash.
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!storeAdminPermissions.includes(moduleKey)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Module Not Enabled</h2>
            <p className="text-muted-foreground">
              Your store owner has not granted you access to this area. Ask them to enable the
              <span className="font-medium text-foreground"> {moduleKey} </span>
              module from Store Staff permissions.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild variant="default" size="lg">
              <Link to="/storeadmin">Go to Store Dashboard</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground break-all">
            Blocked at {location.pathname}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
