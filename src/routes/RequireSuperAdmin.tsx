import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthPathForLocation } from "@/lib/authRedirects";

export function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const { role, loading, user } = useAuth();
  const location = useLocation();
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

  if (isResolvingAuth && !authTimedOut) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={getAuthPathForLocation(location)} replace />;
  }

  if (role !== "suadmin") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Super Admin Access Required</h2>
            <p className="text-muted-foreground">This area is reserved for the platform's root administrators. Your current role ({role ?? "not assigned"}) does not have permission to view this page.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild variant="default" size="lg">
              <Link to="/suadmin">Go to Dashboard</Link>
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
