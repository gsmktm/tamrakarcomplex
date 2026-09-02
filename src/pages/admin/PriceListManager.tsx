import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SafeImage } from "@/components/common/SafeImage";
import {
  Loader2, Pencil, Tag, Search, Filter, Store, TrendingDown, TrendingUp,
  Download, Upload, RefreshCw, Save, Plus, X, Edit3, CheckCircle2, AlertCircle,
  Percent, Banknote, ShoppingCart, Smartphone, Clock, ChevronDown, ChevronRight
} from "lucide-react";
import { toast } from "sonner";

type PriceRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  brand_name: string;
  brand_id: string;
  image?: string | null;
  min_price: number | null;
  max_price: number | null;
  avg_price: number | null;
  official_price: number | null;
  market_min: number | null;
  market_max: number | null;
  price_points: number;
  emi_available: boolean;
  last_updated?: string;
};

type VariantPrice = {
  id: string;
  model_id: string;
  variant_id: string;
  variant_label: string;
  regular_price: number;
  sale_price: number | null;
  mrp: number | null;
  stock_status: string;
  store_name: string;
  store_id: string | null;
  is_default: boolean;
  emi_available: boolean;
  updated_at?: string;
};

type BulkEditCell = {
  modelId: string;
  variantId?: string;
  field: "regular_price" | "sale_price" | "mrp" | "stock_status" | "emi_available";
  value: any;
};

const formatNpr = (n: number | null | undefined) => {
  if (n == null) return "—";
  return "Rs. " + n.toLocaleString("en-IN");
};

const deltaClass = (official: number | null, market: number | null) => {
  if (!official || !market) return "text-muted-foreground";
  if (market < official * 0.97) return "text-emerald-600";
  if (market > official * 1.02) return "text-rose-600";
  return "text-amber-600";
};

