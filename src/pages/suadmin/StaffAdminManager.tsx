import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Mail, User, Trash2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRoleBadgeVariant, getRoleLabel } from "@/lib/roles";

export default function StaffAdminManager() {
  const queryClient = useQueryClient();
  const [newStaffEmail, setNewStaffEmail] = useState("");

  const { data: staff, isLoading } = useQuery({
    queryKey: ["staff-admins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          role,
          profiles:user_id (display_name, avatar_url),
          auth_users:user_id (email)
        `)
        .in("role", ["suadmin", "staffadmin"]);

      if (error) throw error;
      return data;
    }
  });

  const addStaffMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string, role: string }) => {
      const { error } = await supabase.rpc("grant_role_by_email", {
        p_email: email,
        p_role: role
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-admins"] });
      toast.success("Staff admin added successfully");
      setNewStaffEmail("");
    },
    onError: (error: any) => {
      toast.error(`Failed to add staff: ${error.message}`);
    }
  });

  const removeStaffMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .in("role", ["suadmin", "staffadmin"]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-admins"] });
      toast.success("Staff access revoked");
    },
    onError: (error: any) => {
      toast.error(`Failed to revoke access: ${error.message}`);
    }
  });

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Staff Admin Management</h1>
        <p className="text-muted-foreground">
          Manage platform staff and their access levels.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add Staff Member</CardTitle>
            <CardDescription>Grant administrative access to an existing user by email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <div className="flex gap-2">
                <Input 
                  placeholder="staff@tamrakar.com" 
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                />
                <Button 
                  onClick={() => addStaffMutation.mutate({ email: newStaffEmail, role: "staffadmin" })}
                  disabled={addStaffMutation.isPending || !newStaffEmail}
                >
                  {addStaffMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff Overview</CardTitle>
            <CardDescription>Current platform administrators and managers.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff?.map((s: any) => (
                      <TableRow key={s.user_id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{s.profiles?.display_name || "Admin"}</span>
                            <span className="text-xs text-muted-foreground">{s.auth_users?.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(s.role)}>
                            {getRoleLabel(s.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive"
                            onClick={() => removeStaffMutation.mutate(s.user_id)}
                            disabled={removeStaffMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {staff?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                          No staff members found.
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
    </div>
  );
}
