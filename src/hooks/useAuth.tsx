import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getRoleFromEmail, normalizeRole } from "@/lib/roles";
import type { AppRole } from "@/types/app";
import { normalizeEmail, sanitizeOptionalText } from "@/lib/security";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name?: string, phone?: string, referralCode?: string) => Promise<{ data?: { user?: { id: string } | null }; error: Error | null }>;
  signOut: () => Promise<void>;
  signInWithProvider: (provider: "google", redirectTo?: string) => Promise<void>;
  refreshRole: () => Promise<void>;
  roleError: string | null;
  // Dev mode quick sign in
  signInAsDev: (role: AppRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const fetchingRoleForRef = useRef<string | null>(null);
  const fetchingRolePromiseRef = useRef<Promise<void> | null>(null);

  const fetchUserRole = useCallback(async (authUser: User) => {
    // Reuse in-flight role fetches for the same user. Supabase can emit multiple
    // auth events on reload; returning early here can leave role=null forever.
    if (fetchingRoleForRef.current === authUser.id && fetchingRolePromiseRef.current) {
      return fetchingRolePromiseRef.current;
    }

    fetchingRoleForRef.current = authUser.id;
    const rolePromise = (async () => {
      setRoleError(null);
      const rawMetadataRole =
        typeof authUser.app_metadata?.role === "string"
          ? authUser.app_metadata.role
          : typeof authUser.user_metadata?.role === "string"
            ? authUser.user_metadata.role
            : null;
      const metadataRole = rawMetadataRole ? normalizeRole(rawMetadataRole) : null;
      const emailRole = getRoleFromEmail(authUser.email);

      // Dev mode: if email role is present, use it without DB query
      if (import.meta.env.DEV && emailRole) {
        setRole(emailRole);
        return;
      }

      try {

        // 2. Fallback to table query
        const { data: tableData, error: tableError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", authUser.id);

        if (!tableError && tableData && tableData.length > 0) {
          const roles = tableData.map((row) => normalizeRole(row.role));
          if (roles.includes("suadmin")) setRole("suadmin");
          else if (roles.includes("staffadmin")) setRole("staffadmin");
          else if (roles.includes("storeadmin")) setRole("storeadmin");
          else if (roles.includes("storestaff")) setRole("storestaff");
          else setRole("user");
          return;
        }

        // 3. Last resort: metadata heuristics only - no email-based bypass
        const finalRole = emailRole ?? metadataRole ?? "user";

        setRole(finalRole);
        if (!emailRole && !metadataRole && finalRole === "user") {
          setRoleError("No role assigned. Using guest access.");
        }
      } catch (error) {
        console.error("Auth: Role resolution failed:", error);
        setRole(emailRole ?? metadataRole ?? "user");
      } finally {
        fetchingRoleForRef.current = null;
        fetchingRolePromiseRef.current = null;
      }
    })();

    fetchingRolePromiseRef.current = rolePromise;
    return rolePromise;
  }, []);

  const resolveAuthState = useCallback(
    async (nextSession: Session | null) => {
      try {
        if (nextSession?.user) {
          setUser(nextSession.user);
          setSession(nextSession);
          await fetchUserRole(nextSession.user);
          return;
        }
        setUser(null);
        setSession(null);
        setRole(null);
        setRoleError(null);
      } catch (error) {
        console.error("Auth state resolution failed:", error);
        setUser(nextSession?.user ?? null);
        setSession(nextSession);
        setRole(nextSession?.user ? "user" : null);
        setRoleError(nextSession?.user ? "Auth state could not be resolved." : null);
      } finally {
        setLoading(false);
      }
    },
    [fetchUserRole],
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        if (error.message.includes("refresh_token") || error.message.includes("Refresh Token")) {
          void supabase.auth.signOut();
          void resolveAuthState(null);
          return;
        }
      }
      void resolveAuthState(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        void resolveAuthState(null);
      } else {
        void resolveAuthState(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [resolveAuthState]);

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    
    if (!error && data.session) {
      await resolveAuthState(data.session);
    }
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, name?: string, phone?: string, referralCode?: string) => {
    const trimmedEmail = normalizeEmail(email);

    const result = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: sanitizeOptionalText(name, 120),
          phone: sanitizeOptionalText(phone, 32),
          referred_by_code: referralCode || null,
        },
      },
    });

    if (result.error) {
      return { error: result.error };
    }

    return { data: { user: result.data?.user ? { id: result.data.user.id } : null }, error: null };
  };

  const signOut = async () => {
    setUser(null);
    setSession(null);
    setRole(null);
    setRoleError(null);
    await supabase.auth.signOut();
  };

  const signInWithProvider = async (provider: "google", redirectTo?: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account",
          access_type: "offline",
        },
      },
    });
    if (error) throw error;
  };

  const refreshRole = async () => {
    if (user) {
      await fetchUserRole(user);
    }
  };

  const signInAsDev = async (devRole: AppRole) => {
    const mockUser = {
      id: `dev-${devRole}-id-123`,
      email: `dev-${devRole}@tamrakarcomplex.com`,
      app_metadata: { role: devRole },
      user_metadata: { full_name: `Dev ${devRole.charAt(0).toUpperCase() + devRole.slice(1)}` },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as User;
    
    const mockSession = {
      user: mockUser,
      access_token: "dev-access-token",
      refresh_token: "dev-refresh-token",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    } as Session;

    setUser(mockUser);
    setSession(mockSession);
    setRole(devRole);
    setRoleError(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      role, 
      loading, 
      signIn, 
      signUp, 
      signOut, 
      signInWithProvider, 
      refreshRole,
      roleError,
      signInAsDev,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
