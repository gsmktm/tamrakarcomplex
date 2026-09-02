import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, CheckCircle2, Loader2, Search, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type PricingRow = {
  id: string;
  name: string;
  slug: string;
  price_npr: number | null;
  brand?: { name?: string | null } | null;
  model?: { name?: string | null } | null;
  ruleId?: string | null;
  basePrice?: number | null;
  active?: boolean;
};

export function CatalogValuationPricing() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);

  const { data: rows = [], isLoading } = useQuery<PricingRow[]>({
    queryKey: ["catalog-valuation-pricing"],
    queryFn: async () => {
      const [productsResult, rulesResult] = await Promise.all([
        supabase.from("catalog_products").select("id,name,slug,price_npr,brand:brands(name),model:device_models(name)").eq("is_active", true).order("name"),
        (supabase as any).from("valuation_rules").select("id,catalog_product_id,base_price,active"),
      ]);
      if (productsResult.error) throw productsResult.error;
      if (rulesResult.error) throw rulesResult.error;
      const rules = new Map((rulesResult.data ?? []).filter((rule: any) => rule.catalog_product_id).map((rule: any) => [rule.catalog_product_id, rule]));
      return (productsResult.data ?? []).map((product: any) => ({
        ...product,
        ruleId: rules.get(product.id)?.id ?? null,
        basePrice: rules.get(product.id)?.base_price ?? null,
        active: rules.get(product.id)?.active ?? false,
      }));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ productId, price }: { productId: string; price: number }) => {
      if (!Number.isFinite(price) || price < 5000 || price > 2000000) throw new Error("Enter a base price between Rs. 5,000 and Rs. 2,000,000.");
      const { error } = await (supabase as any).from("valuation_rules").upsert({
        catalog_product_id: productId,
        base_price: Math.round(price),
        storage_adjustments: {},
        condition_factors: { new: 0.92, like_new: 0.82, used: 0.68, fair: 0.52, open_box: 0.82, refurbished: 0.62 },
        defect_adjustments: { screen_crack: 8000, battery_weak: 4000, camera_issue: 5000, face_id_fail: 6000, speaker_issue: 2000, buttons_issue: 1500 },
        age_depreciation: { perMonth: 0.01, capMonths: 48 },
        demand_factor: 1,
        active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "catalog_product_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["catalog-valuation-pricing"] });
      queryClient.invalidateQueries({ queryKey: ["admin-valuation-rules"] });
      toast.success("Live valuation base price saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filtered = useMemo(() => rows.filter((row) => {
    if (missingOnly && row.basePrice) return false;
    const haystack = `${row.brand?.name ?? ""} ${row.model?.name ?? ""} ${row.name} ${row.slug}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  }), [missingOnly, rows, search]);
  const configured = rows.filter((row) => Number(row.basePrice) > 0).length;

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">
      <Card><CardContent className="p-5"><div className="text-2xl font-black">{rows.length}</div><div className="text-sm text-muted-foreground">Live sell-wizard models</div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="text-2xl font-black text-emerald-600">{configured}</div><div className="text-sm text-muted-foreground">Configured valuation prices</div></CardContent></Card>
      <Card><CardContent className="p-5"><div className="text-2xl font-black text-amber-600">{rows.length - configured}</div><div className="text-sm text-muted-foreground">Using retail fallback</div></CardContent></Card>
    </div>
    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm leading-6">
      <div className="flex gap-3"><Calculator className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" /><div><strong>This is the live pricing source.</strong> Set the fair starting resale value here. Condition, storage, age, demand and defects are applied afterward by the valuation function.</div></div>
    </div>
    <div className="flex flex-wrap gap-3">
      <div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search brand, model or slug…" className="pl-9" /></div>
      <Button variant={missingOnly ? "default" : "outline"} onClick={() => setMissingOnly((value) => !value)}>{missingOnly ? "Showing missing prices" : "Show missing prices"}</Button>
      <Button asChild variant="outline"><Link to="/suadmin/products">Add or manage catalog models</Link></Button>
    </div>
    <div className="overflow-hidden rounded-2xl border">
      <Table><TableHeader><TableRow><TableHead>Live model</TableHead><TableHead>Retail reference</TableHead><TableHead>Valuation base</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
      <TableBody>{filtered.map((row) => <TableRow key={row.id}>
        <TableCell><div className="font-bold">{row.brand?.name ? `${row.brand.name} ` : ""}{row.model?.name || row.name}</div><div className="text-xs text-muted-foreground">{row.slug}</div></TableCell>
        <TableCell>{row.price_npr ? `Rs. ${Number(row.price_npr).toLocaleString()}` : "—"}</TableCell>
        <TableCell>{editing?.id === row.id ? <div className="flex gap-2"><Input type="number" min={5000} max={2000000} value={editing.value} onChange={(event) => setEditing({ id: row.id, value: event.target.value })} className="w-40" autoFocus /><Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate({ productId: row.id, price: Number(editing.value) })}>{saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div> : <button className="rounded-lg border border-dashed px-3 py-2 text-sm font-bold hover:bg-muted" onClick={() => setEditing({ id: row.id, value: String(row.basePrice ?? row.price_npr ?? "") })}>{row.basePrice ? `Rs. ${Number(row.basePrice).toLocaleString()}` : "+ Set price"}</button>}</TableCell>
        <TableCell>{row.basePrice ? <Badge className="gap-1 bg-emerald-600"><CheckCircle2 className="h-3 w-3" />Configured</Badge> : <Badge variant="outline" className="gap-1 text-amber-700"><TriangleAlert className="h-3 w-3" />Fallback</Badge>}</TableCell>
      </TableRow>)}{filtered.length === 0 && <TableRow><TableCell colSpan={4} className="py-12 text-center text-muted-foreground">No matching live models.</TableCell></TableRow>}</TableBody></Table>
    </div>
  </div>;
}
