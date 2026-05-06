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
  Info
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
import { getStoreEntitlements, resolveEffectiveStorePackage } from "@/lib/storeEntitlements";

export default function StoreTeamManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"manager" | "staff">("staff");
  const [isAdding, setIsAdding] = useState(false);

  const { data: stores, isLoading: isStoresLoading } = useQuery({
    queryKey: ["my-stores-for-team", user?.id],
    queryFn: async () => {
      const { data: memberships } = await supabase
        .from("store_admins")
        .select("store_id")
        .eq("user_id", user?.id)
        .eq("role", "owner");
      
      const { data: stores } = await supabase
        .from("stores")
        .select("id, name, package_slug, subscription_status, subscription_end_date")
        .in("id", memberships?.map(m => m.store_id) || []);
      
      if (stores && stores.length > 0 && !selectedStore) {
        setSelectedStore(stores[0].id);
      }
      return stores || [];
    },
  });

  const currentStore = useMemo(() => 
    stores?.find(s => s.id === selectedStore), 
  [stores, selectedStore]);

  const entitlements = useMemo(() => 
    getStoreEntitlements(currentStore ? resolveEffectiveStorePackage(currentStore) : "free"),
  [currentStore]);

  const { data: team, isLoading: isTeamLoading } = useQuery({
    queryKey: ["store-team", selectedStore],
    queryFn: async () => {
      if (!selectedStore) return [];
      const { data, error } = await supabase
        .from("store_admins")
        .select(`
          *,
          profile:user_id (
            display_name,
            email
          )
        `)
        .eq("store_id", selectedStore);
      
      if (error) throw error;
      
      return data.map(member => ({
        ...member,
        display_name: (member.profile as any)?.display_name || "Unknown",
        email: (member.profile as any)?.email || "No email"
      }));
    },
    enabled: !!selectedStore,
  });

  const stats = useMemo(() => {
    if (!team) return { managers: 0, staff: 0 };
    return {
      managers: team.filter(m => m.role === "owner" || m.role === "manager").length,
      staff: team.filter(m => m.role === "staff").length
    };
  }, [team]);

  const addMemberMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStore || !newMemberEmail) return;
      setIsAdding(true);

      try {
        // 1. Check limits first
        if (newMemberRole === "manager" && stats.managers >= entitlements.adminUserLimit) {
          throw new Error(`Admin limit reached for ${currentStore?.package_slug} package (${entitlements.adminUserLimit})`);
        }
        if (newMemberRole === "staff" && stats.staff >= entitlements.staffMemberLimit) {
          throw new Error(`Staff limit reached for ${currentStore?.package_slug} package (${entitlements.staffMemberLimit})`);
        }

        // 2. Find user by email
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", newMemberEmail.toLowerCase().trim())
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profiles) throw new Error("User not found. They must have a Tamrakar account first.");

        // 3. Add to store_admins
        const { error: insertError } = await supabase
          .from("store_admins")
          .insert({
            store_id: selectedStore,
            user_id: profiles.user_id,
            role: newMemberRole,
            status: "active"
          });

        if (insertError) {
          if (insertError.code === "23505") {
            throw new Error("This user is already a member of this store team.");
          }
          throw insertError;
        }
      } finally {
        setIsAdding(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-team", selectedStore] });
      toast.success("Team member added successfully");
      setIsAddDialogOpen(false);
      setNewMemberEmail("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add team member");
    }
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string, role?: string, status?: string }) => {
      // If changing role, check limits
      if (updates.role) {
        if ((updates.role === "manager" || updates.role === "owner") && stats.managers >= entitlements.adminUserLimit) {
           // Find if we are replacing a manager role or adding one
           const member = team?.find(m => m.id === id);
           if (member?.role === "staff") {
             throw new Error(`Admin limit reached for ${currentStore?.package_slug} package`);
           }
        }
        if (updates.role === "staff" && stats.staff >= entitlements.staffMemberLimit) {
           const member = team?.find(m => m.id === id);
           if (member?.role !== "staff") {
             throw new Error(`Staff limit reached for ${currentStore?.package_slug} package`);
           }
        }
      }

      const { error } = await supabase.from("store_admins").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-team", selectedStore] });
      toast.success("Member updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update member");
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_admins").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-team", selectedStore] });
      toast.success("Member removed successfully");
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
                    <SelectItem value="manager">Manager (Admin Access)</SelectItem>
                    <SelectItem value="staff">Staff (Standard Access)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Managers can manage team, listings and settings. Staff can only manage listings.
                </p>
              </div>

              {newMemberRole === "manager" && stats.managers >= entitlements.adminUserLimit && (
                <div className="bg-destructive/10 p-3 rounded-md flex items-start gap-2 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>Manager limit reached ({entitlements.adminUserLimit}). Upgrade your package to add more admins.</p>
                </div>
              )}
              {newMemberRole === "staff" && stats.staff >= entitlements.staffMemberLimit && (
                <div className="bg-destructive/10 p-3 rounded-md flex items-start gap-2 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>Staff limit reached ({entitlements.staffMemberLimit}). Upgrade your package to add more staff.</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => addMemberMutation.mutate()} 
                disabled={
                  !newMemberEmail || 
                  isAdding || 
                  (newMemberRole === "manager" && stats.managers >= entitlements.adminUserLimit) ||
                  (newMemberRole === "staff" && stats.staff >= entitlements.staffMemberLimit)
                }
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
                {currentStore?.package_slug || "free"} Plan
              </Badge>
            </div>
            <CardDescription>
              Your current package limits for team management.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Admins/Managers</span>
                <span className="font-medium">{stats.managers} / {entitlements.adminUserLimit}</span>
              </div>
              <Progress value={(stats.managers / entitlements.adminUserLimit) * 100} className="h-1.5" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Staff Members</span>
                <span className="font-medium">{stats.staff} / {entitlements.staffMemberLimit}</span>
              </div>
              <Progress value={entitlements.staffMemberLimit > 0 ? (stats.staff / entitlements.staffMemberLimit) * 100 : 0} className="h-1.5" />
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
                  <TableHead>Status</TableHead>
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
                      <Badge variant={member.role === 'owner' ? 'default' : member.role === 'manager' ? 'secondary' : 'outline'} className="capitalize">
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {member.status === 'active' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="text-sm capitalize">{member.status}</span>
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
                            <DropdownMenuItem onClick={() => updateMemberMutation.mutate({ id: member.id, role: 'manager' })}>
                              Promote to Manager
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateMemberMutation.mutate({ id: member.id, role: 'staff' })}>
                              Demote to Staff
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => updateMemberMutation.mutate({ id: member.id, status: member.status === 'active' ? 'inactive' : 'active' })}
                            >
                              {member.status === 'active' ? "Deactivate" : "Reactivate"}
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
    </div>
  );
}
