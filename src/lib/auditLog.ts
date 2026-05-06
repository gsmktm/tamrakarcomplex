import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/utils";

type AuditPayload = {
  action: string;
  module: string;
  targetId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
};

export async function writeAuditLog(payload: AuditPayload): Promise<void> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return;
    }

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id)
      .limit(1);

    const actorRole = roleRows?.[0]?.role ?? "user";

    const { error } = await supabase.from("audit_logs").insert({
      actor_id: authData.user.id,
      actor_role: actorRole,
      action: payload.action,
      module: payload.module,
      target_id: payload.targetId ?? null,
      old_data: payload.oldData ?? null,
      new_data: payload.newData ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });

    if (error) {
      // Keep app flow resilient while preserving visibility for debug.
      console.error("Failed to write audit log:", getErrorMessage(error));
    }
  } catch (error) {
    console.error("Unexpected audit log failure:", getErrorMessage(error));
  }
}
