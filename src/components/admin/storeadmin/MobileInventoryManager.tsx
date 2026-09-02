import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { masterCatalogService, MasterModel, MasterVariant } from "@/services/masterCatalogService";
import { inventoryService, InventoryItem } from "@/services/inventoryService";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Search, Trash2, Edit, Save, Smartphone, Hash, Banknote, Package, Info } from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";

export default function MobileInventoryManager({ storeId }: { storeId: string }) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<MasterModel | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<MasterVariant | null>(null);
  const [price, setPrice] = useState<string>("");
  const [stock, setStock] = useState<string>("1");
  const [condition, setCondition] = useState<string>("new");
  const [batteryHealth, setBatteryHealth] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [editingItem, setEditingItem] = useState<any>(null);

  const queryClient = useQueryClient();

  // 1. Fetch current inventory
  const { data: inventory, isLoading: loadingInventory } = useQuery({
    queryKey: ['store-inventory', storeId],
    queryFn: () => inventoryService.getStoreInventory(storeId)
  });

  // 2. Search master models
  const { data: searchResults, isLoading: searchingModels } = useQuery({
    queryKey: ['master-search', debouncedSearch],
    queryFn: () => masterCatalogService.searchModels(debouncedSearch),
    enabled: debouncedSearch.length > 1
  });

  // 3. Fetch variants for selected model
  const { data: variants, isLoading: loadingVariants } = useQuery({
    queryKey: ['model-variants', selectedModel?.id],
    queryFn: () => masterCatalogService.getModelVariants(selectedModel!.id),
    enabled: !!selectedModel
  });

  const addMutation = useMutation({
    mutationFn: (item: InventoryItem) => inventoryService.addToInventory(item),
    onSuccess: () => {
      toast.success("Added to inventory");
      setIsAddOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['store-inventory', storeId] });
    },
    onError: (e) => toast.error("Failed to add: " + (e as Error).message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: Partial<InventoryItem> }) => 
      inventoryService.updateInventoryItem(id, updates),
    onSuccess: () => {
      toast.success("Inventory updated");
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ['store-inventory', storeId] });
    },
    onError: (e) => toast.error("Update failed: " + (e as Error).message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supabase.from('store_products').delete().eq('id', id),
    onSuccess: () => {
      toast.success("Item removed");
      queryClient.invalidateQueries({ queryKey: ['store-inventory', storeId] });
    }
  });

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setPrice(item.price.toString());
    setStock(item.stock_quantity.toString());
    setCondition(item.condition);
  };

  const handleUpdate = () => {
    if (!editingItem || !price) return;
    updateMutation.mutate({
      id: editingItem.id,
      updates: {
        price: parseInt(price),
        stock_quantity: parseInt(stock),
        condition
      }
    });
  };

  const resetForm = () => {
    setSelectedModel(null);
    setSelectedVariant(null);
    setPrice("");
    setStock("1");
    setCondition("new");
    setBatteryHealth("");
    setDescription("");
    setSearch("");
  };

  const handleAdd = async () => {
    if (!selectedModel || !selectedVariant || !price) {
      toast.error("Please fill all fields");
      return;
    }

    addMutation.mutate({
      model_id: selectedModel.id,
      variant_id: selectedVariant.id,
      store_id: storeId,
      title: selectedModel.name,
      brand_id: selectedModel.brand_id,
      brand: selectedModel.brand?.name,
      model: selectedModel.name,
      storage: selectedVariant.storage ?? undefined,
      color: selectedVariant.color ?? undefined,
      price: parseInt(price),
      stock_quantity: condition === "used" ? 1 : parseInt(stock),
      condition,
      warranty: condition === "used" ? `Battery: ${batteryHealth}%, ${description}` : undefined,
      status: 'active'
    } as InventoryItem);
    
    setIsAddOpen(false);
    resetForm();
    queryClient.invalidateQueries({ queryKey: ['store-inventory', storeId] });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Mobile Inventory</h2>
          <p className="text-muted-foreground text-sm">Manage your phone stock and pricing from the master catalog.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gap-2">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Product from Master Catalog</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {!selectedModel ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search Model (e.g. iPhone 15 Pro)..." 
                      className="pl-10"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                    {searchingModels ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : searchResults?.map(model => (
                      <button
                        key={model.id}
                        onClick={() => setSelectedModel(model)}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-all text-left"
                      >
                        <div className="h-10 w-10 bg-muted rounded flex items-center justify-center overflow-hidden">
                          {model.image ? <img src={model.image} className="h-full w-full object-contain" /> : <Smartphone className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{model.name}</p>
                          <p className="text-xs text-muted-foreground">{model.brand?.name} · {model.release_year}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-background rounded border border-border flex items-center justify-center overflow-hidden">
                        {selectedModel.image ? <img src={selectedModel.image} className="h-full w-full object-contain" /> : <Smartphone className="h-5 w-5 text-primary" />}
                      </div>
                      <div>
                        <p className="font-bold">{selectedModel.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedModel.brand?.name}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedModel(null)}>Change</Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Select Variant</Label>
                        <div className="grid gap-2 max-h-[200px] overflow-y-auto p-1">
                          {loadingVariants ? <Loader2 className="h-4 w-4 animate-spin" /> : variants?.map(v => (
                            <button
                              key={v.id}
                              onClick={() => setSelectedVariant(v)}
                              className={`p-2 text-xs border rounded-md text-left transition-all ${selectedVariant?.id === v.id ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' : 'hover:border-primary/50'}`}
                            >
                              <div className="font-bold">{v.ram || 'N/A'} RAM / {v.storage || 'N/A'} Storage</div>
                              <div className="text-muted-foreground">{v.color || 'N/A'} Color</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Condition</Label>
                        <select 
                          className="w-full h-10 px-3 rounded-md border border-input bg-background font-medium"
                          value={condition}
                          onChange={(e) => setCondition(e.target.value)}
                        >
                          <option value="new">Brand New (Sealed)</option>
                          <option value="open_box">Open Box</option>
                          <option value="refurbished">Refurbished</option>
                          <option value="used">Used / Second Hand</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{condition === 'used' ? 'Asking Price (NPR)' : 'Selling Price (NPR)'}</Label>
                        <div className="relative">
                          <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="number" placeholder="0.00" className="pl-10 font-bold" value={price} onChange={(e) => setPrice(e.target.value)} />
                        </div>
                      </div>
                      
                      {condition !== 'used' ? (
                        <div className="space-y-2">
                          <Label>Stock Quantity</Label>
                          <div className="relative">
                            <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="number" placeholder="1" className="pl-10" value={stock} onChange={(e) => setStock(e.target.value)} />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label>Battery Health (%)</Label>
                            <Input type="number" placeholder="e.g. 95" value={batteryHealth} onChange={(e) => setBatteryHealth(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>Notes / Condition Details</Label>
                            <Textarea placeholder="e.g. No scratches, box available..." value={description} onChange={(e) => setDescription(e.target.value)} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button disabled={!selectedVariant || !price || addMutation.isPending} onClick={handleAdd}>
                {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to Store Products"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="font-bold">Product</TableHead>
              <TableHead className="font-bold">Variant</TableHead>
              <TableHead className="font-bold">Price</TableHead>
              <TableHead className="font-bold">Stock</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="text-right font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingInventory ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></TableCell></TableRow>
            ) : inventory?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">No products in inventory. Click "Add Product" to start.</TableCell></TableRow>
            ) : inventory?.map((item: any) => (
              <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-background rounded border border-border flex items-center justify-center overflow-hidden">
                      {Array.isArray(item.images) && item.images[0] ? <img src={item.images[0]} className="h-full w-full object-contain" /> : <Smartphone className="h-5 w-5 text-slate-300" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm leading-tight">{item.title || item.model || item.model_id}</p>
                      <Badge variant="secondary" className="text-[10px] h-4 mt-1 bg-slate-100 text-muted-foreground uppercase">
                        {item.condition}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  <div className="font-medium">{item.storage || item.variant || item.variant_id}</div>
                  <div className="text-muted-foreground">{item.color}</div>
                </TableCell>
                <TableCell className="font-bold text-primary">Rs. {item.price.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={item.stock_quantity > 0 ? "outline" : "destructive"} className="font-mono">
                    {item.stock_quantity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${item.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span className="text-xs font-medium capitalize">{item.status}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => handleEdit(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:text-red-500"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if(confirm("Are you sure you want to remove this item?")) deleteMutation.mutate(item.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="h-10 w-10 bg-background rounded border border-border flex items-center justify-center overflow-hidden">
                  {Array.isArray(editingItem.images) && editingItem.images[0] ? <img src={editingItem.images[0]} className="h-full w-full object-contain" /> : <Smartphone className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-bold text-sm">{editingItem.title || editingItem.model || editingItem.model_id}</p>
                  <p className="text-xs text-muted-foreground">{editingItem.storage || editingItem.variant || editingItem.variant_id}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Selling Price (NPR)</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Stock Quantity</Label>
                <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <select 
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option value="new">Brand New (Sealed)</option>
                  <option value="open_box">Open Box</option>
                  <option value="refurbished">Refurbished</option>
                  <option value="used">Used</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
            <Button disabled={updateMutation.isPending} onClick={handleUpdate}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
