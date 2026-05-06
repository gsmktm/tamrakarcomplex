import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  CreditCard,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StoreRow, PackageRow, StoreSubscriptionRow } from "@/types/app";

interface StoreWithSubscriptions extends StoreRow {
  store_subscriptions?: (StoreSubscriptionRow & { packages?: PackageRow })[] | null;
}
import { SEO } from "@/components/common/SEO";
import { getErrorMessage } from "@/lib/utils";
import type { StorePageInsert, StorePageRow, StoreRow, StoreUpdate } from "@/types/app";

type PageFormState = {
  id: string | null;
  title: string;
  slug: string;
  content: string;
  is_published: boolean;
};

const emptyPageForm: PageFormState = {
  id: null,
  title: "",
  slug: "",
  content: "",
  is_published: true,
};

const pageTemplates = [
  {
    title: "Why Choose Us",
    slug: "why-choose-us",
    content:
      "<h2>Why Choose Us</h2><p>Highlight what makes your store different: turnaround time, genuine parts, technical team, warranty clarity, and customer support.</p><ul><li>Experienced technicians</li><li>Transparent pricing</li><li>Trusted after-sales support</li></ul>",
  },
  {
    title: "Supported Devices",
    slug: "supported-devices",
    content:
      "<h2>Supported Devices</h2><p>List the devices your store handles best.</p><ul><li>MacBook Air / Pro</li><li>iPhone models</li><li>iPad models</li></ul>",
  },
  {
    title: "Warranty Policy",
    slug: "warranty-policy",
    content:
      "<h2>Warranty Policy</h2><p>Explain warranty coverage, exclusions, and how customers should contact the store if they need follow-up service.</p>",
  },
  {
    title: "Repair Process",
    slug: "repair-process",
    content:
      "<h2>Repair Process</h2><p>Describe the flow from diagnosis to quotation, approval, repair, testing, and delivery.</p><ol><li>Device check-in</li><li>Diagnosis</li><li>Quote approval</li><li>Repair and testing</li></ol>",
  },
];

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Palette } from "lucide-react";

