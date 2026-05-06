import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Users, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { STAFF_PERMISSION_ACTIONS, STAFF_PERMISSION_MODULES, type StaffPermissionAction, type StaffPermissionModule } from "@/lib/permissions";

const MODULE_LABELS: Record<StaffPermissionModule, string> = {
  price_list: "Price List",
  brands: "Brands",
  device_verification: "Device Verification",
  stores: "Stores",
  subscriptions: "Subscriptions",
  marketplace: "Marketplace",
  orders: "Orders",
  payments: "Payments",
  payouts: "Payouts",
  valuation: "Valuation",
  repairs: "Repairs",
  unlocking: "Unlocking",
  content: "Content",
  users: "Users",
  analytics: "Analytics",
  settings: "Settings",
};

type PermissionRow = {
  id?: string;
  user_id: string;
  module_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_assign: boolean;
  can_export: boolean;
};

export default function PermissionMatrix() {
  const queryClient = useQueryClient();
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);

  const { data: staffAdmins, isLoading: isStaffLoading } = useQuery({
    queryKey: ["staff-admins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "staffadmin");

      if (error) throw error;

      const { data: users, error: userError } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", data?.map(r => r.user_id) || []);

      if (userError) throw userError;
      return data.map(staff => ({
        ...staff,
        display_name: users?.find(u => u.user_id === staff.user_id)?.display_name || "Unknown"
      }));
    },
  });

  const { data: permissions, isLoading: isPermsLoading } = useQuery({
    queryKey: ["staff-permissions", selectedStaff],
    queryFn: async () => {
      if (!selectedStaff) return [];
      const { data, error } = await supabase
        .from("staffadmin_permissions")
        .select("*")
        .eq("user_id", selectedStaff);
      if (error) throw error;
      return data as PermissionRow[];
    },
    enabled: !!selectedStaff,
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async (payload: Partial<PermissionRow> & { user_id: string; module_key: string }) => {
      const { error } = await supabase
        .from("staffadmin_permissions")
        .upsert(payload, { onConflict: "user_id,module_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-permissions", selectedStaff] });
      toast.success("Permissions updated successfully");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to update permissions");
    }
  });

  const togglePermission = (moduleKey: StaffPermissionModule, action: StaffPermissionAction, currentValue: boolean) => {
    if (!selectedStaff) return;
    
    const existing = permissions?.find(p => p.module_key === moduleKey);
    const field = `can_${action}` as keyof PermissionRow;
    const payload = {
      ...(existing || {})
    } as PermissionRow;
    payload.user_id = selectedStaff;
    payload.module_key = moduleKey;
    payload[field] = !currentValue;
    
    updatePermissionMutation.mutate(payload);
  };

  if (isStaffLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Permission Matrix</h1>
          <p className="text-muted-foreground mt-1">Granular access control for staff administrators.</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="h-4 w-4" /> Staff Members
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {staffAdmins?.map((staff) => (
                <button
                  key={staff.user_id}
                  onClick={() => setSelectedStaff(staff.user_id)}
                  className={cn(
                    "w-full text-left px-4 py-3 text-sm transition-colors hover:bg-muted/50",
                    selectedStaff === staff.user_id ? "bg-primary/5 text-primary font-medium border-l-2 border-primary" : ""
                  )}
                >
                  {staff.display_name}
                </button>
              ))}
              {staffAdmins?.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No staff admins found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Shield className="h-4 w-4" /> 
              {selectedStaff ? "Module Access Control" : "Select a staff member"}
            </CardTitle>
            <CardDescription>
              Grant or revoke specific action permissions for platform modules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedStaff ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                <Shield className="h-12 w-12 mb-2 opacity-20" />
                <p>Select a staff member from the list to manage their permissions.</p>
              </div>
            ) : isPermsLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Module</TableHead>
                    {STAFF_PERMISSION_ACTIONS.map((action) => (
                      <TableHead key={action} className="text-center capitalize">{action}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {STAFF_PERMISSION_MODULES.map((moduleKey) => {
                    const perm = permissions?.find(p => p.module_key === moduleKey) || {
                      can_view: false,
                      can_create: false,
                      can_edit: false,
                      can_delete: false,
                      can_approve: false,
                      can_assign: false,
                      can_export: false,
                    };
                    return (
                      <TableRow key={moduleKey}>
                        <TableCell className="font-medium">{MODULE_LABELS[moduleKey]}</TableCell>
                        {STAFF_PERMISSION_ACTIONS.map((action) => {
                          const field = `can_${action}` as keyof PermissionRow;
                          const checked = Boolean(perm[field]);
                          return (
                            <TableCell key={action} className="text-center">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => togglePermission(moduleKey, action, checked)}
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
