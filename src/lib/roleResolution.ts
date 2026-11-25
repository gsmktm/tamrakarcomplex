import { normalizeRole } from "./roles";
import type { AppRole } from "@/types/app";

/**
 * Role assignment records come from RLS-protected user_roles, never from
 * mutable user_metadata, email text, localStorage or untrusted request bodies.
 */
export function highestGrantedRole(rows: ReadonlyArray<{ role: string }> | null | undefined): AppRole {
  const granted = new Set((rows ?? []).map((entry) => normalizeRole(entry.role)));
  if (granted.has("suadmin")) return "suadmin";
  if (granted.has("staffadmin")) return "staffadmin";
  if (granted.has("storeadmin")) return "storeadmin";
  if (granted.has("storestaff")) return "storestaff";
  return "user";
}
