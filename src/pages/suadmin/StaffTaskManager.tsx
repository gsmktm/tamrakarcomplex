import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Loader2, Plus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_TASKS_COLUMNS } from "@/lib/supabaseColumnMaps";
import { useAuth } from "@/hooks/useAuth";
import { STAFF_PERMISSION_MODULES, type StaffPermissionModule } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/utils";

type StaffMember = {
  user_id: string;
  display_name: string;
};

type AdminTask = {
  id: string;
  title: string;
  description: string | null;
  assigned_to_user_id: string | null;
  module_key: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled" | "overdue";
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
};

const MODULE_LABELS: Record<StaffPermissionModule, string> = {
  dashboard: "Dashboard",
  stores: "Stores",
  store_admins: "Store Admins",
  store_permissions: "Store Permissions",
  products: "Products",
  price_list: "Price List",
  brands: "Brands",
  orders: "Orders",
  leads: "Leads",
  payouts: "Payouts",
  subscriptions: "Subscriptions",
  articles: "Articles",
  guides: "Guides",
  content_pages: "Content Pages",
  community_listings: "Community Listings",
  repair_requests: "Repair Requests",
  unlocking_requests: "Unlocking Requests",
  analytics: "Analytics",
  seo_growth: "SEO & Growth",
  valuation_manager: "Valuation Manager",
  audit_logs: "Audit Logs",
  mailbox: "Mailbox",
  chatbot_config: "Chatbot Config",
  user_polls: "User Polls",
  marketplace: "Marketplace",
  device_verification: "Device Verification",
  repairs: "Repairs",
  unlocking: "Unlocking",
  content: "Content",
  users: "Users",
  settings: "Settings",
  valuation: "Valuation",
};

export default function StaffTaskManager() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = role === "suadmin";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [moduleKey, setModuleKey] = useState<StaffPermissionModule>("settings");
  const [priority, setPriority] = useState<AdminTask["priority"]>("medium");
  const [dueDate, setDueDate] = useState("");

  const { data: staffMembers } = useQuery({
    queryKey: ["task-staff-members"],
    queryFn: async () => {
      const { data: roles, error } = await supabase.from("user_roles").select("user_id").eq("role", "staffadmin");
      if (error) throw error;

      const ids = roles?.map((row) => row.user_id) ?? [];
      if (ids.length === 0) return [];

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ids);
      if (profileError) throw profileError;

      return ids.map((id) => ({
        user_id: id,
        display_name: profiles?.find((profile) => profile.user_id === id)?.display_name || id,
      })) as StaffMember[];
    },
    enabled: isSuperAdmin,
  });

  const { data: tasks, isLoading, isError, error: taskLoadError } = useQuery({
    queryKey: ["staff-tasks", role, user?.id],
    queryFn: async () => {
      let query = supabase.from("admin_tasks").select(ADMIN_TASKS_COLUMNS.join(",")).eq("assigned_role_type", "staffadmin");
      if (!isSuperAdmin) query = query.eq("assigned_to_user_id", user?.id);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminTask[];
    },
    enabled: !!user?.id,
  });

  const staffNameById = useMemo(() => {
    return new Map((staffMembers ?? []).map((staff) => [staff.user_id, staff.display_name]));
  }, [staffMembers]);

  const createTask = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !assignedTo) throw new Error("Title and staff member are required.");
      const { error } = await supabase.from("admin_tasks").insert({
        title: title.trim(),
        description: description.trim() || null,
        assigned_to_user_id: assignedTo,
        assigned_role_type: "staffadmin",
        module_key: moduleKey,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setAssignedTo("");
      setDueDate("");
      queryClient.invalidateQueries({ queryKey: ["staff-tasks"] });
      toast.success("Task assigned");
    },
    onError: (error: unknown) => toast.error("Failed to assign task", { description: getErrorMessage(error) }),
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AdminTask["status"] }) => {
      const { error } = await supabase
        .from("admin_tasks")
        .update({
          status,
          updated_by: user?.id,
          completed_at: status === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-tasks"] });
      toast.success("Task updated");
    },
    onError: (error: unknown) => toast.error("Failed to update task", { description: getErrorMessage(error) }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Staff Tasks</h1>
        <p className="text-muted-foreground">
          {isSuperAdmin ? "Assign and monitor tasks for platform staff." : "Review and update your assigned work."}
        </p>
      </div>

      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" />
              Assign Task
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Input placeholder="Task title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Assign to staff" />
              </SelectTrigger>
              <SelectContent>
                {staffMembers?.map((staff) => (
                  <SelectItem key={staff.user_id} value={staff.user_id}>{staff.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={moduleKey} onValueChange={(value) => setModuleKey(value as StaffPermissionModule)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAFF_PERMISSION_MODULES.map((module) => (
                  <SelectItem key={module} value={module}>{MODULE_LABELS[module]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={(value) => setPriority(value as AdminTask["priority"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Input type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            <Textarea className="md:col-span-2" placeholder="Task details" value={description} onChange={(event) => setDescription(event.target.value)} />
            <Button className="md:col-span-2" onClick={() => createTask.mutate()} disabled={createTask.isPending}>
              {createTask.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
              Assign Task
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" />
            Task Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Module</TableHead>
                {isSuperAdmin && <TableHead>Staff</TableHead>}
                <TableHead>Priority</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 6 : 5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 6 : 5} className="h-24 text-center text-destructive">
                    Unable to load tasks: {getErrorMessage(taskLoadError)}
                  </TableCell>
                </TableRow>
              ) : tasks?.length ? (
                tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div className="font-medium">{task.title}</div>
                      {task.description && <div className="text-xs text-muted-foreground">{task.description}</div>}
                    </TableCell>
                    <TableCell>{MODULE_LABELS[task.module_key as StaffPermissionModule] ?? task.module_key ?? "-"}</TableCell>
                    {isSuperAdmin && <TableCell>{staffNameById.get(task.assigned_to_user_id ?? "") ?? task.assigned_to_user_id ?? "-"}</TableCell>}
                    <TableCell><Badge variant="outline" className="capitalize">{task.priority}</Badge></TableCell>
                    <TableCell>{task.due_date ? format(new Date(task.due_date), "MMM d, HH:mm") : "-"}</TableCell>
                    <TableCell>
                      <Select value={task.status} onValueChange={(status) => updateTaskStatus.mutate({ id: task.id, status: status as AdminTask["status"] })}>
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 6 : 5} className="h-24 text-center text-muted-foreground">
                    No tasks found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
