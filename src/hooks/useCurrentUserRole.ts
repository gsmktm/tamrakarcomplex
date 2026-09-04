import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/utils";

export function useCurrentUserRole() {
  const { user, role: roleFromAuth } = useAuth();

  const roleQuery = useQuery({
    queryKey: ["current-user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      let lastError: unknown = null;
      // Retry once: a transient failure must not demote admins to "user".
      for (let attempt = 0; attempt < 2; attempt++) {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (!error) return data?.role ?? roleFromAuth ?? "user";
        lastError = error;
        if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
      }
      throw lastError;
    },
    enabled: Boolean(user?.id),
    // Surface failures to callers instead of silently returning "user".
    retry: false,
  });

  return {
    data: roleQuery.error ? roleFromAuth : (roleQuery.data ?? roleFromAuth ?? null),
    loading: roleQuery.isLoading,
    error: roleQuery.error ? getErrorMessage(roleQuery.error) : null,
    refetch: roleQuery.refetch,
  };
}
