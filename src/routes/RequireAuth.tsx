import { ReactNode, useState } from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MailCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardPathForRole, locationToPath } from "@/lib/authRedirects";
import type { AppRole } from "@/types/app";

type RequireAuthProps = {
  children: ReactNode;
  allowedRoles?: AppRole[];
};

export function RequireAuth({ children, allowedRoles }: RequireAuthProps) {
  const { user, loading, role, signOut } = useAuth();
  const location = useLocation();
  const [resendSent, setResendSent] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const from = locationToPath(location);
  const isResolvingAuth = loading || (!!user && !role);

  const DEV_MODE = import.meta.env.DEV;
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  
  // Only enforce email verification for Admin roles in dev mode.
  // In production, enforce for all users unless they are in public routes.
  const isAdmin = role && ["suadmin", "staffadmin", "storeadmin"].includes(role);
  const shouldEnforceEmailVerification = isAdmin || (!DEV_MODE && !isLocalhost);
  
  const emailConfirmed = !!(user?.email_confirmed_at || user?.confirmed_at);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  if (isResolvingAuth) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Access Restricted</h2>
            <p className="text-muted-foreground">Please sign in to access this area of the Tamrakar Complex platform.</p>
          </div>
          <Button asChild size="lg" className="w-full">
            <Link to="/auth" state={{ from }}>Sign In to Continue</Link>
          </Button>
          <Button variant="link" asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (shouldEnforceEmailVerification && !emailConfirmed) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-4">
        <Card className="max-w-md w-full border-none shadow-2xl bg-card/50 backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-6 rounded-2xl bg-amber-500/10 p-4 w-fit">
              <MailCheck className="h-10 w-10 text-amber-500" />
            </div>
            <CardTitle className="text-2xl font-display font-bold">Email Verification Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-muted-foreground leading-relaxed">
              For security, admin accounts must have a verified email address. 
              We've sent a confirmation link to <span className="text-foreground font-semibold underline underline-offset-4">{user.email}</span>.
            </p>
            
            <div className="grid gap-3">
              {resendSent ? (
                <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 text-green-600 rounded-xl text-sm font-medium animate-in fade-in zoom-in duration-300">
                  <MailCheck className="h-4 w-4" />
                  Link resent! Please check your inbox.
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-xl border-border/60"
                  onClick={async () => {
                    await supabase.auth.resend({ type: "signup", email: user.email! });
                    setResendSent(true);
                  }}
                >
                  Resend Verification Link
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="lg"
                className="rounded-xl text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign Out & Try Another Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to={getDashboardPathForRole(role)} replace />;
  }

  return <>{children}</>;
}
