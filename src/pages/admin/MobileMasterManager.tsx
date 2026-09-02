import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Smartphone,
  Tag,
  Layers,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  Settings2,
  Database,
  ExternalLink,
  PlusCircle,
  Globe,
  MapPin,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  FileText
} from "lucide-react";
import { mobileMasterService, Brand, PhoneSeries, PhoneModel, PhoneVariant, VariantPrice, ExpertScore, ModelImage, EmiPlan, ModelEmi } from "@/services/mobileMasterService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { slugify } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Upload } from "lucide-react";

async function uploadToStorage(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Not an image file");
  if (file.size > 5 * 1024 * 1024) throw new Error("File exceeds 5MB limit");
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const path = `${folder}/${Date.now()}_${crypto.randomUUID()}_${safeName}`;
  const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: false, cacheControl: "3600", contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl;
}

function ImageUploadPicker({ value, onChange, folder, previewClass = "h-10 w-10" }: { value: string; onChange: (url: string) => void; folder: string; previewClass?: string }) {
  const [uploading, setUploading] = useState(false);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToStorage(file, folder);
      onChange(url);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      e.target.value = "";
      setUploading(false);
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://... or upload below" className="flex-1" />
        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "..." : "Upload"}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
      </div>
      {value && <img src={value} alt="preview" className={`${previewClass} object-contain rounded border`} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
    </div>
  );
}

