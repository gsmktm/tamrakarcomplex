import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Loader2, Trash2, Search, ShieldOff, AlertCircle, 
  CheckCircle2, UserPlus, Info, Mail, Lock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getRoleBadgeVariant, getRoleLabel, isAdminRole, mapLegacyRole, normalizeRole } from "@/lib/roles";
import { getErrorMessage } from "@/lib/utils";
import type { AdminUserRecord, AppRole } from "@/types/app";

type UserManagerDataSource = "secure_rpc" | "profiles_fallback";

const UserManager = () => {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [manageOpen, setManageOpen] = useState(false);
  const [manageRole, setManageRole] = useState<AppRole>("user");
  const [manageEmail, setManageEmail] = useState<string>("");
  const [manageName, setManageName] = useState<string>("");
  const [manageId, setManageId] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("staffadmin");
  const [addUserEmail, setAddUserEmail] = useState("");
  const [addUserPassword, setAddUserPassword] = useState("");
  const [addUserRole, setAddUserRole] = useState<AppRole>("user");
  const [addUserName, setAddUserName] = useState("");

  // ✅ Confirmation dialog state for revoke-roles action
  const [revokeTarget, setRevokeTarget] = useState<AdminUserRecord | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRecord | null>(null);

  const [dataSource, setDataSource] = useState<UserManagerDataSource>("secure_rpc");

  const { data: users, isLoading, error } = useQuery<AdminUserRecord[]>({
    queryKey: ["admin_users"],
    queryFn: async () => {
      console.info("Fetching admin users list via secure RPC...");
      const { data, error } = await supabase.rpc("get_admin_users_list_secure");

      if (error) {
        console.warn("Secure RPC failed, falling back to profiles:", error.message);
        const { data: fallbackProfiles, error: fallbackError } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .order("created_at", { ascending: false });

        if (fallbackError) {
          console.error("Fallback profiles fetch also failed:", fallbackError.message);
          throw fallbackError;
        }

        setDataSource("profiles_fallback");
        return (fallbackProfiles || []).map((profile) => ({
          id: profile.user_id,
          full_name: profile.display_name || "Unknown",
          avatar_url: profile.avatar_url,
          email: null,
          phone: null,
          role: "user" as AppRole,
        }));
      }

      console.info("Secure RPC successful. Users found:", data?.length || 0);
      setDataSource("secure_rpc");
      return (data || []).map((u) => ({
        id: u.id,
        full_name: u.full_name,
        avatar_url: u.avatar_url,
        email: u.email,
        phone: null,
        role: normalizeRole(u.role),
      }));
    },
    retry: 1,
  });

  const { data: myRoles } = useQuery<AppRole[]>({
    queryKey: ["current-user-roles", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", currentUser.id);
      if (error) throw error;
      // Consistent with the main users query, use mapLegacyRole for database role strings
      return (data || []).map((r) => normalizeRole(r.role));
    },
    enabled: !!currentUser?.id,
  });

  const canManage = (myRoles || []).some((role) => isAdminRole(role));
  const canGrantSuperAdmin = (myRoles || []).some((role) => role === "suadmin");

  const availableRoleOptions: AppRole[] = canGrantSuperAdmin
    ? ["suadmin", "staffadmin", "storeadmin", "user"]
    : ["staffadmin", "storeadmin", "user"];

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.rpc("manage_user_role", {
        target_user_id: userId,
        new_role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      toast.success("User role updated successfully.");
      setManageOpen(false);
    },
    onError: (error: unknown) => {
      toast.error(`Error updating role: ${getErrorMessage(error)}`);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("delete_user", {
        target_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      toast.success("User permanently deleted.");
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    },
    onError: (error: unknown) => {
      toast.error(`Error deleting user: ${getErrorMessage(error)}`);
    },
  });

  const grantRoleByEmailMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      const { error } = await supabase.rpc("grant_role_by_email", { p_email: email, p_role: role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role granted successfully");
      setInviteEmail("");
      setInviteRole("staffadmin");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error);

      if (message.includes("user_not_found")) {
        toast.error("That user does not exist yet. Ask them to register or sign in first.");
        return;
      }
      if (message.includes("cannot_self_manage_role")) {
        toast.error("Use another super admin account to change your own role.");
        return;
      }
      if (message.includes("not_authorized_super_admin")) {
        toast.error("Only super admins can grant the Super Admin role.");
        return;
      }
      toast.error(`Failed to grant role: ${message}`);
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (_values: { email: string; password: string; role: AppRole; name: string }) => {
      throw new Error("Direct password-based user creation is disabled in production. Ask the user to register, then grant the role by email.");
    },
    onSuccess: () => {
      toast.success("User created successfully");
      setAddUserEmail("");
      setAddUserPassword("");
      setAddUserRole("user");
      setAddUserName("");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (error: unknown) => {
      toast.error(`Failed to create user: ${getErrorMessage(error)}`);
    },
  });

  // ✅ Fixed: renamed to "Revoke All Roles" — this does NOT delete the auth user
  const revokeRolesMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("manage_user_role", {
        target_user_id: userId,
        new_role: "user",
        action: "delete",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      toast.success("All roles revoked. User is now a standard public user.");
      setRevokeDialogOpen(false);
      setRevokeTarget(null);
    },
    onError: (error: unknown) => {
      toast.error(`Error revoking roles: ${getErrorMessage(error)}`);
    },
  });

  const filteredUsers = (users ?? []).filter(
    (user) =>
      (user.full_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (user.email?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (user.id || "").includes(search),
  );

  const displayName = (user: AdminUserRecord) =>
    user.full_name && user.full_name !== "Unknown" ? user.full_name : user.email || "Unknown User";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">User Management</h2>
          <p className="text-sm text-muted-foreground">View and manage all registered users and their roles.</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search users by name, email or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {canManage ? (
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="mb-4">
            <h3 className="text-base font-semibold">Add New User</h3>
            <p className="text-sm text-muted-foreground">
              Create a new user account with email and password.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              type="email"
              placeholder="Email"
              value={addUserEmail}
              onChange={(e) => setAddUserEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              value={addUserPassword}
              onChange={(e) => setAddUserPassword(e.target.value)}
            />
            <Input
              placeholder="Full Name"
              value={addUserName}
              onChange={(e) => setAddUserName(e.target.value)}
            />
            <Select value={addUserRole} onValueChange={(value) => setAddUserRole(value as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {getRoleLabel(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              onClick={() => createUserMutation.mutate({
                email: addUserEmail,
                password: addUserPassword,
                role: addUserRole,
                name: addUserName
              })}
              disabled={createUserMutation.isPending || !addUserEmail.trim() || !addUserPassword.trim()}
            >
              {createUserMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Create User
            </Button>
          </div>
        </div>
      ) : null}

      {canManage ? (
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-4">
            <h3 className="text-base font-semibold">Grant Access By Email</h3>
            <p className="text-sm text-muted-foreground">
              Promote an existing registered user without exposing passwords. The user must already have an account.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
            <Input
              type="email"
              placeholder="user@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {getRoleLabel(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => grantRoleByEmailMutation.mutate({ email: inviteEmail, role: inviteRole })}
              disabled={grantRoleByEmailMutation.isPending || !inviteEmail.trim()}
            >
              {grantRoleByEmailMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Grant Access
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Admins can grant standard roles. Only super admins can grant or manage super-admin access.
          </p>
        </div>
      ) : null}

      {dataSource === "profiles_fallback" ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
          Showing profile-based fallback data — email addresses and roles require a valid admin session with the{" "}
          <code>get_admin_users_list_secure()</code> database function available.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load registered users: {getErrorMessage(error)}.
        </div>
      ) : null}

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Avatar</TableHead>
              <TableHead>User Details</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-destructive">
                  Could not load user records.
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name || ""}
                        className="h-10 w-10 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold border">
                        {displayName(user)[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{displayName(user)}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {user.email || (
                          <span className="text-muted-foreground/40 italic flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5" /> Email Hidden (Secure)
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">ID: {user.id}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {dataSource === "profiles_fallback" ? (
                      <div className="flex items-center gap-1.5 text-muted-foreground/40 italic text-xs">
                        <Lock className="h-3 w-3" /> Role Protected
                      </div>
                    ) : (
                      <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                        {getRoleLabel(user.role)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canManage &&
                        currentUser?.id !== user.id &&
                        (canGrantSuperAdmin || normalizeRole(user.role) !== "suadmin") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setManageId(user.id);
                              setManageEmail(user.email || "");
                              setManageName(displayName(user));
                              setManageRole(normalizeRole(user.role));
                              setManageOpen(true);
                            }}
                          >
                            Edit Role
                          </Button>
                        )}
                      {canManage && currentUser?.id !== user.id && dataSource !== "profiles_fallback" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-amber-700 hover:text-amber-800 hover:bg-amber-500/10"
                          onClick={() => {
                            setRevokeTarget(user);
                            setRevokeDialogOpen(true);
                          }}
                          disabled={revokeRolesMutation.isPending}
                        >
                          <ShieldOff className="h-4 w-4" />
                          Revoke Roles
                        </Button>
                      ) : null}
                      {canGrantSuperAdmin && currentUser?.id !== user.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                          onClick={() => {
                            setDeleteTarget(user);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={deleteUserMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete User
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-1 bg-muted/50 p-3 rounded-md border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Selected User</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{manageName}</span>
                <span className="text-muted-foreground text-sm">({manageEmail})</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Assign Role</Label>
              <Select value={manageRole} onValueChange={(value) => setManageRole(value as AppRole)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoleOptions.includes("suadmin") ? (
                    <SelectItem value="suadmin">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Super Admin</Badge>
                        <span>Full System Access</span>
                      </div>
                    </SelectItem>
                  ) : null}
                  <SelectItem value="staffadmin">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="h-5 px-1.5 text-[10px]">Staff Admin</Badge>
                      <span>System Management</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="storeadmin">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Store Admin</Badge>
                      <span>Manage Store & Products</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">User</Badge>
                      <span>Standard Access</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!manageId) return;
                assignRoleMutation.mutate({ userId: manageId, role: manageRole });
              }}
              disabled={assignRoleMutation.isPending}
            >
              {assignRoleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Roles Confirmation Dialog */}
      <AlertDialog
        open={revokeDialogOpen}
        onOpenChange={(open) => {
          setRevokeDialogOpen(open);
          if (!open) setRevokeTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-amber-600" />
              Revoke All Roles?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes all roles for{" "}
              <strong>{revokeTarget ? displayName(revokeTarget) : "this user"}</strong> and makes them a{" "}
              <strong>standard user</strong>. Their auth account is not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 text-white hover:bg-amber-600/90"
              onClick={() => revokeTarget && revokeRolesMutation.mutate(revokeTarget.id)}
              disabled={revokeRolesMutation.isPending}
            >
              {revokeRolesMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Revoke Roles
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete User Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Permanently Delete User?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{deleteTarget ? displayName(deleteTarget) : "this user"}</strong> from the entire system,
              including their authentication record, profile, and all assigned roles.
              <br /><br />
              <span className="font-bold text-red-600 uppercase text-xs">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteUserMutation.mutate(deleteTarget.id)}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManager;
