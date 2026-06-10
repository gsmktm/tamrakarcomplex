import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2, Trash2, Search, CheckCircle, XCircle,
  ExternalLink, Pencil, MoreVertical, ShieldCheck,
  Calendar, CreditCard, Star, Store, ShoppingBag, Palette,
  Phone, MapPin, Upload, AlertCircle
} from "lucide-react";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage, cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { StoreRow, StoreSubscriptionRow, PackageRow } from "@/types/app";
import type { Json } from "@/integrations/supabase/types";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { getStorePackageMeta, formatStorePackageName } from "@/lib/storePackages";
import { fetchStoreTierOverrides, resolveTierForStore, type StoreTierOverrides } from "@/lib/storeTier";

interface StoreWithSubscriptionsRaw extends StoreRow {
  store_subscriptions?: (StoreSubscriptionRow & { packages: PackageRow })[] | null;
}

interface StoreWithSubscription extends StoreRow {
  store_subscriptions?: (StoreSubscriptionRow & { packages: PackageRow }) | null;
}

function isMissingRelationshipError(error: unknown) {
  const err = error as { message?: string; code?: string };
  const message = err.message;
  const code = err.code;
  if (!message && !code) return false;
  return (
    code === "PGRST200" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    message?.includes("Could not find a relationship") ||
    message?.includes("Could not find the table") ||
    message?.includes("schema cache")
  );
}

function isPermissionOrRlsError(error: unknown) {
  const err = error as { message?: string; code?: string; status?: number };
  const message = err.message?.toLowerCase();
  const code = err.code;
  const status = err.status;
  if (!message && !code && !status) return false;
  return (
    code === "42501" || // insufficient_privilege
    status === 401 ||
    status === 403 ||
    message?.includes("permission denied") ||
    message?.includes("not allowed") ||
    message?.includes("jwt") ||
    message?.includes("rls")
  );
}

interface StoreFormValues {
  name: string;
  slug: string;
  shop_no: string;
  location: string;
  address: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  map_url: string;
  logo_url: string;
  services: string;
  is_verified: boolean;
  is_featured: boolean;
  is_marketplace_enabled: boolean;
  marketplace_commission: number;
  status: string;
  theme_slug: string;
}

