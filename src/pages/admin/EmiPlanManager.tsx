import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Plus, Pencil, Trash2, Loader2, CreditCard, Calculator, ShieldCheck,
  Smartphone, IndianRupee, TrendingUp, AlertTriangle, Link2, CheckCircle2, XCircle,
} from "lucide-react";
import { mobileMasterService, EmiPlan, PhoneModel } from "@/services/mobileMasterService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type EmiPlanExtended = EmiPlan & {
  min_price?: number;
  max_price?: number;
  down_payment_pct?: number;
  zero_interest?: boolean;
  notes?: string;
};

const EMPTY: Partial<EmiPlanExtended> = {
  bank_name: "",
  duration_months: 12,
  interest_rate: 0,
  processing_fee: 0,
  status: "active",
  min_price: 15000,
  max_price: 500000,
  down_payment_pct: 10,
  zero_interest: false,
};

type ModelLink = {
  id: string;
  model_id: string;
  emi_plan_id: string;
  created_at?: string;
  models?: { id: string; name: string; brand_id: string; brands?: { name: string } };
};

function calcEmi(principal: number, rateAnnualPct: number, months: number) {
  if (months <= 0 || principal <= 0) return 0;
  const r = rateAnnualPct / 100 / 12;
  if (r === 0) return principal / months;
  const x = Math.pow(1 + r, months);
  return (principal * r * x) / (x - 1);
}

function formatNpr(n: number) {
  return "Rs. " + Math.round(n).toLocaleString("en-IN");
}

