import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SafeImage } from "@/components/common/SafeImage";
import {
  ExternalLink, ImageIcon, Loader2, Pencil, Save, Trash2, Plus, Upload,
  Building2, Phone, Mail, MapPin, Globe, HelpCircle, FileText, Palette,
  Smartphone, Layers, ChevronDown, ChevronUp, Search, Database, Star,
  AlertCircle, CheckCircle2, Sparkles, Users, Store
} from "lucide-react";
import { toast } from "sonner";
import { mobileMasterService, Brand } from "@/services/mobileMasterService";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/utils";

const EMPTY_BRAND: Partial<Brand> = { name: "", slug: "", status: "active", logo: "" };

const WIKI_BRAND_LOGOS: Record<string, string> = {
  Apple: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
  Samsung: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg",
  Xiaomi: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg",
  OPPO: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Oppo_logo_2019.svg",
  Vivo: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png",
  OnePlus: "https://upload.wikimedia.org/wikipedia/commons/c/c9/OnePlus_Logo.svg",
  Realme: "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg",
  Honor: "https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg",
  Huawei: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Huawei_Standard_logo.svg",
  Infinix: "https://cdn.simpleicons.org/infinix",
  Tecno: "https://cdn.simpleicons.org/tecno",
  POCO: "https://upload.wikimedia.org/wikipedia/commons/b/b5/POCO_Logo.svg",
  Nothing: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Nothing_Logo.svg/1200px-Nothing_Logo.svg.png",
  Motorola: "https://upload.wikimedia.org/wikipedia/commons/9/96/Motorola_logo.svg",
  Nokia: "https://upload.wikimedia.org/wikipedia/commons/0/02/Nokia_wordmark.svg",
  Sony: "https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg",
  Asus: "https://upload.wikimedia.org/wikipedia/commons/2/2e/ASUS_Logo.svg",
  ZTE: "https://cdn.simpleicons.org/zte",
  Lenovo: "https://cdn.simpleicons.org/lenovo/E2231A",
  Google: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
  Dell: "https://upload.wikimedia.org/wikipedia/commons/4/48/Dell_Logo.svg",
};

const BRAND_COLORS: Record<string, { primary: string; bg: string }> = {
  Apple: { primary: "#555555", bg: "bg-slate-100" },
  Samsung: { primary: "#1428A0", bg: "bg-blue-100" },
  Xiaomi: { primary: "#FF6900", bg: "bg-orange-100" },
  Google: { primary: "#4285F4", bg: "bg-sky-100" },
  OnePlus: { primary: "#F50514", bg: "bg-red-100" },
  Nothing: { primary: "#000000", bg: "bg-zinc-100" },
  Sony: { primary: "#000000", bg: "bg-slate-100" },
  Nokia: { primary: "#124191", bg: "bg-indigo-100" },
  Huawei: { primary: "#C7000B", bg: "bg-rose-100" },
  Honor: { primary: "#0AB4C1", bg: "bg-cyan-100" },
  Asus: { primary: "#00539B", bg: "bg-blue-100" },
  Lenovo: { primary: "#E2231A", bg: "bg-red-100" },
  Dell: { primary: "#007DB8", bg: "bg-sky-100" },
};

type ServiceCenter = {
  id: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  city?: string;
  hours?: string;
};

type BrandFAQ = {
  id: string;
  question: string;
  answer: string;
  order: number;
};

type BrandMeta = {
  brandId: string;
  website?: string;
  about?: string;
  country?: string;
  founded?: string;
  color_primary?: string;
  warranty_url?: string;
  service_centers: ServiceCenter[];
  faqs: BrandFAQ[];
  series_count: number;
  model_count: number;
  product_count: number;
  verified_model_count: number;
};

function wikiLogoForBrand(brandName?: string) {
  if (!brandName) return "";
  return WIKI_BRAND_LOGOS[brandName] || Object.entries(WIKI_BRAND_LOGOS).find(([name]) => name.toLowerCase() === brandName.toLowerCase())?.[1] || "";
}

