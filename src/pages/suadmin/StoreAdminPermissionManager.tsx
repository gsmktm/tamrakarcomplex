import { useState } from "react";
import { Shield, Key, User, Store, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";

interface StoreAdmin {
  user_id: string;
  store_id: string;
  full_name: string;
  store_name: string;
  permissions: string[];
}

const AVAILABLE_PERMISSIONS = [
  { id: "products", label: "Inventory Management", description: "Create, edit and delete products" },
  { id: "orders", label: "Order Processing", description: "View and update customer orders" },
  { id: "leads", label: "Lead Management", description: "Manage customer inquiries and leads" },
  { id: "settings", label: "Store Settings", description: "Modify store profile and configuration" },
  { id: "branding", label: "Media & Branding", description: "Manage store logo, banner and theme" },
  { id: "staff", label: "Staff Management", description: "Manage store staff members" },
  { id: "payouts", label: "Financial Access", description: "View and request payouts" },
];

export default function StoreAdminPermissionManager() {
  const queryClient = useQueryClient();
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

  const { data: admins, isLoading } = useQuery({
    queryKey: ["store-admins-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_admins")
        .select(`
          user_id,
          store_id,
          permissions,
          profiles:user_id (display_name),
          stores:store_id (name)
        `);

      if (error) throw error;
      
      return (data || []).map((d: any) => ({
        user_id: d.user_id,
        store_id: d.store_id,
        full_name: d.profiles?.display_name || "Unknown Admin",
        store_name: d.stores?.name || "Unknown Store",
        permissions: d.permissions || []
      })) as StoreAdmin[];
    }
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ userId, storeId, permissions }: { userId: string, storeId: string, permissions: string[] }) => {
      const { error } = await supabase
        .from("store_admins")
        .update({ permissions })
        .eq("user_id", userId)
        .eq("store_id", storeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-admins-permissions"] });
      toast.success("Permissions updated successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to update permissions: ${error.message}`);
    }
  });

  const selectedAdmin = admins?.find(a => `${a.user_id}-${a.store_id}` === selectedAdminId);

  const handleTogglePermission = (permissionId: string) => {
    if (!selectedAdmin) return;
    
    const currentPermissions = selectedAdmin.permissions;
    const newPermissions = currentPermissions.includes(permissionId)
      ? currentPermissions.filter(p => p !== permissionId)
      : [...currentPermissions, permissionId];
    
    updatePermissionsMutation.mutate({
      userId: selectedAdmin.user_id,
      storeId: selectedAdmin.store_id,
      permissions: newPermissions
    });
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Store Permissions</h1>
        <p className="text-muted-foreground">
          Manage granular access control for store-level administrators.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <Card className="md:col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-4 w-4" />
              Store Admins
            </CardTitle>
            <CardDescription>Select an admin to manage</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : admins?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No store admins found.
                </div>
              ) : (
                <div className="divide-y">
                  {admins?.map((admin) => (
                    <button
                      key={`${admin.user_id}-${admin.store_id}`}
                      onClick={() => setSelectedAdminId(`${admin.user_id}-${admin.store_id}`)}
                      className={cn(
                        "w-full text-left p-4 hover:bg-muted/50 transition-colors flex flex-col gap-1",
                        selectedAdminId === `${admin.user_id}-${admin.store_id}` && "bg-muted"
                      )}
                    >
                      <span className="font-medium text-sm">{admin.full_name}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Store className="h-3 w-3" />
                        {admin.store_name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-8 lg:col-span-9">
          {!selectedAdminId ? (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="p-4 bg-muted rounded-full">
                <Shield className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="max-w-[300px] space-y-2">
                <h3 className="font-bold text-xl">Select an Admin</h3>
                <p className="text-muted-foreground">
                  Choose a store administrator from the list to view and manage their specific platform permissions.
                </p>
              </div>
            </div>
          ) : (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{selectedAdmin?.full_name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Store className="h-3.5 w-3.5" />
                      Administrator for {selectedAdmin?.store_name}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="px-3 py-1">
                    {selectedAdmin?.permissions.length} Active Permissions
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="grid gap-4">
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <div
                        key={perm.id}
                        className="flex items-start space-x-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                      >
                        <Checkbox
                          id={perm.id}
                          checked={selectedAdmin?.permissions.includes(perm.id)}
                          onCheckedChange={() => handleTogglePermission(perm.id)}
                          disabled={updatePermissionsMutation.isPending}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={perm.id}
                            className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {perm.label}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {perm.description}
                          </p>
                        </div>
                        {selectedAdmin?.permissions.includes(perm.id) && (
                          <div className="ml-auto">
                            <Check className="h-4 w-4 text-green-500" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

