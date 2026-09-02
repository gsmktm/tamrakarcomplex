import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Globe2,
  Loader2,
  Lock,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  Smartphone,
  TestTube2,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type ProviderMode = "sandbox" | "production" | "demo";
type ProviderRegion = "np" | "intl";
type ProviderType = "wallet" | "card" | "bank" | "qr" | "cod" | "gateway";

interface PaymentProvider {
  slug: string;
  name: string;
  region: ProviderRegion;
  provider_type: ProviderType;
  is_enabled: boolean;
  is_ready: boolean;
  mode: ProviderMode;
  merchant_code: string | null;
  secret_key: string | null;
  gateway_url: string | null;
  fee_percent: number | null;
  icon_url: string | null;
  display_order: number;
  config: Record<string, unknown> | null;
  updated_at: string;
}

const PROVIDER_TYPE_META: Record<ProviderType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  wallet: { label: "Wallet", icon: Wallet },
  card: { label: "Card", icon: CreditCard },
  bank: { label: "Bank", icon: Banknote },
  qr: { label: "QR", icon: QrCode },
  cod: { label: "Cash on Delivery", icon: Smartphone },
  gateway: { label: "Gateway", icon: Globe2 },
};

type EditDraft = {
  slug: string;
  name: string;
  region: ProviderRegion;
  provider_type: ProviderType;
  is_enabled: boolean;
  is_ready: boolean;
  mode: ProviderMode;
  merchant_code: string;
  secret_key: string;
  gateway_url: string;
  fee_percent: string;
  icon_url: string;
  display_order: string;
  config_json: string;
};

function toDraft(p: PaymentProvider): EditDraft {
  return {
    slug: p.slug,
    name: p.name,
    region: p.region,
    provider_type: p.provider_type,
    is_enabled: p.is_enabled,
    is_ready: p.is_ready,
    mode: p.mode,
    merchant_code: p.merchant_code ?? "",
    secret_key: "",
    gateway_url: p.gateway_url ?? "",
    fee_percent: p.fee_percent != null ? String(p.fee_percent) : "",
    icon_url: p.icon_url ?? "",
    display_order: String(p.display_order),
    config_json: JSON.stringify(p.config ?? {}, null, 2),
  };
}

