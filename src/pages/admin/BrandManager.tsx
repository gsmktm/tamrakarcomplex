import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2, Pencil, Save, X, Trash2, Plus, CheckCircle, XCircle } from "lucide-react";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";
import { toast } from "sonner";
import { brandService, Brand } from "@/services/brandService";

export default function BrandManager() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Brand>>({});
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [filters, setFilters] = useState<{ active?: boolean; search?: string }>({});

  const queryClient = useQueryClient();

  const { data: brands, isLoading, error: brandsError } = useQuery({
    queryKey: ["brands", filters],
    queryFn: async () => {
      try {
        return await brandService.getBrands(filters);
      } catch (err) {
        handleSupabaseError(err, "BrandManager: Failed to fetch brands");
        return [];
      }
    },
    retry: 1,
  });

  const createBrandMutation = useMutation({
    mutationFn: (brand: Omit<Brand, "id" | "created_at" | "updated_at">) =>
      brandService.createBrand(brand),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand created successfully");
      setShowEditDialog(false);
      setEditingId(null);
      setEditData({});
    },
    onError: (error) => {
      toast.error("Failed to create brand: " + error.message);
    },
  });

  const updateBrandMutation = useMutation({
    mutationFn: ({ id, brand }: { id: string; brand: Partial<Brand> }) =>
      brandService.updateBrand(id, brand),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand updated successfully");
      setShowEditDialog(false);
      setEditingId(null);
      setEditData({});
    },
    onError: (error) => {
      toast.error("Failed to update brand: " + error.message);
    },
  });

  const deleteBrandMutation = useMutation({
    mutationFn: (id: string) => brandService.deleteBrand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete brand: " + error.message);
    },
  });

  const handleEdit = (brand: Brand) => {
    setEditData(brand);
    setEditingId(brand.id);
    setShowEditDialog(true);
  };

  const handleSave = () => {
    if (editingId) {
      updateBrandMutation.mutate({ id: editingId, brand: editData });
    } else {
      createBrandMutation.mutate(editData as Omit<Brand, "id" | "created_at" | "updated_at">);
    }
  };

  const handleCancel = () => {
    setShowEditDialog(false);
    setEditingId(null);
    setEditData({});
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Brand Manager</CardTitle>
            <Button variant="outline" onClick={() => {
              setEditingId(null);
              setEditData({});
              setShowEditDialog(true);
            }}>
              <Plus className="h-4 w-4" /> Add Brand
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Search brand name..."
              value={filters.search ?? ""}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="max-w-sm"
            />
            <Button
              onClick={() => setFilters({ ...filters, active: undefined })}
              variant="outline"
            >
              All Status
            </Button>
            <Button
              onClick={() => setFilters({ ...filters, active: true })}
              variant={filters.active === true ? "default" : "outline"}
            >
              Active
            </Button>
            <Button
              onClick={() => setFilters({ ...filters, active: false })}
              variant={filters.active === false ? "default" : "outline"}
            >
              Inactive
            </Button>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Logo</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Aliases</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands?.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell>{brand.name}</TableCell>
                  <TableCell>
                    {brand.logo_url ? (
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="h-8 w-8 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          if (target.parentElement) {
                            target.parentElement.innerHTML = `<span>${brand.name.slice(0, 1).toUpperCase()}</span>`;
                          }
                        }}
                      />
                    ) : (
                      <div className="h-8 w-8 flex items-center justify-center bg-secondary/50 text-muted-foreground">
                        {brand.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{brand.slug}</TableCell>
                  <TableCell>
                    {brand.aliases?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {brand.aliases.map((alias) => (
                          <Badge key={alias} variant="outline" size="xs">
                            {alias}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={brand.active ? "default" : "secondary"}>
                      {brand.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{brand.sort_order}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {editingId === brand.id ? (
                        <>
                          <Button size="sm" onClick={handleSave} disabled={updateBrandMutation.isPending}>
                            {updateBrandMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(brand)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => {
                            if (window.confirm(`Delete brand "${brand.name}"?`)) {
                              deleteBrandMutation.mutate(brand.id);
                            }
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Brand Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Brand" : "Add Brand"}</DialogTitle>
          </DialogHeader>
          <DialogContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Brand Name</Label>
                <Input
                  id="name"
                  value={editData.name ?? ""}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={editData.slug ?? ""}
                  onChange={(e) => setEditData({ ...editData, slug: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="logo_url">Logo URL</Label>
                <Input
                  id="logo_url"
                  value={editData.logo_url ?? ""}
                  onChange={(e) => setEditData({ ...editData, logo_url: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="aliases">Aliases (comma-separated)</Label>
                <Input
                  id="aliases"
                  value={editData.aliases ? editData.aliases.join(", ") : ""}
                  onChange={(e) => {
                    const aliases = e.target.value
                      .split(",")
                      .map((a) => a.trim())
                      .filter((a) => a.length > 0);
                    setEditData({ ...editData, aliases });
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Example: OPPO, Oppo, oppo
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="active"
                  checked={editData.active ?? false}
                  onCheckedChange={(checked) => setEditData({ ...editData, active: checked })}
                />
                <Label htmlFor="active">Active</Label>
              </div>
              <div>
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={editData.sort_order ?? 0}
                  onChange={(e) => setEditData({ ...editData, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createBrandMutation.isPending || updateBrandMutation.isPending}>
              {createBrandMutation.isPending || updateBrandMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}