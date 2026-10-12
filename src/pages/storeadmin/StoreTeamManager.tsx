import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  Trash2, 
  Loader2,
  CheckCircle2,
  XCircle,
  MoreVertical,
  AlertTriangle,
  Info,
  Check
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

type Permission = "manage_products" | "manage_accessories" | "manage_repairs" | "manage_exchange" | "manage_leads" | "view_analytics" | "edit_profile";

const ALL_PERMISSIONS: { id: Permission; label: string }[] = [
  { id: "manage_products", label: "Manage Products" },
  { id: "manage_accessories", label: "Manage Accessories" },
  { id: "manage_repairs", label: "Manage Repairs" },
  { id: "manage_exchange", label: "Manage Exchanges" },
  { id: "manage_leads", label: "Manage Leads" },
  { id: "view_analytics", label: "View Analytics" },
  { id: "edit_profile", label: "Edit Store Profile" },
];

export default function StoreTeamManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"manager" | "staff">("staff");
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPermissionsMember, setEditingPermissionsMember] = useState<any>(null);

  const { data: stores, isLoading: isStoresLoading } = useQuery({
    queryKey: ["my-stores-for-team", user?.id],
    queryFn: async () => {
      const { data: stores } = await supabase
        .from("stores")
        .select("id, name, package_id, store_packages(name, staff_limit)")
        .or(`owner_user_id.eq.${user?.id},owner_id.eq.${user?.id}`);
      
      if (stores && stores.length > 0 && !selectedStore) {
        setSelectedStore(stores[0].id);
      }
      return stores || [];
    },
  });

  const currentStore = useMemo(() => 
    stores?.find(s => s.id === selectedStore), 
  [stores, selectedStore]);

  const staffLimit = (currentStore?.store_packages as any)?.staff_limit || 0;

  const { data: team, isLoading: isTeamLoading } = useQuery({
    queryKey: ["store-team", selectedStore],
    queryFn: async () => {
      if (!selectedStore) return [];
      const { data, error } = await supabase
        .from("store_staff")
        .select(`
          *,
          profile:user_id (
            full_name,
            email
          )
        `)
        .eq("store_id", selectedStore);
      
      if (error) throw error;
      
      return data.map(member => ({
        ...member,
        display_name: (member.profile as any)?.full_name || "Unknown",
        email: (member.profile as any)?.email || "No email"
      }));
    },
    enabled: !!selectedStore,
  });

  const currentStaffCount = team?.length ?? 0;
  // Negative limits mean unlimited in the store-package contract.
  const isLimitReached = staffLimit >= 0 && currentStaffCount >= staffLimit;

  const addMemberMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStore || !newMemberEmail) return;
      setIsAdding(true);

      try {
        // 1. Check limits
        if (staffLimit >= 0 && (team?.length || 0) >= staffLimit) {
          throw new Error(`Staff limit reached for your package (${staffLimit})`);
        }

        // 2. Find user
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", newMemberEmail.toLowerCase().trim())
          .maybeSingle();

        if (!profile) throw new Error("User not found. They must have an account first.");

        // 3. Add
        const { error } = await supabase.from("store_staff").insert({
          store_id: selectedStore,
          user_id: profile.id,
          role: newMemberRole,
          permissions: selectedPermissions,
          status: "active"
        });

        if (error) throw error;
      } finally {
        setIsAdding(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-team", selectedStore] });
      toast.success("Team member added");
      setIsAddDialogOpen(false);
      setNewMemberEmail("");
      setSelectedPermissions([]);
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ id, permissions }: { id: string, permissions: Permission[] }) => {
      const { error } = await supabase.from("store_staff").update({ permissions }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-team", selectedStore] });
      toast.success("Permissions updated");
      setEditingPermissionsMember(null);
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_staff").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-team", selectedStore] });
      toast.success("Member removed");
    },
  });

  if (isStoresLoading) {
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
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground mt-1">Manage staff access and roles for your store.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" /> Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Invite a user to join your store team by their account email.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  placeholder="staff@example.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newMemberRole} onValueChange={(value: any) => setNewMemberRole(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager (Full Access)</SelectItem>
                    <SelectItem value="staff">Staff (Limited Access)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="grid grid-cols-1 gap-2">
                  {ALL_PERMISSIONS.map((perm) => (
                    <div key={perm.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`perm-${perm.id}`} 
                        checked={selectedPermissions.includes(perm.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedPermissions([...selectedPermissions, perm.id]);
                          else setSelectedPermissions(selectedPermissions.filter(p => p !== perm.id));
                        }}
                      />
                      <label htmlFor={`perm-${perm.id}`} className="text-sm font-medium leading-none cursor-pointer">
                        {perm.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {isLimitReached && (
                <div className="bg-destructive/10 p-3 rounded-md flex items-start gap-2 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>Staff limit reached ({staffLimit}). Upgrade your package to add more staff.</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => addMemberMutation.mutate()} 
                disabled={!newMemberEmail || isAdding || isLimitReached}
              >
                {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Package Entitlements
              </CardTitle>
              <Badge variant="secondary" className="capitalize">
                {currentStore?.store_packages?.name || "Free"} Plan
              </Badge>
            </div>
            <CardDescription>
              Your current package limits for team management.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Staff Members</span>
                <span className="font-medium">{currentStaffCount} / {staffLimit < 0 ? "Unlimited" : staffLimit}</span>
              </div>
              <Progress value={staffLimit > 0 ? (currentStaffCount / staffLimit) * 100 : staffLimit < 0 ? 100 : 0} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Quick Info
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-3 text-muted-foreground">
            <p>• <strong>Owners:</strong> Full control, billing access.</p>
            <p>• <strong>Managers:</strong> Team management, listing management.</p>
            <p>• <strong>Staff:</strong> Can post and manage store listings only.</p>
            <p className="pt-2 italic">Limits are strictly enforced based on your subscription tier.</p>
          </CardContent>
        </Card>
      </div>

      {stores.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {stores.map(store => (
            <Button
              key={store.id}
              variant={selectedStore === store.id ? "default" : "outline"}
              onClick={() => setSelectedStore(store.id)}
              className="whitespace-nowrap"
            >
              {store.name}
            </Button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Users className="h-4 w-4" /> Current Staff
          </CardTitle>
          <CardDescription>
            Only owners and managers can modify staff permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isTeamLoading ? (
            <div className="h-32 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Added On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team?.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{member.display_name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.role === 'manager' ? 'default' : 'outline'} className="capitalize">
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(member.permissions as Permission[])?.map(p => (
                          <Badge key={p} variant="secondary" className="text-[9px] h-4">
                            {ALL_PERMISSIONS.find(ap => ap.id === p)?.label || p}
                          </Badge>
                        ))}
                        {(!member.permissions || member.permissions.length === 0) && (
                          <span className="text-xs text-muted-foreground italic">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(member.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      {member.user_id !== user?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedPermissions(member.permissions || []);
                              setEditingPermissionsMember(member);
                            }}>
                              Edit Permissions
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                if (confirm("Are you sure you want to remove this member?")) {
                                  removeMemberMutation.mutate(member.id);
                                }
                              }}
                            >
                              Remove from Store
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {team?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No staff members added yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingPermissionsMember} onOpenChange={(open) => !open && setEditingPermissionsMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Permissions</DialogTitle>
            <DialogDescription>
              Update access levels for {editingPermissionsMember?.display_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-3">
              {ALL_PERMISSIONS.map((perm) => (
                <div key={perm.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`edit-perm-${perm.id}`} 
                    checked={selectedPermissions.includes(perm.id)}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedPermissions([...selectedPermissions, perm.id]);
                      else setSelectedPermissions(selectedPermissions.filter(p => p !== perm.id));
                    }}
                  />
                  <label htmlFor={`edit-perm-${perm.id}`} className="text-sm font-medium leading-none cursor-pointer">
                    {perm.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPermissionsMember(null)}>Cancel</Button>
            <Button 
              onClick={() => updatePermissionsMutation.mutate({ 
                id: editingPermissionsMember.id, 
                permissions: selectedPermissions 
              })}
              disabled={updatePermissionsMutation.isPending}
            >
              {updatePermissionsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