export default function PaymentProviderManager() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EditDraft | null>(null);
  const [isNew, setIsNew] = useState(false);

  const { data: providers, isLoading, refetch } = useQuery({
    queryKey: ["suadmin-payment-providers"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("suadmin_get_payment_providers");
      if (error) throw error;
      return (data ?? []) as unknown as PaymentProvider[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ slug, enabled }: { slug: string; enabled: boolean }) => {
      const { error } = await supabase.rpc("suadmin_toggle_payment_provider", {
        p_slug: slug,
        p_enabled: enabled,
      });
      if (error) throw error;
    },
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: ["suadmin-payment-providers"] });
      toast.success(vars.enabled ? "Payment method enabled" : "Payment method disabled");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("cannot_enable_demo_provider")) {
        toast.error("Demo-mode methods cannot be enabled. Switch the mode to sandbox or production first.");
      } else {
        toast.error(message || "Failed to toggle provider");
      }
    },
  });

  const modeMutation = useMutation({
    mutationFn: async ({ slug, mode }: { slug: string; mode: ProviderMode }) => {
      const { error } = await supabase.rpc("suadmin_set_payment_mode", { p_slug: slug, p_mode: mode });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suadmin-payment-providers"] });
      toast.success("Payment mode updated");
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Failed to set mode"),
  });

  const saveMutation = useMutation({
    mutationFn: async (draft: EditDraft) => {
      let config: Record<string, unknown> | null = null;
      if (draft.config_json.trim()) {
        try {
          config = JSON.parse(draft.config_json);
        } catch {
          throw new Error("Config JSON is invalid");
        }
      }
      const { error } = await supabase.rpc("suadmin_upsert_payment_provider", {
        p_slug: draft.slug,
        p_name: draft.name,
        p_region: draft.region,
        p_provider_type: draft.provider_type,
        p_is_enabled: draft.is_enabled,
        p_is_ready: draft.is_ready,
        p_mode: draft.mode,
        p_merchant_code: draft.merchant_code || null,
        p_secret_key: draft.secret_key || null,
        p_gateway_url: draft.gateway_url || null,
        p_fee_percent: draft.fee_percent === "" ? null : Number(draft.fee_percent),
        p_icon_url: draft.icon_url || null,
        p_display_order: Number(draft.display_order || 0),
        p_config: config,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suadmin-payment-providers"] });
      toast.success("Payment method saved");
      setEditing(null);
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Failed to save provider"),
  });

  const nepalProviders = useMemo(() => (providers ?? []).filter((p) => p.region === "np"), [providers]);
  const intlProviders = useMemo(() => (providers ?? []).filter((p) => p.region === "intl"), [providers]);
  const demoCount = (providers ?? []).filter((p) => p.is_enabled && p.mode === "demo").length;

  const openEdit = (p: PaymentProvider) => {
    setIsNew(false);
    setEditing(toDraft(p));
  };

  const openNew = () => {
    setIsNew(true);
    setEditing({
      slug: "",
      name: "",
      region: "np",
      provider_type: "wallet",
      is_enabled: false,
      is_ready: false,
      mode: "sandbox",
      merchant_code: "",
      secret_key: "",
      gateway_url: "",
      fee_percent: "",
      icon_url: "",
      display_order: "20",
      config_json: "{}",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Methods</h1>
          <p className="text-sm text-muted-foreground">
            Configure Nepal's top payment methods and international options. Control which methods
            customers see at checkout, and switch providers between production, sandbox, and demo modes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Add Method
          </Button>
        </div>
      </div>

      {demoCount > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-amber-700">Demo mode is active on {demoCount} enabled method{demoCount > 1 ? "s" : ""}</p>
              <p className="text-muted-foreground">
                Demo payments complete instantly without contacting a real gateway — orders settle and
                commissions/payouts run, so never leave demo on with real credentials in production.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <ProviderSection
            title="Nepal Payment Methods"
            description="Top local methods — wallets, bank rails, QR, and cash on delivery."
            providers={nepalProviders}
            onToggle={toggleMutation.mutate}
            onModeChange={modeMutation.mutate}
            onEdit={openEdit}
          />
          <ProviderSection
            title="International Payment Methods"
            description="Cards and global gateways for diaspora and cross-border customers."
            providers={intlProviders}
            onToggle={toggleMutation.mutate}
            onModeChange={modeMutation.mutate}
            onEdit={openEdit}
          />
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mode Reference</CardTitle>
          <CardDescription>What each provider mode means at checkout.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Production</p>
            <p className="mt-1 text-muted-foreground">Real gateway with live credentials. Money moves for real.</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="flex items-center gap-2 font-semibold"><TestTube2 className="h-4 w-4 text-sky-600" /> Sandbox</p>
            <p className="mt-1 text-muted-foreground">Gateway test environment with sandbox credentials.</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4 text-amber-600" /> Demo</p>
            <p className="mt-1 text-muted-foreground">
              No gateway call at all — verification auto-passes so the full order-to-payout chain can be tested.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? "Add Payment Method" : `Edit ${editing?.name ?? ""}`}</DialogTitle>
            <DialogDescription>
              Credentials are stored server-side and never exposed to customers. Leave the secret blank
              to keep the existing one.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form
              className="grid gap-4 py-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!/^[a-z0-9_]+$/.test(editing.slug)) {
                  toast.error("Slug must be lowercase letters, numbers and underscores only");
                  return;
                }
                saveMutation.mutate(editing);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="pp-slug">Slug</Label>
                  <Input
                    id="pp-slug"
                    value={editing.slug}
                    disabled={!isNew}
                    onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                    placeholder="esewa"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pp-name">Display Name</Label>
                  <Input
                    id="pp-name"
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="eSewa"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Region</Label>
                  <Select value={editing.region} onValueChange={(v: ProviderRegion) => setEditing({ ...editing, region: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="np">Nepal</SelectItem>
                      <SelectItem value="intl">International</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select value={editing.provider_type} onValueChange={(v: ProviderType) => setEditing({ ...editing, provider_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PROVIDER_TYPE_META) as ProviderType[]).map((t) => (
                        <SelectItem key={t} value={t}>{PROVIDER_TYPE_META[t].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Mode</Label>
                  <Select value={editing.mode} onValueChange={(v: ProviderMode) => setEditing({ ...editing, mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="demo">Demo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="pp-merchant">Merchant / Product Code</Label>
                  <Input
                    id="pp-merchant"
                    value={editing.merchant_code}
                    onChange={(e) => setEditing({ ...editing, merchant_code: e.target.value })}
                    placeholder="EPAYTEST"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pp-secret">Secret Key {isNew ? "" : "(leave blank to keep)"}</Label>
                  <Input
                    id="pp-secret"
                    type="password"
                    value={editing.secret_key}
                    onChange={(e) => setEditing({ ...editing, secret_key: e.target.value })}
                    placeholder="8gBm4&38nFN2#6T!" // eSewa public sandbox sample — safe placeholder
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="pp-gateway">Gateway URL</Label>
                  <Input
                    id="pp-gateway"
                    value={editing.gateway_url}
                    onChange={(e) => setEditing({ ...editing, gateway_url: e.target.value })}
                    placeholder="https://…/form"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pp-fee">Fee %</Label>
                  <Input
                    id="pp-fee"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={editing.fee_percent}
                    onChange={(e) => setEditing({ ...editing, fee_percent: e.target.value })}
                    placeholder="2.0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pp-order">Display Order</Label>
                  <Input
                    id="pp-order"
                    type="number"
                    min="0"
                    value={editing.display_order}
                    onChange={(e) => setEditing({ ...editing, display_order: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pp-icon">Icon URL</Label>
                <Input
                  id="pp-icon"
                  value={editing.icon_url}
                  onChange={(e) => setEditing({ ...editing, icon_url: e.target.value })}
                  placeholder="https://…/logo.png"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pp-config">Config JSON</Label>
                <Textarea
                  id="pp-config"
                  className="font-mono text-xs"
                  rows={4}
                  value={editing.config_json}
                  onChange={(e) => setEditing({ ...editing, config_json: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="pp-enabled"
                    checked={editing.is_enabled}
                    onCheckedChange={(v) => setEditing({ ...editing, is_enabled: v })}
                  />
                  <Label htmlFor="pp-enabled">Enabled (visible at checkout)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="pp-ready"
                    checked={editing.is_ready}
                    onCheckedChange={(v) => setEditing({ ...editing, is_ready: v })}
                  />
                  <Label htmlFor="pp-ready">Ready (vs. "Coming soon" badge)</Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProviderSection({
  title,
  description,
  providers,
  onToggle,
  onModeChange,
  onEdit,
}: {
  title: string;
  description: string;
  providers: PaymentProvider[];
  onToggle: (v: { slug: string; enabled: boolean }) => void;
  onModeChange: (v: { slug: string; mode: ProviderMode }) => void;
  onEdit: (p: PaymentProvider) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {title}
          <Badge variant="secondary">{providers.filter((p) => p.is_enabled).length}/{providers.length} enabled</Badge>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {providers.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No payment methods configured for this region yet.
          </p>
        ) : (
          providers.map((p) => {
            const TypeIcon = PROVIDER_TYPE_META[p.provider_type]?.icon ?? Wallet;
            const hasSecret = !!p.secret_key;
            return (
              <div
                key={p.slug}
                className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <TypeIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {p.name}
                      <Badge variant={p.is_ready ? "secondary" : "outline"} className="text-[10px]">
                        {p.is_ready ? "Ready" : "Coming soon"}
                      </Badge>
                      {p.mode === "demo" && p.is_enabled && (
                        <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-600">Demo</Badge>
                      )}
                      {!hasSecret && p.provider_type !== "cod" && (
                        <Badge variant="outline" className="border-red-500/30 text-[10px] text-red-600">No secret set</Badge>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.slug} · fee {p.fee_percent != null ? `${p.fee_percent}%` : "—"}
                      {p.config && typeof (p.config as Record<string, unknown>).description === "string"
                        ? ` · ${(p.config as Record<string, string>).description}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    value={p.mode}
                    onValueChange={(v: ProviderMode) => onModeChange({ slug: p.slug, mode: v })}
                    disabled={!p.is_enabled}
                  >
                    <SelectTrigger className="h-8 w-[130px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="demo">Demo</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => onEdit(p)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Switch
                    checked={p.is_enabled}
                    onCheckedChange={(v) => onToggle({ slug: p.slug, enabled: v })}
                    aria-label={`Toggle ${p.name}`}
                  />
                </div>
              </div>
            );
          })
        )}
        <Separator className="my-1" />
        <p className="text-xs text-muted-foreground">
          Mode meanings — Production: live gateway · Sandbox: gateway test env · Demo: verification
          auto-passes for end-to-end order testing.
        </p>
      </CardContent>
    </Card>
  );
}