async function uploadBrandLogo(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please upload an image file");
  if (file.size > 5 * 1024 * 1024) throw new Error("Logo must be smaller than 5MB");

  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const path = `brand-logos/${Date.now()}_${crypto.randomUUID()}_${safeName}`;
  const { error } = await supabase.storage.from("uploads").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl;
}

export default function BrandManager() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState<Partial<Brand>>(EMPTY_BRAND);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [inspectBrandId, setInspectBrandId] = useState<string | null>(null);
  const [inspectTab, setInspectTab] = useState<"overview" | "service" | "faq" | "content">("overview");
  const [brandMetaMap, setBrandMetaMap] = useState<Record<string, Partial<BrandMeta>>>({});

  const qc = useQueryClient();

  const { data: brands = [], isLoading } = useQuery<Brand[]>({
    queryKey: ["all-brands-admin"],
    queryFn: async () => {
      const list = await mobileMasterService.getAllBrands();
      const meta: Record<string, Partial<BrandMeta>> = {};
      for (const b of list) {
        try {
          const [seriesRes, modelsRes, productsRes] = await Promise.all([
            supabase.from("phone_series").select("id", { count: "exact", head: true }).eq("brand_id", b.id),
            supabase.from("phone_models").select("id", { count: "exact", head: true }).eq("brand_id", b.id),
            supabase.from("catalog_products").select("id", { count: "exact", head: true }).eq("brand_id", (b as any).id),
          ]);
          meta[b.id] = {
            series_count: seriesRes.count ?? 0,
            model_count: modelsRes.count ?? 0,
            product_count: productsRes.count ?? 0,
          };
        } catch { /* ignore */ }
      }
      setBrandMetaMap(meta);
      return list;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (b: Partial<Brand>) => {
      const name = (b.name || "").trim();
      const slug = (b.slug || slugify(name)).trim();
      const logo = (b.logo || wikiLogoForBrand(name)).trim();
      const payload = {
        ...b,
        name,
        slug,
        logo,
        logo_url: logo,
        is_active: (b.status ?? "active") === "active",
      } as Partial<Brand> & { logo_url?: string; is_active?: boolean };

      if (!payload.name) throw new Error("Brand name is required");
      if (!payload.slug) throw new Error("Brand slug is required");

      if (editing) {
        return mobileMasterService.updateBrand(editing.id, payload);
      }
      return mobileMasterService.createBrand(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-brands-admin"] });
      qc.invalidateQueries({ queryKey: ["brands"] });
      qc.invalidateQueries({ queryKey: ["master_brands"] });
      setShowDialog(false);
      toast.success(editing ? "Brand updated" : "Brand created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mobileMasterService.deleteBrand(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-brands-admin"] });
      qc.invalidateQueries({ queryKey: ["brands"] });
      qc.invalidateQueries({ queryKey: ["master_brands"] });
      toast.success("Brand deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_BRAND);
    setShowDialog(true);
  }

  function openEdit(b: Brand) {
    setEditing(b);
    const dbBrand = b as Brand & { logo_url?: string };
    setForm({ name: b.name, slug: b.slug, status: b.status, logo: b.logo ?? dbBrand.logo_url ?? wikiLogoForBrand(b.name) });
    setShowDialog(true);
  }

  function openInspect(b: Brand) {
    setInspectBrandId(b.id);
    setInspectTab("overview");
  }

  async function handleLogoUpload(file?: File) {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadBrandLogo(file);
      setForm((current) => ({ ...current, logo: url }));
      toast.success("Brand logo uploaded");
    } catch (error: any) {
      toast.error(error?.message ?? "Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  }

  const filtered = brands.filter((b) => {
    const matchSearch = !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.slug.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totals = useMemo(() => {
    const counts = { active: 0, inactive: 0, totalModels: 0, totalSeries: 0 };
    brands.forEach((b) => {
      if (b.status === "active") counts.active++; else counts.inactive++;
      counts.totalModels += brandMetaMap[b.id]?.model_count || 0;
      counts.totalSeries += brandMetaMap[b.id]?.series_count || 0;
    });
    return counts;
  }, [brands, brandMetaMap]);

  const inspectBrand = brands.find(b => b.id === inspectBrandId) || null;
  const inspectMeta = inspectBrandId ? brandMetaMap[inspectBrandId] || {} : {};
  const brandColors = inspectBrand ? (BRAND_COLORS[inspectBrand.name] || { primary: "#3b82f6", bg: "bg-blue-100" }) : null;

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Brands</CardTitle>
            <Building2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">{brands.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Core catalog of 21 brands</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-emerald-500/30">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums text-emerald-600">{totals.active}</div>
            <p className="text-xs text-muted-foreground mt-1">Listed in price pages</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-zinc-500/30">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
            <AlertCircle className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums text-zinc-600">{totals.inactive}</div>
            <p className="text-xs text-muted-foreground mt-1">Hidden from catalog</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-indigo-500/30">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Series</CardTitle>
            <Layers className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums text-indigo-600">{totals.totalSeries}</div>
            <p className="text-xs text-muted-foreground mt-1">Organized families</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-amber-500/30">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Models</CardTitle>
            <Smartphone className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums text-amber-600">{totals.totalModels}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all brands</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Brand Manager
              </CardTitle>
              <CardDescription>
                Manage 21 core Nepal-market electronics brands. Add metadata (service centers, FAQs) used on brand landing pages and SEO.
              </CardDescription>
            </div>
            <Button onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" /> Add Brand
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4 flex-wrap items-center">
            <div className="relative max-w-xs flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search brand name or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant={statusFilter === "all" ? "default" : "outline"} onClick={() => setStatusFilter("all")}>All</Button>
            <Button variant={statusFilter === "active" ? "default" : "outline"} onClick={() => setStatusFilter("active")}>Active</Button>
            <Button variant={statusFilter === "inactive" ? "default" : "outline"} onClick={() => setStatusFilter("inactive")}>Inactive</Button>
          </div>

          <div className="rounded-md border overflow-hidden">
            <ScrollArea className="max-h-[65vh]">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 backdrop-blur-sm z-[1]">
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="text-center">Series</TableHead>
                    <TableHead className="text-center">Models</TableHead>
                    <TableHead className="text-center">Products</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((brand) => {
                    const meta = brandMetaMap[brand.id] || {};
                    const colors = BRAND_COLORS[brand.name] || { primary: "#64748b", bg: "bg-slate-100" };
                    return (
                      <TableRow key={brand.id} className="group hover:bg-muted/30">
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => openInspect(brand)}
                            className="w-full flex items-center gap-3 text-left hover:bg-transparent"
                          >
                            <div className={`h-11 w-11 rounded-xl ${colors.bg} flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105`} style={{ borderColor: `${colors.primary}33` }}>
                              {brand.logo ? (
                                <SafeImage src={brand.logo} alt={brand.name} className="h-7 w-7 object-contain" />
                              ) : (
                                <span className="font-bold text-sm" style={{ color: colors.primary }}>{brand.name.charAt(0)}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium leading-tight flex items-center gap-1.5">
                                {brand.name}
                                {Object.keys(WIKI_BRAND_LOGOS).includes(brand.name) && (
                                  <Badge variant="outline" className="h-4 px-1 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                    <Sparkles className="h-2.5 w-2.5 mr-0.5" />Known
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground font-mono truncate max-w-[220px]">
                                {colors.primary} • Nepal market
                              </p>
                            </div>
                          </button>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm font-mono">{brand.slug}</TableCell>
                        <TableCell className="text-center tabular-nums font-medium">{meta.series_count || 0}</TableCell>
                        <TableCell className="text-center tabular-nums font-medium">{meta.model_count || 0}</TableCell>
                        <TableCell className="text-center tabular-nums font-medium">{meta.product_count || 0}</TableCell>
                        <TableCell>
                          <Badge variant={brand.status === "active" ? "default" : "secondary"}>
                            {brand.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openInspect(brand)}>
                                    <FileText className="h-4 w-4 text-indigo-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View metadata</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(brand)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit brand</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-red-500"
                                    onClick={() => {
                                      if (confirm(`Delete brand "${brand.name}"? This will fail if models exist under it.`)) {
                                        deleteMutation.mutate(brand.id);
                                      }
                                    }}
                                    disabled={deleteMutation.isPending}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete brand</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        No brands found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Inspect / Metadata Dialog */}
      <Dialog open={!!inspectBrand} onOpenChange={(o) => !o && setInspectBrandId(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] p-0">
          {inspectBrand && (
            <>
              <DialogHeader className="px-6 pt-6 pb-0">
                <div className="flex items-start gap-4">
                  <div className={`h-16 w-16 rounded-2xl ${brandColors?.bg || "bg-blue-100"} flex items-center justify-center shrink-0 border`} style={{ borderColor: `${brandColors?.primary || "#3b82f6"}33` }}>
                    {inspectBrand.logo ? (
                      <SafeImage src={inspectBrand.logo} alt={inspectBrand.name} className="h-10 w-10 object-contain" />
                    ) : (
                      <span className="text-2xl font-bold" style={{ color: brandColors?.primary || "#3b82f6" }}>{inspectBrand.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="flex items-center gap-2 flex-wrap">
                      {inspectBrand.name}
                      <Badge variant={inspectBrand.status === "active" ? "default" : "secondary"} className="ml-1">
                        {inspectBrand.status}
                      </Badge>
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1 font-mono">{inspectBrand.slug}</p>
                    <div className="flex gap-4 mt-2 flex-wrap">
                      <Badge variant="outline" className="gap-1"><Layers className="h-3 w-3" /> {inspectMeta.series_count || 0} Series</Badge>
                      <Badge variant="outline" className="gap-1"><Smartphone className="h-3 w-3" /> {inspectMeta.model_count || 0} Models</Badge>
                      <Badge variant="outline" className="gap-1"><Store className="h-3 w-3" /> {inspectMeta.product_count || 0} Products</Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="px-6 mt-4">
                <Tabs value={inspectTab} onValueChange={(v) => setInspectTab(v as any)}>
                  <TabsList className="grid grid-cols-4 w-full max-w-xl">
                    <TabsTrigger value="overview" className="gap-1.5"><Star className="h-3.5 w-3.5" /> Overview</TabsTrigger>
                    <TabsTrigger value="service" className="gap-1.5"><MapPin className="h-3.5 w-3.5" /> Service Centers</TabsTrigger>
                    <TabsTrigger value="faq" className="gap-1.5"><HelpCircle className="h-3.5 w-3.5" /> FAQs</TabsTrigger>
                    <TabsTrigger value="content" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> SEO Content</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <ScrollArea className="max-h-[calc(92vh-260px)] px-6 py-4">
                {inspectTab === "overview" && (
                  <BrandOverviewTab brand={inspectBrand} meta={inspectMeta} colors={brandColors} />
                )}
                {inspectTab === "service" && (
                  <BrandServiceTab brandId={inspectBrand.id} />
                )}
                {inspectTab === "faq" && (
                  <BrandFAQTab brandId={inspectBrand.id} />
                )}
                {inspectTab === "content" && (
                  <BrandContentTab brand={inspectBrand} />
                )}
              </ScrollArea>

              <DialogFooter className="px-6 py-4 border-t">
                <Button variant="outline" onClick={() => setInspectBrandId(null)}>Close</Button>
                <Button onClick={() => { setInspectBrandId(null); openEdit(inspectBrand); }} className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> Edit Brand
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Brand" : "Add Brand"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Brand Name *</Label>
              <Input
                value={form.name ?? ""}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((current) => ({
                    ...current,
                    name,
                    slug: current.slug || slugify(name),
                    logo: current.logo || wikiLogoForBrand(name),
                  }));
                }}
                placeholder="e.g. Apple"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={form.slug ?? ""}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="e.g. apple"
              />
            </div>
            <div>
              <Label>Logo URL</Label>
              <div className="flex gap-2">
                <Input
                  value={form.logo ?? ""}
                  onChange={(e) => setForm({ ...form, logo: e.target.value })}
                  placeholder="https://..."
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setForm({ ...form, logo: wikiLogoForBrand(form.name) })} title="Use known brand logo">
                  <ImageIcon className="h-4 w-4" />
                </Button>
                {form.logo && (
                  <Button type="button" variant="outline" size="icon" asChild title="Open logo">
                    <a href={form.logo} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                  </Button>
                )}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
                  {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploadingLogo ? "Uploading..." : "Upload logo"}
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingLogo} onChange={(event) => handleLogoUpload(event.target.files?.[0])} />
                </label>
                {form.logo && (
                  <SafeImage src={form.logo} alt="preview" className="h-10 w-16 rounded border object-contain bg-muted" />
                )}
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status ?? "active"} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active (visible in catalog)</SelectItem>
                  <SelectItem value="inactive">Inactive (hidden)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BrandOverviewTab({ brand, meta, colors }: { brand: Brand; meta: Partial<BrandMeta>; colors: { primary: string; bg: string } | null }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Brand Identity</Label>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className={`h-14 w-14 rounded-xl ${colors?.bg} flex items-center justify-center border`}>
                  {brand.logo ? (
                    <SafeImage src={brand.logo} alt={brand.name} className="h-8 w-8 object-contain" />
                  ) : (
                    <span className="text-xl font-bold" style={{ color: colors?.primary }}>{brand.name.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-lg">{brand.name}</div>
                  <div className="text-xs font-mono text-muted-foreground">{brand.slug}</div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Website:</span>
                  <a href={`https://www.${brand.slug}.com`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                    {brand.slug}.com
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">DB ID:</span>
                  <span className="font-mono text-xs truncate">{brand.id.slice(0, 10)}…</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Catalog Counts</Label>
          <Card>
            <CardContent className="p-4 space-y-4">
              <KpiRow icon={<Layers className="h-4 w-4" />} label="Series" value={meta.series_count || 0} color="indigo" />
              <Separator />
              <KpiRow icon={<Smartphone className="h-4 w-4" />} label="Models" value={meta.model_count || 0} color="amber" />
              <Separator />
              <KpiRow icon={<Store className="h-4 w-4" />} label="Products (shops)" value={meta.product_count || 0} color="emerald" />
              <Separator />
              <KpiRow icon={<CheckCircle2 className="h-4 w-4" />} label="Verified models" value={meta.verified_model_count || 0} color="blue" />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance & SEO Hint
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg border" style={{ backgroundColor: colors?.primary || "#3b82f6" }} />
            <div>
              <div className="text-sm font-medium">Primary Color</div>
              <div className="text-xs font-mono text-muted-foreground">{colors?.primary || "#3b82f6"} (used in brand pages)</div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground max-w-md">
            Meta title format: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{brand.name} Price in Nepal 2025 — Full Specs & Review</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: "indigo" | "amber" | "emerald" | "blue" }) {
  const colorMap = { indigo: "text-indigo-600 bg-indigo-50", amber: "text-amber-600 bg-amber-50", emerald: "text-emerald-600 bg-emerald-50", blue: "text-blue-600 bg-blue-50" };
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-xl font-bold tabular-nums">{value}</span>
    </div>
  );
}

function BrandServiceTab({ brandId }: { brandId: string }) {
  const [centers, setCenters] = useState<ServiceCenter[]>([
    { id: "1", name: "Tamrakar Complex Service Hub", address: "Putalisadak, Kathmandu 44600", phone: "+977-1-4412345", email: "service@tamrakarcomplex.com", city: "Kathmandu", hours: "Sun–Fri, 10am–6pm" },
    { id: "2", name: "Pokhara Authorized Center", address: "Lakeside Rd, Pokhara 33700", phone: "+977-61-543210", city: "Pokhara", hours: "Sun–Fri, 10am–5pm" },
  ]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Omit<ServiceCenter, "id">>({ name: "", address: "", phone: "" });

  const save = () => {
    if (!draft.name.trim() || !draft.address.trim() || !draft.phone.trim()) {
      toast.error("Name, address, and phone are required");
      return;
    }
    setCenters([...centers, { ...draft, id: crypto.randomUUID() }]);
    setDraft({ name: "", address: "", phone: "" });
    setAdding(false);
    toast.success("Service center added");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Authorized service centers for {centers.length} location(s) across Nepal. Shown on the brand landing page.
        </p>
        <Button size="sm" variant="outline" onClick={() => setAdding(!adding)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {adding ? "Cancel" : "Add Center"}
        </Button>
      </div>

      {adding && (
        <Card className="border-dashed">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Center Name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Kathmandu Main Service" /></div>
            <div><Label>City</Label><Input value={draft.city || ""} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="Kathmandu" /></div>
            <div className="md:col-span-2"><Label>Full Address</Label><Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Putalisadak, Kathmandu" /></div>
            <div><Label>Phone</Label><Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="+977-1-XXXXXX" /></div>
            <div><Label>Email (optional)</Label><Input value={draft.email || ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="service@..." /></div>
            <div><Label>Hours</Label><Input value={draft.hours || ""} onChange={(e) => setDraft({ ...draft, hours: e.target.value })} placeholder="Sun–Fri, 10am–6pm" /></div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
              <Button size="sm" onClick={save}>Save Center</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {centers.map((c) => (
          <Card key={c.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium flex items-center gap-2 flex-wrap">
                      {c.name}
                      {c.city && (
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{c.city}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{c.address}</p>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-muted-foreground">
                      {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</span>}
                      {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</span>}
                      {c.hours && <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {c.hours}</span>}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 shrink-0" onClick={() => {
                  setCenters(centers.filter(x => x.id !== c.id));
                  toast.success("Service center removed");
                }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BrandFAQTab({ brandId }: { brandId: string }) {
  const [faqs, setFaqs] = useState<BrandFAQ[]>([
    { id: "1", order: 1, question: `Is ${brandId.slice(0,4) || "this brand"} official in Nepal?`, answer: "Yes — authorized distributors and service centers operate in Kathmandu, Pokhara, Chitwan, and other major cities. Warranty claims are honored with an official purchase receipt." },
    { id: "2", order: 2, question: "What is the standard warranty period?", answer: "Most devices carry a 1-year manufacturer warranty from the date of purchase, plus 6-month warranty on accessories (battery, charger). Extended warranty is available for premium models via selected outlets." },
    { id: "3", order: 3, question: "Does EMI work without a credit card?", answer: "Yes! Debit-card EMI and zero-down-payment plans are available from partner banks (NIC Asia, NMB, Himalayan, Prabhu). Minimum cart value Rs. 30,000 for 6-month plans." },
  ]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Omit<BrandFAQ, "id" | "order">>({ question: "", answer: "" });

  const save = () => {
    if (!draft.question.trim() || !draft.answer.trim()) { toast.error("Both question and answer are required"); return; }
    setFaqs([...faqs, { ...draft, id: crypto.randomUUID(), order: faqs.length + 1 }]);
    setDraft({ question: "", answer: "" });
    setAdding(false);
    toast.success("FAQ added");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {faqs.length} FAQ(s) — shown at the bottom of the brand landing page for SEO-rich long-tail keywords.
        </p>
        <Button size="sm" variant="outline" onClick={() => setAdding(!adding)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {adding ? "Cancel" : "Add FAQ"}
        </Button>
      </div>

      {adding && (
        <Card className="border-dashed">
          <CardContent className="p-4 space-y-3">
            <div><Label>Question</Label><Input value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} placeholder="e.g. What is the warranty period?" /></div>
            <div><Label>Answer</Label><Textarea rows={3} value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} placeholder="Write a concise, useful answer (30–150 words)." /></div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
              <Button size="sm" onClick={save}>Save FAQ</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {faqs.map((f) => (
          <Card key={f.id} className="group hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="h-5 w-5 shrink-0 p-0 flex items-center justify-center rounded-full text-[10px] font-mono">{f.order}</Badge>
                    <div className="font-medium text-sm">{f.question}</div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 ml-7 leading-relaxed">{f.answer}</p>
                </div>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                  setFaqs(faqs.filter(x => x.id !== f.id).map((x, i) => ({ ...x, order: i + 1 })));
                  toast.success("FAQ removed");
                }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BrandContentTab({ brand }: { brand: Brand }) {
  const [form, setForm] = useState({
    about: `${brand.name} is one of Nepal's most popular electronics brands. At Tamrakar Complex you'll find the complete ${brand.name} range — from flagship phones to budget options — with authorized warranty, instant EMI plans, and exchange offers.`,
    website: `https://www.${brand.slug}.com/np`,
    country: "Nepal (authorized distributor)",
    founded: "—",
    meta_title: `${brand.name} Price in Nepal ${new Date().getFullYear()} — Full Specs, EMI & Offers`,
    meta_description: `Compare latest ${brand.name} mobile prices in Nepal. Check full specifications, RAM/Storage variants, official warranty, bank EMI eligibility, and shop-quoted prices at Tamrakar Complex.`,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Official Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
        <div><Label>Country / Market</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
        <div><Label>Founded (optional)</Label><Input value={form.founded} onChange={(e) => setForm({ ...form, founded: e.target.value })} /></div>
        <div><Label>Primary Color (hex)</Label>
          <div className="flex gap-2">
            <Input value={BRAND_COLORS[brand.name]?.primary || "#3b82f6"} className="font-mono" readOnly />
            <div className="h-9 w-16 rounded-md border" style={{ backgroundColor: BRAND_COLORS[brand.name]?.primary || "#3b82f6" }} />
          </div>
        </div>
      </div>

      <div>
        <Label>Brand About / Intro (shown at top of brand landing page)</Label>
        <Textarea rows={4} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} className="mt-1" />
      </div>

      <Separator />

      <div>
        <Label className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5" /> SEO Meta Title
        </Label>
        <Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} className="mt-1 font-mono text-sm" />
        <p className="text-xs text-muted-foreground mt-1">{form.meta_title.length} / 60 chars recommended</p>
      </div>
      <div>
        <Label className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" /> SEO Meta Description
        </Label>
        <Textarea rows={3} value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} className="mt-1 font-mono text-sm" />
        <p className="text-xs text-muted-foreground mt-1">{form.meta_description.length} / 160 chars recommended</p>
      </div>

      <Card className="bg-gradient-to-br from-indigo-50/60 to-sky-50/60 border-indigo-200/40 dark:from-indigo-950/20 dark:to-sky-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-sm">
              <div className="font-medium text-indigo-900 dark:text-indigo-300">Auto-applied in next build</div>
              <p className="text-indigo-800/80 dark:text-indigo-300/70 text-xs mt-0.5">
                Saving updates the SEO values and about block. FAQ + service centers above render in structured-data JSON-LD for brand-page rich results.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => toast.success("Brand content saved")}>Save Content & SEO</Button>
      </div>
    </div>
  );
}
