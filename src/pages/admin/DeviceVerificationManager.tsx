import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Search, Filter, CheckCircle, XCircle, AlertTriangle, Eye, EyeOff,
  Edit, Merge, ExternalLink, Calendar, Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { deviceVerificationService, VerificationProduct } from "@/services/deviceVerificationService";

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

  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery<{ data: VerificationProduct[] }>({
    queryKey: ["device-verification", filters],
    queryFn: () => deviceVerificationService.getProductsForVerification({
      verified: filters.verified === 'true' ? true : filters.verified === 'false' ? false : undefined,
      has_image: filters.has_image === 'true' ? true : filters.has_image === 'false' ? false : undefined,
      has_specs: filters.has_specs === 'true' ? true : filters.has_specs === 'false' ? false : undefined,
      has_price: filters.has_price === 'true' ? true : filters.has_price === 'false' ? false : undefined,
      search: filters.search || undefined,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ["verification-stats"],
    queryFn: () => deviceVerificationService.getVerificationStats(),
  });

  const updateVerificationMutation = useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) =>
      deviceVerificationService.updateVerification(id, verified),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-verification"] });
      queryClient.invalidateQueries({ queryKey: ["verification-stats"] });
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

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.verified || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unverified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.unverified || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.needs_review || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Device Verification Manager</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <Input
              placeholder="Search by name..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="max-w-sm"
            />
            <Button
              onClick={() => setFilters({ ...filters, verified: '' })}
              variant="outline"
            >
              All Verification
            </Button>
            <Button
              onClick={() => setFilters({ ...filters, verified: 'true' })}
              variant={filters.verified === 'true' ? "default" : "outline"}
            >
              Verified
            </Button>
            <Button
              onClick={() => setFilters({ ...filters, verified: 'false' })}
              variant={filters.verified === 'false' ? "default" : "outline"}
            >
              Unverified
            </Button>
            <Button
              onClick={() => setFilters({ ...filters, has_image: 'false' })}
              variant={filters.has_image === 'false' ? "default" : "outline"}
            >
              Missing Image
            </Button>
            <Button
              onClick={() => setFilters({ ...filters, has_specs: 'false' })}
              variant={filters.has_specs === 'false' ? "default" : "outline"}
            >
              Missing Specs
            </Button>
            <Button
              onClick={() => setFilters({ ...filters, has_price: 'false' })}
              variant={filters.has_price === 'false' ? "default" : "outline"}
            >
              Missing Price
            </Button>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Missing</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Last Verified</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.data?.map((product) => {
                const missing = getMissingIndicators(product);
                return (
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
                          <p className="text-sm text-muted-foreground">
                            {product.brand?.name} • {product.model?.name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
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
                      {missing.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {missing.map((item) => (
                            <Badge key={item} variant="destructive" size="xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="outline">Complete</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.source_url ? (
                        <a
                          href={product.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {product.source_site || 'Source'}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.verified_at ? (
                        <span className="text-sm">
                          {new Date(product.verified_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateVerificationMutation.mutate({ id: product.id, verified: !product.verified })}
                        >
                          {product.verified ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markNeedsReviewMutation.mutate(product.id)}
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(product, 'specs')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(product, 'price')}
                        >
                          <span className="text-xs">₹</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(product, 'image')}
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit {editType.charAt(0).toUpperCase() + editType.slice(1)} - {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editType === 'specs' ? (
              <div>
                <Label>Specifications (JSON)</Label>
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
            ) : editType === 'price' ? (
              <div>
                <Label>Price (NPR)</Label>
                <Input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter price in NPR"
                />
              </div>
            ) : editType === 'image' ? (
              <div>
                <Label>Image URL</Label>
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter image URL"
                />
                {editValue && (
                  <div className="mt-2">
                    <img
                      src={editValue}
                      alt="Preview"
                      className="max-w-full h-32 object-contain border rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
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
              {updateSpecsMutation.isPending ||
               updatePriceMutation.isPending ||
               updateImageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>Save</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}