const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const StoreManager = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreRow | null>(null);
  const [search, setSearch] = useState("");
  const [tierOverride, setTierOverride] = useState<"free" | "silver" | "gold" | "diamond">("free");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm<StoreFormValues>();
  const formValues = watch();

  const { user, role } = useAuth();
  const isStoreAdmin = role === "storeadmin";
  const isPlatformAdmin = role === "suadmin" || role === "staffadmin";

  const { data: storeTierOverrides } = useQuery<StoreTierOverrides | null>({
    queryKey: ["store_package_overrides"],
    queryFn: async () => fetchStoreTierOverrides(supabase),
    staleTime: 30_000,
  });

  const saveTierOverrideMutation = useMutation({
    mutationFn: async ({ storeId, tier }: { storeId: string; tier: "free" | "silver" | "gold" | "diamond" }) => {
      const { data: currentRow, error: readError } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "store_package_overrides")
        .maybeSingle();
      if (readError) throw readError;

      const current = ((currentRow as { value: Record<string, unknown> } | null)?.value ?? {}) as Record<string, unknown>;
      const next = { ...current, [storeId]: tier };

      const { error: upsertError } = await supabase
        .from("app_settings")
        .upsert({ key: "store_package_overrides", value: next as unknown as Json }, { onConflict: "key" });
      if (upsertError) throw upsertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store_package_overrides"] });
      queryClient.invalidateQueries({ queryKey: ["admin_stores"] });
    },
    onError: (error: unknown) => {
      toast.error(`Failed to save package tier: ${getErrorMessage(error)}`);
    },
  });

  const { data: stores, isLoading, error: storesError } = useQuery({
    queryKey: ["admin_stores", user?.id, role],
    queryFn: async () => {
      try {
        // 1. Get stores user has access to
        let storeIds: string[] = [];
        
        if (role === "suadmin" || role === "staffadmin") {
          // Platform admins see all stores — storeIds stays empty, no filter applied
        } else if (role === "storeadmin" && user?.id) {
          // Store admins see stores they belong to
          const { data: memberships } = await supabase
            .from("store_admins")
            .select("store_id")
            .eq("user_id", user.id)
            .eq("status", "active");
          
          // Also check legacy owner_id
          const { data: ownedStores } = await supabase
            .from("stores")
            .select("id")
            .eq("owner_id", user.id);
            
          storeIds = Array.from(new Set([
            ...(memberships?.map(m => m.store_id) || []),
            ...(ownedStores?.map(s => s.id) || [])
          ]));
        }

        if (storeIds.length === 0 && role !== "suadmin" && role !== "staffadmin") return [];

        const loadBaseStores = async () => {
          let baseQuery = supabase.from("stores").select("*, store_packages(name)");
          if (storeIds.length > 0) {
            baseQuery = baseQuery.in("id", storeIds);
          }
          const { data: baseData, error: baseError } = await baseQuery.order("name");
          if (baseError) {
            if (isMissingRelationshipError(baseError)) {
              let fallbackQuery = supabase.from("stores").select("*");
              if (storeIds.length > 0) fallbackQuery = fallbackQuery.in("id", storeIds);
              const { data: fallbackData, error: fallbackError } = await fallbackQuery.order("name");
              if (fallbackError) throw fallbackError;
              return (fallbackData ?? []) as StoreRow[];
            }
            throw baseError;
          }
          return (baseData ?? []) as StoreRow[];
        };

        const tryLoadWithSubscriptions = async () => {
          let query = supabase.from("stores").select(`
              *,
              store_subscriptions (
                *,
                packages (*)
              )
            `);
          if (storeIds.length > 0) {
            query = query.in("id", storeIds);
          }
          const { data, error } = await query.order("created_at", { ascending: false });
          if (error) throw error;
          return (data ?? []) as StoreWithSubscriptionsRaw[];
        };

        let data: StoreWithSubscriptionsRaw[] | StoreRow[] = [];

        try {
          data = await tryLoadWithSubscriptions();
        } catch (e) {
          if (!isMissingRelationshipError(e)) throw e;
          data = await loadBaseStores();
        }

        // Flatten store_subscriptions from array to single object (when join exists)
        return (data || []).map((store) => {
          const s = store as StoreWithSubscriptionsRaw;
          const subscriptions = s.store_subscriptions;
          const activeSub = Array.isArray(subscriptions) && subscriptions.length > 0 ? subscriptions[0] : null;
          return {
            ...s,
            store_subscriptions: activeSub,
          } as StoreWithSubscription;
        });
      } catch (err) {
        handleSupabaseError(err, "StoreManager: Failed to fetch stores list");
        return [];
      }
    },
    retry: 1,
  });

  const { data: packages } = useQuery({
    queryKey: ["admin_packages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("packages").select("*").order("sort_order", { ascending: true });
      if (error) {
        if (isMissingRelationshipError(error)) return [] as PackageRow[];
        throw error;
      }
      return (data ?? []) as PackageRow[];
    },
  });

  const legacyActivateMutation = useMutation({
    mutationFn: async ({ storeId, duration }: { storeId: string; duration: 'monthly' | 'yearly' }) => {
      const endDate = new Date();
      if (duration === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
      else endDate.setFullYear(endDate.getFullYear() + 1);

      const { error } = await supabase
        .from("stores")
        .update({
          subscription_status: "active",
          subscription_end_date: endDate.toISOString(),
        })
        .eq("id", storeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_stores"] });
      toast.success("Subscription updated (legacy mode)");
    },
    onError: (error: unknown) => {
      toast.error(`Error updating subscription: ${getErrorMessage(error)}`);
    }
  });

  const assignSubscriptionMutation = useMutation({
    mutationFn: async ({ storeId, packageId, duration }: { storeId: string, packageId: string, duration: 'monthly' | 'yearly' }) => {
      const startDate = new Date();
      const endDate = new Date();
      if (duration === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
      else endDate.setFullYear(endDate.getFullYear() + 1);

      const { error } = await supabase.from("store_subscriptions").upsert(
        {
          store_id: storeId,
          package_id: packageId,
          status: "active",
          is_enabled: true,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          auto_renew: true,
        },
        { onConflict: "store_id" },
      );

      if (error) {
        if (isMissingRelationshipError(error)) {
          const { error: legacyError } = await supabase
            .from("stores")
            .update({
              subscription_status: "active",
              subscription_end_date: endDate.toISOString(),
            })
            .eq("id", storeId);
          if (legacyError) throw legacyError;
          return;
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_stores"] });
      toast.success("Subscription assigned successfully");
    },
    onError: (error: unknown) => {
      toast.error(`Error assigning subscription: ${getErrorMessage(error)}`);
    }
  });

  const createMutation = useMutation({
    mutationFn: async (values: StoreFormValues) => {
      const servicesArray = values.services.split(",").map(s => s.trim()).filter(s => s);
      const { data, error } = await supabase.from("stores").insert({
        name: values.name,
        slug: values.slug || generateSlug(values.name),
        shop_no: values.shop_no,
        location: values.location,
        address: values.address,
        description: values.description,
        phone: values.phone,
        email: values.email,
        website: values.website,
        map_url: values.map_url,
        logo_url: values.logo_url,
        services: servicesArray,
        is_verified: values.is_verified,
        is_featured: values.is_featured,
        is_marketplace_enabled: values.is_marketplace_enabled,
        marketplace_commission: values.marketplace_commission,
        status: values.status,
        theme_slug: values.theme_slug,
      }).select("id").single();
      if (error) throw error;
      return (data as { id: string })?.id;
    },
    onSuccess: (newStoreId) => {
      queryClient.invalidateQueries({ queryKey: ["admin_stores"] });
      if ((role === "suadmin" || role === "staffadmin") && newStoreId) {
        saveTierOverrideMutation.mutate({ storeId: newStoreId, tier: tierOverride });
      }
      setIsOpen(false);
      reset();
      toast.success("Store created successfully");
    },
    onError: (error: unknown) => {
      toast.error(`Error creating store: ${getErrorMessage(error)}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: StoreFormValues & { package_id?: string }) => {
      const servicesArray = values.services.split(",").map(s => s.trim()).filter(s => s);
      const { error } = await supabase
        .from("stores")
        .update({
          name: values.name,
          slug: values.slug || generateSlug(values.name),
          shop_no: values.shop_no,
          location: values.location,
          address: values.address,
          description: values.description,
          phone: values.phone,
          email: values.email,
          website: values.website,
          map_url: values.map_url,
          logo_url: values.logo_url,
          services: servicesArray,
          is_verified: values.is_verified,
          is_featured: values.is_featured,
          is_marketplace_enabled: values.is_marketplace_enabled,
          marketplace_commission: values.marketplace_commission,
          status: values.status,
          theme_slug: values.theme_slug,
          package_id: (values as any).package_id,
        })
        .eq("id", editingStore.id);
      if (error) throw error;
      return editingStore.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_stores"] });
      setIsOpen(false);
      setEditingStore(null);
      reset();
      toast.success("Store updated successfully");
    },
    onError: (error: unknown) => {
      toast.error(`Error updating store: ${getErrorMessage(error)}`);
    },
  });

  const toggleVerifyMutation = useMutation({
    mutationFn: async ({ id, is_verified }: { id: string; is_verified: boolean }) => {
      const { error } = await supabase
        .from("stores")
        .update({ is_verified })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_stores"] });
      toast.success("Store verification updated");
    },
    onError: (error: unknown) => {
      toast.error(`Error updating store: ${getErrorMessage(error)}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_stores"] });
      toast.success("Store deleted successfully");
    },
    onError: (error: unknown) => {
      toast.error(`Error deleting store: ${getErrorMessage(error)}`);
    },
  });

  const { data: allPackages } = useQuery({
    queryKey: ["all_store_packages_for_select"],
    queryFn: async () => {
      const { data } = await supabase.from("store_packages").select("id, name").order("price");
      return data || [];
    },
  });

  const onSubmit = (values: StoreFormValues) => {
    if (editingStore) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `store-logos/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
      if (data?.publicUrl) {
        setValue("logo_url", data.publicUrl);
        toast.success("Logo uploaded successfully");
      }
    } catch (error: unknown) {
      toast.error(`Failed to upload logo: ${getErrorMessage(error)}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleEdit = (store: StoreWithSubscription) => {
    setEditingStore(store);
    setValue("name", store.name);
    setValue("slug", store.slug || "");
    setValue("shop_no", store.shop_no || "");
    setValue("location", store.location);
    setValue("address", store.address || "");
    setValue("description", store.description || "");
    setValue("phone", store.phone || "");
    setValue("email", store.email || "");
    setValue("website", store.website || "");
    setValue("map_url", store.map_url || "");
    setValue("logo_url", store.logo_url || "");
    setValue("services", (store.services as string[])?.join(", ") || "");
    setValue("is_verified", store.is_verified || false);
    setValue("is_featured", store.is_featured || false);
    setValue("is_marketplace_enabled", store.is_marketplace_enabled !== false);
    setValue("marketplace_commission", store.marketplace_commission || 10);
    setValue("status", store.status || "active");
    setValue("theme_slug", store.theme_slug || "default");
    const computedTier = resolveTierForStore(store, storeTierOverrides);
    setTierOverride((storeTierOverrides?.[store.id] ?? computedTier) as "free" | "silver" | "gold" | "diamond");
    setIsOpen(true);
  };

  const handleImpersonate = (store: StoreWithSubscription) => {
    if (confirm(`Are you sure you want to log in as ${store.name}?`)) {
      toast.info(`Impersonating ${store.name}...`);
      navigate(`/stores/${store.id}/manage`);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setEditingStore(null);
      setTierOverride("free");
      reset();
    }
  };

  const filteredStores = stores?.filter((store) =>
    store.name.toLowerCase().includes(search.toLowerCase()) ||
    store.location.toLowerCase().includes(search.toLowerCase()) ||
    (store.shop_no && store.shop_no.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Stores</h1>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>Add Store</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingStore ? "Edit Store" : "Add New Store"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Store Name</Label>
                    <Input id="name" {...register("name", { required: true })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="slug">Store Slug (SEO URL)</Label>
                    <Input id="slug" {...register("slug")} placeholder="apple-asia-nepal" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="shop_no">Shop No</Label>
                    <Input id="shop_no" {...register("shop_no")} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" {...register("location", { required: true })} />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="address">Full Address</Label>
                  <Input id="address" {...register("address")} placeholder="e.g. 5th Floor, New Road TamrakarComplex , Kathmandu" />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" {...register("description")} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" {...register("phone")} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" {...register("email")} />
                  </div>
                </div>

                {(role === "suadmin" || role === "staffadmin") && (
                  <div className="space-y-4 border-t pt-4 mt-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" /> Marketplace Settings
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg">
                        <div className="space-y-0.5">
                          <Label htmlFor="is_featured" className="text-sm font-medium">Featured Store</Label>
                          <p className="text-[10px] text-muted-foreground">Show in homepage sections</p>
                        </div>
                        <Switch 
                          id="is_featured" 
                          checked={!!formValues.is_featured}
                          onCheckedChange={(checked) => setValue("is_featured", checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg">
                        <div className="space-y-0.5">
                          <Label htmlFor="is_verified" className="text-sm font-medium">Verified Status</Label>
                          <p className="text-[10px] text-muted-foreground">Blue checkmark badge</p>
                        </div>
                        <Switch 
                          id="is_verified" 
                          checked={!!formValues.is_verified}
                          onCheckedChange={(checked) => setValue("is_verified", checked)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="status">Store Status</Label>
                        <Select 
                          value={formValues.status || "active"} 
                          onValueChange={(val) => setValue("status", val)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label>Store Package</Label>
                        <Select 
                          onValueChange={(v) => (setValue as any)("package_id", v)} 
                          defaultValue={(editingStore as any)?.package_id}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Package" />
                          </SelectTrigger>
                          <SelectContent>
                            {allPackages?.map(pkg => (
                              <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="marketplace_commission">Commission (%)</Label>
                      <Input 
                        id="marketplace_commission" 
                        type="number" 
                        step="0.01" 
                        {...register("marketplace_commission")} 
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="grid gap-2">
                        <Label>Directory Package</Label>
                        <Select value={tierOverride} onValueChange={(val) => setTierOverride(val as any)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Package" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Basic (Free)</SelectItem>
                            <SelectItem value="silver">Silver</SelectItem>
                            <SelectItem value="gold">Gold</SelectItem>
                            <SelectItem value="diamond">Diamond</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">Controls how the store appears on `/stores`.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="theme_slug">Store Theme</Label>
                        <Select 
                          value={formValues.theme_slug || "default"} 
                          onValueChange={(val) => setValue("theme_slug", val)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Theme" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default Dark</SelectItem>
                            <SelectItem value="emerald">Emerald Teal</SelectItem>
                            <SelectItem value="rose">Rose Pink</SelectItem>
                            <SelectItem value="amber">Amber Gold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg">
                        <div className="space-y-0.5">
                          <Label htmlFor="is_marketplace_enabled" className="text-sm font-medium">Marketplace Selling</Label>
                          <p className="text-[10px] text-muted-foreground">Allow listing products</p>
                        </div>
                        <Switch 
                          id="is_marketplace_enabled" 
                          checked={formValues.is_marketplace_enabled !== false}
                          onCheckedChange={(checked) => setValue("is_marketplace_enabled", checked)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-sm">Media & Links</h3>
                  <div className="grid gap-2">
                    <Label htmlFor="logo_url">Logo URL</Label>
                    <div className="flex gap-2">
                      <Input id="logo_url" {...register("logo_url")} placeholder="https://... or upload below" />
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Button type="button" variant="outline" size="sm" disabled={uploadingLogo}>
                          {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="website">Website URL</Label>
                    <Input id="website" {...register("website")} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="map_url">Google Maps URL</Label>
                    <Input id="map_url" {...register("map_url")} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="services">Services (comma separated)</Label>
                    <Input id="services" {...register("services")} placeholder="Sales, Repair, Exchange" />
                  </div>
                </div>
              </div>
              
              <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingStore ? "Save Changes" : "Create Store"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search stores..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="border rounded-xl overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[100px]">Shop No</TableHead>
              <TableHead>Store Identity</TableHead>
              <TableHead>Contact & Location</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Status & Features</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading stores...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : storesError ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-destructive">Failed to load stores</p>
                    <p className="text-xs text-muted-foreground">{getErrorMessage(storesError)}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredStores?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                  No stores found.
                </TableCell>
              </TableRow>
            ) : (
              filteredStores?.map((store) => (
                <TableRow key={store.id} className="hover:bg-muted/30 transition-colors group">
                  <TableCell className="font-mono text-xs font-bold">
                    {store.shop_no ? `#${store.shop_no}` : "-"}
                  </TableCell>
                  <TableCell>
                    <div 
                      className="flex items-center gap-3 cursor-pointer group-hover:opacity-80 transition-opacity"
                      onClick={() => handleEdit(store)}
                    >
                      <div className="h-10 w-10 rounded-lg border bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                        {store.logo_url ? (
                          <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
                        ) : (
                          <Store className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate flex items-center gap-1.5">
                          {store.name}
                          {store.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate uppercase tracking-tighter">
                          {store.services?.slice(0, 2).join(" • ") || "No services listed"}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {(store as any).store_packages?.name || "Free"}
                          </Badge>
                          {store.is_verified && (
                            <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-100">
                              Verified
                            </Badge>
                          )}
                          {store.is_featured && (
                            <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 border-amber-100">
                              Featured
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{store.phone || "No phone"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{store.location}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {store.store_subscriptions?.packages?.slug ? (
                      <div className="space-y-1.5">
                        <Badge
                          variant="outline"
                          className={cn("font-bold text-[10px] uppercase px-2 py-0", getStorePackageMeta(store.store_subscriptions.packages.slug)?.badgeClassName)}
                        >
                          {formatStorePackageName(store.store_subscriptions.packages.slug, store.store_subscriptions.packages.name)}
                        </Badge>
                        {store.store_subscriptions?.end_date ? (
                          <div className="flex items-center text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
                            <Calendar className="mr-1 h-2.5 w-2.5" />
                            Ends: {format(new Date(store.store_subscriptions.end_date), "MMM d")}
                          </div>
                        ) : null}
                      </div>
                    ) : store.subscription_status ? (
                      <div className="space-y-1.5">
                        <Badge variant="outline" className="text-[9px] uppercase font-bold px-2 py-0">
                          {store.subscription_status}
                        </Badge>
                        {store.subscription_end_date ? (
                          <div className="flex items-center text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
                            <Calendar className="mr-1 h-2.5 w-2.5" />
                            Ends: {format(new Date(store.subscription_end_date), "MMM d")}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <Badge variant="secondary" className="opacity-40 text-[9px] uppercase font-bold px-2 py-0">No Plan</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {store.is_featured && (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[9px] px-1.5 py-0">
                          <Star className="h-2.5 w-2.5 mr-1 fill-amber-600" /> Featured
                        </Badge>
                      )}
                      {store.status === 'active' ? (
                        <Badge variant="outline" className="text-green-600 border-green-200 text-[9px] px-1.5 py-0 bg-green-50/50">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-200 text-[9px] px-1.5 py-0 capitalize">{store.status}</Badge>
                      )}
                      {store.is_marketplace_enabled ? (
                        <Badge variant="outline" className="text-blue-600 border-blue-200 text-[9px] px-1.5 py-0 bg-blue-50/50">Marketplace</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground border-muted-foreground/20 text-[9px] px-1.5 py-0">Directory Only</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                        title="Edit Store"
                        onClick={() => handleEdit(store)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      {isPlatformAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl border-border/40">
                            <DropdownMenuLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-3 pt-3 pb-1">Manage Store</DropdownMenuLabel>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => toggleVerifyMutation.mutate({ id: store.id, is_verified: !store.is_verified })}>
                              <ShieldCheck className="mr-2 h-4 w-4 text-blue-500" />
                              {store.is_verified ? "Unverify Store" : "Verify Store"}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => handleEdit(store)}>
                              <Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
                              Edit Details
                            </DropdownMenuItem>
                            
                            {role === "suadmin" && (
                              <DropdownMenuItem className="cursor-pointer" onClick={() => handleImpersonate(store)}>
                                <Store className="mr-2 h-4 w-4 text-purple-500" />
                                Impersonate Owner
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 py-2">Quick Subscription</DropdownMenuLabel>
                            <div className="px-1 py-1 space-y-1">
                              {packages && packages.length > 0 ? packages.map((pkg) => (
                                <div key={pkg.id} className="px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                                  <div className="text-[11px] font-bold mb-1.5 flex items-center justify-between">
                                    <span>{pkg.name}</span>
                                    <span className="text-[9px] text-muted-foreground font-normal">Rs. {pkg.monthly_price}/mo</span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-6 flex-1 text-[9px] px-1 font-bold hover:bg-primary hover:text-white transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        assignSubscriptionMutation.mutate({ storeId: store.id, packageId: pkg.id, duration: 'monthly' });
                                      }}
                                    >
                                      1 Month
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-6 flex-1 text-[9px] px-1 font-bold hover:bg-primary hover:text-white transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        assignSubscriptionMutation.mutate({ storeId: store.id, packageId: pkg.id, duration: 'yearly' });
                                      }}
                                    >
                                      1 Year
                                    </Button>
                                  </div>
                                </div>
                              )) : (
                                <div className="px-3 py-2 space-y-2">
                                  <div className="text-[11px] text-muted-foreground">Quick extend (no packages table)</div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 flex-1 text-[9px] px-1 font-bold hover:bg-primary hover:text-white transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        legacyActivateMutation.mutate({ storeId: store.id, duration: "monthly" });
                                      }}
                                    >
                                      +1 Month
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 flex-1 text-[9px] px-1 font-bold hover:bg-primary hover:text-white transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        legacyActivateMutation.mutate({ storeId: store.id, duration: "yearly" });
                                      }}
                                    >
                                      +1 Year
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>

                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600 cursor-pointer"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this store?")) {
                                  deleteMutation.mutate(store.id);
                                }
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Store
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default StoreManager;
