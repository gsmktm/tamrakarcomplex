import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SafeImage } from "@/components/common/SafeImage";
import {
  Loader2, Search, Filter, CheckCircle, XCircle, AlertTriangle, Eye, EyeOff,
  Edit, Merge, ExternalLink, Calendar, Image as ImageIcon, Download, Upload,
  ChevronDown, ChevronUp, Trash2, Download as DownloadIcon, History,
  ShieldCheck, ShieldAlert, Copy, CheckSquare, Square, Users, Database, RefreshCw,
  FileSpreadsheet, Sparkles, GripVertical, Ban, Check
} from "lucide-react";
import { toast } from "sonner";
import { deviceVerificationService, VerificationProduct } from "@/services/deviceVerificationService";
import { supabase } from "@/integrations/supabase/client";

type DuplicateGroup = {
  group_key: string;
  products: Array<VerificationProduct & { match_score: number }>;
};

type AuditEntry = {
  id: string;
  product_id: string;
  product_name: string;
  action: string;
  action_detail: string;
  created_at: string;
  admin_email?: string;
};

export default function DeviceVerificationManager() {
  const [selectedProduct, setSelectedProduct] = useState<VerificationProduct | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editType, setEditType] = useState<'specs' | 'price' | 'image'>('specs');
  const [editValue, setEditValue] = useState('');
  const [filters, setFilters] = useState({
    verified: '',
    has_image: '',
    has_specs: '',
    has_price: '',
    search: ''
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"queue" | "duplicates" | "audit">("queue");
  const [mergeConfirmId, setMergeConfirmId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: products, isLoading, error: productsError } = useQuery<{ data: VerificationProduct[]; count?: number }>({
    queryKey: ["device-verification", filters],
    queryFn: async () => {
      try {
        return await deviceVerificationService.getProductsForVerification({
          verified: filters.verified === 'true' ? true : filters.verified === 'false' ? false : undefined,
          has_image: filters.has_image === 'true' ? true : filters.has_image === 'false' ? false : undefined,
          has_specs: filters.has_specs === 'true' ? true : filters.has_specs === 'false' ? false : undefined,
          has_price: filters.has_price === 'true' ? true : filters.has_price === 'false' ? false : undefined,
          search: filters.search || undefined,
        });
      } catch (err) {
        handleSupabaseError(err, "DeviceVerificationManager: Failed to fetch products");
        return { data: [] };
      }
    },
    retry: 1,
  });

  const { data: stats, error: statsError } = useQuery({
    queryKey: ["verification-stats"],
    queryFn: async () => {
      try {
        return await deviceVerificationService.getVerificationStats();
      } catch (err) {
        handleSupabaseError(err, "DeviceVerificationManager: Failed to fetch stats");
        return null;
      }
    },
    retry: 1,
  });

  const { data: duplicateGroups = [], isLoading: loadingDupes } = useQuery<DuplicateGroup[]>({
    queryKey: ["verification-duplicates"],
    queryFn: async () => {
      try {
        const raw = await deviceVerificationService.findDuplicates();
        const groupsMap = new Map<string, DuplicateGroup>();
        (raw as any[] || []).forEach((r: any) => {
          const key = r.group_key || `${r.brand_name}|${r.model_name}|${r.variant_key}`;
          if (!groupsMap.has(key)) groupsMap.set(key, { group_key: key, products: [] });
          groupsMap.get(key)!.products.push({
            id: r.id,
            name: r.name,
            slug: r.slug,
            brand: { name: r.brand_name || "Unknown" },
            model: { name: r.model_name || "" },
            variant: { storage: r.storage, ram: r.ram, color: r.color },
            image_url: r.image_url,
            specs_json: r.specs_json || {},
            price_npr: r.price_npr,
            price_text: r.price_text,
            source_url: r.source_url,
            source_site: r.source_site,
            verified: r.verified,
            verified_at: r.verified_at,
            is_active: r.is_active,
            is_price_list_item: r.is_price_list_item,
            created_at: r.created_at,
            match_score: r.match_score || 0.9,
          });
        });
        return Array.from(groupsMap.values()).filter(g => g.products.length > 1);
      } catch {
        return [];
      }
    },
    enabled: activeTab === "duplicates",
    retry: 0,
  });

  const { data: auditLog = [], isLoading: loadingAudit } = useQuery<AuditEntry[]>({
    queryKey: ["verification-audit"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("catalog_products")
          .select("id, name, verified, verified_at, updated_at, created_at")
          .not("verified_at", "is", null)
          .order("verified_at", { ascending: false })
          .limit(50);
        return (data || []).map(p => ({
          id: `audit-${p.id}-${p.verified_at}`,
          product_id: p.id,
          product_name: p.name,
          action: p.verified ? "Verified" : "Unverified",
          action_detail: p.verified ? "Marked as verified for SEO traffic & price list" : "Removed from verified set",
          created_at: p.verified_at || p.updated_at,
        })) as AuditEntry[];
      } catch {
        return [];
      }
    },
    enabled: activeTab === "audit",
    retry: 0,
  });

  const updateVerificationMutation = useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) =>
      deviceVerificationService.updateVerification(id, verified),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-verification"] });
      queryClient.invalidateQueries({ queryKey: ["verification-stats"] });
      queryClient.invalidateQueries({ queryKey: ["verification-audit"] });
      toast.success("Verification status updated");
    },
    onError: (error) => {
      toast.error("Failed to update verification: " + error.message);
    },
  });

  const markNeedsReviewMutation = useMutation({
    mutationFn: (id: string) => deviceVerificationService.markNeedsReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-verification"] });
      queryClient.invalidateQueries({ queryKey: ["verification-stats"] });
      toast.success("Marked as needs review");
    },
    onError: (error) => {
      toast.error("Failed to mark as needs review: " + error.message);
    },
  });

  const bulkUpdateVerificationMutation = useMutation({
    mutationFn: ({ ids, verified }: { ids: string[]; verified: boolean }) =>
      deviceVerificationService.bulkUpdateVerification(ids, verified),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["device-verification"] });
      queryClient.invalidateQueries({ queryKey: ["verification-stats"] });
      queryClient.invalidateQueries({ queryKey: ["verification-audit"] });
      setSelectedIds([]);
      toast.success(`Bulk ${variables.verified ? "verified" : "unverified"} successfully`);
    },
    onError: (error) => {
      toast.error("Bulk update failed: " + error.message);
    },
  });

  const mergeDuplicatesMutation = useMutation({
    mutationFn: ({ primaryId, duplicateIds }: { primaryId: string; duplicateIds: string[] }) =>
      deviceVerificationService.mergeDuplicates(primaryId, duplicateIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-verification"] });
      queryClient.invalidateQueries({ queryKey: ["verification-duplicates"] });
      queryClient.invalidateQueries({ queryKey: ["verification-stats"] });
      setMergeConfirmId(null);
      toast.success("Duplicates merged successfully");
    },
    onError: (error) => {
      toast.error("Merge failed: " + error.message);
    },
  });

  const updateSpecsMutation = useMutation({
    mutationFn: ({ id, specs }: { id: string; specs: Record<string, unknown> }) =>
      deviceVerificationService.updateSpecs(id, specs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-verification"] });
      toast.success("Specs updated successfully");
      setShowEditDialog(false);
    },
    onError: (error) => {
      toast.error("Failed to update specs: " + error.message);
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: ({ id, price }: { id: string; price: number }) =>
      deviceVerificationService.updatePrice(id, price),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-verification"] });
      queryClient.invalidateQueries({ queryKey: ["price-list-models"] });
      toast.success("Price updated successfully");
      setShowEditDialog(false);
    },
    onError: (error) => {
      toast.error("Failed to update price: " + error.message);
    },
  });

  const updateImageMutation = useMutation({
    mutationFn: ({ id, image_url }: { id: string; image_url: string }) =>
      deviceVerificationService.updateImage(id, image_url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-verification"] });
      toast.success("Image updated successfully");
      setShowEditDialog(false);
    },
    onError: (error) => {
      toast.error("Failed to update image: " + error.message);
    },
  });

  const handleEdit = (product: VerificationProduct, type: 'specs' | 'price' | 'image') => {
    setSelectedProduct(product);
    setEditType(type);
    if (type === 'specs') {
      setEditValue(JSON.stringify(product.specs_json, null, 2));
    } else if (type === 'price') {
      setEditValue(product.price_npr?.toString() || '');
    } else if (type === 'image') {
      setEditValue(product.image_url || '');
    }
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!selectedProduct) return;

    if (editType === 'specs') {
      try {
        const specs = JSON.parse(editValue);
        updateSpecsMutation.mutate({ id: selectedProduct.id, specs });
      } catch {
        toast.error("Invalid JSON for specs");
      }
    } else if (editType === 'price') {
      const price = parseFloat(editValue);
      if (isNaN(price)) {
        toast.error("Invalid price");
        return;
      }
      updatePriceMutation.mutate({ id: selectedProduct.id, price });
    } else if (editType === 'image') {
      updateImageMutation.mutate({ id: selectedProduct.id, image_url: editValue });
    }
  };

  const getMissingIndicators = (product: VerificationProduct) => {
    const missing = [];
    if (!product.image_url) missing.push('Image');
    if (!product.specs_json || Object.keys(product.specs_json).length === 0) missing.push('Specs');
    if (!product.price_npr) missing.push('Price');
    if (!product.source_url) missing.push('Source');
    return missing;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const allIds = (products?.data || []).map(p => p.id);
    if (selectedIds.length === allIds.length && allIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };

  const exportReport = () => {
    if (!products?.data || products.data.length === 0) return;
    const headers = ["ID", "Name", "Brand", "Model", "Variant", "Price (NPR)", "Verified", "Missing", "Image", "Specs", "Source URL", "Verified At"];
    const rows = products.data.map(p => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.brand?.name || "",
      p.model?.name || "",
      [p.variant?.ram, p.variant?.storage, p.variant?.color].filter(Boolean).join("/"),
      p.price_npr || "",
      p.verified ? "Yes" : "No",
      getMissingIndicators(p).join("; "),
      p.image_url ? "Yes" : "No",
      (p.specs_json && Object.keys(p.specs_json).length > 0) ? "Yes" : "No",
      p.source_url || "",
      p.verified_at || ""
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verification-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  const progressPct = useMemo(() => {
    if (!stats || !stats.total) return 0;
    return Math.round((stats.verified / stats.total) * 100);
  }, [stats]);

  const completionRate = useMemo(() => {
    if (!products?.data) return 0;
    const complete = products.data.filter(p => getMissingIndicators(p).length === 0).length;
    return Math.round(complete / products.data.length * 100);
  }, [products]);

  if (isLoading && activeTab === "queue") {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
            <Database className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total || 0}</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Progress value={progressPct} className="h-1.5 flex-1" />
              <span className="tabular-nums">{progressPct}% verified</span>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-emerald-500/30">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verified</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{stats?.verified || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Eligible for SEO traffic & price list</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-amber-500/30">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unverified</CardTitle>
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{stats?.unverified || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Queue to review & complete</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-rose-500/30">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Needs Review</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-600">{stats?.needs_review || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Flagged for QA check</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-indigo-500/30">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Data Quality</CardTitle>
            <Sparkles className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600">{completionRate}%</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Progress value={completionRate} className="h-1.5 flex-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Device Verification Center
              </CardTitle>
              <CardDescription>
                Validate catalog entries before they appear in Nepal price list, SEO pages, and EMI eligibility checks.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["device-verification"] });
                  queryClient.invalidateQueries({ queryKey: ["verification-stats"] });
                  queryClient.invalidateQueries({ queryKey: ["verification-duplicates"] });
                  queryClient.invalidateQueries({ queryKey: ["verification-audit"] });
                }}
              >
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportReport}>
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Export Report
              </Button>
            </div>
          </div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-4">
            <TabsList className="grid grid-cols-3 w-full max-w-lg">
              <TabsTrigger value="queue" className="gap-2">
                <CheckSquare className="h-3.5 w-3.5" /> Verification Queue
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{products?.data?.length || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="duplicates" className="gap-2">
                <Copy className="h-3.5 w-3.5" /> Duplicates
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{duplicateGroups.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2">
                <History className="h-3.5 w-3.5" /> Audit Trail
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{auditLog.length}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <TabsContent value="queue" className="mt-0 space-y-4">
            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
              <div className="sticky top-0 z-10 -mx-6 -mt-2 mb-4 px-6 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-200 dark:from-indigo-950/40 dark:to-blue-950/40 dark:border-indigo-800/40">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className="gap-1 border-indigo-300 text-indigo-700 bg-white">
                    <CheckSquare className="h-3 w-3" />
                    {selectedIds.length} selected
                  </Badge>
                  <Separator orientation="vertical" className="h-6" />
                  <Button
                    size="sm"
                    onClick={() => bulkUpdateVerificationMutation.mutate({ ids: selectedIds, verified: true })}
                    disabled={bulkUpdateVerificationMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Bulk Verify
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => bulkUpdateVerificationMutation.mutate({ ids: selectedIds, verified: false })}
                    disabled={bulkUpdateVerificationMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Bulk Unverify
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const promises = selectedIds.map(id => markNeedsReviewMutation.mutateAsync(id));
                      Promise.all(promises).then(() => {
                        setSelectedIds([]);
                        toast.success("Marked as needs review");
                      });
                    }}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" /> Mark Needs Review
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedIds([])}
                    className="ml-auto"
                  >
                    Clear selection
                  </Button>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, brand, model..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-8"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => setFilters({ ...filters, verified: '' })}
                        variant={filters.verified === '' ? 'default' : 'outline'}
                      >All</Button>
                    </TooltipTrigger>
                    <TooltipContent>All verification statuses</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => setFilters({ ...filters, verified: 'true' })}
                        variant={filters.verified === 'true' ? 'default' : 'outline'}
                      >Verified</Button>
                    </TooltipTrigger>
                    <TooltipContent>Show verified entries</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => setFilters({ ...filters, verified: 'false' })}
                        variant={filters.verified === 'false' ? 'default' : 'outline'}
                      >Unverified</Button>
                    </TooltipTrigger>
                    <TooltipContent>Show unverified entries</TooltipContent>
                  </Tooltip>
                  <Separator orientation="vertical" className="h-6 mx-1" />
                  <Button
                    size="sm"
                    variant={filters.has_image === 'false' ? 'destructive' : 'outline'}
                    onClick={() => setFilters({ ...filters, has_image: filters.has_image === 'false' ? '' : 'false' })}
                  >
                    <ImageIcon className="h-3.5 w-3.5 mr-1" /> Missing Image
                  </Button>
                  <Button
                    size="sm"
                    variant={filters.has_specs === 'false' ? 'destructive' : 'outline'}
                    onClick={() => setFilters({ ...filters, has_specs: filters.has_specs === 'false' ? '' : 'false' })}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Missing Specs
                  </Button>
                  <Button
                    size="sm"
                    variant={filters.has_price === 'false' ? 'destructive' : 'outline'}
                    onClick={() => setFilters({ ...filters, has_price: filters.has_price === 'false' ? '' : 'false' })}
                  >
                    <span className="text-xs mr-1">₨</span> Missing Price
                  </Button>
                </TooltipProvider>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-md border overflow-hidden">
              <ScrollArea className="max-h-[65vh]">
                <Table>
                  <TableHeader className="bg-muted/40 sticky top-0 backdrop-blur-sm z-[1]">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.length > 0 && selectedIds.length === (products?.data?.length || 0)}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Completeness</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Last Verified</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(products?.data || []).map((product) => {
                      const missing = getMissingIndicators(product);
                      const completeCount = 4 - missing.length;
                      return (
                        <TableRow key={product.id} className={selectedIds.includes(product.id) ? "bg-indigo-50/50 dark:bg-indigo-950/20" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(product.id)}
                              onCheckedChange={() => toggleSelect(product.id)}
                              aria-label={`Select ${product.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-lg border bg-muted overflow-hidden shrink-0">
                                <SafeImage
                                  src={product.image_url}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium leading-tight truncate max-w-[260px]">{product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {product.brand?.name} • {product.model?.name}
                                  {product.variant?.storage && ` • ${[product.variant.ram, product.variant.storage].filter(Boolean).join("/")}`}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant={product.verified ? "default" : "secondary"} className="w-fit">
                                {product.verified ? <CheckCircle className="h-3 w-3 mr-1" /> : null}
                                {product.verified ? "Verified" : "Unverified"}
                              </Badge>
                              {!product.is_active && (
                                <Badge variant="outline" className="w-fit text-muted-foreground">Inactive</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {missing.length > 0 ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {missing.map((item) => (
                                    <Badge key={item} variant="destructive" className="h-5 text-[10px] px-1.5">
                                      Missing {item}
                                    </Badge>
                                  ))}
                                </div>
                                <Progress value={(completeCount / 4) * 100} className="h-1 w-24" />
                              </div>
                            ) : (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                <CheckCircle className="h-3 w-3 mr-1" /> Complete
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {product.price_npr ? (
                              <div className="flex flex-col">
                                <span className="font-semibold tabular-nums">Rs. {product.price_npr.toLocaleString('en-IN')}</span>
                                {product.is_price_list_item && (
                                  <Badge variant="outline" className="w-fit mt-1 text-[10px] bg-amber-50 text-amber-700 border-amber-200">Price List</Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {product.source_url ? (
                              <a
                                href={product.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-600 hover:underline max-w-[140px]"
                              >
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                <span className="truncate">{product.source_site || 'Source'}</span>
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {product.verified_at ? (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(product.verified_at).toLocaleDateString()}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() => updateVerificationMutation.mutate({ id: product.id, verified: !product.verified })}
                                    >
                                      {product.verified ? <Ban className="h-4 w-4 text-rose-500" /> : <Check className="h-4 w-4 text-emerald-600" />}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{product.verified ? "Unverify" : "Verify"}</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() => markNeedsReviewMutation.mutate(product.id)}
                                    >
                                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Mark needs review</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleEdit(product, 'specs')}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit specs (JSON)</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleEdit(product, 'price')}
                                    >
                                      <span className="text-sm font-bold">₨</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit price</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleEdit(product, 'image')}
                                    >
                                      <ImageIcon className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit image URL</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(products?.data?.length || 0) === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Database className="h-10 w-10 opacity-30" />
                            <p className="text-sm">No products match current filters</p>
                            <Button variant="outline" size="sm" onClick={() => setFilters({ verified: '', has_image: '', has_specs: '', has_price: '', search: '' })}>Clear filters</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="duplicates" className="mt-0">
            {loadingDupes ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : duplicateGroups.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed rounded-2xl">
                <Sparkles className="h-12 w-12 mx-auto text-emerald-500/50 mb-4" />
                <h3 className="text-lg font-semibold mb-1">No duplicates found</h3>
                <p className="text-muted-foreground text-sm">Catalog is clean — all products are unique.</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[65vh] pr-2 space-y-4">
              {duplicateGroups.map((group) => (
                <Card key={group.group_key} className="border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Copy className="h-4 w-4 text-amber-500" />
                          {group.group_key.split('|')[0]} — {group.group_key.split('|')[1]}
                          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-100 ml-2">
                            {group.products.length} entries
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          Variant key: {group.group_key.split('|')[2] || '—'}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setMergeConfirmId(group.group_key)}
                        >
                          <Merge className="h-3.5 w-3.5 mr-1" /> Merge into primary
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {group.products.map((p, idx) => (
                        <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border ${idx === 0 ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/20' : 'border-border'}`}>
                          <div className="h-10 w-10 rounded-md bg-muted shrink-0 overflow-hidden border">
                            <SafeImage src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {idx === 0 && <Badge variant="default" className="h-5 text-[10px] px-1.5 bg-emerald-600">PRIMARY</Badge>}
                              <span className="font-medium truncate">{p.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {p.source_site || 'No source'} • {p.price_npr ? `Rs. ${p.price_npr.toLocaleString('en-IN')}` : 'No price'}
                              {p.verified && ' • Verified'}
                            </p>
                          </div>
                          <Badge variant="outline" className="font-mono text-[10px]">{p.id.slice(-6)}</Badge>
                          <div className="flex items-center gap-1 ml-auto">
                            <div className="text-xs tabular-nums text-muted-foreground mr-2">
                              Score: {Math.round(p.match_score * 100)}%
                            </div>
                            {idx !== 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => mergeDuplicatesMutation.mutate({ primaryId: group.products[0].id, duplicateIds: [p.id] })}
                              >
                                <Merge className="h-3.5 w-3.5 mr-1" /> Merge
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>

                  {mergeConfirmId === group.group_key && (
                    <div className="px-6 pb-4">
                      <Separator className="mb-3" />
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div className="text-muted-foreground">
                          Merge {group.products.length - 1} duplicate(s) into "{group.products[0].name}"? Primary retains all data fields.
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setMergeConfirmId(null)}>Cancel</Button>
                          <Button
                            size="sm"
                            onClick={() => mergeDuplicatesMutation.mutate({
                              primaryId: group.products[0].id,
                              duplicateIds: group.products.slice(1).map(p => p.id)
                            })}
                            disabled={mergeDuplicatesMutation.isPending}
                          >
                            {mergeDuplicatesMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                            Confirm Merge
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="audit" className="mt-0">
            {loadingAudit ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : auditLog.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed rounded-2xl">
                <History className="h-12 w-12 mx-auto text-slate-500/30 mb-4" />
                <h3 className="text-lg font-semibold mb-1">No audit history</h3>
                <p className="text-muted-foreground text-sm">Verification activity will appear here.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Detail</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLog.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{entry.product_name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{entry.product_id.slice(-8)}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.action === "Verified" ? "default" : "secondary"} className="gap-1">
                            {entry.action === "Verified" ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{entry.action_detail}</TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(entry.created_at).toLocaleString()}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit {editType.charAt(0).toUpperCase() + editType.slice(1)} — {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editType === 'specs' ? (
              <div>
                <Label>Specifications (JSON)</Label>
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={14}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Try: {JSON.stringify({ display: '6.7"', ram: "8GB", storage: "256GB", camera: "48MP" })}
                </p>
              </div>
            ) : editType === 'price' ? (
              <div className="space-y-3">
                <div>
                  <Label>Price (NPR)</Label>
                  <Input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="e.g. 129999"
                  />
                </div>
                {editValue && !isNaN(parseFloat(editValue)) && (
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">
                    Will display as: Rs. {parseFloat(editValue).toLocaleString('en-IN')}
                  </Badge>
                )}
              </div>
            ) : editType === 'image' ? (
              <div>
                <Label>Image URL</Label>
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                />
                <div className="mt-3 h-40 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                  {editValue ? (
                    <SafeImage src={editValue} alt="Preview" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-muted-foreground text-sm">Enter URL to preview</span>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={
              updateSpecsMutation.isPending ||
              updatePriceMutation.isPending ||
              updateImageMutation.isPending
            }>
              {(updateSpecsMutation.isPending ||
               updatePriceMutation.isPending ||
               updateImageMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
