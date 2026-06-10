import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  const fetchUserRole = useCallback(async (authUser: User) => {
    setRoleError(null);
    const rawMetadataRole =
      typeof authUser.app_metadata?.role === "string"
        ? authUser.app_metadata.role
        : typeof authUser.user_metadata?.role === "string"
          ? authUser.user_metadata.role
          : null;
    const metadataRole = rawMetadataRole ? normalizeRole(rawMetadataRole) : null;
    const emailRole = getRoleFromEmail(authUser.email);

    try {
      // 1. Try RPC first (preferred)
      const { data: roleRows, error: roleRpcError } = await supabase.rpc("get_my_roles");

      if (!roleRpcError && roleRows) {
        // Handle both array of strings (legacy) and array of objects (new 4-panel)
        const normalizedRoles = (roleRows as any[]).map(row => {
          if (typeof row === 'string') return normalizeRole(row);
          if (row && typeof row === 'object' && row.role) return normalizeRole(row.role);
          return 'user';
        });
        
        // Priority order: suadmin > staffadmin > storeadmin > storestaff > user
        if (normalizedRoles.includes("suadmin")) {
          setRole("suadmin");
          return;
        }
        if (normalizedRoles.includes("staffadmin")) {
          setRole("staffadmin");
          return;
        }
        if (normalizedRoles.includes("storeadmin")) {
          setRole("storeadmin");
          return;
        }
        if (normalizedRoles.includes("storestaff")) {
          setRole("storestaff");
          return;
        }
        if (normalizedRoles.includes("user")) {
          setRole("user");
          return;
        }
      }

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

      // 3. Last resort: metadata heuristics only — no email-based bypass
      const finalRole = emailRole ?? metadataRole ?? "user";

      setRole(finalRole);
      if (!emailRole && !metadataRole && finalRole === "user") {
        setRoleError("No role assigned. Using guest access.");
      }
    } catch (error) {
      console.error("Auth: Role resolution failed:", error);
      setRole(emailRole ?? metadataRole ?? "user");
    }
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
