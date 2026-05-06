import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2, Pencil, Save, X, Search, Filter, Upload, Download, CheckCircle, XCircle,
  Eye, EyeOff, Link, Calendar, AlertTriangle, Merge, BarChart3, Database
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PRODUCTS } from "@/utils/productData";
import { gsmArenaService, GsmArenaProduct } from "@/services/gsmArenaService";
import { evostoreService, EvostoreProduct } from "@/services/evostoreService";

interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  brand: { name: string; logo_url?: string };
  model: { name: string };
  variant: { storage?: string; ram?: string; color?: string };
  image_url?: string;
  specs_json: Record<string, unknown>;
  price_npr?: number;
  price_text?: string;
  source_url?: string;
  source_site?: string;
  verified: boolean;
  verified_at?: string;
  is_active: boolean;
  created_at: string;
}

export default function PriceListManager() {
  const { role } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<CatalogProduct>>({});
  const [filters, setFilters] = useState({
    brand: 'all',
    category: 'all',
    verified: 'all',
    active: 'all',
    search: ''
  });
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showAutoImportDialog, setShowAutoImportDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [csvContent, setCsvContent] = useState("");

  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["price-list-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_catalog_verification_stats");
      if (error) throw error;
      return data as {
        total_products: number;
        verified_products: number;
        pending_verification: number;
        total_brands: number;
        total_models: number;
      };
    }
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["price-list", filters],
    queryFn: async () => {
      let query = supabase
        .from("catalog_products")
        .select(`
          id, name, slug, image_url, specs_json, price_npr, price_text,
          source_url, source_site, verified, verified_at, is_active, created_at,
          brand:brands(name, logo_url),
          model:device_models(name),
          variant:device_variants(storage, ram, color)
        `)
        .order("created_at", { ascending: false });

      if (filters.brand !== 'all') {
        query = query.eq("brand_id", filters.brand);
      }
      if (filters.verified !== 'all') {
        query = query.eq("verified", filters.verified === 'true');
      }
      if (filters.active !== 'all') {
        query = query.eq("is_active", filters.active === 'true');
      }
      if (filters.search) {
        query = query.ilike("name", `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CatalogProduct[];
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CatalogProduct> }) => {
      const { error } = await supabase
        .from("catalog_products")
        .update({
          ...updates,
          verified_at: updates.verified ? new Date().toISOString() : null
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-list"] });
      queryClient.invalidateQueries({ queryKey: ["price-list-stats"] });
      toast.success("Product updated successfully");
      setShowEditDialog(false);
      setEditingId(null);
    },
    onError: (error) => {
      toast.error("Failed to update product: " + error.message);
    },
  });

  const handleEdit = (product: CatalogProduct) => {
    setEditData(product);
    setEditingId(product.id);
    setShowEditDialog(true);
  };

  const handleSave = () => {
    if (editingId && editData) {
      // Generate price_text from price_npr
      const updates = {
        ...editData,
        price_text: editData.price_npr ? `Rs. ${editData.price_npr.toLocaleString('en-IN')}` : editData.price_text
      };
      updateProductMutation.mutate({ id: editingId, updates });
    }
  };

  const importCsvMutation = useMutation({
    mutationFn: async (data: any[]) => {
      const { error } = await supabase
        .from("catalog_products")
        .upsert(data, { onConflict: 'slug' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-list"] });
      toast.success("CSV data imported successfully");
      setShowImportDialog(false);
      setCsvContent("");
    },
    onError: (error) => {
      toast.error("Failed to import CSV: " + error.message);
    },
  });

  const handleCsvImport = () => {
    try {
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) throw new Error("Invalid CSV format: Header and at least one data row required.");

      const headers = lines[0].split(',').map(h => h.trim());
      
      // Basic validation of required headers
      const required = ['name', 'slug', 'brand_id', 'model_id'];
      const missing = required.filter(h => !headers.includes(h));
      if (missing.length > 0) {
        throw new Error(`Missing required headers: ${missing.join(', ')}`);
      }

      const data = lines.slice(1).map((line, lineIdx) => {
        // Simple comma split (doesn't handle quoted commas)
        const values = line.split(',').map(v => v.trim());
        if (values.length !== headers.length) {
          throw new Error(`Row ${lineIdx + 2} has ${values.length} columns, but header has ${headers.length}`);
        }
        
        const obj: Record<string, string | number | boolean | null> = {};
        headers.forEach((header, index) => {
          obj[header] = values[index];
        });

        // Data type conversions
        if (obj.price_npr) {
          const price = parseFloat(obj.price_npr as string);
          if (isNaN(price)) {
            throw new Error(`Row ${lineIdx + 2}: Invalid price_npr "${obj.price_npr}"`);
          }
          obj.price_npr = price;
          obj.price_text = `Rs. ${price.toLocaleString('en-IN')}`;
        }
        
        if (obj.verified !== undefined) {
          obj.verified = obj.verified === 'true' || obj.verified === '1' || obj.verified === 'yes';
          if (obj.verified) {
            obj.verified_at = new Date().toISOString();
          }
        }
        
        if (obj.is_active !== undefined) {
          obj.is_active = obj.is_active === 'true' || obj.is_active === '1' || obj.is_active === 'yes';
        }
        
        return obj;
      });

      importCsvMutation.mutate(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error("CSV Import Error", { description: message });
    }
  };

  const importExternalMutation = useMutation({
    mutationFn: async (source: 'gsmarena' | 'evostore') => {
      setIsImporting(true);
      try {
        let externalData: any[] = [];
        const { data: existingBrands } = await supabase.from("brands").select("id, name");
        const brandMap = new Map(existingBrands?.map(b => [b.name.toLowerCase(), b.id]) || []);

        if (source === 'gsmarena') {
          const phones = await gsmArenaService.generateBulkData(20); // Small batch for demo
          externalData = phones.map(p => ({
            name: p.name,
            slug: p.slug,
            brand_id: brandMap.get(p.brand.toLowerCase()),
            price_npr: p.price_npr,
            price_text: `Rs. ${p.price_npr.toLocaleString('en-IN')}`,
            image_url: p.image,
            specs_json: p.specs,
            source_site: "gsmarena.com",
            source_url: `https://www.gsmarena.com/${p.slug}`,
            verified: false, // Must be verified by admin
            is_active: true,
            is_price_list_item: true
          }));
        } else {
          const phones = await evostoreService.getAllProducts();
          const processed = await evostoreService.importProducts(phones);
          externalData = processed.map(p => ({
            name: p.name,
            slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            brand_id: brandMap.get(p.brand.toLowerCase()),
            price_npr: p.price_value,
            price_text: p.price,
            image_url: p.image,
            specs_json: p.specs,
            source_site: "evostore.com.np",
            source_url: p.url,
            verified: false, // Must be verified by admin
            is_active: true,
            is_price_list_item: true
          }));
        }

        const { error } = await supabase
          .from("catalog_products")
          .upsert(externalData, { onConflict: 'slug' });

        if (error) throw error;
        return externalData.length;
      } finally {
        setIsImporting(false);
      }
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["price-list"] });
      queryClient.invalidateQueries({ queryKey: ["price-list-stats"] });
      toast.success(`Successfully imported ${count} items. They are marked as unverified.`);
      setShowAutoImportDialog(false);
    },
    onError: (error) => {
      toast.error("Import failed: " + error.message);
    }
  });

  const mergeDuplicatesMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("auto_merge_catalog_duplicates");
      if (error) throw error;
      return data as { merged_count: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["price-list"] });
      queryClient.invalidateQueries({ queryKey: ["price-list-stats"] });
      toast.success(`Merged ${data?.merged_count || 0} duplicates`);
      setShowMergeDialog(false);
    },
    onError: (error) => {
      toast.error("Failed to merge duplicates: " + error.message);
    },
  });

  const seedMarketDataMutation = useMutation({
    mutationFn: async () => {
      // 1. Get existing brands to map names to IDs
      const { data: existingBrands } = await supabase.from("brands").select("id, name");
      const brandMap = new Map(existingBrands?.map(b => [b.name.toLowerCase(), b.id]) || []);

      // 2. Prepare data
      const dataToInsert = PRODUCTS.map(device => {
        const brandId = brandMap.get(device.brand.toLowerCase());
        const slug = `${device.brand.toLowerCase()}-${device.model.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        
        return {
          name: `${device.brand} ${device.model}`,
          slug: slug,
          brand_id: brandId,
          price_npr: device.retail_npr,
          price_text: `Rs. ${device.retail_npr?.toLocaleString('en-IN')}`,
          image_url: device.image,
          is_active: true,
          verified: true,
          verified_at: new Date().toISOString(),
          is_price_list_item: true,
          source_site: "Tamrakar Market Update",
          specs_json: {}
        };
      });

      // 3. Upsert into catalog_products
      const { error } = await supabase
        .from("catalog_products")
        .upsert(dataToInsert, { onConflict: 'slug' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-list"] });
      queryClient.invalidateQueries({ queryKey: ["price-list-stats"] });
      toast.success("Market data seeded successfully from local catalog");
    },
    onError: (error) => {
      toast.error("Failed to seed market data: " + error.message);
    }
  });

  const toggleVerified = (product: CatalogProduct) => {
    updateProductMutation.mutate({
      id: product.id,
      updates: { verified: !product.verified }
    });
  };

  const toggleActive = (product: CatalogProduct) => {
    updateProductMutation.mutate({
      id: product.id,
      updates: { is_active: !product.is_active }
    });
  };

  const { data: brands } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                {stats.total_products}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {stats.verified_products}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {stats.pending_verification}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Brands</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.total_brands}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Models</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.total_models}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Price List Manager</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => seedMarketDataMutation.mutate()}
              disabled={seedMarketDataMutation.isPending}
            >
              {seedMarketDataMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              Seed Market Data
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAutoImportDialog(true)}>
              <Search className="mr-2 h-4 w-4" />
              Auto-Import
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowMergeDialog(true)}>
              <Merge className="mr-2 h-4 w-4" />
              Merge Duplicates
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Search by name..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="max-w-sm"
            />
            <Select value={filters.brand} onValueChange={(value) => setFilters({ ...filters, brand: value })}>
              <SelectTrigger className="max-w-[200px]">
                <SelectValue placeholder="Filter by brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands?.map((brand: { id: string; name: string }) => (
                  <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.verified} onValueChange={(value) => setFilters({ ...filters, verified: value })}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Verification status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Verification</SelectItem>
                <SelectItem value="true">Verified</SelectItem>
                <SelectItem value="false">Unverified</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.active} onValueChange={(value) => setFilters({ ...filters, active: value })}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Active status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((product: any) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={product.image_url || "/placeholder.svg"}
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.model?.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{product.brand?.name}</TableCell>
                  <TableCell>{product.price_text || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Badge variant={product.verified ? "default" : "secondary"}>
                        {product.verified ? "Verified" : "Unverified"}
                      </Badge>
                      <Badge variant={product.is_active ? "default" : "outline"}>
                        {product.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleVerified(product)}>
                        {product.verified ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleActive(product)}>
                        {product.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editData.name || ''}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="price">Price (NPR)</Label>
              <Input
                id="price"
                type="number"
                value={editData.price_npr || ''}
                onChange={(e) => setEditData({ ...editData, price_npr: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="image">Image URL</Label>
              <Input
                id="image"
                value={editData.image_url || ''}
                onChange={(e) => setEditData({ ...editData, image_url: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="specs">Specs (JSON)</Label>
              <Textarea
                id="specs"
                value={JSON.stringify(editData.specs_json, null, 2) || ''}
                onChange={(e) => setEditData({ ...editData, specs_json: JSON.parse(e.target.value) })}
                rows={6}
              />
            </div>
            <div>
              <Label htmlFor="source_url">Source URL</Label>
              <Input
                id="source_url"
                value={editData.source_url || ''}
                onChange={(e) => setEditData({ ...editData, source_url: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="source_site">Source Site</Label>
              <Input
                id="source_site"
                value={editData.source_site || ''}
                onChange={(e) => setEditData({ ...editData, source_site: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateProductMutation.isPending}>
              {updateProductMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Import CSV Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Catalog CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Format: name, slug, brand_id, model_id, price_npr, source_url, verified, is_active</p>
              <p>Example: iPhone 15 Pro, iphone-15-pro, brand-uuid, model-uuid, 150000, site.com/p, true, true</p>
            </div>
            <Textarea
              placeholder="Paste CSV content here..."
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              rows={10}
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCsvImport} disabled={importCsvMutation.isPending}>
              {importCsvMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Import Dialog */}
      <Dialog open={showAutoImportDialog} onOpenChange={setShowAutoImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>External Market Data Import</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pull the latest device specifications and market prices from external sources.
              All imported items will be marked as <strong>unverified</strong> and will require
              manual approval before appearing in the public catalog.
            </p>
            
            <div className="grid grid-cols-1 gap-4">
              <Card 
                className="p-4 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => importExternalMutation.mutate('gsmarena')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Database className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold">GSMArena Import</h4>
                      <p className="text-xs text-muted-foreground">Global specifications and global release pricing.</p>
                    </div>
                  </div>
                  {isImporting && importExternalMutation.variables === 'gsmarena' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </Card>

              <Card 
                className="p-4 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => importExternalMutation.mutate('evostore')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Link className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold">EvoStore Nepal</h4>
                      <p className="text-xs text-muted-foreground">Local Nepal retail pricing and availability.</p>
                    </div>
                  </div>
                  {isImporting && importExternalMutation.variables === 'evostore' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </Card>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAutoImportDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Duplicates Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Duplicate Products</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              This will run the <code>merge_catalog_products</code> RPC function to identify and merge
              duplicate entries based on name, brand, and model.
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    This action is irreversible. It will combine variants and keep the most complete entry.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => mergeDuplicatesMutation.mutate()}
              disabled={mergeDuplicatesMutation.isPending}
            >
              {mergeDuplicatesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Run Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}