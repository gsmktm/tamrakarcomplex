import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ClipboardList, RefreshCw, Search, ShieldAlert, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type QueueKind = "tasks" | "repairs" | "unlocking" | "valuation";
type QueueFilter = "all" | QueueKind;
type QueueState = "open" | "all" | "closed";
type RecordRow = {
  id: string;
  title?: string | null;
  name?: string | null;
  customer_name?: string | null;
  device_model?: string | null;
  tracking_id?: string | null;
  status?: string | null;
  priority?: string | null;
  urgency?: string | null;
  module_key?: string | null;
  due_date?: string | null;
  created_at?: string | null;
};
type QueueItem = {
  id: string;
  kind: QueueKind;
  title: string;
  detail: string;
  status: string;
  priority: string;
  createdAt: string;
  dueDate: string | null;
  href: string;
};
type QueueSource = {
  kind: QueueKind;
  table: string;
  columns: string;
  href: string;
};

const SOURCES: QueueSource[] = [
  {
    kind: "tasks",
    table: "admin_tasks",
    columns: "id,title,status,priority,module_key,due_date,created_at",
    href: "/suadmin/team-access?tab=tasks",
  },
  {
    kind: "repairs",
    table: "repair_requests",
    columns: "id,name,device_model,tracking_id,status,urgency,created_at",
    href: "/suadmin/service-desk?tab=repairs",
  },
  {
    kind: "unlocking",
    table: "unlock_requests",
    columns: "id,customer_name,device_model,status,urgency,created_at",
    href: "/suadmin/service-desk?tab=unlocking",
  },
  {
    kind: "valuation",
    table: "sell_phone_leads",
    columns: "id,status,created_at",
    href: "/suadmin/service-desk?tab=valuation",
  },
];

const TITLES: Record<QueueKind, string> = {
  tasks: "Staff tasks",
  repairs: "Repair requests",
  unlocking: "Unlocking requests",
  valuation: "Valuation follow-ups",
};

const CLOSED_STATUSES = new Set(["completed", "cancelled", "closed", "rejected", "delivered"]);
const isClosed = (status: string) => CLOSED_STATUSES.has(status.toLowerCase());

function toItem(row: RecordRow, source: QueueSource): QueueItem {
  const identifier = row.tracking_id || row.id.slice(0, 8);
  const detail = [row.device_model, row.module_key].filter(Boolean).join(" · ");
  return {
    id: row.id,
    kind: source.kind,
    title: row.title || row.name || row.customer_name || `${TITLES[source.kind]} · ${identifier}`,
    detail: detail || identifier,
    status: row.status || "unknown",
    priority: row.priority || row.urgency || "normal",
    createdAt: row.created_at || "",
    dueDate: row.due_date || null,
    href: source.href,
  };
}

async function loadQueues() {
  // Read-only command center. Mutations remain in the role-aware managers and database RLS.
  // A failed source remains visible as an error, not a fabricated empty queue.
  const results = await Promise.all(
    SOURCES.map(async (source) => {
      try {
        const { data, error } = await supabase
          .from(source.table as any)
          .select(source.columns)
          .order("created_at", { ascending: false })
          .limit(75);
        if (error) throw error;
        return {
          kind: source.kind,
          items: ((data ?? []) as unknown as RecordRow[]).map((row) => toItem(row, source)),
          error: null as string | null,
        };
      } catch (error) {
        return {
          kind: source.kind,
          items: [] as QueueItem[],
          error: error instanceof Error ? error.message : "This queue could not be loaded.",
        };
      }
    }),
  );
  return results;
}

export default function UnifiedOperationsBoard() {
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [state, setState] = useState<QueueState>("open");
  const [search, setSearch] = useState("");
  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["suadmin-unified-operations"],
    queryFn: loadQueues,
    refetchInterval: 60_000,
    staleTime: 20_000,
  });

  const items = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data ?? [])
      .flatMap((source) => source.items)
      .filter((item) => filter === "all" || item.kind === filter)
      .filter((item) => state === "all" || (state === "closed" ? isClosed(item.status) : !isClosed(item.status)))
      .filter((item) => !needle || [item.title, item.detail, item.status, item.priority, item.id]
        .some((value) => value.toLowerCase().includes(needle)))
      .sort((a, b) => {
        const urgent = (priority: string) => priority === "urgent" || priority === "emergency" ? 2 : priority === "high" ? 1 : 0;
        const byPriority = urgent(b.priority) - urgent(a.priority);
        if (byPriority !== 0) return byPriority;
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      });
  }, [data, filter, state, search]);

  const failures = (data ?? []).filter((source) => source.error);
  const openItems = (data ?? []).flatMap((source) => source.items).filter((item) => !isClosed(item.status));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unified Operations</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            One Super Admin view across tasks and after-sales services. Each queue displays its 75 newest records.
            Counts below reflect loaded records, not unbounded platform totals.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button asChild><Link to="/suadmin/team-access?tab=tasks"><ClipboardList className="mr-2 h-4 w-4" />Assign task</Link></Button>
          <Button asChild variant="outline"><Link to="/suadmin/service-desk"><Wrench className="mr-2 h-4 w-4" />Service desk</Link></Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SOURCES.map((source) => {
          const result = data?.find((entry) => entry.kind === source.kind);
          const total = result?.items.length ?? 0;
          const open = result?.items.filter((item) => !isClosed(item.status)).length ?? 0;
          return (
            <Card key={source.kind}>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{TITLES[source.kind]}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{isLoading ? "…" : result?.error ? "Unavailable" : total}</p>
                <p className="text-xs text-muted-foreground">{result?.error ? "Query failed" : `${open} active in loaded sample`}</p>
                <Button variant="link" size="sm" className="h-auto px-0 pt-2" onClick={() => { setFilter(source.kind); setState("open"); }}>
                  View queue
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error && <div role="alert" className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">Unable to load operations: {String(error)}</div>}
      {failures.map((failure) => (
        <div key={failure.kind} role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{TITLES[failure.kind]} could not be loaded: {failure.error}</span>
        </div>
      ))}

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Work Queue</CardTitle>
            <Badge variant="outline">{openItems.length} active loaded records</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={filter} onValueChange={(value) => setFilter(value as QueueFilter)}>
              <SelectTrigger aria-label="Queue type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All queues</SelectItem>
                {SOURCES.map((source) => <SelectItem key={source.kind} value={source.kind}>{TITLES[source.kind]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={state} onValueChange={(value) => setState(value as QueueState)}>
              <SelectTrigger aria-label="Queue state"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="all">All states</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Search loaded records…" aria-label="Search operations" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="py-8 text-center text-muted-foreground">Loading operational queues…</p>}
          {!isLoading && items.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">No matching records in the loaded sample. Review any query errors above.</p>
          )}
          {items.map((item) => (
            <div key={`${item.kind}:${item.id}`} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{TITLES[item.kind]}</Badge>
                  <Badge variant={isClosed(item.status) ? "secondary" : "outline"}>{item.status.replace(/_/g, " ")}</Badge>
                  {(item.priority === "urgent" || item.priority === "emergency" || item.priority === "high") && <Badge variant="destructive">{item.priority}</Badge>}
                </div>
                <p className="break-words font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.detail}{item.dueDate ? ` · Due ${new Date(item.dueDate).toLocaleDateString()}` : ""}</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to={item.href}>Manage <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
