import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Activity, User, Search } from "lucide-react";
import { format } from "date-fns";

export default function AuditLogs() {
  const [search, setSearch] = useState("");

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, user_id, action, table_name, record_id, old_data, new_data, ip_address, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (logs ?? []).filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (log.action ?? "").toLowerCase().includes(q) ||
      (log.table_name ?? "").toLowerCase().includes(q) ||
      (log.user_id ?? "").toLowerCase().includes(q)
    );
  });

  const deleteCount = filtered.filter((l) => l.action === "delete" || l.action === "DELETE").length;
  const updateCount = filtered.filter((l) => l.action === "update" || l.action === "UPDATE").length;
  const insertCount = filtered.filter((l) => l.action === "insert" || l.action === "INSERT").length;

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">Track all administrative actions and system changes.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" /> Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filtered.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Showing last 200</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Inserts</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{insertCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Updates</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{updateCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Deletes</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{deleteCount}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Activity</CardTitle>
          <CardDescription>Real-time stream of platform management events.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Filter by action, table, or user ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoading && (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          )}
          {error && (
            <p className="text-sm text-destructive text-center py-4">
              Failed to load audit logs. Run the latest migrations to enable this table.
            </p>
          )}
          {!isLoading && !error && (
            <div className="border rounded-md overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Record ID</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(log.created_at), "MMM dd, HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-xs font-mono truncate max-w-[120px]">
                            {log.user_id ? log.user_id.slice(0, 8) + "…" : "system"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.action?.toLowerCase() === "delete" ? "destructive"
                            : log.action?.toLowerCase() === "insert" ? "default"
                            : "secondary"
                          }
                          className="text-[10px] h-5 uppercase"
                        >
                          {log.action ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono">{log.table_name ?? "—"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-muted-foreground truncate max-w-[100px] block">
                          {log.record_id ? log.record_id.slice(0, 8) + "…" : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{log.ip_address ?? "—"}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {search ? "No matching logs." : "No audit logs yet."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
