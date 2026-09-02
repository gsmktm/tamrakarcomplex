import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { getAuthPathForLocation } from "@/lib/authRedirects";
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
  const { isLoading: permissionsLoading, canAccessModule } = usePermissions();

  const isResolvingAuth = loading || (!!user && !role);
  const needsPermissionCheck = role === "staffadmin" && Boolean(requiredModule);
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
