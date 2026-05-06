import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type StaffTask = {
  assigned_to_user_id: string | null;
  status: string;
  completed_at: string | null;
  created_at: string;
};

type AuditLog = {
  actor_user_id: string | null;
  action_key: string;
  module_key: string;
  created_at: string;
};

type StaffProfile = {
  user_id: string;
  display_name: string | null;
};

export default function StaffPerformanceManager() {
  const { user, role } = useAuth();
  const isSuperAdmin = role === "suadmin";

  const { data, isLoading } = useQuery({
    queryKey: ["staff-performance", role, user?.id],
    queryFn: async () => {
      const staffRoleResult = isSuperAdmin
        ? await supabase.from("user_roles").select("user_id").eq("role", "staffadmin")
        : null;
      if (staffRoleResult?.error) throw staffRoleResult.error;
      const staffIds = isSuperAdmin ? (staffRoleResult?.data ?? []).map((row) => row.user_id) : [user?.id].filter(Boolean);
      if (isSuperAdmin && staffIds.length === 0) {
        return { tasks: [], auditLogs: [], profiles: [] };
      }

      let taskQuery = supabase.from("admin_tasks").select("assigned_to_user_id, status, completed_at, created_at").eq("assigned_role_type", "staffadmin");
      let auditQuery = supabase.from("audit_logs").select("actor_user_id, action_key, module_key, created_at");

      if (!isSuperAdmin) {
        taskQuery = taskQuery.eq("assigned_to_user_id", user?.id);
        auditQuery = auditQuery.eq("actor_user_id", user?.id);
      } else if (staffIds.length > 0) {
        auditQuery = auditQuery.in("actor_user_id", staffIds);
      }

      const [tasksResult, auditResult, staffResult] = await Promise.all([
        taskQuery,
        auditQuery.order("created_at", { ascending: false }).limit(500),
        staffIds.length > 0
          ? supabase.from("profiles").select("user_id, display_name").in("user_id", staffIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (auditResult.error) throw auditResult.error;
      if (staffResult.error) throw staffResult.error;

      return {
        tasks: (tasksResult.data ?? []) as StaffTask[],
        auditLogs: (auditResult.data ?? []) as AuditLog[],
        profiles: (staffResult.data ?? []) as StaffProfile[],
      };
    },
    enabled: !!user?.id,
  });

  const rows = useMemo(() => {
    const profiles = new Map((data?.profiles ?? []).map((profile) => [profile.user_id, profile.display_name || profile.user_id]));
    const ids = new Set<string>();
    data?.tasks.forEach((task) => task.assigned_to_user_id && ids.add(task.assigned_to_user_id));
    data?.auditLogs.forEach((log) => log.actor_user_id && ids.add(log.actor_user_id));

    return Array.from(ids).map((id) => {
      const tasks = data?.tasks.filter((task) => task.assigned_to_user_id === id) ?? [];
      const logs = data?.auditLogs.filter((log) => log.actor_user_id === id) ?? [];
      return {
        id,
        name: profiles.get(id) ?? id,
        assigned: tasks.length,
        completed: tasks.filter((task) => task.status === "completed").length,
        open: tasks.filter((task) => !["completed", "cancelled"].includes(task.status)).length,
        changes: logs.length,
        lastActivity: logs[0]?.created_at ?? tasks[0]?.created_at ?? null,
      };
    });
  }, [data]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        assigned: acc.assigned + row.assigned,
        completed: acc.completed + row.completed,
        open: acc.open + row.open,
        changes: acc.changes + row.changes,
      }),
      { assigned: 0, completed: 0, open: 0, changes: 0 },
    );
  }, [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Staff Performance</h1>
        <p className="text-muted-foreground">
          {isSuperAdmin ? "Monitor task completion and audited platform changes." : "Review your task and activity summary."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Assigned</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-bold"><Clock className="h-5 w-5 text-primary" />{totals.assigned}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Completed</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-bold"><CheckCircle2 className="h-5 w-5 text-green-600" />{totals.completed}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Open</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-bold"><Clock className="h-5 w-5 text-amber-600" />{totals.open}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Audited Changes</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-bold"><Activity className="h-5 w-5 text-blue-600" />{totals.changes}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Staff Activity</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Open</TableHead>
                <TableHead>Audited Changes</TableHead>
                <TableHead>Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell>
                </TableRow>
              ) : rows.length ? (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.assigned}</TableCell>
                    <TableCell>{row.completed}</TableCell>
                    <TableCell>{row.open}</TableCell>
                    <TableCell>{row.changes}</TableCell>
                    <TableCell>{row.lastActivity ? new Date(row.lastActivity).toLocaleString() : "-"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No staff activity found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
