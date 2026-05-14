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
  PlusCircle
} from "lucide-react";
import { mobileMasterService, Brand, PhoneSeries, PhoneModel, PhoneVariant } from "@/services/mobileMasterService";
import { toast } from "sonner";
import { slugify } from "@/lib/utils";
import { Link } from "react-router-dom";

export default function MobileMasterManager() {
  const [activeTab, setActiveTab] = useState("brands");
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  
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
    onSuccess: () => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_series"] });
      toast.success("Series deleted");
      if (selectedSeriesId === id) setSelectedSeriesId(null);
    },
    onError: (error: any) => toast.error("Failed to delete series: " + error.message)
  });

  const deleteModel = useMutation({
    mutationFn: (id: string) => mobileMasterService.deleteModel(id),
    onSuccess: () => {
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-8 w-8 text-primary" />
            Mobile Master Data
          </h1>
          <p className="text-muted-foreground">Centralized phone database. One Model = One ID.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Hierarchy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Brand</Label>
              <Select value={selectedBrandId || ""} onValueChange={(v) => {
                setSelectedBrandId(v);
                setSelectedSeriesId(null);
                setSelectedModelId(null);
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

            {selectedBrandId && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label>Select Series</Label>
                <Select value={selectedSeriesId || ""} onValueChange={(v) => {
                  setSelectedSeriesId(v);
                  setSelectedModelId(null);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Series" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Series</SelectItem>
                    {series?.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="brands" className="gap-2">
                <Tag className="h-4 w-4" /> Brands
              </TabsTrigger>
              <TabsTrigger value="series" className="gap-2" disabled={!selectedBrandId}>
                <Layers className="h-4 w-4" /> Series
              </TabsTrigger>
              <TabsTrigger value="models" className="gap-2">
                <Smartphone className="h-4 w-4" /> Models
              </TabsTrigger>
              <TabsTrigger value="connections" className="gap-2" disabled={!selectedModelId}>
                <Settings2 className="h-4 w-4" /> Connections
              </TabsTrigger>
            </TabsList>

            <TabsContent value="brands" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Manage Brands</h2>
                <AddBrandDialog onAdd={(b) => createBrand.mutate(b)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {brands?.map(brand => (
                  <Card key={brand.id} className="group cursor-pointer hover:border-primary transition-colors" onClick={() => setSelectedBrandId(brand.id)}>
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
                {series?.map(s => (
                  <Card key={s.id} className="group cursor-pointer hover:border-primary transition-colors" onClick={() => setSelectedSeriesId(s.id)}>
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
                {series?.length === 0 && (
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
                    <Input placeholder="Search models..." className="pl-8" />
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
                  {models?.map(model => (
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
                      title="Stock Management" 
                      description="Update new phone stock and pricing."
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
        </div>
        <DialogFooter>
          <Button onClick={() => {
            onAdd({ name, slug: slugify(name) });
            setOpen(false);
            setName("");
          }}>Create Brand</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditBrandDialog({ brand, onUpdate }: { brand: any, onUpdate: (id: string, data: any) => void }) {
  const [name, setName] = useState(brand.name);
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
        </div>
        <DialogFooter>
          <Button onClick={() => {
            onUpdate(brand.id, { name, slug: slugify(name) });
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
        </div>
        <DialogFooter>
          <Button onClick={() => {
            const { series_id, ...rest } = formData;
            onUpdate(model.id, { 
              ...rest, 
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
  });
  const [open, setOpen] = useState(false);

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
        </div>
        <DialogFooter>
          <Button onClick={() => {
            onAdd({ 
              ...formData, 
              slug: slugify(formData.name),
              series_id: formData.series_id === 'none' ? null : formData.series_id
            });
            setOpen(false);
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
      </div>
    </div>
  );
}

function ConnectionCard({ title, description, icon, action, href }: any) {
  return (
    <Card className="flex flex-col h-full border-slate-200 hover:border-primary/30 transition-colors">
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
