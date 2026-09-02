import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getStorePackageMeta } from "@/lib/storePackages";
import { STORE_SUBSCRIPTION_PACKAGES } from "@/lib/storePackages";
import { supabase } from "@/integrations/supabase/client";
import { STORE_PACKAGES_COLUMNS } from "@/lib/supabaseColumnMaps";
import { getErrorMessage, slugify } from "@/lib/utils";
import { useForm } from "react-hook-form";

type StorageMode = "db" | "settings" | "builtin";

type PackageLike = {
  id: string;
  name: string;
  slug: string;
  price: number;
  billing_cycle: string;
  product_limit: number;
  accessory_limit: number;
  staff_limit: number;
  exchange_enabled: boolean;
  repair_enabled: boolean;
  custom_seo_enabled: boolean;
  analytics_level: string;
  featured_enabled: boolean;
  verified_badge_enabled: boolean;
  homepage_promotion_enabled: boolean;
};

type PackagesResult = {
  storage: StorageMode;
  packages: PackageLike[];
  writable: boolean;
  note?: string;
};

type PackageFormValues = {
  name: string;
  price: number;
  billing_cycle: string;
  product_limit: number;
  accessory_limit: number;
  staff_limit: number;
  exchange_enabled: boolean;
  repair_enabled: boolean;
  custom_seo_enabled: boolean;
  analytics_level: string;
  featured_enabled: boolean;
  verified_badge_enabled: boolean;
  homepage_promotion_enabled: boolean;
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

function toPackageLike(p: Record<string, unknown>): PackageLike {
  return {
    id: String(p?.id ?? newId()),
    name: String(p?.name ?? ""),
    slug: String(p?.slug ?? slugify(String(p?.name ?? ""))),
    price: Number(p?.price ?? 0),
    billing_cycle: String(p?.billing_cycle ?? "monthly"),
    product_limit: Number(p?.product_limit ?? 0),
    accessory_limit: Number(p?.accessory_limit ?? 0),
    staff_limit: Number(p?.staff_limit ?? 0),
    exchange_enabled: !!p?.exchange_enabled,
    repair_enabled: !!p?.repair_enabled,
    custom_seo_enabled: !!p?.custom_seo_enabled,
    analytics_level: String(p?.analytics_level ?? "none"),
    featured_enabled: !!p?.featured_enabled,
    verified_badge_enabled: !!p?.verified_badge_enabled,
    homepage_promotion_enabled: !!p?.homepage_promotion_enabled,
  };
}

async function loadPackages(): Promise<PackagesResult> {
  try {
    const { data: pkgData, error: pkgError } = await supabase
      .from("store_packages")
      .select(STORE_PACKAGES_COLUMNS.join(","))
      .order("price", { ascending: true });

    if (!pkgError) {
      const packages = (pkgData ?? []).map((p: Record<string, unknown>) => toPackageLike(p));
      return { storage: "db", packages, writable: true };
    }

    if (!isSchemaMissingError(pkgError)) {
      throw pkgError;
    }
  } catch (e) {
    if (!isSchemaMissingError(e)) {
      throw e;
    }
  }

  const builtinPackages = STORE_SUBSCRIPTION_PACKAGES.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    slug: pkg.slug,
    price: pkg.monthly_price,
    billing_cycle: "monthly",
    product_limit: pkg.product_limit,
    accessory_limit: pkg.product_limit,
    staff_limit: pkg.admin_limit,
    exchange_enabled: true,
    repair_enabled: true,
    custom_seo_enabled: true,
    analytics_level: "basic",
    featured_enabled: pkg.slug === "gold" || pkg.slug === "diamond",
    verified_badge_enabled: pkg.slug === "gold" || pkg.slug === "diamond",
    homepage_promotion_enabled: pkg.slug === "gold" || pkg.slug === "diamond",
    sort_order: pkg.sort_order,
  }));

  return {
    storage: "builtin",
    packages: builtinPackages,
    writable: false,
    note: "Using built-in default packages. Create 'store_packages' table in database to enable customization."
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

  const packages = useMemo(() => data?.packages ?? [], [data?.packages]);
  const storage = data?.storage ?? "builtin";
  const writable = !!data?.writable;
  const note = data?.note;

  const billingCycleValue = watch("billing_cycle") || "monthly";
  const analyticsLevelValue = watch("analytics_level") || "none";

  const { data: pendingPayments = [] } = useQuery({
    queryKey: ["admin-pending-subscription-payments"],
    queryFn: async () => {
      const { data: rows, error: paymentError } = await (supabase.from as any)("subscription_payments")
        .select("id, invoice_no, amount, status, payment_method, provider_transaction_id, billing_cycle, created_at, store:stores(name), package:store_packages(name,slug)")
        .eq("status", "pending").order("created_at", { ascending: true });
      if (paymentError) throw paymentError;
      return rows ?? [];
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error: verifyError } = await (supabase.rpc as any)("verify_store_subscription_payment", { p_payment_id: paymentId });
      if (verifyError) throw verifyError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-subscription-payments"] });
      toast({ title: "Payment verified", description: "The package is active and its expiry date was set." });
    },
    onError: (e) => toast({ title: "Verification failed", description: getErrorMessage(e), variant: "destructive" }),
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: PackageFormValues) => {
      if (!writable) throw new Error("Packages are read-only in this environment.");

      const payload = {
        name: values.name.trim(),
        slug: editing?.slug || slugify(values.name),
        price: values.price,
        billing_cycle: values.billing_cycle,
        product_limit: values.product_limit,
        accessory_limit: values.accessory_limit,
        staff_limit: values.staff_limit,
        exchange_enabled: values.exchange_enabled,
        repair_enabled: values.repair_enabled,
        custom_seo_enabled: values.custom_seo_enabled,
        analytics_level: values.analytics_level,
        featured_enabled: values.featured_enabled,
        verified_badge_enabled: values.verified_badge_enabled,
        homepage_promotion_enabled: values.homepage_promotion_enabled,
        updated_at: new Date().toISOString(),
      };

      if (editing) {
        const { error: updateError } = await supabase.from("store_packages").update(payload).eq("id", editing.id);
        if (updateError) throw updateError;
        return;
      }
      const { error: insertError } = await supabase.from("store_packages").insert(payload);
      if (insertError) throw insertError;
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
      const { error: deleteError } = await supabase.from("store_packages").delete().eq("id", id);
      if (deleteError) throw deleteError;
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
      price: 0,
      billing_cycle: "monthly",
      product_limit: 5,
      accessory_limit: 5,
      staff_limit: 0,
      exchange_enabled: false,
      repair_enabled: false,
      custom_seo_enabled: false,
      analytics_level: "none",
      featured_enabled: false,
      verified_badge_enabled: false,
      homepage_promotion_enabled: false,
    });
    setIsDialogOpen(true);
  };

  const openEdit = (pkg: PackageLike) => {
    if (!writable) return;
    setEditing(pkg);
    setValue("name", pkg.name);
    setValue("price", pkg.price);
    setValue("billing_cycle", pkg.billing_cycle);
    setValue("product_limit", pkg.product_limit);
    setValue("accessory_limit", pkg.accessory_limit);
    setValue("staff_limit", pkg.staff_limit);
    setValue("exchange_enabled", pkg.exchange_enabled);
    setValue("repair_enabled", pkg.repair_enabled);
    setValue("custom_seo_enabled", pkg.custom_seo_enabled);
    setValue("analytics_level", pkg.analytics_level);
    setValue("featured_enabled", pkg.featured_enabled);
    setValue("verified_badge_enabled", pkg.verified_badge_enabled);
    setValue("homepage_promotion_enabled", pkg.homepage_promotion_enabled);
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

      <div className="grid gap-6 md:grid-cols-4">
        {uiPackages.map((pkg) => (
          <div key={pkg.id} className="relative group">
            <div className="rounded-2xl border p-6 h-full transition-all duration-300 hover:shadow-xl bg-card border-primary/10">
              <div className="flex justify-between items-start mb-4">
                <Badge variant="outline" className="capitalize">
                  {pkg.name}
                </Badge>

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
                <div className="text-3xl font-bold">Rs. {pkg.price.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground capitalize">{pkg.billing_cycle}</div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold border-b pb-1">Limits</div>
                <div className="grid grid-cols-2 text-xs gap-y-2">
                  <div className="text-muted-foreground">Products:</div>
                  <div className="font-medium text-right">{pkg.product_limit < 0 ? "Unlimited" : pkg.product_limit.toLocaleString()}</div>
                  <div className="text-muted-foreground">Accessories:</div>
                  <div className="font-medium text-right">{pkg.accessory_limit < 0 ? "Unlimited" : pkg.accessory_limit.toLocaleString()}</div>
                  <div className="text-muted-foreground">Staff:</div>
                  <div className="font-medium text-right">{pkg.staff_limit < 0 ? "Unlimited" : pkg.staff_limit}</div>
                </div>

                <div className="text-sm font-semibold border-b pb-1 pt-2">Features</div>
                <ul className="space-y-2">
                  <li className="text-xs flex items-center gap-2">
                    {pkg.exchange_enabled ? <Check className="h-3 w-3 text-green-500" /> : <X className="h-3 w-3 text-red-500" />}
                    <span>Exchange Feature</span>
                  </li>
                  <li className="text-xs flex items-center gap-2">
                    {pkg.repair_enabled ? <Check className="h-3 w-3 text-green-500" /> : <X className="h-3 w-3 text-red-500" />}
                    <span>Repair Service</span>
                  </li>
                  <li className="text-xs flex items-center gap-2">
                    {pkg.custom_seo_enabled ? <Check className="h-3 w-3 text-green-500" /> : <X className="h-3 w-3 text-red-500" />}
                    <span>Custom SEO</span>
                  </li>
                  <li className="text-xs flex items-center gap-2">
                    {pkg.featured_enabled ? <Check className="h-3 w-3 text-green-500" /> : <X className="h-3 w-3 text-red-500" />}
                    <span>Featured Store</span>
                  </li>
                  <li className="text-xs flex items-center gap-2">
                    {pkg.verified_badge_enabled ? <Check className="h-3 w-3 text-green-500" /> : <X className="h-3 w-3 text-red-500" />}
                    <span>Verified Badge</span>
                  </li>
                  <li className="text-xs flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] h-4">Analytics: {pkg.analytics_level}</Badge>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <div><h2 className="text-2xl font-bold">Payments awaiting verification</h2><p className="text-sm text-muted-foreground">Confirm the provider or bank reference before activation. Verification is audited and idempotent.</p></div>
        {pendingPayments.length === 0 ? (
          <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">No pending subscription payments.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            {pendingPayments.map((payment: any) => (
              <div key={payment.id} className="flex flex-col gap-3 border-b p-4 last:border-b-0 md:flex-row md:items-center md:justify-between">
                <div><div className="font-semibold">{payment.store?.name || "Store"} · {payment.package?.name || "Package"}</div><div className="text-sm text-muted-foreground">{payment.invoice_no} · NPR {Number(payment.amount).toLocaleString()} · {payment.payment_method} · {payment.provider_transaction_id || "no reference"}</div></div>
                <Button size="sm" disabled={verifyPaymentMutation.isPending || (!payment.provider_transaction_id && payment.payment_method !== "cash")} onClick={() => verifyPaymentMutation.mutate(payment.id)}>
                  {verifyPaymentMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Verify and activate
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

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
                <Label>Price (Rs.)</Label>
                <Input type="number" {...register("price", { required: true, valueAsNumber: true })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select value={billingCycleValue} onValueChange={(v) => setValue("billing_cycle", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="lifetime">Lifetime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Analytics Level</Label>
                <Select value={analyticsLevelValue} onValueChange={(v) => setValue("analytics_level", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Products</Label>
                <Input type="number" {...register("product_limit", { required: true, valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Accessories</Label>
                <Input type="number" {...register("accessory_limit", { required: true, valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Staff</Label>
                <Input type="number" {...register("staff_limit", { required: true, valueAsNumber: true })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t">
              <div className="flex items-center justify-between space-x-2">
                <Label>Exchange Enabled</Label>
                <Switch onCheckedChange={(v) => setValue("exchange_enabled", v)} defaultChecked={watch("exchange_enabled")} />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label>Repair Enabled</Label>
                <Switch onCheckedChange={(v) => setValue("repair_enabled", v)} defaultChecked={watch("repair_enabled")} />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label>Custom SEO</Label>
                <Switch onCheckedChange={(v) => setValue("custom_seo_enabled", v)} defaultChecked={watch("custom_seo_enabled")} />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label>Featured Enabled</Label>
                <Switch onCheckedChange={(v) => setValue("featured_enabled", v)} defaultChecked={watch("featured_enabled")} />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label>Verified Badge</Label>
                <Switch onCheckedChange={(v) => setValue("verified_badge_enabled", v)} defaultChecked={watch("verified_badge_enabled")} />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label>Home Promotion</Label>
                <Switch onCheckedChange={(v) => setValue("homepage_promotion_enabled", v)} defaultChecked={watch("homepage_promotion_enabled")} />
              </div>
            </div>

            <DialogFooter className="pt-6">
              <Button type="submit" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Package
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
