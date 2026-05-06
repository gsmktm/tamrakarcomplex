/**
 * Staff Admin - Store Management Page
 * 
 * Staff admins can manage stores they have permission to manage
 * Cannot change packages or subscription status
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isAdminRole } from "@/lib/roles";
import type { Store, StoreUpdateInput } from "@/types/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  Loader2,
  MapPin,
  Phone,
  Search,
  Shield,
  X,
} from "lucide-react";

interface ManagedStore extends Store {
  permission: string;
}

export default function StaffAdminStores() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editingStore, setEditingStore] = useState<string | null>(null);
  const [editData, setEditData] = useState<StoreUpdateInput>({});

  // Fetch stores this staff admin can manage
  const { data: stores = [], isLoading, refetch } = useQuery<ManagedStore[]>({
    queryKey: ["staffadmin-stores", user?.id, search],
    queryFn: async () => {
      if (!user) throw new Error("No user");

      // Get stores where this user has management permissions
      const { data, error } = await supabase
        .from("store_permissions")
        .select("store_id, permission")
        .eq("user_id", user.id)
        .in("permission", ["manage", "update"]);

      if (error) throw error;

      if (!data || data.length === 0) return [];

      const storeIds = data.map((p) => p.store_id);

      // Fetch the stores
      let query = supabase
        .from("stores")
        .select("*")
        .in("id", storeIds)
        .order("name");

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,shop_no.ilike.%${search}%`);
      }

      const { data: storesData, error: storesError } = await query;
      if (storesError) throw storesError;

      // Map permissions
      return (storesData as Store[]).map((store) => ({
        ...store,
        permission: data.find((p) => p.store_id === store.id)?.permission || "view",
      }));
    },
    enabled: !!user,
  });

  // Update store mutation
  const updateMutation = useMutation({
    mutationFn: async ({ storeId, data }: { storeId: string; data: StoreUpdateInput }) => {
      const { error } = await supabase
        .from("stores")
        .update(data)
        .eq("id", storeId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Store updated successfully",
      });
      setEditingStore(null);
      setEditData({});
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to update store",
        variant: "destructive",
      });
    },
  });

  const handleSave = (storeId: string) => {
    updateMutation.mutate({ storeId, data: editData });
  };

  if (!isAdminRole(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You don't have permission to access this page</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Managed Stores</h1>
          <p className="text-muted-foreground">Update store information for stores you manage</p>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stores..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stores */}
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : stores.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No stores assigned to you yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {stores.map((store) => (
              <Card key={store.id} className="overflow-hidden">
                {editingStore === store.id ? (
                  // Edit mode
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-semibold">Name</label>
                        <Input
                          value={editData.name || store.name}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold">Phone</label>
                        <Input
                          value={editData.phone || store.phone || ""}
                          onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold">Email</label>
                        <Input
                          type="email"
                          value={editData.email || store.email || ""}
                          onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold">WhatsApp</label>
                        <Input
                          value={editData.whatsapp || store.whatsapp || ""}
                          onChange={(e) => setEditData({ ...editData, whatsapp: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-semibold">Address</label>
                        <Input
                          value={editData.address || store.address || ""}
                          onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-semibold">Description</label>
                        <textarea
                          className="w-full p-3 border rounded-lg"
                          rows={4}
                          value={editData.description || store.description || ""}
                          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingStore(null);
                          setEditData({});
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleSave(store.id)}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                      </Button>
                    </div>
                  </CardContent>
                ) : (
                  // View mode
                  <>
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">{store.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            Shop #{store.shop_no}
                            {store.is_verified && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                                Verified
                              </>
                            )}
                          </CardDescription>
                        </div>
                        <Badge>{store.package_slug?.toUpperCase() || "FREE"}</Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Location</p>
                            <p className="font-medium">{store.location}</p>
                          </div>
                        </div>
                        {store.address && (
                          <div>
                            <p className="text-xs text-muted-foreground">Address</p>
                            <p className="font-medium text-sm">{store.address}</p>
                          </div>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {store.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Phone</p>
                              <p className="font-medium">{store.phone}</p>
                            </div>
                          </div>
                        )}
                        {store.email && (
                          <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            <p className="font-medium text-sm">{store.email}</p>
                          </div>
                        )}
                      </div>

                      {store.description && (
                        <div>
                          <p className="text-xs text-muted-foreground">Description</p>
                          <p className="text-sm">{store.description}</p>
                        </div>
                      )}

                      <div className="pt-4 border-t flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingStore(store.id);
                            setEditData(store);
                          }}
                          className="gap-2"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit Store
                        </Button>
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
