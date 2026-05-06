import { useCrudResource } from "@/hooks/useCrudResource";

export type AuditLogRecord = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  module: string;
  target_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export function useAuditLogs() {
  const resource = useCrudResource<AuditLogRecord>({
    table: "audit_logs",
    queryKey: "audit-logs",
    orderBy: "created_at",
  });

  return {
    data: resource.data,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
    createAuditLog: resource.create,
  };
}
