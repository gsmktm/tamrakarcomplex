import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Store, User, Mail, Shield, Trash2, Plus, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StoreAdminManager() {
  const queryClient = useQueryClient();
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const { data: stores } = useQuery({
    queryKey: ["all-stores-for-admin-assign"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name").order("name");
      if (error) throw error;
      return data;
    }
  });

  const { data: storeAdmins, isLoading } = useQuery({
    queryKey: ["store-admins-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_admins")
        .select(`
          user_id,
          store_id,
          profiles:user_id (display_name),
          stores:store_id (name),
          auth_users:user_id (email)
        `);

      if (error) throw error;
      return data;
    }
  });

  const addAdminMutation = useMutation({
    mutationFn: async ({ email, storeId }: { email: string, storeId: string }) => {
      // 1. Grant storeadmin role
      const { error: roleError } = await supabase.rpc("grant_role_by_email", {
        p_email: email,
        p_role: "storeadmin"
      });
      if (roleError) throw roleError;

      // Better: let's assume the user exists and we use an RPC that handles both
      const { error: linkError } = await supabase.rpc("assign_store_admin_by_email", {
        p_email: email,
        p_store_id: storeId
      });
      if (linkError) throw linkError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-admins-list"] });
      toast.success("Store administrator assigned successfully");
      setNewAdminEmail("");
      setSelectedStoreId(null);
    },
    onError: (error: any) => {
      toast.error(`Assignment failed: ${error.message}`);
    }
  });

  const removeAdminMutation = useMutation({
    mutationFn: async ({ userId, storeId }: { userId: string, storeId: string }) => {
      const { error } = await supabase
        .from("store_admins")
        .delete()
        .eq("user_id", userId)
        .eq("store_id", storeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-admins-list"] });
      toast.success("Administrator removed from store");
    },
    onError: (error: any) => {
      toast.error(`Failed to remove: ${error.message}`);
    }
  });

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Store Admin Management</h1>
        <p className="text-muted-foreground">
          Manage store owners and their administrative staff.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assign Store Admin</CardTitle>
            <CardDescription>Grant store-level access to an existing user.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">User Email</label>
              <Input 
                placeholder="owner@store.com" 
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign to Store</label>
              <Select onValueChange={setSelectedStoreId} value={selectedStoreId || undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {stores?.map(store => (
                    <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              className="w-full"
              onClick={() => selectedStoreId && addAdminMutation.mutate({ email: newAdminEmail, storeId: selectedStoreId })}
              disabled={addAdminMutation.isPending || !newAdminEmail || !selectedStoreId}
            >
              {addAdminMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Assign Administrator
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Store Admins</CardTitle>
            <CardDescription>Users with administrative access to specific stores.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admin</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storeAdmins?.map((s: any) => (
                      <TableRow key={`${s.user_id}-${s.store_id}`}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{s.profiles?.display_name || "Store Admin"}</span>
                            <span className="text-xs text-muted-foreground">{s.auth_users?.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{s.stores?.name}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive"
                            onClick={() => removeAdminMutation.mutate({ userId: s.user_id, storeId: s.store_id })}
                            disabled={removeAdminMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {storeAdmins?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                          No store administrators assigned.
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

