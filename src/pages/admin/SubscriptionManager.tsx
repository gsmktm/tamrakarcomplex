import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getStorePackageMeta } from "@/lib/storePackages";
import { STORE_SUBSCRIPTION_PACKAGES } from "@/lib/storePackages";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/utils";
import { useForm } from "react-hook-form";

type StorageMode = "db" | "settings" | "builtin";

type PackageLike = {
  id: string;
  name: string;
  slug: string;
  monthly_price: number;
  yearly_price: number;
  product_limit: number;
  admin_limit: number;
  branch_limit: number;
  promo_slot_limit: number;
  sort_order: number | null;
  is_active: boolean;
  features_json: string[];
};

type PackagesResult = {
  storage: StorageMode;
  packages: PackageLike[];
  writable: boolean;
  note?: string;
};

type PackageFormValues = {
  name: string;
  slug: string;
  monthly_price: number;
  yearly_price: number;
  product_limit: number;
  admin_limit: number;
  branch_limit: number;
  promo_slot_limit: number;
  sort_order: number;
  is_active: boolean;
  features_text: string;
};

function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `pkg_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function isSchemaMissingError(error: unknown) {
  const message = (error as any)?.message as string | undefined;
  const code = (error as any)?.code as string | undefined;
  if (!message && !code) return false;
  return (
    code === "PGRST200" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    message?.includes("Could not find the table") ||
    message?.includes("Could not find the function") ||
    message?.includes("Could not find a relationship") ||
    message?.includes("schema cache")
  );
}

function toPackageLike(p: Record<string, unknown>, fallbackOrder: number): PackageLike {
  return {
    id: String(p?.id ?? newId()),
    name: String(p?.name ?? ""),
    slug: String(p?.slug ?? ""),
    monthly_price: Number(p?.monthly_price ?? 0),
    yearly_price: Number(p?.yearly_price ?? 0),
    product_limit: Number(p?.product_limit ?? 0),
    admin_limit: Number(p?.admin_limit ?? 0),
    branch_limit: Number(p?.branch_limit ?? 0),
    promo_slot_limit: Number(p?.promo_slot_limit ?? 0),
    sort_order: typeof p?.sort_order === "number" ? p.sort_order : fallbackOrder,
    is_active: p?.is_active !== false,
    features_json: Array.isArray(p?.features_json) ? (p.features_json as string[]) : [],
  };
}

function defaultPackages(): PackageLike[] {
  return (STORE_SUBSCRIPTION_PACKAGES as any[]).map((p, idx) => toPackageLike(p, idx));
}

async function loadPackages(): Promise<PackagesResult> {
  // 1) Preferred: subscription module tables
  const { data: pkgData, error: pkgError } = await supabase
    .from("packages")
    .select("*")
    .order("sort_order", { ascending: true });

  if (!pkgError) {
    const packages = (pkgData ?? []).map((p: Record<string, unknown>, idx: number) => toPackageLike(p, idx));
    return { storage: "db", packages, writable: true };
  }

  if (!isSchemaMissingError(pkgError)) {
    throw pkgError;
  }

  // 2) Fallback: store packages in app_settings JSON
  const { data: settingsRow, error: settingsError } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "subscription_packages")
    .maybeSingle();

  if (!settingsError) {
    const raw = (settingsRow as { value?: unknown })?.value;
    if (Array.isArray(raw)) {
      const mapped = raw
        .map((p: Record<string, unknown>, idx: number) => toPackageLike(p, idx))
        .filter((p: PackageLike) => p.slug.trim() && p.name.trim());
      if (mapped.length > 0) {
        mapped.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
        return {
          storage: "settings",
          packages: mapped,
          writable: true,
          note: "Editing uses app_settings (key: subscription_packages).",
        };
      }
    }

    return {
      storage: "settings",
      packages: defaultPackages(),
      writable: true,
      note: "Editing uses app_settings (key: subscription_packages).",
    };
  }

  if (!isSchemaMissingError(settingsError)) {
    console.warn("Failed to load app_settings.subscription_packages:", settingsError);
  }

  // 3) Final: built-in defaults
  return {
    storage: "builtin",
    packages: defaultPackages(),
    writable: false,
    note: "Read-only defaults (no packages table, and app_settings unavailable).",
  };
}

export default function SubscriptionManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PackageLike | null>(null);
  const { register, handleSubmit, reset, setValue, watch } = useForm<PackageFormValues>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["subscription-packages-admin"],
    queryFn: loadPackages,
    staleTime: 60_000,
  });

  const packages = data?.packages ?? [];
  const storage = data?.storage ?? "builtin";
  const writable = !!data?.writable;
  const note = data?.note;

  const activeValue = watch("is_active");

  const upsertMutation = useMutation({
    mutationFn: async (values: PackageFormValues) => {
      if (!writable) throw new Error("Packages are read-only in this environment.");

      const features = values.features_text
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);

      if (storage === "db") {
        const payload = {
          name: values.name.trim(),
          slug: values.slug.trim(),
          monthly_price: values.monthly_price,
          yearly_price: values.yearly_price,
          product_limit: values.product_limit,
          admin_limit: values.admin_limit,
          branch_limit: values.branch_limit,
          promo_slot_limit: values.promo_slot_limit,
          sort_order: values.sort_order,
          is_active: values.is_active,
          features_json: features,
        };

        if (editing) {
          const { error: updateError } = await supabase.from("packages").update(payload).eq("id", editing.id);
          if (updateError) throw updateError;
          return;
        }
        const { error: insertError } = await supabase.from("packages").insert(payload);
        if (insertError) throw insertError;
        return;
      }

      // storage === "settings"
      const next: PackageLike = {
        id: editing?.id ?? newId(),
        name: values.name.trim(),
        slug: values.slug.trim(),
        monthly_price: values.monthly_price,
        yearly_price: values.yearly_price,
        product_limit: values.product_limit,
        admin_limit: values.admin_limit,
        branch_limit: values.branch_limit,
        promo_slot_limit: values.promo_slot_limit,
        sort_order: Number.isFinite(values.sort_order) ? values.sort_order : null,
        is_active: values.is_active,
        features_json: features,
      };

      const current = packages;
      const exists = current.some((p) => p.id === next.id);
      const merged = exists ? current.map((p) => (p.id === next.id ? next : p)) : [...current, next];

      // Keep slug unique
      const deduped = Array.from(new Map(merged.map((p) => [p.slug, p])).values());
      deduped.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

      const { error: upsertError } = await supabase
        .from("app_settings")
        .upsert({ key: "subscription_packages", value: deduped }, { onConflict: "key" });
      if (upsertError) throw upsertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-packages-admin"] });
      setIsDialogOpen(false);
      setEditing(null);
      reset();
      toast({ title: "Package saved" });
    },
    onError: (e) => {
      toast({ title: "Save failed", description: getErrorMessage(e), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!writable) throw new Error("Packages are read-only in this environment.");

      if (storage === "db") {
        const { error: deleteError } = await supabase.from("packages").delete().eq("id", id);
        if (deleteError) throw deleteError;
        return;
      }

      const next = packages.filter((p) => p.id !== id);
      const { error: upsertError } = await supabase
        .from("app_settings")
        .upsert({ key: "subscription_packages", value: next }, { onConflict: "key" });
      if (upsertError) throw upsertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-packages-admin"] });
      toast({ title: "Package deleted" });
    },
    onError: (e) => {
      toast({ title: "Delete failed", description: getErrorMessage(e), variant: "destructive" });
    },
  });

  const uiPackages = useMemo(() => {
    const copy = [...packages];
    copy.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
    return copy;
  }, [packages]);

  const openCreate = () => {
    if (!writable) return;
    setEditing(null);
    reset({
      name: "",
      slug: "",
      monthly_price: 0,
      yearly_price: 0,
      product_limit: 100,
      admin_limit: 1,
      branch_limit: 1,
      promo_slot_limit: 0,
      sort_order: 0,
      is_active: true,
      features_text: "",
    });
    setIsDialogOpen(true);
  };

  const openEdit = (pkg: PackageLike) => {
    if (!writable) return;
    setEditing(pkg);
    setValue("name", pkg.name);
    setValue("slug", pkg.slug);
    setValue("monthly_price", Number(pkg.monthly_price));
    setValue("yearly_price", Number(pkg.yearly_price));
    setValue("product_limit", pkg.product_limit);
    setValue("admin_limit", pkg.admin_limit);
    setValue("branch_limit", pkg.branch_limit);
    setValue("promo_slot_limit", pkg.promo_slot_limit);
    setValue("sort_order", (pkg.sort_order ?? 0) as number);
    setValue("is_active", pkg.is_active !== false);
    setValue("features_text", (pkg.features_json ?? []).join("\n"));
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-muted/20 p-6">
        <div className="text-sm font-semibold text-destructive">Failed to load packages</div>
        <div className="mt-1 text-xs text-muted-foreground">{getErrorMessage(error)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription Packages</h1>
          <p className="text-muted-foreground">Pricing + limits + feature list for each tier.</p>
          <div className="mt-2 text-xs text-muted-foreground">
            Source: <span className="font-medium">{storage}</span>
            {note ? ` — ${note}` : null}
          </div>
        </div>
        <Button onClick={openCreate} disabled={!writable}>
          <Plus className="mr-2 h-4 w-4" />
          Add Package
        </Button>
      </div>

      {!writable ? (
        <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
          Package editing is disabled because the backend storage is not writable. Install the subscription tables
          (`packages`, `store_subscriptions`) or enable settings storage (`app_settings`).
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-3">
        {uiPackages.map((pkg) => (
          <div key={pkg.id} className="relative group">
            <div
              className={`rounded-2xl border p-6 h-full transition-all duration-300 hover:shadow-xl bg-card ${getStorePackageMeta(pkg.slug).accentClassName}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getStorePackageMeta(pkg.slug).badgeClassName}>
                    {pkg.name}
                  </Badge>
                  {!pkg.is_active ? (
                    <Badge variant="destructive" className="text-[10px] uppercase tracking-wider">
                      Inactive
                    </Badge>
                  ) : null}
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!writable} onClick={() => openEdit(pkg)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    disabled={!writable}
                    onClick={() => {
                      if (confirm("Delete this package?")) deleteMutation.mutate(pkg.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-3xl font-bold">Rs. {pkg.monthly_price.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">per month</div>
                <div className="text-xs font-medium text-green-600 mt-1">Rs. {pkg.yearly_price.toLocaleString()} / year</div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold border-b pb-1">Limits</div>
                <div className="grid grid-cols-2 text-xs gap-y-2">
                  <div className="text-muted-foreground">Products:</div>
                  <div className="font-medium text-right">{pkg.product_limit.toLocaleString()}</div>
                  <div className="text-muted-foreground">Admins:</div>
                  <div className="font-medium text-right">{pkg.admin_limit}</div>
                  <div className="text-muted-foreground">Branches:</div>
                  <div className="font-medium text-right">{pkg.branch_limit}</div>
                  <div className="text-muted-foreground">Promo slots:</div>
                  <div className="font-medium text-right">{pkg.promo_slot_limit.toLocaleString()}</div>
                </div>

                <div className="text-sm font-semibold border-b pb-1 pt-2">Features</div>
                <ul className="space-y-2">
                  {(pkg.features_json ?? []).slice(0, 8).map((feature, i) => (
                    <li key={i} className="text-xs flex items-start gap-2">
                      <Check className="h-3 w-3 mt-0.5 text-green-500 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {(pkg.features_json ?? []).length > 8 ? (
                    <li className="text-[10px] text-muted-foreground">…and more</li>
                  ) : null}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Package" : "Create Package"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit((v) => upsertMutation.mutate(v))} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input {...register("name", { required: true })} placeholder="e.g. Gold Store" />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input {...register("slug", { required: true })} placeholder="e.g. gold" disabled={!!editing} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monthly Price (Rs.)</Label>
                <Input type="number" {...register("monthly_price", { required: true, valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Yearly Price (Rs.)</Label>
                <Input type="number" {...register("yearly_price", { required: true, valueAsNumber: true })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Products</Label>
                <Input type="number" {...register("product_limit", { required: true, valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Admins</Label>
                <Input type="number" {...register("admin_limit", { required: true, valueAsNumber: true })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Branches</Label>
                <Input type="number" {...register("branch_limit", { required: true, valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Promo Slots</Label>
                <Input type="number" {...register("promo_slot_limit", { required: true, valueAsNumber: true })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input type="number" {...register("sort_order", { required: true, valueAsNumber: true })} />
              </div>
              <div className="flex items-center justify-between rounded-xl border px-3 py-3 mt-6">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Active</div>
                  <div className="text-[11px] text-muted-foreground">Hide inactive packages from public purchase.</div>
                </div>
                <Switch checked={!!activeValue} onCheckedChange={(v) => setValue("is_active", v)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Features (one per line)</Label>
              <Textarea
                {...register("features_text")}
                placeholder={"Everything in Silver\nVerified badge\nPublic contact details\nAdvanced analytics"}
                className="min-h-[140px]"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Package
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