export default function EmiPlanManager() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmiPlanExtended | null>(null);
  const [form, setForm] = useState<Partial<EmiPlanExtended>>(EMPTY);
  const [calcPrice, setCalcPrice] = useState<number>(150000);
  const [calcDownPct, setCalcDownPct] = useState<number>(10);
  const [activeTab, setActiveTab] = useState("plans");
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<EmiPlanExtended | null>(null);

  const { data: plans, isLoading } = useQuery<EmiPlanExtended[]>({
    queryKey: ["all_emi_plans_ext"],
    queryFn: async () => {
      const base = await mobileMasterService.getAllEmiPlans();
      return (base ?? []) as EmiPlanExtended[];
    },
  });

  const { data: models } = useQuery<PhoneModel[]>({
    queryKey: ["emi-link-models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phone_models")
        .select("id, name, slug, status, brand_id, brands:brand_id(name)")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return (data ?? []) as PhoneModel[];
    },
  });

  const { data: existingLinks } = useQuery<ModelLink[]>({
    queryKey: ["emi-model-links", selectedPlan?.id],
    enabled: !!selectedPlan && !!linkOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emi_model_links")
        .select("id, model_id, emi_plan_id, created_at, models:phone_models(id, name, brand_id, brands:brand_id(name))")
        .eq("emi_plan_id", selectedPlan!.id);
      if (error) throw error;
      return (data ?? []) as ModelLink[];
    },
  });

  const save = useMutation({
    mutationFn: (p: Partial<EmiPlanExtended>) => {
      const payload = {
        bank_name: p.bank_name?.trim(),
        duration_months: Number(p.duration_months ?? 0),
        interest_rate: Number(p.interest_rate ?? 0),
        processing_fee: Number(p.processing_fee ?? 0),
        status: p.status ?? "active",
      };
      if (!payload.bank_name) throw new Error("Bank / NBFC name is required");
      if (!payload.duration_months || payload.duration_months < 1) throw new Error("Duration must be at least 1 month");
      if (payload.interest_rate < 0) throw new Error("Interest rate cannot be negative");
      if (payload.processing_fee < 0) throw new Error("Processing fee cannot be negative");
      return mobileMasterService.upsertEmiPlan(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all_emi_plans"] });
      qc.invalidateQueries({ queryKey: ["all_emi_plans_ext"] });
      qc.invalidateQueries({ queryKey: ["emi_plans"] });
      setOpen(false);
      toast.success("EMI plan saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => mobileMasterService.deleteEmiPlan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all_emi_plans"] });
      qc.invalidateQueries({ queryKey: ["all_emi_plans_ext"] });
      toast.success("EMI plan deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleLink = useMutation({
    mutationFn: async ({ planId, modelId, add }: { planId: string; modelId: string; add: boolean }) => {
      if (add) {
        const { error } = await supabase
          .from("emi_model_links")
          .insert({ emi_plan_id: planId, model_id: modelId })
          .select();
        if (error && !error.message?.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase
          .from("emi_model_links")
          .delete()
          .eq("emi_plan_id", planId)
          .eq("model_id", modelId);
        if (error) throw error;
      }
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emi-model-links"] });
      toast.success("Model link updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  function openAdd() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(p: EmiPlanExtended) { setEditing(p); setForm(p); setOpen(true); }
  function openLinks(p: EmiPlanExtended) { setSelectedPlan(p); setLinkOpen(true); }

  const activePlans = useMemo(() => (plans ?? []).filter(p => p.status === "active"), [plans]);

  const calcRows = useMemo(() => {
    const downPayment = Math.round(calcPrice * (calcDownPct / 100));
    const loan = calcPrice - downPayment;
    return activePlans.map(plan => {
      const rate = plan.zero_interest ? 0 : plan.interest_rate;
      const monthly = calcEmi(loan, rate, plan.duration_months);
      const totalPay = monthly * plan.duration_months;
      const interest = totalPay - loan;
      const allIn = totalPay + (plan.processing_fee || 0) + downPayment;
      return { plan, downPayment, loan, monthly, interest, totalPay, processingFee: plan.processing_fee || 0, allIn };
    });
  }, [activePlans, calcPrice, calcDownPct]);

  const linkedModelIds = useMemo(
    () => new Set((existingLinks ?? []).map(l => l.model_id)),
    [existingLinks]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5">
          <CreditCard className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight">EMI Plans & Financing</h1>
          <p className="text-sm text-muted-foreground">
            Manage bank/NBFC EMI plans, preview calculator, and link eligible devices.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="outline" size="sm" className="gap-1.5" onClick={() => setActiveTab("calculator")}>
                  <span>
                    <Calculator className="h-3.5 w-3.5" />
                    Preview Calc
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Try EMI calculator with current plans</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={openAdd} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Plan
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid h-auto grid-flow-col auto-cols-max min-w-max gap-1">
          <TabsTrigger value="plans" className="gap-1.5 px-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="calculator" className="gap-1.5 px-3">
            <Calculator className="h-3.5 w-3.5" />
            EMI Calculator
          </TabsTrigger>
          <TabsTrigger value="eligibility" className="gap-1.5 px-3">
            <Smartphone className="h-3.5 w-3.5" />
            Eligibility
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-0 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Plans</p>
                    <p className="mt-1 text-2xl font-bold">{activePlans.length}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Interest</p>
                    <p className="mt-1 text-2xl font-bold">
                      {activePlans.length ? (activePlans.reduce((s, p) => s + (p.interest_rate || 0), 0) / activePlans.length).toFixed(1) : "0"}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 p-2">
                    <TrendingUp className="h-4 w-4 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tenure Spread</p>
                    <p className="mt-1 text-2xl font-bold">
                      {activePlans.length ? `${Math.min(...activePlans.map(p => p.duration_months))}–${Math.max(...activePlans.map(p => p.duration_months))}` : "0"} mo
                    </p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-36">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bank / NBFC</TableHead>
                      <TableHead>Tenure</TableHead>
                      <TableHead>Interest</TableHead>
                      <TableHead>Processing</TableHead>
                      <TableHead>0% Offer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(plans ?? []).map(p => (
                      <TableRow key={p.id} className="group">
                        <TableCell className="font-medium">{p.bank_name}</TableCell>
                        <TableCell>{p.duration_months} months</TableCell>
                        <TableCell className="tabular-nums">{p.interest_rate}%</TableCell>
                        <TableCell className="tabular-nums">{formatNpr(p.processing_fee)}</TableCell>
                        <TableCell>
                          {p.zero_interest ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                              Zero interest
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">Standard</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openLinks(p as EmiPlanExtended)} title="Link models">
                              <Link2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p as EmiPlanExtended)} title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-rose-500 hover:text-rose-600"
                              onClick={() => {
                                if (confirm("Delete this EMI plan?")) del.mutate(p.id);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!plans?.length && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                          <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p className="font-medium">No EMI plans yet.</p>
                          <p className="text-xs">Add plans from NIC Asia, Nabil, Global IME, or finance companies.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator" className="mt-0">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  Calculator Inputs
                </CardTitle>
                <CardDescription>Enter phone price and down payment to preview EMI options.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Device Price (NPR)</Label>
                    <span className="text-sm font-semibold tabular-nums">{formatNpr(calcPrice)}</span>
                  </div>
                  <Slider
                    value={[calcPrice]}
                    onValueChange={v => setCalcPrice(v[0])}
                    min={10000}
                    max={500000}
                    step={5000}
                  />
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="number"
                      value={calcPrice}
                      onChange={e => setCalcPrice(Number(e.target.value) || 0)}
                      className="tabular-nums"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Down Payment</Label>
                    <span className="text-sm font-semibold tabular-nums">
                      {calcDownPct}% · {formatNpr(Math.round(calcPrice * calcDownPct / 100))}
                    </span>
                  </div>
                  <Slider
                    value={[calcDownPct]}
                    onValueChange={v => setCalcDownPct(v[0])}
                    min={0}
                    max={60}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Typical EMI plans in Nepal require 0%–30% down payment.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Loan Amount</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {formatNpr(calcPrice - Math.round(calcPrice * calcDownPct / 100))}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Plans Available</p>
                    <p className="mt-1 text-lg font-semibold">{activePlans.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Plan Breakdown
                </CardTitle>
                <CardDescription>Per-plan EMI, interest, and all-in cost.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {activePlans.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No active EMI plans to display.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plan</TableHead>
                        <TableHead>Monthly</TableHead>
                        <TableHead>Interest</TableHead>
                        <TableHead>Total Payable</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calcRows.map(r => (
                        <TableRow key={r.plan.id}>
                          <TableCell>
                            <p className="font-medium">{r.plan.bank_name}</p>
                            <p className="text-xs text-muted-foreground">{r.plan.duration_months} months · {r.plan.interest_rate}%</p>
                          </TableCell>
                          <TableCell className="font-semibold tabular-nums">{formatNpr(r.monthly)}</TableCell>
                          <TableCell className={cn("tabular-nums", r.interest > 0 ? "text-amber-600" : "text-emerald-600")}>
                            {r.interest > 0 ? `+${formatNpr(r.interest)}` : "Zero"}
                          </TableCell>
                          <TableCell className="font-bold tabular-nums">{formatNpr(r.allIn)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="eligibility" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Eligibility Rules
              </CardTitle>
              <CardDescription>
                Set price range eligibility per plan. Device-link level constraints are managed via "Link models" on each plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-36">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Min Price</TableHead>
                      <TableHead>Max Price</TableHead>
                      <TableHead>Default Down %</TableHead>
                      <TableHead>Zero Interest</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(plans ?? []).map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.bank_name}</TableCell>
                        <TableCell className="tabular-nums">{formatNpr(p.min_price ?? 0)}</TableCell>
                        <TableCell className="tabular-nums">{formatNpr(p.max_price ?? 0)}</TableCell>
                        <TableCell>{p.down_payment_pct ?? 0}%</TableCell>
                        <TableCell>
                          {p.zero_interest ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">Yes</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">No</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!plans?.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                          No plans to display.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit EMI Plan" : "Add EMI Plan"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Bank / NBFC Name</Label>
              <Input
                value={form.bank_name ?? ""}
                onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                placeholder="e.g. NIC Asia Bank, Nabil Bank, Sipradi Finance"
              />
            </div>
            <div className="space-y-1">
              <Label>Duration (months)</Label>
              <Input
                type="number"
                value={form.duration_months ?? 12}
                onChange={e => setForm(f => ({ ...f, duration_months: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Interest Rate (annual %)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.interest_rate ?? 0}
                onChange={e => setForm(f => ({ ...f, interest_rate: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Processing Fee (NPR)</Label>
              <Input
                type="number"
                step="100"
                value={form.processing_fee ?? 0}
                onChange={e => setForm(f => ({ ...f, processing_fee: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status ?? "active"} onValueChange={status => setForm(f => ({ ...f, status }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator className="col-span-2 my-2" />

            <div className="space-y-1">
              <Label>Min Eligible Price</Label>
              <Input
                type="number"
                value={form.min_price ?? 15000}
                onChange={e => setForm(f => ({ ...f, min_price: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Max Eligible Price</Label>
              <Input
                type="number"
                value={form.max_price ?? 500000}
                onChange={e => setForm(f => ({ ...f, max_price: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Default Down Payment (%)</Label>
              <Input
                type="number"
                value={form.down_payment_pct ?? 10}
                onChange={e => setForm(f => ({ ...f, down_payment_pct: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between h-9">
                <Label className="cursor-pointer">Zero Interest Offer</Label>
                <Switch
                  checked={!!form.zero_interest}
                  onCheckedChange={v => setForm(f => ({ ...f, zero_interest: v }))}
                />
              </div>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Internal Notes</Label>
              <Input
                value={form.notes ?? ""}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Debit card EMI, cardholder required, limited-time"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={!form.bank_name || save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              Link Models to · {selectedPlan?.bank_name ?? ""}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <Input
              placeholder="Search models..."
              className="mb-3"
            />
            {!models?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Smartphone className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No active models to link.
              </div>
            ) : (
              <div className="space-y-1">
                {models.map(m => {
                  const linked = linkedModelIds.has(m.id);
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                        linked && "bg-primary/5 border-primary/20"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(m as any).brands?.name ?? "—"} · {m.slug ?? ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={linked ? "secondary" : "outline"}
                        className={cn("gap-1.5 shrink-0", linked && "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/20")}
                        disabled={toggleLink.isPending}
                        onClick={() => {
                          if (!selectedPlan) return;
                          toggleLink.mutate({
                            planId: selectedPlan.id,
                            modelId: m.id,
                            add: !linked,
                          });
                        }}
                      >
                        {linked ? (
                          <><CheckCircle2 className="h-3.5 w-3.5" /> Linked</>
                        ) : (
                          <><Plus className="h-3.5 w-3.5" /> Link</>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
