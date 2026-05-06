/**
 * Super Admin - Store Management Page
 * 
 * Manage all stores, override packages, update subscriptions
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isAdminRole } from "@/lib/roles";
import type { Store, StoreUpdateInput, StoreStatus, SubscriptionStatus } from "@/types/store";
import type { StorePackageSlug } from "@/lib/storePackages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  Gem,
  Globe,
  Loader2,
  MapPin,
  Package,
  Search,
  Shield,
  Star,
  TrendingUp,
  UserCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PACKAGE_OPTIONS: { value: StorePackageSlug; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "diamond", label: "Diamond" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending", label: "Pending" },
  { value: "expired", label: "Expired" },
];

interface StoreWithStats extends Store {
  productCount?: number;
  adminCount?: number;
  viewCount?: number;
}

export default function SuperAdminStores() {
  const { role } = useAuth();
  const [search, setSearch] = useState("");
  const [packageFilter, setPackageFilter] = useState<StorePackageSlug | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingStore, setEditingStore] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Store>>({});

  // Fetch all stores
  const { data: stores = [], isLoading, refetch } = useQuery<StoreWithStats[]>({
    queryKey: ["admin-stores", search, packageFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("stores")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,shop_no.ilike.%${search}%`);
      }

      if (packageFilter !== "all") {
        query = query.eq("package_slug", packageFilter);
      }

      if (statusFilter !== "all") {
        query = query.eq("subscription_status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as StoreWithStats[];
    },
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
      setEditingStore(null);
      setEditData({});
      refetch();
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
      <div className="container max-w-7xl py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Store Management</h1>
          <p className="text-muted-foreground">Manage all stores and subscriptions</p>
        </div>

        {/* Search & Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by store name, email, or shop number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter tabs */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={packageFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPackageFilter("all")}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  All Packages
                </Button>
                {PACKAGE_OPTIONS.map((pkg) => (
                  <Button
                    key={pkg.value}
                    variant={packageFilter === pkg.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPackageFilter(pkg.value)}
                  >
                    {pkg.label}
                  </Button>
                ))}

                <div className="w-px bg-border mx-2" />

                {STATUS_OPTIONS.map((status) => (
                  <Button
                    key={status.value}
                    variant={statusFilter === status.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(status.value)}
                  >
                    {status.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">{stores.length}</div>
              <p className="text-sm text-muted-foreground">Total Stores</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-cyan-600">
                {stores.filter((s) => s.package_slug === "diamond").length}
              </div>
              <p className="text-sm text-muted-foreground">Diamond</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-amber-600">
                {stores.filter((s) => s.package_slug === "gold").length}
              </div>
              <p className="text-sm text-muted-foreground">Gold</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">
                {stores.filter((s) => s.subscription_status === "active").length}
              </div>
              <p className="text-sm text-muted-foreground">Active</p>
            </CardContent>
          </Card>
        </div>

        {/* Stores Table */}
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                All Stores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Store Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Package</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Verified</th>
                      <th className="text-left py-3 px-4 font-semibold">Subscription</th>
                      <th className="text-left py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map((store) => (
                      <tr key={store.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-semibold">{store.name}</div>
                            <div className="text-xs text-muted-foreground">{store.shop_no}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {editingStore === store.id ? (
                            <select
                              value={editData.package_slug || store.package_slug || "free"}
                              onChange={(e) =>
                                setEditData({ ...editData, package_slug: e.target.value as StorePackageSlug })
                              }
                              className="p-2 border rounded text-sm"
                            >
                              {PACKAGE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Badge variant="outline">
                              {store.package_slug?.toUpperCase() || "FREE"}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {editingStore === store.id ? (
                            <select
                              value={editData.status || store.status || "active"}
                              onChange={(e) =>
                                setEditData({ ...editData, status: e.target.value as StoreStatus })
                              }
                              className="p-2 border rounded text-sm"
                            >
                              <option value="active">Active</option>
                              <option value="suspended">Suspended</option>
                              <option value="maintenance">Maintenance</option>
                            </select>
                          ) : (
                            <Badge
                              variant={store.status === "active" ? "default" : "secondary"}
                            >
                              {store.status}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {store.is_verified ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground" />
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {editingStore === store.id ? (
                            <select
                              value={editData.subscription_status || store.subscription_status || "inactive"}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  subscription_status: e.target.value as SubscriptionStatus,
                                })
                              }
                              className="p-2 border rounded text-sm"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                              <option value="pending">Pending</option>
                              <option value="expired">Expired</option>
                            </select>
                          ) : (
                            <Badge
                              variant={
                                store.subscription_status === "active" ? "default" : "outline"
                              }
                            >
                              {store.subscription_status}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {editingStore === store.id ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleSave(store.id)}
                                  disabled={updateMutation.isPending}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingStore(null);
                                    setEditData({});
                                  }}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingStore(store.id);
                                  setEditData(store);
                                }}
                              >
                                Edit
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
