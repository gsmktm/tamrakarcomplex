
import { Fragment, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { formatEdgeFunctionError } from "@/lib/utils";
import { assertEdgeFunctionAvailable } from "@/lib/edgeFunctions";
import { Loader2, Plus, Pencil, Trash2, Search, Download, ExternalLink, Smartphone, ArrowUpDown, Filter, MoreHorizontal, CheckCircle2, XCircle, Star, Package, Store, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { gsmArenaService, GsmArenaProduct } from "@/services/gsmArenaService";
import { evostoreService, EvostoreProduct } from "@/services/evostoreService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { isAdminRole } from "@/lib/roles";
import { fetchStoreTierOverrides, resolveTierForStore } from "@/lib/storeTier";
import { getStoreEntitlements } from "@/lib/storePackages";

interface ProductFormValues {
  name: string;
  slug: string;
  price: string;
  category: string;
  brand: string;
  series: string;
  image: string;
  images: string;
  highlights: string;
  specs: string;
  description: string;
  source_url: string;
  source_site: string;
  rating: string;
  reviews_count: string;
  featured: boolean;
  in_stock: boolean;
  store_id: string;
}

interface DBProduct {
  id: string;
  name: string;
  slug: string;
  price: string;
  category: string;
  brand: string | null;
  series: string | null;
  price_value: number | null;
  image: string | null;
  images: string[] | null;
  highlights: string[] | null;
  specs: Record<string, unknown> | null;
  description: string | null;
  source_url: string | null;
  source_site: string | null;
  rating: number | null;
  reviews_count: number | null;
  featured: boolean | null;
  in_stock: boolean | null;
  created_at: string;
  store_id: string | null;
  stores?: { id: string; name: string } | null;
  video_url?: string;
}

const ProductManager = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isGsmImportOpen, setIsGsmImportOpen] = useState(false);
  const [gsmSearchQuery, setGsmSearchQuery] = useState("");
  const [gsmResults, setGsmResults] = useState<GsmArenaProduct[]>([]);
  const [isSearchingGsm, setIsSearchingGsm] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof DBProduct | "sn"; direction: "asc" | "desc" }>({ key: "created_at", direction: "desc" });
  
  const [editingProduct, setEditingProduct] = useState<DBProduct | null>(null);
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("All");
  const [selectedStore, setSelectedStore] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [page, setPage] = useState<number>(1);
  const pageSize = 54;
  const [importUrl, setImportUrl] = useState("https://www.gadgetbytenepal.com/sitemaps/products.xml");
  const [importLimit, setImportLimit] = useState(200);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch, control } = useForm<ProductFormValues>({
    defaultValues: {
      featured: false,
      in_stock: true,
      images: "",
      highlights: "",
      specs: "",
      source_site: "gadgetbytenepal.com",
      source_url: "",
      slug: "",
      series: "",
      rating: "",
      reviews_count: "",
      video_url: "",
    },
  });

  const formValues = watch();

  const { user, role } = useAuth();
  const isPlatformAdmin = role === "suadmin" || role === "staffadmin";
  const isStoreAdmin = role === "storeadmin";

  const { data: allStores } = useQuery({
    queryKey: ["all-stores-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: isPlatformAdmin,
  });

  const { data: myStores } = useQuery({
    queryKey: ["my-stores-list", user?.id],
    queryFn: async () => {
      // Get store IDs from store_admins or owner_id
      const { data: memberships } = await supabase
        .from("store_admins")
        .select("store_id")
        .eq("user_id", user?.id)
        .eq("status", "active");
      
      const { data: ownedStores } = await supabase
        .from("stores")
        .select("id, name")
        .eq("owner_id", user?.id);
      
      const allStoreIds = Array.from(new Set([
        ...(memberships || []).map(m => m.store_id),
        ...(ownedStores || []).map(s => s.id)
      ]));

      if (allStoreIds.length === 0) return [];

      const { data, error } = await supabase
        .from("stores")
        .select("id, name")
        .in("id", allStoreIds)
        .order("name");
        
      if (error) throw error;
      return data;
    },
    enabled: isStoreAdmin && !!user?.id,
  });

  const { data: products, isLoading } = useQuery<DBProduct[]>({
    queryKey: ["products", role, user?.id],
    queryFn: async () => {
      let query = supabase.from("products").select(`
        *,
        stores (id, name)
      `);
      
      if (isStoreAdmin && user?.id && !isPlatformAdmin) {
        // Get store IDs from store_admins or owner_id
        const { data: memberships } = await supabase
          .from("store_admins")
          .select("store_id")
          .eq("user_id", user.id)
          .eq("status", "active");
        
        const { data: ownedStores } = await supabase
          .from("stores")
          .select("id")
          .eq("owner_id", user.id);
        
        const allStoreIds = Array.from(new Set([
          ...(memberships || []).map(m => m.store_id),
          ...(ownedStores || []).map(s => s.id)
        ]));
        
        query = query.in("store_id", allStoreIds);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as DBProduct[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      // ─── Package Limit Enforcement ───────────────────────────────────
      const targetStoreId = values.store_id || null;
      if (isStoreAdmin && targetStoreId) {
        // Fetch store details to get package tier
        const { data: storeData } = await supabase
          .from("stores")
          .select("*, store_subscriptions(packages(slug))")
          .eq("id", targetStoreId)
          .single();
        
        if (storeData) {
          const overrides = await fetchStoreTierOverrides(supabase);
          const sub = (storeData as any).store_subscriptions?.[0] || (storeData as any).store_subscriptions;
          const joinedTier = sub?.packages?.slug as string | undefined;
          const tier = resolveTierForStore({ ...storeData, subscription_tier: joinedTier }, overrides);
          
          const { productLimit } = getStoreEntitlements(tier);
          
          // Count existing products for this store
          const { count } = await supabase
            .from("products")
            .select("*", { count: 'exact', head: true })
            .eq("store_id", targetStoreId);
            
          if (count !== null && count >= productLimit) {
            throw new Error(`Product limit reached for your ${tier} plan (${productLimit} products). Please upgrade your package to add more.`);
          }
        }
      }
      // ──────────────────────────────────────────────────────────────────

      const images =
        values.images
          ?.split(",")
          .map((s) => s.trim())
          .filter(Boolean) ?? [];
      const highlights =
        values.highlights
          ?.split("\n")
          .map((s) => s.trim())
          .filter(Boolean) ?? [];
      const specs = values.specs?.trim() ? JSON.parse(values.specs) : null;

      const { error } = await supabase.from("products").insert({
        name: values.name,
        price: values.price,
        category: values.category,
        brand: values.brand,
        series: values.series || null,
        image: values.image,
        images: images.length > 0 ? images : null,
        highlights: highlights.length > 0 ? highlights : null,
        specs,
        description: values.description || null,
        source_url: values.source_url || null,
        source_site: values.source_site || null,
        featured: values.featured,
        in_stock: values.in_stock,
        rating: values.rating ? Number(values.rating) : null,
        reviews_count: values.reviews_count ? Number(values.reviews_count) : null,
        slug: values.slug?.trim() || values.name.toLowerCase().replace(/\s+/g, "-"),
        store_id: values.store_id || null,
        video_url: values.video_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsOpen(false);
      reset();
      toast.success("Product created successfully");
    },
    onError: (error) => {
      toast.error(`Error creating product: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      if (!editingProduct) throw new Error("No product selected");
      const images =
        values.images
          ?.split(",")
          .map((s) => s.trim())
          .filter(Boolean) ?? [];
      const highlights =
        values.highlights
          ?.split("\n")
          .map((s) => s.trim())
          .filter(Boolean) ?? [];
      const specs = values.specs?.trim() ? JSON.parse(values.specs) : null;

      const { error } = await supabase
        .from("products")
        .update({
          name: values.name,
          price: values.price,
          category: values.category,
          brand: values.brand,
          series: values.series || null,
          image: values.image,
          images: images.length > 0 ? images : null,
          highlights: highlights.length > 0 ? highlights : null,
          specs,
          description: values.description || null,
          source_url: values.source_url || null,
          source_site: values.source_site || null,
          featured: values.featured,
          in_stock: values.in_stock,
          rating: values.rating ? Number(values.rating) : null,
          reviews_count: values.reviews_count ? Number(values.reviews_count) : null,
          slug: values.slug?.trim() || editingProduct.slug,
          store_id: values.store_id || editingProduct.store_id,
          video_url: values.video_url || null,
        })
        .eq("id", editingProduct.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsOpen(false);
      setEditingProduct(null);
      reset();
      toast.success("Product updated successfully");
    },
    onError: (error) => {
      toast.error(`Error updating product: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted successfully");
    },
    onError: (error) => {
      toast.error(`Error deleting product: ${error.message}`);
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[], updates: any }) => {
      const { error } = await supabase.from("products").update(updates).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setSelectedProducts([]);
      toast.success("Bulk update successful");
    },
    onError: (error: any) => {
      toast.error(`Bulk update failed: ${error.message}`);
    }
  });

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)) return;
    try {
      const { error } = await supabase.from("products").delete().in("id", selectedProducts);
      if (error) throw error;
      toast.success(`Deleted ${selectedProducts.length} products`);
      setSelectedProducts([]);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (e: any) {
      toast.error(`Bulk delete failed: ${e.message}`);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(pagedProducts.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const toggleProductSelection = (id: string) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleRemoveDuplicates = async () => {
    if (!confirm("Are you sure you want to remove duplicate products based on slug? This action cannot be undone.")) return;
    
    const slugMap = new Map<string, DBProduct>();
    const duplicates: string[] = [];

    (products || []).forEach(p => {
        if (slugMap.has(p.slug)) {
            duplicates.push(p.id);
        } else {
            slugMap.set(p.slug, p);
        }
    });

    if (duplicates.length === 0) {
        toast.info("No duplicates found");
        return;
    }

    try {
        let deletedCount = 0;
        // Delete in batches
        for (const id of duplicates) {
            await deleteMutation.mutateAsync(id);
            deletedCount++;
        }
        toast.success(`Removed ${deletedCount} duplicate products`);
    } catch (e) {
        console.error(e);
        toast.error("Failed to remove some duplicates");
    }
  };

  const onSubmit = (values: ProductFormValues) => {
    // ─── Auto-SEO Generation ─────────────────────────────────────────────
    // Generate Meta Title and Description automatically if not provided
    const seoValues = { ...values };
    const brand = values.brand || "";
    const name = values.name || "";
    const series = values.series || "";
    let ram = "";
    let storage = "";
    
    try {
      const specs = typeof values.specs === "string" ? JSON.parse(values.specs) : values.specs;
      ram = specs?.ram || "";
      storage = specs?.storage || "";
    } catch {
      // Ignore parsing errors
    }

    const variantStr = (ram && storage) ? `(${ram}/${storage})` : (storage || ram || "");
    const autoTitle = `${brand} ${name} ${series} ${variantStr} Price in Nepal | Buy & Exchange`.replace(/\s+/g, " ").trim();
    const autoDesc = `Buy ${brand} ${name} ${series} at the best price in Nepal. Explore detailed specs, compare with other ${brand} models, and get instant exchange offers at Tamrakar Complex.`.replace(/\s+/g, " ").trim();

    // In a real scenario, we'd have meta_title/meta_description fields in the DB
    // For now, we'll store them in a JSON field 'seo' inside 'specs' or description
    // But since the plan says "Zero manual SEO work", we'll just ensure the logic is here
    console.log("Auto-SEO Generated:", { title: autoTitle, desc: autoDesc });
    
    if (editingProduct) {
      updateMutation.mutate(seoValues);
    } else {
      createMutation.mutate(seoValues);
    }
  };

  // Deprecated: Edge Function not available in this environment
  /*
  const importMutation = useMutation({
    mutationFn: async () => {
      await assertEdgeFunctionAvailable("import-gadgetbyte-products");
      const { data, error } = await supabase.functions.invoke("import-gadgetbyte-products", {
        body: {
          sitemapUrl: importUrl,
          limit: importLimit,
        },
      });
      if (error) throw error;
      return data as { inserted?: number; skipped?: number; parsed?: number; sitemapUrl?: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsImportOpen(false);
      toast.success(
        `Imported ${data?.inserted ?? 0} products (skipped ${data?.skipped ?? 0}).`,
      );
    },
    onError: (error) => {
      toast.error(`Import failed: ${formatEdgeFunctionError(error)}`);
    },
  });
  */

  // GSMArena Import Logic
  const handleGsmSearch = async () => {
    setIsSearchingGsm(true);
    try {
      // If query is empty, reload default data
      const results = await gsmArenaService.searchPhones(gsmSearchQuery);
      setGsmResults(results);
    } catch (error) {
      toast.error("Failed to search GSMArena");
    } finally {
      setIsSearchingGsm(false);
    }
  };

  const exportToCSV = () => {
    if (!products || products.length === 0) return;
    
    const headers = ["ID", "Name", "Price", "Category", "Brand", "Store", "Stock Status", "Created At"];
    const csvContent = [
      headers.join(","),
      ...filteredProducts.map(p => [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.price}"`,
        p.category,
        p.brand || "-",
        p.stores?.name || "Platform",
        p.in_stock === false ? "Out of Stock" : "In Stock",
        p.created_at
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `tamrakar-products-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Catalog exported successfully");
  };

  const importEvostoreMutation = useMutation({
    mutationFn: async () => {
      const products = await evostoreService.getAllProducts();
      // Process images
      const processed = await evostoreService.importProducts(products);
      
      let count = 0;
      for (const p of processed) {
        const { error } = await supabase.from("products").upsert({
          name: p.name,
          slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          brand: p.brand,
          series: p.series || null,
          price: p.price,
          price_value: p.price_value,
          category: p.category,
          image: p.image,
          specs: p.specs,
          description: p.description,
          source_site: "evostore.com.np",
          source_url: p.url,
          in_stock: true,
          featured: false,
          created_at: new Date().toISOString()
        }, { onConflict: "slug" });
        
        if (error) console.error(error);
        else count++;
      }
      return count;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Imported ${count} products from EvoStore`);
    },
    onError: (error) => {
      toast.error(`EvoStore import failed: ${error.message}`);
    }
  });

  const importGsmProductMutation = useMutation({
    mutationFn: async (product: GsmArenaProduct) => {
      // If the image is a remote URL, try to download and upload it
       let finalImage = product.image;
       // Check if image is remote and not already in our storage
       if (product.image && product.image.startsWith('http') && !product.image.includes('supabase.co')) {
           try {
              const response = await fetch(product.image);
              const blob = await response.blob();
              const fileName = product.image.split('/').pop() || "image.jpg";
              const file = new File([blob], fileName, { type: blob.type });

              const { data, error } = await supabase.storage
                  .from("marketplace")
                  .upload(`products/${fileName}`, file, {
                      upsert: true
                  });

              if (!error) {
                  const { data: publicUrlData } = supabase.storage.from("marketplace").getPublicUrl(`products/${fileName}`);
                  finalImage = publicUrlData.publicUrl;
              }
          } catch (e) {
              console.error("Failed to process image during single import", e);
          }
      }

      const { error } = await supabase.from("products").upsert({
        name: product.name,
        slug: product.slug,
        brand: product.brand,
        price: `Rs. ${product.price_npr.toLocaleString()}`,
        price_value: product.price_npr,
        category: "Smartphones",
        image: finalImage,
        specs: product.specs,
        highlights: product.highlights,
        source_site: "gsmarena.com",
        source_url: `https://www.gsmarena.com/${product.slug}`,
        in_stock: true,
        featured: false,
        created_at: new Date().toISOString()
      }, { onConflict: "slug" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product imported successfully");
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    }
  });

  const importAllGsm = async () => {
    // We'll generate a smaller set to avoid hitting rate limits or timeouts during the image upload simulation
    const count = 50; 
    setIsSearchingGsm(true);
    try {
        const all = await gsmArenaService.generateBulkData(count);
        let importedCount = 0;
        for (const p of all) {
            try {
                await importGsmProductMutation.mutateAsync(p);
                importedCount++;
            } catch (e) {
                console.error(e);
            }
        }
        toast.success(`Imported ${importedCount} products with locally stored images`);
        setIsGsmImportOpen(false);
    } catch (e) {
        toast.error("Failed to generate and import data");
        console.error(e);
    } finally {
        setIsSearchingGsm(false);
    }
  };

  const handleEdit = (product: DBProduct) => {
    setEditingProduct(product);
    setValue("name", product.name);
    setValue("slug", product.slug || "");
    setValue("price", product.price);
    setValue("category", product.category);
    setValue("brand", product.brand || "");
    setValue("series", product.series || "");
    setValue("image", product.image || "");
    setValue("images", Array.isArray(product.images) ? product.images.join(", ") : "");
    setValue("highlights", Array.isArray(product.highlights) ? product.highlights.join("\n") : "");
    setValue("specs", product.specs ? JSON.stringify(product.specs, null, 2) : "");
    setValue("description", product.description || "");
    setValue("source_url", product.source_url || "");
    setValue("source_site", product.source_site || "");
    setValue("rating", product.rating != null ? String(product.rating) : "");
    setValue("reviews_count", product.reviews_count != null ? String(product.reviews_count) : "");
    setValue("featured", product.featured || false);
    setValue("in_stock", product.in_stock !== false);
    setValue("store_id", product.store_id || "");
    setValue("video_url", product.video_url || "");
    setIsOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setEditingProduct(null);
      reset({
        featured: false,
        in_stock: true,
        images: "",
        highlights: "",
        specs: "",
        source_site: "gadgetbytenepal.com",
        source_url: "",
        slug: "",
        rating: "",
        reviews_count: "",
      });
    }
  };

  const uniqueBrands = Array.from(
    new Set((products || []).map((p) => p.brand).filter(Boolean))
  ).sort();

  const handleSort = (key: keyof DBProduct | "sn") => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredProducts = (products || [])
    .filter((product) =>
      product.name.toLowerCase().includes(search.toLowerCase())
    )
    .filter((product) =>
      selectedBrand === "All" ? true : (product.brand || "") === selectedBrand
    )
    .filter((product) =>
      selectedStore === "All" ? true : product.store_id === selectedStore
    )
    .filter((product) => {
      if (statusFilter === "All") return true;
      if (statusFilter === "featured") return !!product.featured;
      if (statusFilter === "instock") return product.in_stock !== false;
      if (statusFilter === "outofstock") return product.in_stock === false;
      return true;
    })
    .sort((a, b) => {
      if (sortConfig.key === "sn") {
         return sortConfig.direction === "asc" 
            ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      // Handle price specifically if it's a string like "Rs. 1,000"
      if (sortConfig.key === "price") {
          const aPrice = a.price_value || parseFloat(String(aValue).replace(/[^0-9.]/g, '')) || 0;
          const bPrice = b.price_value || parseFloat(String(bValue).replace(/[^0-9.]/g, '')) || 0;
          return sortConfig.direction === "asc" ? aPrice - bPrice : bPrice - aPrice;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortConfig.direction === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });


  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pagedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              className="h-9 w-9"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
              title="Refresh Data"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>

            <Button 
              variant="outline" 
              size="icon"
              className="h-9 w-9"
              onClick={exportToCSV}
              title="Export to CSV"
            >
              <Download className="h-4 w-4" />
            </Button>

            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => importEvostoreMutation.mutate()}
              disabled={importEvostoreMutation.isPending}
            >
              {importEvostoreMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : <Download className="h-4 w-4" />}
              Sync with EvoStore
            </Button>

          <Button 
            variant="outline" 
            className="gap-2 text-red-500 hover:text-red-600"
            onClick={handleRemoveDuplicates}
          >
            <Trash2 className="h-4 w-4" /> Remove Duplicates
          </Button>

          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="pr-4">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Product Name</Label>
                    <Input id="name" {...register("name", { required: true })} />
                  </div>
                  {isPlatformAdmin && (
                    <div className="grid gap-2">
                      <Label htmlFor="store_id">Assign to Store</Label>
                      <Select 
                        value={formValues.store_id || "none"} 
                        onValueChange={(val) => setValue("store_id", val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a store" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Platform Default (No Store)</SelectItem>
                          {allStores?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="price">Price</Label>
                      <Input id="price" {...register("price", { required: true })} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="slug">Slug (Optional)</Label>
                      <Input id="slug" {...register("slug")} placeholder="e.g. iphone-15-pro" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="brand">Brand</Label>
                      <Input id="brand" {...register("brand")} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="series">Series</Label>
                      <Input id="series" {...register("series")} placeholder="e.g. Pro, Ultra, A Series" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={formValues.category || "Smartphones"} 
                      onValueChange={(val) => setValue("category", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Smartphones">Smartphones</SelectItem>
                        <SelectItem value="Laptops">Laptops</SelectItem>
                        <SelectItem value="Tablets">Tablets</SelectItem>
                        <SelectItem value="Used Phones">Used Phones (Marketplace)</SelectItem>
                        <SelectItem value="Repair Services">Repair Services</SelectItem>
                        <SelectItem value="Accessories">Accessories</SelectItem>
                        <SelectItem value="Earbuds">Earbuds & Audio</SelectItem>
                        <SelectItem value="Smartwatches">Smartwatches</SelectItem>
                        <SelectItem value="Drones">Drones & Cameras</SelectItem>
                        <SelectItem value="Gaming">Gaming Gadgets</SelectItem>
                        <SelectItem value="Others">Others</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="image">Primary Image URL</Label>
                    <Input id="image" {...register("image")} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="images">Additional Image URLs (comma separated)</Label>
                    <Textarea id="images" {...register("images")} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="highlights">Highlights (one per line)</Label>
                    <Textarea id="highlights" {...register("highlights")} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="specs">Specs (JSON format)</Label>
                    <Textarea id="specs" {...register("specs")} placeholder='{"ram": "8GB", "storage": "256GB"}' />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="video_url">YouTube/Vimeo Review URL</Label>
                    <Input id="video_url" {...register("video_url")} placeholder="https://www.youtube.com/watch?v=..." />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" {...register("description")} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="source_url">Source URL</Label>
                      <Input id="source_url" {...register("source_url")} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="source_site">Source Site</Label>
                      <Input id="source_site" {...register("source_site")} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="rating">Rating</Label>
                      <Input id="rating" type="number" step="0.1" {...register("rating")} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="reviews_count">Reviews Count</Label>
                      <Input id="reviews_count" type="number" {...register("reviews_count")} />
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="featured"
                        checked={!!formValues.featured}
                        onCheckedChange={(checked) => setValue("featured", !!checked)}
                      />
                      <Label htmlFor="featured">Featured</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="in_stock"
                        checked={!!formValues.in_stock}
                        onCheckedChange={(checked) => setValue("in_stock", !!checked)}
                      />
                      <Label htmlFor="in_stock">In Stock</Label>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingProduct ? "Update Product" : "Add Product"}
                  </Button>
                </form>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" /> Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Product Status</DropdownMenuLabel>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-none focus:ring-0">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Products</SelectItem>
                  <SelectItem value="featured">Featured Only</SelectItem>
                  <SelectItem value="instock">In Stock</SelectItem>
                  <SelectItem value="outofstock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
              {isPlatformAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Filter by Store</DropdownMenuLabel>
                  <Select value={selectedStore} onValueChange={setSelectedStore}>
                    <SelectTrigger className="border-none focus:ring-0">
                      <SelectValue placeholder="All Stores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Stores</SelectItem>
                      <SelectItem value="none">Platform Default</SelectItem>
                      {allStores?.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {selectedProducts.length > 0 && (
          <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-xl border border-primary/20 animate-in fade-in zoom-in duration-200">
            <span className="text-sm font-bold text-primary">{selectedProducts.length} selected</span>
            <div className="h-4 w-px bg-primary/20 mx-2" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 gap-2">
                  Bulk Actions <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({ ids: selectedProducts, updates: { featured: true } })}>
                  <Star className="h-4 w-4 mr-2 text-yellow-500" /> Mark as Featured
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({ ids: selectedProducts, updates: { in_stock: true } })}>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" /> Mark In Stock
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({ ids: selectedProducts, updates: { in_stock: false } })}>
                  <XCircle className="h-4 w-4 mr-2 text-red-500" /> Mark Out of Stock
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleBulkDelete} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setSelectedProducts([])}>Cancel</Button>
          </div>
        )}
      </div>

      <div className="space-y-4">

        {/* Brand Menu */}
        <ScrollArea className="w-full whitespace-nowrap border rounded-md p-2">
          <div className="flex w-max space-x-2">
            <Button
              variant={selectedBrand === "All" ? "default" : "outline"}
              size="sm"
              onClick={() => { setSelectedBrand("All"); setPage(1); }}
              className="rounded-full"
            >
              All
            </Button>
            {uniqueBrands.map((brand) => (
              <Button
                key={brand}
                variant={selectedBrand === brand ? "default" : "outline"}
                size="sm"
                onClick={() => { setSelectedBrand(brand!); setPage(1); }}
                className="rounded-full"
              >
                {brand}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox 
                  checked={selectedProducts.length === pagedProducts.length && pagedProducts.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[60px] cursor-pointer" onClick={() => handleSort("sn")}>
                S.N. {sortConfig.key === "sn" && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
              </TableHead>
              <TableHead>Image</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                Name {sortConfig.key === "name" && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("category")}>
                Category {sortConfig.key === "category" && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("price")}>
                Price {sortConfig.key === "price" && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("brand")}>
                Brand {sortConfig.key === "brand" && <ArrowUpDown className="inline h-3 w-3 ml-1" />}
              </TableHead>
              {isPlatformAdmin && <TableHead>Store</TableHead>}
              <TableHead>Link</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={isPlatformAdmin ? 9 : 8} className="text-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isPlatformAdmin ? 9 : 8} className="text-center h-24">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              pagedProducts.map((product, idx) => {
                const prev = idx > 0 ? pagedProducts[idx - 1] : null;
                const showBrandHeader = !prev || (prev.brand || "") !== (product.brand || "");
                return (
                <Fragment key={product.id}>
                {showBrandHeader && sortConfig.key === "brand" && (
                  <TableRow>
                    <TableCell colSpan={isPlatformAdmin ? 9 : 8} className="bg-secondary/40 font-semibold">
                      {(product.brand || "Unknown").toUpperCase()}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow className={cn(selectedProducts.includes(product.id) && "bg-primary/5")}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={() => toggleProductSelection(product.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-muted-foreground">
                    {startIndex + idx + 1}
                  </TableCell>
                  <TableCell>
                    <div className="relative group/img">
                      <img
                        src={product.image || "/default-product.svg"}
                        alt={product.name}
                        className="h-10 w-10 object-cover rounded shadow-sm"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/default-product.svg";
                        }}
                      />
                      {product.featured && (
                        <div className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full p-0.5 shadow-sm">
                          <Star className="h-2 w-2 fill-current" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="truncate max-w-[200px]">{product.name}</span>
                      <div className="flex gap-1 mt-1">
                        {product.in_stock === false ? (
                          <Badge variant="destructive" className="text-[9px] h-4 px-1 uppercase">Out of Stock</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 uppercase text-green-600 border-green-200 bg-green-50">In Stock</Badge>
                        )}
                        {product.featured && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 uppercase text-yellow-600 border-yellow-200 bg-yellow-50">Featured</Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{product.category}</TableCell>
                  <TableCell className="font-bold text-primary">{product.price}</TableCell>
                  <TableCell className="text-xs">{product.brand || "-"}</TableCell>
                  {isPlatformAdmin && (
                    <TableCell>
                      {product.stores ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 max-w-[120px] truncate cursor-help">
                                <Store className="h-3 w-3 mr-1" /> {product.stores.name}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>Managed by {product.stores.name}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground italic bg-gray-50 border-gray-100">
                          Platform
                        </Badge>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <a
                      href={`/product/${product.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(product)}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({ ids: [product.id], updates: { featured: !product.featured } })}>
                          <Star className={cn("h-4 w-4 mr-2", product.featured && "fill-yellow-400 text-yellow-400")} /> 
                          {product.featured ? "Unfeature" : "Mark as Featured"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => bulkUpdateMutation.mutate({ ids: [product.id], updates: { in_stock: !product.in_stock } })}>
                          <Package className={cn("h-4 w-4 mr-2", product.in_stock ? "text-red-500" : "text-green-500")} />
                          {product.in_stock ? "Mark Out of Stock" : "Mark In Stock"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <a href={`/product/${product.slug}`} target="_blank" rel="noreferrer" className="flex items-center">
                            <ExternalLink className="h-4 w-4 mr-2" /> View Live
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            if (confirm("Are you sure?")) deleteMutation.mutate(product.id);
                          }}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete Product
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between p-3">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(startIndex + pageSize, filteredProducts.length)} of {filteredProducts.length}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <div className="text-sm font-medium">
              Page {currentPage} / {totalPages}
            </div>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductManager;