export default function StoreManage({ storeId }: { storeId?: string }) {
  const { id: paramId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();

  // If used in /storeadmin/profile, we might not have an ID in params
  const isPanel = location.pathname.startsWith("/storeadmin");
  
  // For the panel version, we use the storeId prop or the paramId
  const id = storeId || paramId;

  const [activeTab, setActiveTab] = useState("details");
  const [pageForm, setPageForm] = useState<PageFormState>(emptyPageForm);
  const [marketplaceValues, setMarketplaceValues] = useState({
    status: "active",
    theme_slug: "default",
  });

  const { data: store, isLoading: isStoreLoading } = useQuery<StoreWithSubscriptions>({
    queryKey: ["store", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*, store_subscriptions(*, packages(*))")
        .eq("id", id)
        .single();
      if (error) throw error;
      
      // Sync local state with fetched data
      if (data) {
        setMarketplaceValues({
          status: data.status || "active",
          theme_slug: data.theme_slug || "default",
        });
      }
      
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (store && user && store.owner_id !== user.id) {
      const checkAdmin = async () => {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "suadmin"])
          .maybeSingle();

        if (!data) {
          toast.error("You do not have permission to manage this store.");
          navigate(`/stores/${id}`);
        }
      };

      checkAdmin();
    }
  }, [id, navigate, store, user]);

  const { data: pages } = useQuery<StorePageRow[]>({
    queryKey: ["store_pages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_pages")
        .select("*")
        .eq("store_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const pageSlugs = useMemo(() => new Set((pages ?? []).map((page) => page.slug)), [pages]);

  const updateStoreMutation = useMutation({
    mutationFn: async (values: StoreUpdate) => {
      const { error } = await supabase.from("stores").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Store details updated successfully");
      queryClient.invalidateQueries({ queryKey: ["store", id] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    },
    onError: (error: unknown) => {
      toast.error(`Error: ${getErrorMessage(error)}`);
    },
  });

  const createPageMutation = useMutation({
    mutationFn: async (values: Omit<StorePageInsert, "store_id">) => {
      const { error } = await supabase.from("store_pages").insert({ ...values, store_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Page created successfully");
      setPageForm(emptyPageForm);
      queryClient.invalidateQueries({ queryKey: ["store_pages", id] });
    },
    onError: (error: unknown) => {
      toast.error(`Error: ${getErrorMessage(error)}`);
    },
  });

  const updatePageMutation = useMutation({
    mutationFn: async (values: Omit<StorePageInsert, "store_id"> & { id: string }) => {
      const { id: pageId, ...payload } = values;
      const { error } = await supabase.from("store_pages").update(payload).eq("id", pageId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Page updated successfully");
      setPageForm(emptyPageForm);
      queryClient.invalidateQueries({ queryKey: ["store_pages", id] });
    },
    onError: (error: unknown) => {
      toast.error(`Error: ${getErrorMessage(error)}`);
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase.from("store_pages").delete().eq("id", pageId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Page deleted successfully");
      if (pageForm.id) {
        setPageForm(emptyPageForm);
      }
      queryClient.invalidateQueries({ queryKey: ["store_pages", id] });
    },
    onError: (error: unknown) => {
      toast.error(`Error: ${getErrorMessage(error)}`);
    },
  });

  if (isStoreLoading || !store) {
    return (
      <div className="flex min-h-screen flex-col">
        <SEO title="Manage Store" description="Manage store information and custom pages." noindex />
        <Header />
        <div className="flex flex-1 justify-center py-20">
          <Loader2 className="animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  const handleUpdateStore = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const servicesRaw = String(formData.get("services") || "");
    const services = servicesRaw
      .split(",")
      .map((service) => service.trim())
      .filter(Boolean);

    const updates: StoreUpdate = {
      name: String(formData.get("name") || ""),
      description: String(formData.get("description") || ""),
      location: String(formData.get("location") || ""),
      phone: String(formData.get("phone") || "") || null,
      email: String(formData.get("email") || "") || null,
      website: String(formData.get("website") || "") || null,
      shop_no: String(formData.get("shop_no") || "") || null,
      map_url: String(formData.get("map_url") || "") || null,
      logo_url: String(formData.get("logo_url") || "") || null,
      services,
    };

    updateStoreMutation.mutate(updates);
  };

  const handleUpdateMarketplace = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateStoreMutation.mutate(marketplaceValues);
  };

  const handleSubmitPage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const normalizedSlug = pageForm.slug.toLowerCase().trim();
    const reservedSlugs = ["home", "about", "policy", "contact"];

    if (reservedSlugs.includes(normalizedSlug)) {
      toast.error(`"${normalizedSlug}" is a reserved URL. Please choose another one.`);
      return;
    }

    const slugTakenByOtherPage = (pages ?? []).some(
      (page) => page.slug === normalizedSlug && page.id !== pageForm.id,
    );

    if (slugTakenByOtherPage) {
      toast.error("Another page already uses that slug.");
      return;
    }

    const payload = {
      title: pageForm.title.trim(),
      slug: normalizedSlug,
      content: pageForm.content,
      is_published: pageForm.is_published,
    };

    if (!payload.title || !payload.slug) {
      toast.error("Page title and slug are required.");
      return;
    }

    if (pageForm.id) {
      updatePageMutation.mutate({ id: pageForm.id, ...payload });
      return;
    }

    createPageMutation.mutate(payload);
  };

  const isSavingPage = createPageMutation.isPending || updatePageMutation.isPending;

  return (
    <div className={cn("flex min-h-screen flex-col", isPanel ? "bg-transparent min-h-0" : "bg-slate-50")}>
      <SEO title={`Manage ${store.name}`} description="Edit store details and custom store pages." noindex />
      {!isPanel && <Header />}
      <main className={cn("flex-1 py-8", isPanel ? "px-0 py-0" : "container")}>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!isPanel && (
              <Button variant="ghost" size="icon" asChild>
                <Link to={`/stores/${id}`}>
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold">Manage Store: {store.name}</h1>
              <p className="text-sm text-muted-foreground">
                Subscription Status:{" "}
                <span className="font-semibold uppercase text-primary">
                  {store.subscription_status || "Inactive"}
                </span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isPanel && (
              <Button variant="outline" asChild>
                <Link to="/storeadmin/my-subscription">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Packages
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to={`/stores/${id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View Store
              </Link>
            </Button>
            <Button asChild>
              <Link to="/marketplace/sell">Add Product</Link>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="details">Store Details</TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="pages">Custom Pages</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Edit Store Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateStore} className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Store Name</Label>
                      <Input id="name" name="name" defaultValue={store.name} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input id="location" name="location" defaultValue={store.location} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" name="phone" defaultValue={store.phone || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" defaultValue={store.email || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website URL</Label>
                      <Input id="website" name="website" defaultValue={store.website || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shop_no">Shop No</Label>
                      <Input id="shop_no" name="shop_no" defaultValue={store.shop_no || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="map_url">Google Maps URL</Label>
                      <Input id="map_url" name="map_url" defaultValue={store.map_url || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="logo_url">Logo URL</Label>
                      <Input id="logo_url" name="logo_url" defaultValue={store.logo_url || ""} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="services">Services</Label>
                    <Input
                      id="services"
                      name="services"
                      defaultValue={(store.services ?? []).join(", ")}
                      placeholder="MacBook Repair, iPhone Service, Diagnostics"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter services separated by commas. These are used on the public store page.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={store.description || ""}
                      rows={5}
                    />
                  </div>

                  <Button type="submit" disabled={updateStoreMutation.isPending}>
                    {updateStoreMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marketplace">
            <Card>
              <CardHeader>
                <CardTitle>Marketplace & Design</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateMarketplace} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4 border p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base font-semibold">Store Status</Label>
                          <p className="text-xs text-muted-foreground">Manage your store's visibility</p>
                        </div>
                        <Badge variant={store.status === 'active' ? 'outline' : 'destructive'} className="capitalize">
                          {store.status || 'Active'}
                        </Badge>
                      </div>
                      
                      <div className="grid gap-2">
                        <Select 
                          value={marketplaceValues.status} 
                          onValueChange={(val) => setMarketplaceValues(v => ({ ...v, status: val }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active (Open for business)</SelectItem>
                            <SelectItem value="suspended">Suspended (Closed by you)</SelectItem>
                            <SelectItem value="maintenance">Maintenance (Updating store)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4 border p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base font-semibold">Store Theme</Label>
                          <p className="text-xs text-muted-foreground">Choose your brand colors</p>
                        </div>
                        <Palette className="h-5 w-5 text-muted-foreground" />
                      </div>
                      
                      <div className="grid gap-2">
                        <Select 
                          value={marketplaceValues.theme_slug} 
                          onValueChange={(val) => setMarketplaceValues(v => ({ ...v, theme_slug: val }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Theme" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default Dark</SelectItem>
                            <SelectItem value="emerald">Emerald Teal</SelectItem>
                            <SelectItem value="rose">Rose Pink</SelectItem>
                            <SelectItem value="amber">Amber Gold</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">Premium themes are for Diamond & Gold partners.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border p-4 rounded-lg">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Billing & Commission
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Marketplace Commission</Label>
                        <div className="text-xl font-bold">{store.marketplace_commission || 10}%</div>
                        <p className="text-[10px] text-muted-foreground">Per successful sale. Non-editable.</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Subscription Tier</Label>
                        <div className="text-xl font-bold capitalize">{store.store_subscriptions?.[0]?.packages?.slug || 'Basic'}</div>
                        <Link to="/storeadmin/my-subscription" className="text-[10px] text-primary hover:underline">Change Plan</Link>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={updateStoreMutation.isPending}>
                      {updateStoreMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Marketplace Settings
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Page Templates</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {pageTemplates.map((template) => (
                  <Button
                    key={template.slug}
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setPageForm({
                        id: null,
                        title: template.title,
                        slug: template.slug,
                        content: template.content,
                        is_published: true,
                      })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {template.title}
                    {pageSlugs.has(template.slug) ? (
                      <Badge variant="secondary" className="ml-2">
                        Exists
                      </Badge>
                    ) : null}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{pageForm.id ? "Edit Page" : "Add New Page"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitPage} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="page-title">Page Title</Label>
                      <Input
                        id="page-title"
                        value={pageForm.title}
                        onChange={(e) =>
                          setPageForm((current) => ({ ...current, title: e.target.value }))
                        }
                        placeholder="e.g. Supported Devices"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="page-slug">URL Slug</Label>
                      <Input
                        id="page-slug"
                        value={pageForm.slug}
                        onChange={(e) =>
                          setPageForm((current) => ({ ...current, slug: e.target.value }))
                        }
                        placeholder="e.g. supported-devices"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="page-content">Content</Label>
                    <Textarea
                      id="page-content"
                      value={pageForm.content}
                      onChange={(e) =>
                        setPageForm((current) => ({ ...current, content: e.target.value }))
                      }
                      placeholder="<p>Enter your content here...</p>"
                      rows={10}
                    />
                    <p className="text-xs text-muted-foreground">
                      HTML is allowed. Custom pages are shown as premium content sections on the public store page.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" disabled={isSavingPage}>
                      {isSavingPage ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : pageForm.id ? (
                        <Save className="mr-2 h-4 w-4" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      {pageForm.id ? "Update Page" : "Add Page"}
                    </Button>

                    {pageForm.id ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPageForm(emptyPageForm)}
                      >
                        Cancel Edit
                      </Button>
                    ) : null}
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {pages?.map((page) => (
                <Card key={page.id}>
                  <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">{page.title}</h3>
                        <Badge variant={page.is_published ? "default" : "secondary"}>
                          {page.is_published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">/{page.slug}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setPageForm({
                            id: page.id,
                            title: page.title,
                            slug: page.slug,
                            content: page.content || "",
                            is_published: page.is_published ?? true,
                          })
                        }
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => deletePageMutation.mutate(page.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {pages?.length === 0 ? (
                <p className="text-center text-muted-foreground">No custom pages yet.</p>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      {!isPanel && <Footer />}
    </div>
  );
}
