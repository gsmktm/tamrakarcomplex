import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { getAuthPathForLocation } from "@/lib/authRedirects";

/**
 * Legacy RequireAdmin guard. 
 * Now redirects to /staffadmin for authorized users or shows access denied.
 * Only suadmin and staffadmin are allowed.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={getAuthPathForLocation(location)} replace />;
  }

  const isAuthorized = role === "suadmin" || role === "staffadmin";

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  // If they are trying to access old /admin, we can let them through but ideally 
  // the router should handle the redirect to /staffadmin.
  return <>{children}</>;
}
