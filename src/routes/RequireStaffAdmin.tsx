import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StaffPermissionAction } from "@/lib/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { getAuthPathForLocation } from "@/lib/authRedirects";

interface RequireStaffAdminProps {
  children: ReactNode;
  module?: string;
  action?: StaffPermissionAction;
}

export function RequireStaffAdmin({ children, module, action = "view" }: RequireStaffAdminProps) {
  const { role, loading, user } = useAuth();
  const location = useLocation();
  const { hasPermission, isLoading: permissionsLoading, error: permissionsError, refetch } = usePermissions();
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const isResolvingAuth = loading || (!!user && !role);

  useEffect(() => {
    if (!isResolvingAuth) {
      setAuthTimedOut(false);
      return;
    }

    const timer = window.setTimeout(() => setAuthTimedOut(true), 2500);
    return () => window.clearTimeout(timer);
  }, [isResolvingAuth]);

  if ((isResolvingAuth && !authTimedOut) || (user && permissionsLoading)) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={getAuthPathForLocation(location)} replace />;
  }

  if (module && permissionsError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <RefreshCw className="h-10 w-10 text-destructive" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Permissions unavailable</h2>
          <p className="mt-2 max-w-md text-muted-foreground">We could not verify staff access. Protected data remains locked.</p>
        </div>
        <Button variant="outline" onClick={() => void refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry access check
        </Button>
      </div>
    );
  }

  const isStaffOrSu = role === "staffadmin" || role === "suadmin";
  const hasModuleAccess = !module || hasPermission(module, action);

  if (!isStaffOrSu || !hasModuleAccess) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">
              {!isStaffOrSu ? "Staff Access Required" : "Permission Denied"}
            </h2>
            <p className="text-muted-foreground">
              {!isStaffOrSu 
                ? `This area is reserved for platform staff. Your current role (${role ?? "not assigned"}) does not have permission to view this page.`
                : `You don't have the required permissions (${action} on ${module}) to access this feature.`}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild variant="default" size="lg">
              <Link to="/staffadmin">Go to Staff Dashboard</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