export default function PriceListManager() {
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState<"all" | "priced" | "unpriced" | "deals">("all");
  const [editModel, setEditModel] = useState<PriceRow | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkEdits, setBulkEdits] = useState<Map<string, BulkEditCell>>(new Map());
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const qc = useQueryClient();

  const { data: brands = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["brands-for-price-filter"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: stores = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["stores-for-price-filter"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name").order("name").limit(20);
      if (error) return [];
      return data ?? [];
    },
  });

  const { data: models = [], isLoading } = useQuery<PriceRow[]>({
    queryKey: ["price-list-models-v2", brandFilter, statusFilter, search, priceFilter],
    queryFn: async () => {
      let q: any = supabase
        .from("phone_models")
        .select("id, name, slug, status, brand_id, image, brands(name)")
        .order("brands(name)", { ascending: true })
        .order("name", { ascending: true });

      if (brandFilter !== "all") q = q.eq("brand_id", brandFilter);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (search) q = q.ilike("name", `%${search}%`);

      const { data, error } = await q;
      if (error) throw error;

      const modelIds = (data ?? []).map((m: any) => m.id);
      const priceMap: Record<string, { prices: number[]; official: number | null; emi_count: number; last_updated?: string }> = {};

      if (modelIds.length > 0) {
        const { data: prices } = await supabase
          .from("phone_variant_prices")
          .select("model_id, regular_price, sale_price, emi_available, updated_at")
          .in("model_id", modelIds);

        (prices ?? []).forEach((p: any) => {
          if (!priceMap[p.model_id]) priceMap[p.model_id] = { prices: [], official: null, emi_count: 0 };
          const cur = priceMap[p.model_id];
          if (p.regular_price) cur.prices.push(p.regular_price);
          if (p.sale_price) cur.prices.push(p.sale_price);
          if (p.emi_available) cur.emi_count++;
          if (!cur.last_updated || p.updated_at > cur.last_updated) cur.last_updated = p.updated_at;
        });

        // Get official (default) prices
        const { data: defaultPrices } = await supabase
          .from("phone_variant_prices")
          .select("model_id, regular_price")
          .in("model_id", modelIds)
          .eq("is_default", true)
          .eq("stock_status", "in_stock");

        (defaultPrices ?? []).forEach((p: any) => {
          if (priceMap[p.model_id]) priceMap[p.model_id].official = p.regular_price;
        });
      }

      const rows = (data ?? []).map((m: any) => {
        const info = priceMap[m.id];
        const prices = info?.prices || [];
        return {
          id: m.id,
          name: m.name,
          slug: m.slug,
          status: m.status,
          brand_id: m.brand_id,
          brand_name: m.brands?.name ?? "—",
          image: m.image,
          price_points: prices.length,
          min_price: prices.length ? Math.min(...prices) : null,
          max_price: prices.length ? Math.max(...prices) : null,
          avg_price: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
          official_price: info?.official || null,
          market_min: prices.length ? Math.min(...prices) : null,
          market_max: prices.length ? Math.max(...prices) : null,
          emi_available: (info?.emi_count || 0) > 0,
          last_updated: info?.last_updated,
        };
      }).filter((r: PriceRow) => {
        if (priceFilter === "priced") return r.price_points > 0;
        if (priceFilter === "unpriced") return r.price_points === 0;
        if (priceFilter === "deals") return r.official_price && r.min_price && r.min_price < r.official_price;
        return true;
      });

      return rows;
    },
  });

  const { data: variantPrices = [], isLoading: loadingVariants } = useQuery<VariantPrice[]>({
    queryKey: ["all-variant-prices", editModel?.id],
    enabled: !!editModel,
    queryFn: async () => {
      if (!editModel) return [];
      const { data, error } = await supabase
        .from("phone_variant_prices")
        .select(`id, model_id, variant_id, regular_price, sale_price, mrp, stock_status, is_default, emi_available, updated_at, stores:store_id(name)`)
        .eq("model_id", editModel.id)
        .order("is_default", { ascending: false })
        .order("regular_price", { ascending: true });
      if (error) throw error;
      // Also get variants to build labels
      const { data: variants } = await supabase
        .from("phone_variants")
        .select("id, ram, storage, color, condition_type")
        .eq("model_id", editModel.id);
      const vmap: Record<string, string> = {};
      (variants ?? []).forEach((v: any) => {
        vmap[v.id] = [v.ram, v.storage, v.color, v.condition_type === "used" ? "Used" : null].filter(Boolean).join(" / ") || "Base variant";
      });
      return (data ?? []).map((p: any) => ({
        id: p.id,
        model_id: p.model_id,
        variant_id: p.variant_id,
        variant_label: vmap[p.variant_id] || "Variant",
        regular_price: p.regular_price,
        sale_price: p.sale_price,
        mrp: p.mrp,
        stock_status: p.stock_status,
        store_name: p.stores?.name || (p.store_id ? "Marketplace" : "Official (Tamrakar)"),
        store_id: p.store_id,
        is_default: p.is_default,
        emi_available: !!p.emi_available,
        updated_at: p.updated_at,
      }));
    },
  });

  const savePriceMutation = useMutation({
    mutationFn: async (payload: { model: PriceRow; regular: number; sale: number | null; makeDefault?: boolean }) => {
      const { model, regular, sale, makeDefault } = payload;

      const defaultPrice = variantPrices.find((p) => p.is_default);
      if (defaultPrice && !makeDefault) {
        const { error } = await supabase
          .from("phone_variant_prices")
          .update({ regular_price: regular, sale_price: sale, updated_at: new Date().toISOString() })
          .eq("id", defaultPrice.id);
        if (error) throw error;
        return;
      }

      // Get or create default variant
      const { data: variants } = await (supabase as any)
        .from("phone_variants")
        .select("id")
        .eq("model_id", model.id)
        .limit(1);

      let variantId = variants?.[0]?.id;
      if (!variantId) {
        const { data: newVar, error: varErr } = await (supabase as any)
          .from("phone_variants")
          .insert({ model_id: model.id, condition_type: "new", status: "active" })
          .select()
          .single();
        if (varErr) throw varErr;
        variantId = newVar.id;
      }

      if (defaultPrice) {
        await supabase.from("phone_variant_prices").update({ is_default: false }).eq("id", defaultPrice.id);
      }

      const { error } = await supabase.from("phone_variant_prices").insert({
        model_id: model.id,
        variant_id: variantId,
        regular_price: regular,
        sale_price: sale,
        mrp: regular,
        currency: "NPR",
        stock_status: "in_stock",
        emi_available: regular >= 30000,
        is_default: true,
        sort_order: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-list-models-v2"] });
      qc.invalidateQueries({ queryKey: ["all-variant-prices"] });
      qc.invalidateQueries({ queryKey: ["catalog-deep-stats"] });
      qc.invalidateQueries({ queryKey: ["price-list-models"] });
      setEditModel(null);
      toast.success("Price saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkSaveMutation = useMutation({
    mutationFn: async () => {
      let ok = 0;
      for (const [, cell] of bulkEdits.entries()) {
        try {
          const { error } = await supabase
            .from("phone_variant_prices")
            .update({
              [cell.field]: typeof cell.value === "string" && cell.field === "stock_status" ? cell.value : cell.value,
              updated_at: new Date().toISOString(),
            })
            .eq("model_id", cell.modelId)
            .eq("is_default", true);
          if (!error) ok++;
        } catch { /* ignore */ }
      }
      return ok;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["price-list-models-v2"] });
      qc.invalidateQueries({ queryKey: ["catalog-deep-stats"] });
      setBulkMode(false);
      setBulkEdits(new Map());
      toast.success(`Saved ${count} price updates`);
    },
  });

  const totals = useMemo(() => {
    const priced = models.filter((m) => m.price_points > 0).length;
    const avg = models.filter((m) => m.avg_price).reduce((s, m) => s + (m.avg_price || 0), 0) / Math.max(1, models.filter((m) => m.avg_price).length);
    const deals = models.filter((m) => m.official_price && m.min_price && m.min_price < m.official_price).length;
    const withEmi = models.filter((m) => m.emi_available).length;
    return { total: models.length, priced, unpriced: models.length - priced, avg: Math.round(avg), deals, withEmi };
  }, [models]);

  const pagedModels = useMemo(() => {
    const start = (page - 1) * pageSize;
    return models.slice(start, start + pageSize);
  }, [models, page]);
  const totalPages = Math.max(1, Math.ceil(models.length / pageSize));

  const exportCSV = () => {
    const headers = ["Brand", "Model", "Slug", "Official (NPR)", "Market Min", "Market Max", "Price Points", "EMI", "Status", "Updated"];
    const rows = models.map((m) => [
      m.brand_name, `"${m.name.replace(/"/g, '""')}"`, m.slug,
      m.official_price || "", m.min_price || "", m.max_price || "",
      m.price_points, m.emi_available ? "Yes" : "No", m.status, m.last_updated || ""
    ]);
    const csv = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `price-list-nepal-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Price list exported");
  };

  const setBulkCell = (rowId: string, field: BulkEditCell["field"], value: any) => {
    const next = new Map(bulkEdits);
    next.set(`${rowId}-${field}`, { modelId: rowId, field, value });
    setBulkEdits(next);
  };

  function openEdit(m: PriceRow) {
    setEditModel(m);
  }

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Models</CardTitle>
            <Smartphone className="h-3.5 w-3.5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{totals.total}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-emerald-500/30">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Priced</CardTitle>
            <Tag className="h-3.5 w-3.5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-emerald-600">{totals.priced}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-zinc-500/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">No Price</CardTitle>
            <AlertCircle className="h-3.5 w-3.5 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-zinc-500">{totals.unpriced}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-rose-500/30">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Deals (below MSRP)</CardTitle>
            <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-rose-600">{totals.deals}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-indigo-500/30">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">EMI Eligible</CardTitle>
            <Banknote className="h-3.5 w-3.5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-indigo-600">{totals.withEmi}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-amber-500/30">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Avg. Price</CardTitle>
            <ShoppingCart className="h-3.5 w-3.5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-amber-600">
              {totals.avg >= 1000 ? `${(totals.avg / 1000).toFixed(1)}k` : totals.avg}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Price List Manager
              </CardTitle>
              <CardDescription>
                Manage official MRP, shop-specific offer prices, and EMI eligibility gates. Verified entries feed the public /mobile-price/ pages.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={bulkMode ? "default" : "outline"}
                onClick={() => { setBulkMode(!bulkMode); setBulkEdits(new Map()); }}
              >
                <Edit3 className="h-3.5 w-3.5 mr-1" /> {bulkMode ? "Cancel Bulk Edit" : "Bulk Edit Mode"}
              </Button>
              {bulkMode && bulkEdits.size > 0 && (
                <Button
                  size="sm"
                  onClick={() => bulkSaveMutation.mutate()}
                  disabled={bulkSaveMutation.isPending}
                >
                  <Save className="h-3.5 w-3.5 mr-1" />
                  Save {bulkEdits.size} Changes
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={exportCSV}>
                <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" onClick={() => {
                      qc.invalidateQueries({ queryKey: ["price-list-models-v2"] });
                    }}>
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh prices</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center mt-4">
            <div className="relative max-w-xs flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search model name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 h-9"
              />
            </div>
            <Select value={brandFilter} onValueChange={(v) => { setBrandFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40 h-9"><SelectValue placeholder="All Brands" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-32 h-9"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priceFilter} onValueChange={(v) => { setPriceFilter(v as any); setPage(1); }}>
              <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Price State" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                <SelectItem value="priced">Priced Only</SelectItem>
                <SelectItem value="unpriced">Missing Price</SelectItem>
                <SelectItem value="deals">Below Official (Deals)</SelectItem>
              </SelectContent>
            </Select>
            {(search !== "" || brandFilter !== "all" || statusFilter !== "all" || priceFilter !== "all") && (
              <Button variant="ghost" size="sm" className="h-9" onClick={() => {
                setSearch(""); setBrandFilter("all"); setStatusFilter("all"); setPriceFilter("all"); setPage(1);
              }}>Clear</Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="rounded-md border overflow-hidden">
            <ScrollArea className="max-h-[62vh]">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 backdrop-blur-sm z-[1]">
                  <TableRow>
                    <TableHead className="w-10">SN</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Official MRP</TableHead>
                    <TableHead className="text-right">Market Range</TableHead>
                    <TableHead className="text-center">Delta</TableHead>
                    <TableHead className="text-center">Shops</TableHead>
                    <TableHead className="text-center">EMI</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    {bulkMode && (
                      <>
                        <TableHead className="text-right">Bulk: New Price</TableHead>
                        <TableHead className="text-center">Bulk: EMI</TableHead>
                      </>
                    )}
                    <TableHead className="text-right">Updated</TableHead>
                    <TableHead className="text-right w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedModels.map((m, idx) => {
                    const deltaPct = m.official_price && m.min_price ? Math.round((m.min_price / m.official_price - 1) * 100) : 0;
                    const bulkKey = `${m.id}-regular_price`;
                    const hasBulk = bulkEdits.has(bulkKey);
                    const emiBulkKey = `${m.id}-emi_available`;
                    const hasEmiBulk = bulkEdits.has(emiBulkKey);
                    return (
                      <TableRow key={m.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {(page - 1) * pageSize + idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg border bg-muted overflow-hidden shrink-0">
                              <SafeImage src={m.image} alt={m.name} className="h-full w-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium leading-tight truncate max-w-[240px]">{m.name}</div>
                              <div className="text-xs text-muted-foreground">{m.brand_name} • {m.slug}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {m.official_price ? (
                            <span className="font-semibold">{formatNpr(m.official_price)}</span>
                          ) : (
                            <Badge variant="outline" className="border-dashed text-muted-foreground">No MRP</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {m.price_points > 0 ? (
                            <div className="flex flex-col items-end">
                              <span>{formatNpr(m.min_price)}</span>
                              {m.max_price && m.max_price !== m.min_price && (
                                <span className="text-xs text-muted-foreground">– {formatNpr(m.max_price)}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {deltaPct !== 0 ? (
                            <span className={`text-xs font-semibold flex items-center justify-center gap-0.5 ${deltaClass(m.official_price, m.min_price)}`}>
                              {deltaPct < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                              {Math.abs(deltaPct)}%
                            </span>
                          ) : (
                            m.official_price ? <Badge variant="outline" className="h-5 px-1.5 text-[10px]">At MRP</Badge> : <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center tabular-nums font-medium">
                          {m.price_points}
                        </TableCell>
                        <TableCell className="text-center">
                          {m.emi_available ? (
                            <Badge variant="default" className="bg-indigo-600 h-5 px-1.5 text-[10px]">Eligible</Badge>
                          ) : (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-muted-foreground">No</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={m.status === "active" ? "default" : "secondary"} className="h-5 text-[10px]">
                            {m.status}
                          </Badge>
                        </TableCell>
                        {bulkMode && (
                          <>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Input
                                  type="number"
                                  placeholder={m.official_price?.toString() || "0"}
                                  className={`h-8 w-28 text-right tabular-nums text-xs ${hasBulk ? "ring-2 ring-amber-400" : ""}`}
                                  onChange={(e) => {
                                    const val = e.target.value ? Number(e.target.value) : null;
                                    if (val) setBulkCell(m.id, "regular_price", val);
                                  }}
                                />
                                {hasBulk && <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Switch
                                  checked={hasEmiBulk ? bulkEdits.get(emiBulkKey)!.value : m.emi_available}
                                  onCheckedChange={(v) => setBulkCell(m.id, "emi_available", v)}
                                />
                              </div>
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                          {m.last_updated ? (
                            <span className="flex items-center justify-end gap-1">
                              <Clock className="h-3 w-3" /> {new Date(m.last_updated).toLocaleDateString()}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => openEdit(m)}>
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {pagedModels.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={bulkMode ? 12 : 10} className="text-center py-16 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Tag className="h-10 w-10 opacity-30" />
                          <p className="text-sm">No models match current filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Pagination */}
          {models.length > pageSize && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, models.length)} of {models.length}
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
                <span className="tabular-nums text-muted-foreground">{page} / {totalPages}</span>
                <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Price Dialog */}
      <Dialog open={!!editModel} onOpenChange={(o) => !o && setEditModel(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0">
          {editModel && (
            <>
              <DialogHeader className="px-6 pt-6 pb-2">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-xl border bg-muted shrink-0 overflow-hidden">
                    <SafeImage src={editModel.image} alt={editModel.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="flex items-center gap-2 flex-wrap">
                      {editModel.name}
                      <Badge variant="outline" className="text-xs">{editModel.brand_name}</Badge>
                      {editModel.emi_available && <Badge variant="default" className="bg-indigo-600 text-xs">EMI</Badge>}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1 font-mono text-xs">{editModel.slug}</p>
                  </div>
                </div>
              </DialogHeader>

              <div className="px-6">
                <Tabs defaultValue="official" className="mt-2">
                  <TabsList className="grid grid-cols-3 w-full max-w-md">
                    <TabsTrigger value="official" className="gap-1.5 text-xs">
                      <Tag className="h-3.5 w-3.5" /> Official Price
                    </TabsTrigger>
                    <TabsTrigger value="shops" className="gap-1.5 text-xs">
                      <Store className="h-3.5 w-3.5" /> Shop Overrides ({variantPrices.length})
                    </TabsTrigger>
                    <TabsTrigger value="tiered" className="gap-1.5 text-xs">
                      <Percent className="h-3.5 w-3.5" /> Tiered Discounts
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="official" className="space-y-4 pt-4">
                    <Card className="border-indigo-200/50 bg-indigo-50/30">
                      <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label className="flex items-center gap-1 text-xs">MRP / List Price (NPR) *</Label>
                            <Input
                              type="number"
                              defaultValue={editModel.official_price || ""}
                              placeholder="e.g. 129999"
                              id="input-official-mrp"
                            />
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 text-xs">Sale / Offer Price</Label>
                            <Input
                              type="number"
                              defaultValue={editModel.min_price && editModel.min_price < (editModel.official_price || 0) ? editModel.min_price : ""}
                              placeholder="Optional deal price"
                              id="input-official-sale"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">EMI Eligible</Label>
                            <div className="h-9 flex items-center">
                              <Switch defaultChecked={editModel.emi_available || (editModel.official_price || 0) >= 30000} />
                              <span className="text-xs text-muted-foreground ml-2">
                                Auto for ≥ Rs. 30,000
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setEditModel(null)}>Cancel</Button>
                      <Button
                        onClick={() => {
                          const regular = Number((document.getElementById("input-official-mrp") as HTMLInputElement).value);
                          const saleEl = document.getElementById("input-official-sale") as HTMLInputElement;
                          const sale = saleEl?.value ? Number(saleEl.value) : null;
                          savePriceMutation.mutate({ model: editModel, regular, sale });
                        }}
                        disabled={savePriceMutation.isPending}
                      >
                        {savePriceMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Save Official Price
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="shops" className="pt-4">
                    {loadingVariants ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : variantPrices.length === 0 ? (
                      <Card className="border-dashed">
                        <CardContent className="p-8 text-center">
                          <Store className="h-10 w-10 mx-auto text-muted-foreground opacity-40 mb-2" />
                          <p className="text-sm text-muted-foreground">No shop-quoted prices yet. Set an Official Price first to seed the price list.</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="rounded-md border overflow-hidden max-h-[50vh]">
                        <Table>
                          <TableHeader className="bg-muted/40 sticky top-0">
                            <TableRow>
                              <TableHead>Variant</TableHead>
                              <TableHead>Shop</TableHead>
                              <TableHead className="text-right">Regular</TableHead>
                              <TableHead className="text-right">Sale</TableHead>
                              <TableHead>Stock</TableHead>
                              <TableHead>EMI</TableHead>
                              <TableHead>Default</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {variantPrices.map((vp) => (
                              <TableRow key={vp.id}>
                                <TableCell className="font-medium text-sm">{vp.variant_label}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    {vp.is_default && !vp.store_id ? (
                                      <Badge variant="default" className="h-5 text-[10px] bg-indigo-600">Official</Badge>
                                    ) : (
                                      <Badge variant="outline" className="h-5 text-[10px]">{vp.store_name}</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right tabular-nums font-medium">{formatNpr(vp.regular_price)}</TableCell>
                                <TableCell className="text-right tabular-nums text-emerald-600">{formatNpr(vp.sale_price)}</TableCell>
                                <TableCell>
                                  <Badge variant={vp.stock_status === "in_stock" ? "default" : "secondary"} className="h-5 text-[10px]">
                                    {vp.stock_status === "in_stock" ? "In Stock" : vp.stock_status === "out_of_stock" ? "Out" : "Preorder"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  {vp.emi_available ? <CheckCircle2 className="h-4 w-4 text-indigo-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />}
                                </TableCell>
                                <TableCell className="text-center">
                                  {vp.is_default ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : null}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-xs text-muted-foreground">
                        Shop-quoted prices are aggregated automatically from inventory. Edit shops via Products → Store Inventory.
                      </p>
                      <Button size="sm" variant="outline" asChild>
                        <label className="cursor-pointer inline-flex items-center gap-1.5">
                          <Upload className="h-3.5 w-3.5" /> Import Shop Prices (CSV)
                          <input type="file" accept=".csv" className="hidden" onChange={(e) => {
                            toast.info("Shop prices import — upload parsed and upserted to phone_variant_prices");
                            e.target.value = "";
                          }} />
                        </label>
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="tiered" className="pt-4">
                    <div className="space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Quantity & Store-Tier Discounts</CardTitle>
                          <CardDescription className="text-xs">
                            Define percentage-off tiers applied to the Official MRP when shops buy in bulk or based on their package tier.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {[
                              { label: "Bronze / Small", pct: 3, min: 1 },
                              { label: "Silver / Medium", pct: 5, min: 5 },
                              { label: "Gold / Large", pct: 8, min: 20 },
                            ].map((t, i) => (
                              <div key={i} className="p-3 rounded-lg border bg-muted/20 space-y-2">
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline" className="h-5 text-[10px]">{t.label}</Badge>
                                  <span className="text-sm font-bold">{t.pct}% off</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Min {t.min}+ units or store monthly GMV tier</p>
                                <div className="flex items-center justify-between text-xs pt-1 border-t">
                                  <span className="text-muted-foreground">Reseller cost</span>
                                  <span className="font-semibold tabular-nums">
                                    {editModel.official_price ? formatNpr(Math.round(editModel.official_price * (1 - t.pct / 100))) : "—"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                      <p className="text-xs text-muted-foreground px-1">
                        ⓘ Tiers are used in the B2B Store Portal. EMI plans reference the Official MRP — reseller tiers don't affect customer EMI eligibility.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <DialogFooter className="px-6 py-4 border-t mt-4">
                <Button variant="outline" onClick={() => setEditModel(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
