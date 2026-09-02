import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Key, User, Check, Loader2, Search, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn, getErrorMessage } from "@/lib/utils";
import { 
  STAFF_PERMISSION_MODULES, 
  STAFF_PERMISSION_ACTIONS, 
  StaffPermissionModule, 
  StaffPermissionAction,
  StaffPermissions,
  getStaffPermissions
} from "@/lib/permissions";

export default function PermissionMatrix() {
  const queryClient = useQueryClient();
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [localPermissions, setLocalPermissions] = useState<StaffPermissions | null>(null);

  const { data: staffMembers, isLoading } = useQuery({
    queryKey: ["staff-permission-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          role,
          profiles:user_id (display_name),
          auth_users:user_id (email)
        `)
        .in("role", ["suadmin", "staffadmin"]);

      if (error) throw error;
      return data;
    }
  });

  const { data: permissions, isLoading: isLoadingPermissions } = useQuery({
    queryKey: ["staff-permissions", selectedStaffId],
    queryFn: () => selectedStaffId ? getStaffPermissions(selectedStaffId) : Promise.resolve(null),
    enabled: !!selectedStaffId,
  });

  useEffect(() => {
    if (permissions) {
      setLocalPermissions(JSON.parse(JSON.stringify(permissions)));
    }
  }, [permissions]);

  const savePermissionsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStaffId || !localPermissions) return;

      const currentUser = (await supabase.auth.getUser()).data.user;
      const updates = Object.entries(localPermissions).map(([moduleKey, perms]) => ({
        staff_user_id: selectedStaffId,
        module_key: moduleKey,
        can_view: perms.view,
        can_create: perms.create,
        can_edit: perms.edit,
        can_delete: perms.delete,
        can_approve: perms.approve,
        can_assign: perms.assign,
        can_export: perms.export,
        granted_by: currentUser?.id ?? null,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from("staff_permissions" as any)
        .upsert(updates, { onConflict: "staff_user_id,module_key" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-permissions", selectedStaffId] });
      toast.success("Permissions updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to save permissions: ${getErrorMessage(error)}`);
    }
  });

  const togglePermission = (module: StaffPermissionModule, action: StaffPermissionAction) => {
    if (!localPermissions) return;

    setLocalPermissions(prev => {
      if (!prev) return prev;
      const next = { ...prev };
      next[module] = { ...next[module], [action]: !next[module][action] };
      
      // If any action is enabled, ensure 'view' is also enabled
      if (action !== 'view' && next[module][action] && !next[module].view) {
        next[module].view = true;
      }
      
      return next;
    });
  };

  const selectedStaff = staffMembers?.find(s => s.user_id === selectedStaffId);
  const isSuAdmin = selectedStaff?.role === "suadmin";

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Permission Matrix</h1>
        <p className="text-muted-foreground">
          Granular access control for staff administrators.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <Card className="md:col-span-4 lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-4 w-4" />
              Staff Members
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search staff..." 
                className="pl-8 h-9" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
                </div>
              ) : (
                <div className="divide-y">
                  {staffMembers?.filter(s => 
                    s.profiles?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.auth_users?.email?.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((staff) => (
                    <button
                      key={staff.user_id}
                      onClick={() => setSelectedStaffId(staff.user_id)}
                      className={cn(
                        "w-full text-left p-4 hover:bg-muted/50 transition-colors flex flex-col gap-1",
                        selectedStaffId === staff.user_id && "bg-muted"
                      )}
                    >
                      <span className="font-medium text-sm">{staff.profiles?.display_name || "Admin"}</span>
                      <span className="text-xs text-muted-foreground">{staff.auth_users?.email}</span>
                      <Badge variant={staff.role === "suadmin" ? "default" : "secondary"} className="w-fit mt-1 text-[10px] h-4 px-1 capitalize">
                        {staff.role}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-8 lg:col-span-9">
          {!selectedStaffId ? (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="p-4 bg-muted rounded-full">
                <Shield className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="max-w-[300px] space-y-2">
                <h3 className="font-bold text-xl">Select Staff Member</h3>
                <p className="text-muted-foreground">
                  Choose a staff administrator from the list to manage their module-level access and action permissions.
                </p>
              </div>
            </div>
          ) : (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{selectedStaff?.profiles?.display_name || "Admin"}</CardTitle>
                    <CardDescription>{selectedStaff?.auth_users?.email}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => savePermissionsMutation.mutate()}
                      disabled={savePermissionsMutation.isPending || isSuAdmin}
                    >
                      {savePermissionsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isSuAdmin ? (
                  <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Shield className="h-8 w-8 text-primary" />
                    </div>
                    <div className="max-w-[400px]">
                      <h4 className="font-bold text-lg">Super Admin Account</h4>
                      <p className="text-sm text-muted-foreground">
                        Super admins have full access to all modules and actions by default. Permissions cannot be restricted for these accounts.
                      </p>
                    </div>
                  </div>
                ) : isLoadingPermissions ? (
                  <div className="p-12 flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="p-6 space-y-6">
                      <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3">
                        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-700">
                          Toggle permissions for each module. Enabling any action (Create, Edit, Delete, etc.) will automatically enable <strong>View</strong> access for that module.
                        </p>
                      </div>
                      <div className="grid gap-4">
                        {STAFF_PERMISSION_MODULES.map((moduleKey) => (
                          <div
                            key={moduleKey}
                            className="flex items-start space-x-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                          >
                            <Checkbox 
                              id={`${moduleKey}-view`} 
                              checked={localPermissions?.[moduleKey]?.view || false}
                              onCheckedChange={() => togglePermission(moduleKey as StaffPermissionModule, 'view')}
                            />
                            <div className="grid gap-1.5 leading-none w-full">
                              <div className="flex items-center justify-between">
                                <label
                                  htmlFor={`${moduleKey}-view`}
                                  className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer"
                                >
                                  {moduleKey.replace(/_/g, ' ')}
                                </label>
                                <Badge variant="outline" className="text-[10px] h-4 px-1">
                                  Module
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-x-6 gap-y-3 mt-4 pt-4 border-t">
                                {STAFF_PERMISSION_ACTIONS.filter(a => a !== 'view').map(action => (
                                  <label 
                                    key={action} 
                                    className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                                  >
                                    <Checkbox 
                                      className="h-4 w-4" 
                                      checked={localPermissions?.[moduleKey]?.[action] || false}
                                      onCheckedChange={() => togglePermission(moduleKey as StaffPermissionModule, action)}
                                    />
                                    <span className="capitalize">{action}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
