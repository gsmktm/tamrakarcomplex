import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Mail, Lock, User, Phone, Loader2 } from "lucide-react";
import { SEO } from "@/components/common/SEO";
import { getErrorMessage } from "@/lib/utils";
import { normalizeEmail, normalizePhone, sanitizeText } from "@/lib/security";
import { getDashboardPathForRole, getPostLoginRedirectPath, getSafeLocalRedirectPath } from "@/lib/authRedirects";

const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 8;

function checkAuthRateLimit(identifier: string) {
  if (typeof window === "undefined") return true;

  const key = `tc_auth_attempts:${identifier}`;
  const now = Date.now();
  const raw = window.localStorage.getItem(key);
  let current: { count: number; startedAt: number } | null = null;
  try {
    current = raw ? JSON.parse(raw) as { count: number; startedAt: number } : null;
  } catch {
    current = null;
  }
  const next = !current || now - current.startedAt > AUTH_RATE_LIMIT_WINDOW_MS
    ? { count: 1, startedAt: now }
    : { count: current.count + 1, startedAt: current.startedAt };

  window.localStorage.setItem(key, JSON.stringify(next));
  return next.count <= AUTH_RATE_LIMIT_MAX_ATTEMPTS;
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetRequestMode, setIsResetRequestMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [confirmResetPassword, setConfirmResetPassword] = useState("");

  const { 
    signIn, 
    signUp, 
    signInWithProvider, 
    refreshRole,
    user, 
    role, 
    loading: authLoading,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const locationState = location.state as { from?: string | { pathname?: string; search?: string; hash?: string } } | null;
  const stateRedirect =
    typeof locationState?.from === "string"
      ? locationState.from
      : locationState?.from?.pathname
        ? `${locationState.from.pathname}${locationState.from.search ?? ""}${locationState.from.hash ?? ""}`
        : null;
  const queryRedirect = new URLSearchParams(location.search).get("redirect");
  const from = getSafeLocalRedirectPath(stateRedirect) ?? getSafeLocalRedirectPath(queryRedirect) ?? "/";
  const isRecoveryMode = location.hash.includes("type=recovery");

  useEffect(() => {
    // Wait for BOTH user and role to be present before auto-redirecting from Auth page
    if (user && !authLoading && role && !isRecoveryMode) {
      const storedRedirect = getSafeLocalRedirectPath(window.localStorage.getItem("tc_oauth_redirect"));
      if (storedRedirect) window.localStorage.removeItem("tc_oauth_redirect");
      console.info("Auth state resolved. Role:", role, "User:", user.email);
      navigate(getPostLoginRedirectPath(role, storedRedirect ?? from), { replace: true });
    } else if (user && !authLoading && !role && !isRecoveryMode) {
      console.warn("User authenticated but NO ROLE FOUND. Attempting auto-bootstrap...");
      // If user has no role, they might be a newly confirmed admin or a new user
      // RequireSuperAdmin or RequireAdmin will handle the bootstrap UI if they navigate there
    }
  }, [user, role, authLoading, navigate, from, isRecoveryMode]);

  useEffect(() => {
    if (isRecoveryMode) {
      setIsResetRequestMode(false);
      setIsLogin(true);
    }
  }, [isRecoveryMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const trimmedEmail = normalizeEmail(email);
        if (!checkAuthRateLimit(trimmedEmail || "anonymous")) {
          toast({
            title: "Too Many Attempts",
            description: "Please wait a few minutes before trying to sign in again.",
            variant: "destructive",
          });
          return;
        }
        const { error } = await signIn(trimmedEmail, password);
        if (error) {
          toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          await refreshRole();
          toast({
            title: "Welcome back!",
            description: "You have been logged in successfully.",
          });
        }
      } else {
        const signupEmail = normalizeEmail(email);
        if (!checkAuthRateLimit(signupEmail || "signup")) {
          toast({
            title: "Too Many Attempts",
            description: "Please wait a few minutes before creating another account.",
            variant: "destructive",
          });
          return;
        }
        const { error } = await signUp(signupEmail, password, sanitizeText(name, 120), normalizePhone(phone));
        if (error) {
          toast({
            title: "Sign Up Failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Account Created!",
            description: "Please check your email to verify your account.",
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const resetEmail = normalizeEmail(email);
      if (!checkAuthRateLimit(`reset:${resetEmail || "anonymous"}`)) {
        toast({
          title: "Too Many Attempts",
          description: "Please wait a few minutes before requesting another reset link.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast({
          title: "Reset Email Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Reset Link Sent",
        description: "Check your email for the secure password reset link.",
      });
      setIsResetRequestMode(false);
      setIsLogin(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();

    if (resetPassword !== confirmResetPassword) {
      toast({
        title: "Password Mismatch",
        description: "The new passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (resetPassword.length < 8) {
      toast({
        title: "Weak Password",
        description: "Use at least 8 characters for your new password.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: resetPassword });

      if (error) {
        toast({
          title: "Password Reset Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully. Redirecting you now.",
      });

      setResetPassword("");
      setConfirmResetPassword("");

      navigate(getDashboardPathForRole(role), { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
      <SEO
        title={isLogin ? "Sign In" : "Create Account"}
        description="Sign in or create your Tamrakar Complex account to manage orders, listings, and device requests."
        url="/auth"
        noindex
      />
      <div className="w-full max-w-md">
        <div className="article-card p-8 shadow-2xl border-primary/10 bg-background/80 backdrop-blur-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-12 h-12 rounded-xl hero-gradient flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold text-xl">TC</span>
              </div>
            </Link>
            <h1 className="font-display text-2xl font-bold mt-4">
              {isRecoveryMode ? "Set New Password" : isResetRequestMode ? "Reset Password" : isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isRecoveryMode
                ? "Choose a secure new password for your account."
                : isResetRequestMode
                  ? "We will email you a secure password reset link."
                  : isLogin
                    ? "Sign in to your account"
                    : "Join Tamrakar Complex today"}
            </p>
          </div>

          {!isRecoveryMode && !isResetRequestMode ? (
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    setLoading(true);
                    window.localStorage.setItem("tc_oauth_redirect", from);
                    const redirectTo = `${window.location.origin}/auth`;
                    await signInWithProvider("google", redirectTo);
                  } catch (error: unknown) {
                    window.localStorage.removeItem("tc_oauth_redirect");
                    toast({
                      title: "Google Login Failed",
                      description: getErrorMessage(error, "An error occurred while connecting to Google."),
                      variant: "destructive",
                    });
                    setLoading(false);
                  }
                }}
                className="w-full"
                disabled={loading}
              >
                Continue with Google
              </Button>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </div>
          ) : null}

          {isRecoveryMode ? (
            <form onSubmit={handlePasswordRecovery} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-password">New Password</Label>
                <Input
                  id="reset-password"
                  type="password"
                  placeholder="Create a strong password (min 8 characters)"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-reset-password">Confirm New Password</Label>
                <Input
                  id="confirm-reset-password"
                  type="password"
                  placeholder="Repeat the new password"
                  value={confirmResetPassword}
                  onChange={(e) => setConfirmResetPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <Button type="submit" className="w-full hero-gradient" disabled={loading || !user}>
                {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          ) : isResetRequestMode ? (
            <form onSubmit={handleResetRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full hero-gradient" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setIsResetRequestMode(false)} disabled={loading}>
                Back to Sign In
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 h-11"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="98XXXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-10 h-11"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 hero-gradient font-bold text-base" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
              </Button>
              {isLogin ? (
                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setIsResetRequestMode(true)}
                    disabled={loading}
                  >
                    Forgot password?
                  </button>
                </div>
              ) : null}
            </form>
          )}

          {!isRecoveryMode && !isResetRequestMode ? (
            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary font-medium hover:underline"
                >
                  {isLogin ? "Sign Up" : "Sign In"}
                </button>
              </p>
            </div>
          ) : null}

        </div>
      </div>
    </div>
  );
}
