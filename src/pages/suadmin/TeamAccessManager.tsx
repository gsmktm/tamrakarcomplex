import { useEffect, useMemo } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Calendar, CheckCircle2, ClipboardList, KeyRound, ShieldAlert, UserPlus, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import StaffAdminManager from "@/pages/suadmin/StaffAdminManager";
import PermissionMatrix from "@/pages/suadmin/PermissionMatrix";
import StaffTaskManager from "@/pages/suadmin/StaffTaskManager";
import StaffPerformanceManager from "@/pages/suadmin/StaffPerformanceManager";

async function countTable(table: string, filter?: (query: any) => any) {
  try {
    let query = supabase.from(table as any).select("*", { count: "exact", head: true });
    if (filter) query = filter(query);
    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.warn(`Unable to count ${table}`, error);
    return 0;
  }
}

function TeamAccessOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["team-access-overview"],
    queryFn: async () => {
      const [suadmins, staffadmins, permissionRows, openTasks, overdueTasks, completedTasks, auditLogs] = await Promise.all([
        countTable("user_roles", (query) => query.eq("role", "suadmin")),
        countTable("user_roles", (query) => query.eq("role", "staffadmin")),
        countTable("staff_permissions"),
        countTable("admin_tasks", (query) => query.eq("assigned_role_type", "staffadmin").in("status", ["pending", "in_progress"])),
        countTable("admin_tasks", (query) => query.eq("assigned_role_type", "staffadmin").eq("status", "overdue")),
        countTable("admin_tasks", (query) => query.eq("assigned_role_type", "staffadmin").eq("status", "completed")),
        countTable("audit_logs"),
      ]);

      return { suadmins, staffadmins, permissionRows, openTasks, overdueTasks, completedTasks, auditLogs };
    },
    retry: 1,
  });

  const stats = [
    { label: "Super Admins", value: data?.suadmins ?? 0, detail: "Full platform control", href: "?tab=staff", icon: ShieldAlert },
    { label: "Staff Admins", value: data?.staffadmins ?? 0, detail: "Permission-scoped team", href: "?tab=staff", icon: Users },
    { label: "Permission Rules", value: data?.permissionRows ?? 0, detail: "Module/action grants", href: "?tab=permissions", icon: KeyRound },
    { label: "Open Tasks", value: data?.openTasks ?? 0, detail: `${data?.overdueTasks ?? 0} overdue`, href: "?tab=tasks", icon: ClipboardList },
    { label: "Completed Tasks", value: data?.completedTasks ?? 0, detail: "Staff delivery history", href: "?tab=performance", icon: CheckCircle2 },
    { label: "Audit Events", value: data?.auditLogs ?? 0, detail: "Tracked platform changes", href: "/suadmin/audit", icon: BarChart3 },
  ];

  const flow = [
    { title: "Grant staff access", detail: "Add an existing user by email as staffadmin. Keep suadmin accounts limited to trusted owners.", href: "?tab=staff" },
    { title: "Set module permissions", detail: "Grant view/create/edit/delete/approve/assign/export only for the modules that staff actually own.", href: "?tab=permissions" },
    { title: "Assign work", detail: "Create clear tasks with module, priority, due date, and one accountable staff member.", href: "?tab=tasks" },
    { title: "Track performance", detail: "Review completed tasks, open workload, last activity, and audit volume by staff member.", href: "?tab=performance" },
    { title: "Audit changes", detail: "Use audit logs for sensitive changes, role grants, permission changes, pricing, billing, and catalog edits.", href: "/suadmin/audit" },
  ];

  const controls = [
    "Never remove the final suadmin",
    "Staff permissions default to no access",
    "Any action permission should imply View",
    "Use tasks for accountability",
    "Review audit logs after sensitive changes",
    "Revoke inactive staff promptly",
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} to={stat.href}>
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardContent className="flex items-start justify-between gap-4 pt-6">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold">{isLoading ? "..." : stat.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{stat.detail}</p>
                  </div>
                  <Icon className="h-8 w-8 shrink-0 text-primary" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Team Access Flow</CardTitle>
            <CardDescription>Use this order so role grants, permission scope, tasks, performance, and audits stay connected.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {flow.map((step, index) => (
              <div key={step.title} className="flex gap-3 rounded-lg border p-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{step.title}</h3>
                    <Button asChild variant="outline" size="sm">
                      <Link to={step.href}>Open</Link>
                    </Button>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access Controls</CardTitle>
            <CardDescription>Checks that keep the admin team safe and understandable.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {controls.map((control) => (
              <Badge key={control} variant="secondary">{control}</Badge>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const tabs = [
  {
    value: "overview",
    label: "Overview",
    icon: BarChart3,
    paths: ["/suadmin/team-access"],
    element: <TeamAccessOverview />,
  },
  {
    value: "staff",
    label: "Staff Admins",
    icon: Users,
    paths: ["/suadmin/staff-admins"],
    element: <StaffAdminManager />,
  },
  {
    value: "permissions",
    label: "Permissions",
    icon: ShieldAlert,
    paths: ["/suadmin/staff-permissions"],
    element: <PermissionMatrix />,
  },
  {
    value: "tasks",
    label: "Tasks",
    icon: Calendar,
    paths: ["/suadmin/staff-tasks"],
    element: <StaffTaskManager />,
  },
  {
    value: "performance",
    label: "Performance",
    icon: BarChart3,
    paths: ["/suadmin/staff-performance"],
    element: <StaffPerformanceManager />,
  },
];

export default function TeamAccessManager() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = useMemo(() => {
    const requestedTab = searchParams.get("tab");
    if (requestedTab && tabs.some((tab) => tab.value === requestedTab)) return requestedTab;
    return tabs.find((tab) => tab.paths.includes(location.pathname))?.value ?? "overview";
  }, [location.pathname, searchParams]);

  useEffect(() => {
    if (searchParams.get("tab")) return;
    const pathTab = tabs.find((tab) => tab.paths.includes(location.pathname))?.value;
    if (!pathTab || pathTab === "overview") return;
    const next = new URLSearchParams(searchParams);
    next.set("tab", pathTab);
    setSearchParams(next, { replace: true });
  }, [location.pathname, searchParams, setSearchParams]);

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "overview") next.delete("tab");
    else next.set("tab", value);
    setSearchParams(next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team & Access</h1>
        <p className="text-muted-foreground">
          Manage staff admins, permissions, tasks, and performance from one control center.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="overflow-x-auto pb-1">
          <TabsList className="grid min-w-[820px] grid-cols-5 lg:w-[920px]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-0">
            {tab.element}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
