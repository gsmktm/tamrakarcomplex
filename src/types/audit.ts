import type { ID, JsonValue } from "@/types/common";
import type { Profile } from "@/types/admin";

export interface AuditLog {
  id: ID;
  actor_id: ID | null;
  actor_role: string | null;
  action: string;
  module: string;
  target_id: string | null;
  old_data: JsonValue | null;
  new_data: JsonValue | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Audit log with actor profile and user data (for display)
 */
export interface AuditLogWithActor extends AuditLog {
  actor?: {
    id: ID;
    email: string | null;
    profiles?: Profile;
  } | null;
}