export default function MobileMasterManager() {
  const [activeTab, setActiveTab] = useState("brands");
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [modelSearch, setModelSearch] = useState("");
  
  const queryClient = useQueryClient();

  // Queries
  const { data: brands, isLoading: loadingBrands } = useQuery({
    queryKey: ["master_brands"],
    queryFn: () => mobileMasterService.getBrands(),
  });

  const { data: series, isLoading: loadingSeries } = useQuery({
    queryKey: ["master_series", selectedBrandId],
    queryFn: () => selectedBrandId ? mobileMasterService.getSeriesByBrand(selectedBrandId) : Promise.resolve([]),
    enabled: !!selectedBrandId,
  });

  const { data: models, isLoading: loadingModels } = useQuery({
    queryKey: ["master_models", selectedBrandId, selectedSeriesId],
    queryFn: () => mobileMasterService.getModels(selectedBrandId || undefined, selectedSeriesId || undefined),
  });

  const filteredModels = (models ?? []).filter((model: any) => {
    const q = modelSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      model.name?.toLowerCase().includes(q) ||
      model.slug?.toLowerCase().includes(q) ||
      model.model_number?.toLowerCase().includes(q) ||
      model.brands?.name?.toLowerCase().includes(q)
    );
  });

  // Mutations
  const createBrand = useMutation({
    mutationFn: (data: any) => mobileMasterService.createBrand(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_brands"] });
      toast.success("Brand created");
    }
  });

  const createSeries = useMutation({
    mutationFn: (data: any) => mobileMasterService.createSeries(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_series"] });
      toast.success("Series created");
    }
  });

  const createModel = useMutation({
    mutationFn: (data: any) => mobileMasterService.createModel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_models"] });
      toast.success("Model created");
    }
  });

  const deleteBrand = useMutation({
    mutationFn: (id: string) => mobileMasterService.deleteBrand(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["master_brands"] });
      toast.success("Brand deleted");
      if (selectedBrandId === id) setSelectedBrandId(null);
    },
    onError: (error: any) => toast.error("Failed to delete brand: " + error.message)
  });

  const updateBrand = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => mobileMasterService.updateBrand(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_brands"] });
      toast.success("Brand updated");
    },
    onError: (error: any) => toast.error("Failed to update brand: " + error.message)
  });

  const deleteSeries = useMutation({
    mutationFn: (id: string) => mobileMasterService.deleteSeries(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["master_series"] });
      toast.success("Series deleted");
      if (selectedSeriesId === id) setSelectedSeriesId(null);
    },
    onError: (error: any) => toast.error("Failed to delete series: " + error.message)
  });

  const deleteModel = useMutation({
    mutationFn: (id: string) => mobileMasterService.deleteModel(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["master_models"] });
      toast.success("Model deleted");
      if (selectedModelId === id) setSelectedModelId(null);
    },
    onError: (error: any) => toast.error("Failed to delete model: " + error.message)
  });

  const updateModel = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => mobileMasterService.updateModel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_models"] });
      toast.success("Model updated");
    },
    onError: (error: any) => toast.error("Failed to update model: " + error.message)
  });

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-8 w-8 text-primary" />
            Mobile Master Data
          </h1>
          <p className="mt-1 text-muted-foreground">One canonical model ID connects specifications, variants, prices, images, EMI and inventory.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border bg-background/80 px-4 py-3"><p className="text-xl font-black">{loadingBrands ? "…" : brands?.length ?? 0}</p><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Brands</p></div>
            <div className="rounded-xl border bg-background/80 px-4 py-3"><p className="text-xl font-black">{selectedBrandId ? (loadingSeries ? "…" : series?.length ?? 0) : "—"}</p><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Series</p></div>
            <div className="rounded-xl border bg-background/80 px-4 py-3"><p className="text-xl font-black">{loadingModels ? "…" : models?.length ?? 0}</p><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Models</p></div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">1. Choose hierarchy</CardTitle>
            <CardDescription>Filter the workspace first. Selecting a brand unlocks its series; selecting a model unlocks all connected records.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Brand</Label>
              <Select value={selectedBrandId || "all"} onValueChange={(v) => {
                setSelectedBrandId(v === "all" ? null : v);
                setSelectedSeriesId(null);
                setSelectedModelId(null);
                if (v !== "all") setActiveTab("series");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands?.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
                <Label>Series</Label>
                <Select value={selectedSeriesId || "all"} onValueChange={(v) => {
                  setSelectedSeriesId(v === "all" ? null : v);
                  setSelectedModelId(null);
                  setActiveTab("models");
                }} disabled={!selectedBrandId}>
                  <SelectTrigger className={!selectedBrandId ? "opacity-60" : ""}>
                    <SelectValue placeholder={selectedBrandId ? "All Series" : "Select a brand first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Series</SelectItem>
                    {series?.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto rounded-xl border bg-muted/20 p-1.5">
            <TabsList className="inline-flex h-auto min-w-full justify-start bg-transparent p-0">
              <TabsTrigger value="brands" className="gap-2">
                <Tag className="h-4 w-4" /> 2. Brands
              </TabsTrigger>
              <TabsTrigger value="series" className="gap-2" disabled={!selectedBrandId}>
                <Layers className="h-4 w-4" /> 3. Series
              </TabsTrigger>
              <TabsTrigger value="models" className="gap-2">
                <Smartphone className="h-4 w-4" /> 4. Models
              </TabsTrigger>
              <TabsTrigger value="connections" className="gap-2" disabled={!selectedModelId}>
                <Settings2 className="h-4 w-4" /> 5. Connections
              </TabsTrigger>
            </TabsList>
            </div>

            <TabsContent value="brands" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Manage Brands</h2>
                <AddBrandDialog onAdd={(b) => createBrand.mutate(b)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingBrands && <div className="col-span-full flex items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading brands…</div>}
                {brands?.map(brand => (
                  <Card key={brand.id} className="group cursor-pointer hover:border-primary transition-colors" onClick={() => { setSelectedBrandId(brand.id); setSelectedSeriesId(null); setSelectedModelId(null); setActiveTab("series"); }}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-12 w-12 bg-muted rounded-md flex items-center justify-center font-bold text-lg">
                        {brand.logo ? <img src={brand.logo} alt={brand.name} className="h-full w-full object-contain" /> : brand.name[0]}
                      </div>
                      <div>
                        <h3 className="font-medium">{brand.name}</h3>
                        <p className="text-xs text-muted-foreground">{brand.slug}</p>
                      </div>
                      <div className="ml-auto flex items-center gap-1">
                        {selectedBrandId === brand.id && <CheckCircle2 className="h-5 w-5 text-primary mr-2" />}
                        <EditBrandDialog brand={brand} onUpdate={(id, data) => updateBrand.mutate({ id, data })} />
                        <BrandContentDialog brand={brand} onUpdate={(id, data) => updateBrand.mutate({ id, data })} />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete brand? This will fail if models exist.")) {
                            deleteBrand.mutate(brand.id);
                          }
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {!loadingBrands && brands?.length === 0 && <div className="col-span-full rounded-xl border border-dashed p-10 text-center"><Tag className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-semibold">No brands yet</p><p className="mt-1 text-sm text-muted-foreground">Create the first brand before adding series or models.</p></div>}
              </div>
            </TabsContent>

            <TabsContent value="series" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  Series for {brands?.find(b => b.id === selectedBrandId)?.name}
                </h2>
                <AddSeriesDialog brandId={selectedBrandId!} onAdd={(s) => createSeries.mutate(s)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingSeries && <div className="col-span-full flex items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading series…</div>}
                {series?.map(s => (
                  <Card key={s.id} className="group cursor-pointer hover:border-primary transition-colors" onClick={() => { setSelectedSeriesId(s.id); setSelectedModelId(null); setActiveTab("models"); }}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">{s.name}</h3>
                        <p className="text-xs text-muted-foreground">{s.slug}</p>
                      </div>
                      <div className="ml-auto flex items-center gap-1">
                        {selectedSeriesId === s.id && <CheckCircle2 className="ml-auto h-5 w-5 text-primary mr-2" />}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete series?")) {
                            deleteSeries.mutate(s.id);
                          }
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {!loadingSeries && series?.length === 0 && (
                  <div className="col-span-full p-8 text-center border rounded-lg border-dashed">
                    No series found for this brand. You can add models directly under the brand.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="models" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold">Phone Models</h2>
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search models..."
                      className="pl-8"
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                    />
                  </div>
                </div>
                <AddModelDialog 
                  brandId={selectedBrandId} 
                  seriesId={selectedSeriesId} 
                  brands={brands || []}
                  series={series || []}
                  onAdd={(m) => createModel.mutate(m)} 
                />
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model Name</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Series</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingModels && <TableRow><TableCell colSpan={6} className="py-10 text-center"><span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading models…</span></TableCell></TableRow>}
                  {filteredModels.map(model => (
                    <TableRow key={model.id} className={selectedModelId === model.id ? "bg-muted/50" : ""}>
                      <TableCell className="font-medium">{model.name}</TableCell>
                      <TableCell>{(model as any).brands?.name}</TableCell>
                      <TableCell>{(model as any).phone_series?.name || "Direct"}</TableCell>
                      <TableCell>{model.release_year}</TableCell>
                      <TableCell>
                        <Badge variant={model.status === 'active' ? "default" : "secondary"}>
                          {model.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            setSelectedModelId(model.id);
                            setActiveTab("connections");
                          }}>
                            <Settings2 className="h-4 w-4" />
                          </Button>
                          <EditModelDialog model={model} brands={brands || []} series={series || []} onUpdate={(id, data) => updateModel.mutate({ id, data })} />
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => {
                            if (confirm("Delete model?")) {
                              deleteModel.mutate(model.id);
                            }
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loadingModels && filteredModels.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        No models found. Try another search or add a new model.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="connections" className="space-y-6 mt-4 animate-in fade-in slide-in-from-right-4">
              {!selectedModelId ? (
                <div className="p-20 text-center border-2 border-dashed rounded-[2rem] bg-muted/20">
                  <Smartphone className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-bold">No Model Selected</h3>
                  <p className="text-muted-foreground mb-6">Select a model from the Models tab to manage its connections.</p>
                  <Button onClick={() => setActiveTab("models")}>Go to Models</Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Smartphone className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">
                          {models?.find(m => m.id === selectedModelId)?.name || "Model Settings"}
                        </h2>
                        <p className="text-sm text-muted-foreground">Manage specifications, variants, and stock links.</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelectedModelId(null)}>Change Model</Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ConnectionCard 
                      title="Specifications" 
                      description="Manage technical specs, pros/cons, and overview."
                      icon={<Settings2 className="h-5 w-5" />}
                      action={<SpecEditor modelId={selectedModelId!} />}
                    />
                    <ConnectionCard 
                      title="Variants" 
                      description="Add RAM, Storage, and Color combinations."
                      icon={<Layers className="h-5 w-5" />}
                      action={<VariantEditor modelId={selectedModelId!} />}
                    />
                    <ConnectionCard
                      title="Prices & Purchase"
                      description="Set variant price, stock status, default offer, EMI flag, retailer, and buy URL."
                      icon={<Tag className="h-5 w-5" />}
                      action={<PriceEditor modelId={selectedModelId!} />}
                    />
                    <ConnectionCard
                      title="Gallery"
                      description="Upload product images used on cards and the detail page gallery."
                      icon={<Upload className="h-5 w-5" />}
                      action={<GalleryEditor modelId={selectedModelId!} />}
                    />
                    <ConnectionCard
                      title="EMI Offers"
                      description="Attach bank plans, monthly amount, and down payment to each variant."
                      icon={<Database className="h-5 w-5" />}
                      action={<EmiConnectionEditor modelId={selectedModelId!} />}
                    />
                    <ConnectionCard
                      title="Expert Score"
                      description="Score display, performance, camera, battery, value, and more."
                      icon={<CheckCircle2 className="h-5 w-5" />}
                      action={<ExpertScoreEditor modelId={selectedModelId!} />}
                    />
                    <ConnectionCard 
                      title="Stock Management" 
                      description="Create store inventory and marketplace stock linked to this model."
                      icon={<Smartphone className="h-5 w-5" />}
                      href={`/suadmin/products?modelId=${selectedModelId}`}
                    />
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function AddBrandDialog({ onAdd }: { onAdd: (data: any) => void }) {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Brand</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Brand</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Brand Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Apple, Samsung" />
          </div>
          <div className="space-y-2">
            <Label>Logo</Label>
            <ImageUploadPicker value={logo} onChange={setLogo} folder="brands" previewClass="h-10 w-10" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => {
            onAdd({ name, slug: slugify(name), logo: logo || null });
            setOpen(false);
            setName(""); setLogo("");
          }}>Create Brand</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditBrandDialog({ brand, onUpdate }: { brand: any, onUpdate: (id: string, data: any) => void }) {
  const [name, setName] = useState(brand.name);
  const [logo, setLogo] = useState(brand.logo || "");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Edit Brand</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Brand Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Apple, Samsung" />
          </div>
          <div className="space-y-2">
            <Label>Logo</Label>
            <ImageUploadPicker value={logo} onChange={setLogo} folder="brands" previewClass="h-10 w-10" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => {
            onUpdate(brand.id, { name, slug: slugify(name), logo: logo || null });
            setOpen(false);
          }}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddSeriesDialog({ brandId, onAdd }: { brandId: string, onAdd: (data: any) => void }) {
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Add Series</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Series</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Series Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. iPhone, Galaxy S, A Series" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => {
            onAdd({ brand_id: brandId, name, slug: slugify(name) });
            setOpen(false);
            setName("");
          }}>Create Series</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditModelDialog({ model, brands, series, onUpdate }: { model: any, brands: any[], series: any[], onUpdate: (id: string, data: any) => void }) {
  const [formData, setFormData] = useState({
    name: model.name,
    brand_id: model.brand_id,
    series_id: model.series_id || "none",
    model_number: model.model_number || "",
    release_year: model.release_year || new Date().getFullYear(),
    image: model.image || "",
  });
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Model</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Brand</Label>
              <Select value={formData.brand_id} onValueChange={(v) => setFormData({...formData, brand_id: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Series (Optional)</Label>
              <Select value={formData.series_id} onValueChange={(v) => setFormData({...formData, series_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Direct)</SelectItem>
                  {series.filter(s => s.brand_id === formData.brand_id).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Model Name</Label>
            <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g. iPhone 17 Pro Max" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Model Number</Label>
              <Input value={formData.model_number} onChange={(e) => setFormData({...formData, model_number: e.target.value})} placeholder="e.g. A3106" />
            </div>
            <div className="space-y-2">
              <Label>Release Year</Label>
              <Input type="number" value={formData.release_year} onChange={(e) => setFormData({...formData, release_year: parseInt(e.target.value)})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Primary Image</Label>
            <ImageUploadPicker value={formData.image} onChange={(url) => setFormData({...formData, image: url})} folder="phone-models" previewClass="h-16 w-16" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => {
            const { series_id, ...rest } = formData;
            onUpdate(model.id, {
              ...rest,
              image: formData.image || null,
              series_id: series_id === "none" ? null : series_id,
              slug: slugify(formData.name)
            });
            setOpen(false);
          }}>Update Model</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddModelDialog({ brandId, seriesId, brands, series, onAdd }: { brandId: string | null, seriesId: string | null, brands: any[], series: any[], onAdd: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: "",
    brand_id: brandId || "",
    series_id: seriesId || "",
    model_number: "",
    release_year: new Date().getFullYear(),
    image: "",
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData((current) => ({
        ...current,
        brand_id: brandId || current.brand_id || "",
        series_id: seriesId || current.series_id || "none",
      }));
    }
  }, [brandId, seriesId, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" /> Add Model</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Phone Model</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Brand</Label>
              <Select value={formData.brand_id} onValueChange={(v) => setFormData({...formData, brand_id: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Series (Optional)</Label>
              <Select value={formData.series_id} onValueChange={(v) => setFormData({...formData, series_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Direct)</SelectItem>
                  {series.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Model Name</Label>
            <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g. iPhone 17 Pro Max" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Model Number</Label>
              <Input value={formData.model_number} onChange={(e) => setFormData({...formData, model_number: e.target.value})} placeholder="e.g. A3106" />
            </div>
            <div className="space-y-2">
              <Label>Release Year</Label>
              <Input type="number" value={formData.release_year} onChange={(e) => setFormData({...formData, release_year: parseInt(e.target.value)})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Primary Image</Label>
            <ImageUploadPicker value={formData.image} onChange={(url) => setFormData({...formData, image: url})} folder="phone-models" previewClass="h-16 w-16" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => {
            if (!formData.name.trim()) {
              toast.error("Model name is required");
              return;
            }
            if (!formData.brand_id) {
              toast.error("Choose a brand first");
              return;
            }
            onAdd({
              ...formData,
              name: formData.name.trim(),
              image: formData.image || null,
              slug: slugify(formData.name),
              series_id: formData.series_id === 'none' ? null : formData.series_id
            });
            setOpen(false);
            setFormData({
              name: "",
              brand_id: brandId || "",
              series_id: seriesId || "none",
              model_number: "",
              release_year: new Date().getFullYear(),
              image: "",
            });
          }}>Create Model</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModelConnections({ modelId, modelName }: { modelId: string, modelName: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 className="h-6 w-6" />
          Module Connections: {modelName}
        </h2>
        <Badge variant="outline" className="font-mono">{modelId}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ConnectionCard 
          title="Specifications" 
          description="Manage technical specs, pros/cons, and overview."
          icon={<Settings2 className="h-5 w-5" />}
          action={<SpecEditor modelId={modelId} />}
        />
        <ConnectionCard 
          title="Variants" 
          description="Add RAM, Storage, and Color combinations."
          icon={<Layers className="h-5 w-5" />}
          action={<VariantEditor modelId={modelId} />}
        />
        <ConnectionCard 
          title="Stock Management" 
          description="Update new phone stock and pricing."
          icon={<Smartphone className="h-5 w-5" />}
          href={`/suadmin/products?modelId=${modelId}`}
        />
        <ConnectionCard 
          title="Exchange Valuation" 
          description="Set trade-in values for this model."
          icon={<Layers className="h-5 w-5" />}
          href={`/admin/exchange?modelId=${modelId}`}
        />
        <ConnectionCard 
          title="Repair Services" 
          description="Link repair parts and service costs."
          icon={<Plus className="h-5 w-5" />}
          href={`/admin/repairs?modelId=${modelId}`}
        />
        <ConnectionCard 
          title="Unlocking Services" 
          description="Configure network unlocking options."
          icon={<Plus className="h-5 w-5" />}
          href={`/admin/unlocking?modelId=${modelId}`}
        />
        <ConnectionCard 
          title="Accessories" 
          description="Manage compatible cases and parts."
          icon={<Tag className="h-5 w-5" />}
          href={`/admin/accessories?modelId=${modelId}`}
        />
        <ConnectionCard
          title="SEO & Content"
          description="Auto-generate landing page content."
          icon={<ExternalLink className="h-5 w-5" />}
          href={`/admin/seo?modelId=${modelId}`}
        />
        <ConnectionCard
          title="Prices"
          description="Variant prices, stock status, and buy URLs."
          icon={<Tag className="h-5 w-5" />}
          action={<PriceEditor modelId={modelId} />}
        />
        <ConnectionCard
          title="Expert Score"
          description="7 dimension scores (0–10). Overall auto-computed."
          icon={<Smartphone className="h-5 w-5" />}
          action={<ExpertScoreEditor modelId={modelId} />}
        />
        <ConnectionCard
          title="Gallery"
          description="Image gallery for the model detail page."
          icon={<Plus className="h-5 w-5" />}
          action={<GalleryEditor modelId={modelId} />}
        />
        <ConnectionCard
          title="EMI"
          description="EMI offers linked to bank plans."
          icon={<Database className="h-5 w-5" />}
          action={<EmiConnectionEditor modelId={modelId} />}
        />
      </div>
    </div>
  );
}

function ConnectionCard({ title, description, icon, action, href }: any) {
  return (
    <Card className="flex flex-col h-full border-border hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary mb-3">
          {icon}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto pt-0">
        {action ? action : (
          <Button variant="outline" className="w-full gap-2" asChild>
            <Link to={href}>
              Open Manager <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function VariantEditor({ modelId }: { modelId: string }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    ram: "",
    storage: "",
    color: "",
    condition_type: "new",
  });
  const queryClient = useQueryClient();

  const { data: variants, isLoading } = useQuery({
    queryKey: ["model_variants", modelId],
    queryFn: () => mobileMasterService.getVariants(modelId),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => mobileMasterService.createVariant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model_variants", modelId] });
      toast.success("Variant added");
      setFormData({ ram: "", storage: "", color: "", condition_type: "new" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mobileMasterService.deleteVariant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model_variants", modelId] });
      toast.success("Variant deleted");
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">Manage Variants</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Model Variants</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Add New Variant */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-xl border border-dashed">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">RAM</Label>
              <Input value={formData.ram} onChange={e => setFormData({...formData, ram: e.target.value})} placeholder="8GB" className="h-9 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Storage</Label>
              <Input value={formData.storage} onChange={e => setFormData({...formData, storage: e.target.value})} placeholder="256GB" className="h-9 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Color</Label>
              <Input value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} placeholder="Black" className="h-9 text-sm" />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => createMutation.mutate({ ...formData, model_id: modelId, status: 'active' })} 
                disabled={createMutation.isPending || !formData.storage}
                className="w-full h-9"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Add
              </Button>
            </div>
          </div>

          {/* Current Variants */}
          <div className="space-y-2">
            <Label className="text-xs font-bold">Existing Variants</Label>
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="h-9 text-xs">RAM</TableHead>
                    <TableHead className="h-9 text-xs">Storage</TableHead>
                    <TableHead className="h-9 text-xs">Color</TableHead>
                    <TableHead className="h-9 text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : variants?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm italic">No variants added yet.</TableCell></TableRow>
                  ) : variants?.map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell className="py-2 text-sm font-medium">{v.ram || '-'}</TableCell>
                      <TableCell className="py-2 text-sm">{v.storage || '-'}</TableCell>
                      <TableCell className="py-2 text-sm">{v.color || '-'}</TableCell>
                      <TableCell className="py-2 text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => {
                          if (confirm("Delete variant?")) {
                            deleteMutation.mutate(v.id);
                          }
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SpecEditor({ modelId }: { modelId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: specs, isLoading } = useQuery({
    queryKey: ["model_specs", modelId],
    queryFn: () => mobileMasterService.getSpecs(modelId),
    enabled: open,
  });

  const [formData, setFormData] = useState<any>({
    display: "",
    processor: "",
    camera: "",
    battery: "",
    charging: "",
    os: "",
    verdict: "",
    pros: "",
    cons: "",
  });

  useEffect(() => {
    if (specs) {
      setFormData({
        display: specs.display || "",
        processor: specs.processor || "",
        camera: specs.camera || "",
        battery: specs.battery || "",
        charging: specs.charging || "",
        os: specs.os || "",
        verdict: specs.verdict || "",
        pros: specs.pros?.join(", ") || "",
        cons: specs.cons?.join(", ") || "",
      });
    }
  }, [specs]);

  const upsertMutation = useMutation({
    mutationFn: (data: any) => mobileMasterService.upsertSpecs(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model_specs", modelId] });
      toast.success("Specifications updated");
      setOpen(false);
    }
  });

  const handleSave = () => {
    upsertMutation.mutate({
      model_id: modelId,
      ...formData,
      pros: formData.pros.split(",").map((s: string) => s.trim()).filter(Boolean),
      cons: formData.cons.split(",").map((s: string) => s.trim()).filter(Boolean),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">Edit Specs & Overview</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Specifications & Rich Content</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8" /></div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Display</Label>
                <Input value={formData.display} onChange={e => setFormData({...formData, display: e.target.value})} placeholder="e.g. 6.7-inch Super Retina XDR" />
              </div>
              <div className="space-y-2">
                <Label>Processor</Label>
                <Input value={formData.processor} onChange={e => setFormData({...formData, processor: e.target.value})} placeholder="e.g. A17 Pro Chip" />
              </div>
              <div className="space-y-2">
                <Label>Camera</Label>
                <Input value={formData.camera} onChange={e => setFormData({...formData, camera: e.target.value})} placeholder="e.g. 48MP Main, 12MP Ultra Wide" />
              </div>
              <div className="space-y-2">
                <Label>Battery</Label>
                <Input value={formData.battery} onChange={e => setFormData({...formData, battery: e.target.value})} placeholder="e.g. 4422 mAh" />
              </div>
              <div className="space-y-2">
                <Label>Charging</Label>
                <Input value={formData.charging} onChange={e => setFormData({...formData, charging: e.target.value})} placeholder="e.g. 25W Wired, MagSafe" />
              </div>
              <div className="space-y-2">
                <Label>OS</Label>
                <Input value={formData.os} onChange={e => setFormData({...formData, os: e.target.value})} placeholder="e.g. iOS 17" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reasons to Buy (Pros) - Comma separated</Label>
              <Textarea value={formData.pros} onChange={e => setFormData({...formData, pros: e.target.value})} placeholder="Titanium design, Powerful zoom, USB-C" />
            </div>

            <div className="space-y-2">
              <Label>Reasons to Avoid (Cons) - Comma separated</Label>
              <Textarea value={formData.cons} onChange={e => setFormData({...formData, cons: e.target.value})} placeholder="Expensive, Slow charging" />
            </div>

            <div className="space-y-2">
              <Label>Expert Verdict</Label>
              <Textarea value={formData.verdict} onChange={e => setFormData({...formData, verdict: e.target.value})} placeholder="The best iPhone for professionals..." />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleSave} disabled={upsertMutation.isPending}>
            {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Specifications
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PriceEditor({ modelId }: { modelId: string }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Partial<VariantPrice>>({ currency: 'NPR', stock_status: 'in_stock', emi_available: false, is_default: false, sort_order: 0 });

  const { data: variants } = useQuery({ queryKey: ['variants', modelId], queryFn: () => mobileMasterService.getVariants(modelId) });
  const { data: prices, isLoading } = useQuery({ queryKey: ['variant_prices', modelId], queryFn: () => mobileMasterService.getVariantPrices(modelId) });
  const { data: retailers } = useQuery({ queryKey: ['retailers'], queryFn: () => mobileMasterService.getRetailers() });

  const variantLabel = (variantId?: string | null) => {
    const variant = (variants ?? []).find(v => v.id === variantId);
    if (!variant) return "Any variant";
    return [variant.ram, variant.storage, variant.color].filter(Boolean).join(" / ") || "Base variant";
  };

  const upsert = useMutation({
    mutationFn: (p: Partial<VariantPrice>) => mobileMasterService.upsertVariantPrice({ ...p, model_id: modelId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variant_prices', modelId] });
      qc.invalidateQueries({ queryKey: ['model_detail'] });
      setAdding(false);
      setForm({ currency: 'NPR', stock_status: 'in_stock', emi_available: false, is_default: false, sort_order: 0 });
      toast.success('Price saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => mobileMasterService.deleteVariantPrice(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['variant_prices', modelId] }),
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground py-2">Loading prices...</div>;

  return (
    <div className="space-y-3">
      {(prices ?? []).length === 0 && (
        <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          No purchase price is configured yet. Add one price to show a purchase panel on the public model page.
        </div>
      )}
      {(prices ?? []).map((p) => (
        <div key={p.id} className="flex items-center gap-3 p-3 border rounded-lg text-sm bg-background">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground truncate">{variantLabel(p.variant_id)}</div>
            <div className="font-medium">NPR {p.regular_price.toLocaleString()}{p.sale_price ? ` → ${p.sale_price.toLocaleString()}` : ''}</div>
            <div className="text-muted-foreground flex flex-wrap gap-1.5">
              <span>{p.stock_status}</span>
              {p.is_default && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">Default</Badge>}
              {p.emi_available && <Badge variant="outline" className="h-5 px-1.5 text-[10px]">EMI</Badge>}
            </div>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => del.mutate(p.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      {adding ? (
        <div className="border rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Variant</Label>
              <Select value={form.variant_id ?? ''} onValueChange={(v) => setForm(f => ({ ...f, variant_id: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pick variant" /></SelectTrigger>
                <SelectContent>{(variants ?? []).map(v => <SelectItem key={v.id} value={v.id}>{[v.ram, v.storage, v.color].filter(Boolean).join(" / ") || "Base variant"}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Regular Price (NPR)</Label>
              <Input className="h-8 text-sm" type="number" value={form.regular_price ?? ''} onChange={e => setForm(f => ({ ...f, regular_price: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs">Sale Price (NPR, optional)</Label>
              <Input className="h-8 text-sm" type="number" value={form.sale_price ?? ''} onChange={e => setForm(f => ({ ...f, sale_price: Number(e.target.value) || undefined }))} />
            </div>
            <div>
              <Label className="text-xs">Stock Status</Label>
              <Select value={form.stock_status ?? 'in_stock'} onValueChange={(v) => setForm(f => ({ ...f, stock_status: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="pre_order">Pre-Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Retailer</Label>
              <Select value={form.retailer_id ?? 'none'} onValueChange={(v) => setForm(f => ({ ...f, retailer_id: v === 'none' ? undefined : v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Tamrakar Complex" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tamrakar Complex</SelectItem>
                  {(retailers ?? []).map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Sort Order</Label>
              <Input className="h-8 text-sm" type="number" value={form.sort_order ?? 0} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Buy URL</Label>
              <Input className="h-8 text-sm" value={form.buy_url ?? ''} onChange={e => setForm(f => ({ ...f, buy_url: e.target.value }))} placeholder="https://..." />
            </div>
            <label className="col-span-2 flex items-center gap-2 rounded-md border p-2 text-xs">
              <input
                type="checkbox"
                checked={!!form.is_default}
                onChange={(e) => setForm(f => ({ ...f, is_default: e.target.checked }))}
              />
              Make this the default public purchase price
            </label>
            <label className="col-span-2 flex items-center gap-2 rounded-md border p-2 text-xs">
              <input
                type="checkbox"
                checked={!!form.emi_available}
                onChange={(e) => setForm(f => ({ ...f, emi_available: e.target.checked }))}
              />
              EMI available for this offer
            </label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => upsert.mutate(form)} disabled={!form.variant_id || !form.regular_price || upsert.isPending}>
              {upsert.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="h-3 w-3 mr-1" />Add Price</Button>
      )}
    </div>
  );
}

function ExpertScoreEditor({ modelId }: { modelId: string }) {
  const qc = useQueryClient();
  const { data: score, isLoading } = useQuery({ queryKey: ['expert_score', modelId], queryFn: () => mobileMasterService.getExpertScore(modelId) });
  const [form, setForm] = useState<Partial<ExpertScore>>({});

  useEffect(() => { if (score) setForm(score); }, [score]);

  const save = useMutation({
    mutationFn: (s: Partial<ExpertScore>) => mobileMasterService.upsertExpertScore({ ...s, model_id: modelId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expert_score', modelId] }); toast.success('Expert score saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  const DIMENSIONS: { key: keyof ExpertScore; label: string }[] = [
    { key: 'design_score', label: 'Design' },
    { key: 'display_score', label: 'Display' },
    { key: 'performance_score', label: 'Performance' },
    { key: 'software_score', label: 'Software' },
    { key: 'camera_score', label: 'Camera' },
    { key: 'battery_score', label: 'Battery' },
    { key: 'value_score', label: 'Value' },
  ];

  const overall = (() => {
    const scores = DIMENSIONS.map(d => form[d.key] as number | undefined).filter((v): v is number => v != null);
    if (!scores.length) return null;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  })();

  if (isLoading) return <div className="text-sm text-muted-foreground py-2">Loading...</div>;

  return (
    <div className="space-y-3">
      {overall && <div className="text-2xl font-bold text-primary">{overall}<span className="text-sm font-normal text-muted-foreground">/10 overall</span></div>}
      <div className="grid grid-cols-2 gap-2">
        {DIMENSIONS.map(({ key, label }) => (
          <div key={key}>
            <Label className="text-xs">{label} (0–10)</Label>
            <Input className="h-8 text-sm" type="number" min={0} max={10} step={0.1}
              value={form[key] as number ?? ''} onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) || undefined }))} />
          </div>
        ))}
        <div className="col-span-2">
          <Label className="text-xs">Review post slug (optional)</Label>
          <Input className="h-8 text-sm" value={form.review_post_slug ?? ''} onChange={e => setForm(f => ({ ...f, review_post_slug: e.target.value }))} placeholder="samsung-galaxy-s24-review" />
        </div>
      </div>
      <Button size="sm" onClick={() => save.mutate(form)} disabled={save.isPending}>
        {save.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}Save Score
      </Button>
    </div>
  );
}

function GalleryEditor({ modelId }: { modelId: string }) {
  const qc = useQueryClient();
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [uploading, setUploading] = useState(false);
  const { data: images, isLoading } = useQuery({ queryKey: ['model_images', modelId], queryFn: () => mobileMasterService.getModelImages(modelId) });

  const add = useMutation({
    mutationFn: (imageUrl: string) => mobileMasterService.addModelImage({ model_id: modelId, image_url: imageUrl, alt_text: alt, sort_order: (images?.length ?? 0) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['model_images', modelId] }); setUrl(''); setAlt(''); toast.success('Image added'); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => mobileMasterService.deleteModelImage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['model_images', modelId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const toggleFeatured = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) => mobileMasterService.updateModelImage(id, { is_featured: val }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['model_images', modelId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const publicUrl = await uploadToStorage(file, `phone-models/${modelId}`);
      add.mutate(publicUrl);
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      e.target.value = "";
      setUploading(false);
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground py-2">Loading...</div>;

  return (
    <div className="space-y-3">
      {(images ?? []).map((img) => (
        <div key={img.id} className="flex items-center gap-2 text-sm border rounded p-2">
          <img src={img.image_url} alt={img.alt_text ?? ''} className="h-10 w-10 object-cover rounded" onError={(e) => { (e.target as HTMLImageElement).src = '/default-product.svg'; }} />
          <div className="flex-1 truncate text-xs text-muted-foreground">{img.image_url}</div>
          {img.alt_text && <span className="text-xs text-muted-foreground hidden sm:block max-w-[80px] truncate">{img.alt_text}</span>}
          <Button size="sm" variant={img.is_featured ? 'default' : 'outline'} className="h-6 text-xs px-2" onClick={() => toggleFeatured.mutate({ id: img.id, val: !img.is_featured })}>
            {img.is_featured ? '★ Featured' : '☆'}
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => del.mutate(img.id)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      ))}
      {/* Add image: file upload OR URL */}
      <div className="border rounded p-3 space-y-2 bg-muted/30">
        <p className="text-xs font-medium text-muted-foreground">Add Image</p>
        <div className="flex gap-2 items-center flex-wrap">
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border bg-background text-xs font-medium hover:bg-accent transition-colors">
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {uploading ? "Uploading…" : "Upload from device"}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading || add.isPending} />
          </label>
          <span className="text-xs text-muted-foreground">or</span>
          <Input className="h-8 text-sm flex-1 min-w-[160px]" placeholder="Paste image URL" value={url} onChange={e => setUrl(e.target.value)} />
          <Input className="h-8 text-sm w-28" placeholder="Alt text" value={alt} onChange={e => setAlt(e.target.value)} />
          <Button size="sm" className="h-8" onClick={() => add.mutate(url)} disabled={!url || add.isPending || uploading}>Add URL</Button>
        </div>
      </div>
    </div>
  );
}

function BrandContentDialog({ brand, onUpdate }: { brand: Brand; onUpdate: (id: string, data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [overview, setOverview] = useState(brand.overview_text ?? "");
  const [country, setCountry] = useState((brand as any).country ?? "");
  const [foundedYear, setFoundedYear] = useState(String((brand as any).founded_year ?? ""));
  const [website, setWebsite] = useState((brand as any).website ?? "");
  const [seriesDesc, setSeriesDesc] = useState<{ name: string; description: string }[]>((brand as any).series_descriptions ?? []);
  const [centers, setCenters] = useState<{ name: string; address?: string; phone?: string; email?: string }[]>((brand as any).service_centers ?? []);
  const [faq, setFaq] = useState<{ question: string; answer: string }[]>((brand as any).faq ?? []);
  const [saving, setSaving] = useState(false);

  const handleOpen = (v: boolean) => {
    if (v) {
      setOverview(brand.overview_text ?? "");
      setCountry((brand as any).country ?? "");
      setFoundedYear(String((brand as any).founded_year ?? ""));
      setWebsite((brand as any).website ?? "");
      setSeriesDesc((brand as any).series_descriptions ?? []);
      setCenters((brand as any).service_centers ?? []);
      setFaq((brand as any).faq ?? []);
    }
    setOpen(v);
  };

  const save = () => {
    setSaving(true);
    onUpdate(brand.id, {
      overview_text: overview || null,
      country: country || null,
      founded_year: foundedYear ? parseInt(foundedYear) : null,
      website: website || null,
      series_descriptions: seriesDesc,
      service_centers: centers,
      faq,
    });
    setSaving(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Brand Content & SEO" onClick={(e) => e.stopPropagation()}>
          <FileText className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Brand Content — {brand.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic meta */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Country</Label>
              <Input className="h-8 text-sm" value={country} onChange={e => setCountry(e.target.value)} placeholder="South Korea" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Founded Year</Label>
              <Input className="h-8 text-sm" type="number" value={foundedYear} onChange={e => setFoundedYear(e.target.value)} placeholder="1969" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Official Website</Label>
              <Input className="h-8 text-sm" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." />
            </div>
          </div>

          {/* Overview */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Brand Overview (shown on brand page)</Label>
            <Textarea rows={5} value={overview} onChange={e => setOverview(e.target.value)} placeholder="Write a detailed brand overview..." />
          </div>

          {/* Series descriptions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Series Descriptions</Label>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSeriesDesc(s => [...s, { name: "", description: "" }])}>
                <Plus className="h-3 w-3 mr-1" />Add
              </Button>
            </div>
            {seriesDesc.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-start">
                <Input className="h-8 text-sm" placeholder="Series name" value={s.name} onChange={e => setSeriesDesc(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <Input className="h-8 text-sm" placeholder="Description" value={s.description} onChange={e => setSeriesDesc(prev => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => setSeriesDesc(prev => prev.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
            {seriesDesc.length === 0 && <p className="text-xs text-muted-foreground italic">No series descriptions yet.</p>}
          </div>

          {/* Service centers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Service Centers</Label>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCenters(c => [...c, { name: "" }])}>
                <Plus className="h-3 w-3 mr-1" />Add
              </Button>
            </div>
            {centers.map((c, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Center #{i + 1}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => setCenters(prev => prev.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input className="h-7 text-xs" placeholder="Name" value={c.name} onChange={e => setCenters(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  <Input className="h-7 text-xs" placeholder="Address" value={c.address ?? ""} onChange={e => setCenters(prev => prev.map((x, j) => j === i ? { ...x, address: e.target.value } : x))} />
                  <Input className="h-7 text-xs" placeholder="Phone" value={c.phone ?? ""} onChange={e => setCenters(prev => prev.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} />
                  <Input className="h-7 text-xs" placeholder="Email" value={c.email ?? ""} onChange={e => setCenters(prev => prev.map((x, j) => j === i ? { ...x, email: e.target.value } : x))} />
                </div>
              </div>
            ))}
            {centers.length === 0 && <p className="text-xs text-muted-foreground italic">No service centers yet.</p>}
          </div>

          {/* FAQ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">FAQ Items</Label>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setFaq(f => [...f, { question: "", answer: "" }])}>
                <Plus className="h-3 w-3 mr-1" />Add
              </Button>
            </div>
            {faq.map((f, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Q #{i + 1}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => setFaq(prev => prev.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>
                </div>
                <Input className="h-7 text-xs" placeholder="Question" value={f.question} onChange={e => setFaq(prev => prev.map((x, j) => j === i ? { ...x, question: e.target.value } : x))} />
                <Textarea className="text-xs" rows={2} placeholder="Answer" value={f.answer} onChange={e => setFaq(prev => prev.map((x, j) => j === i ? { ...x, answer: e.target.value } : x))} />
              </div>
            ))}
            {faq.length === 0 && <p className="text-xs text-muted-foreground italic">No FAQ items yet.</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Brand Content
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmiConnectionEditor({ modelId }: { modelId: string }) {
  const qc = useQueryClient();
  const { data: plans } = useQuery({ queryKey: ['emi_plans'], queryFn: () => mobileMasterService.getEmiPlans() });
  const { data: variants } = useQuery({ queryKey: ['variants', modelId], queryFn: () => mobileMasterService.getVariants(modelId) });
  const { data: emis, isLoading } = useQuery({ queryKey: ['model_emi', modelId], queryFn: () => mobileMasterService.getModelEmi(modelId) });
  const [form, setForm] = useState<Partial<ModelEmi>>({ down_payment: 0 });
  const [adding, setAdding] = useState(false);

  const add = useMutation({
    mutationFn: (e: Partial<ModelEmi>) => mobileMasterService.upsertModelEmi({ ...e, model_id: modelId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['model_emi', modelId] }); setAdding(false); toast.success('EMI saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => mobileMasterService.deleteModelEmi(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['model_emi', modelId] }),
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground py-2">Loading...</div>;

  return (
    <div className="space-y-3">
      {(emis ?? []).map((e) => (
        <div key={e.id} className="flex items-center gap-3 p-2 border rounded text-sm">
          <div className="flex-1">NPR {e.monthly_amount.toLocaleString()}/mo · DP {e.down_payment.toLocaleString()}</div>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => del.mutate(e.id)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      ))}
      {adding ? (
        <div className="border rounded p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Variant</Label>
              <Select value={form.variant_id ?? ''} onValueChange={v => setForm(f => ({ ...f, variant_id: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pick variant" /></SelectTrigger>
                <SelectContent>{(variants ?? []).map(v => <SelectItem key={v.id} value={v.id}>{v.ram}/{v.storage}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">EMI Plan</Label>
              <Select value={form.emi_plan_id ?? ''} onValueChange={v => setForm(f => ({ ...f, emi_plan_id: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pick plan" /></SelectTrigger>
                <SelectContent>{(plans ?? []).map(p => <SelectItem key={p.id} value={p.id}>{p.bank_name} {p.duration_months}mo</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Monthly Amount (NPR)</Label>
              <Input className="h-8 text-sm" type="number" value={form.monthly_amount ?? ''} onChange={e => setForm(f => ({ ...f, monthly_amount: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs">Down Payment (NPR)</Label>
              <Input className="h-8 text-sm" type="number" value={form.down_payment ?? 0} onChange={e => setForm(f => ({ ...f, down_payment: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => add.mutate(form)} disabled={!form.variant_id || !form.emi_plan_id || !form.monthly_amount || add.isPending}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="h-3 w-3 mr-1" />Add EMI</Button>
      )}
    </div>
  );
}
