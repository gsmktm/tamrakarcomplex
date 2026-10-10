import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { getAuthPathForLocation } from "@/lib/authRedirects";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AppRole, StaffPermissionAction } from "@/lib/permissions";

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: AppRole[];
  requiredModule?: string;
  requiredAction?: StaffPermissionAction;
};

export function ProtectedRoute({
  children,
  allowedRoles,
  requiredModule,
  requiredAction = "view",
}: ProtectedRouteProps) {
  const location = useLocation();
  const { user, loading, role } = useAuth();
  const { isLoading: permissionsLoading, error: permissionsError, refetch, canAccessModule } = usePermissions();

  const isResolvingAuth = loading || (!!user && !role);
  const needsPermissionCheck = (role === "staffadmin" || role === "storeadmin") && Boolean(requiredModule);
  if (isResolvingAuth || (needsPermissionCheck && permissionsLoading)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={getAuthPathForLocation(location)} replace />;
  }

  if (needsPermissionCheck && permissionsError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="rounded-full bg-destructive/10 p-4">
          <RefreshCw className="h-10 w-10 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Permissions unavailable</h1>
          <p className="mt-2 max-w-md text-muted-foreground">
            We could not verify your access right now. No protected data was loaded.
          </p>
        </div>
        <p className="max-w-lg text-xs text-muted-foreground">{getErrorMessage(permissionsError)}</p>
        <Button variant="outline" onClick={() => void refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry access check
        </Button>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(role as AppRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredModule && !canAccessModule(requiredModule, requiredAction)) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 p-4">
        <div className="rounded-full bg-yellow-500/10 p-4">
          <ShieldAlert className="h-12 w-12 text-yellow-600" />
        </div>
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="max-w-md text-center text-muted-foreground">
          You do not have `{requiredAction}` permission for `{requiredModule}`.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
