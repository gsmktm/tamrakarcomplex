import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Camera, ExternalLink, ImagePlus, Loader2, Lock, Palette, Save, Sparkles, Store as StoreIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, getErrorMessage } from "@/lib/utils";
import { resolveEffectiveStorePackage } from "@/lib/storeEntitlements";
import {
  OPENING_DAYS,
  STORE_THEME_OPTIONS,
  allowedStoreThemes,
  canUseStoreTheme,
  getLockedThemeMessage,
  sanitizeThemeForPackage,
  type BannerSettings,
  type OpeningHours,
  type SocialLinks,
  type StoreThemeSlug,
} from "@/lib/storeThemeBuilder";

type BuilderStore = {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string | null;
  location: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  services: string[] | null;
  services_json: string[] | null;
  opening_hours: OpeningHours | null;
  social_links_json: SocialLinks | null;
  featured_product_ids: string[] | null;
  theme_slug: string | null;
  theme_color: string | null;
  banner_json: BannerSettings | null;
  custom_design_json: Record<string, unknown> | null;
  package_slug: string | null;
  subscription_status: string | null;
  subscription_end_date: string | null;
};

type ProductOption = {
  id: string;
  title: string;
  price: number | null;
  image_url: string | null;
};

function parseList(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function stringifyList(value: string[] | null | undefined) {
  return (value ?? []).join("\n");
}

function isPlatformMode(role: string | null, routeStoreId?: string) {
  return !!routeStoreId && (role === "suadmin" || role === "staffadmin");
}

async function uploadStoreImage(storeId: string, file: File, kind: "logo" | "cover") {
  const extension = file.name.split(".").pop() || "jpg";
  const safeName = `${kind}-${Date.now()}.${extension}`.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const path = `stores/${storeId}/${safeName}`;
  const bucketAttempts = ["uploads", "marketplace"];

  for (const bucket of bucketAttempts) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      cacheControl: "3600",
    });
    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    }
  }

  throw new Error("Image upload failed. Check storage bucket configuration.");
}

export default function StoreThemeBuilder() {
  const { id: routeStoreId } = useParams();
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const platformMode = isPlatformMode(role, routeStoreId);

  const { data: store, isLoading } = useQuery({
    queryKey: ["store-theme-builder", routeStoreId, user?.id, role],
    queryFn: async () => {
      if (!user?.id) throw new Error("Not signed in");

      if (platformMode && routeStoreId) {
        const { data, error } = await supabase.from("stores").select("*").eq("id", routeStoreId).single();
        if (error) throw error;
        return data as BuilderStore;
      }

      const { data: membership } = await supabase
        .from("store_admins")
        .select("store_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      const query = membership?.store_id
        ? supabase.from("stores").select("*").eq("id", membership.store_id)
        : supabase.from("stores").select("*").eq("owner_id", user.id);

      const { data, error } = await query.limit(1).single();
      if (error) throw error;
      return data as BuilderStore;
    },
    enabled: !!user?.id,
  });

  const { data: products } = useQuery({
    queryKey: ["store-theme-products", store?.owner_id, store?.id],
    queryFn: async () => {
      if (!store?.owner_id) return [];
      const { data, error } = await supabase
        .from("sell_listings")
        .select("id, title, price, image_url")
        .eq("user_id", store.owner_id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as ProductOption[];
    },
    enabled: !!store?.owner_id,
  });

  const [form, setForm] = useState<Partial<BuilderStore> | null>(null);
  const activeStore = form ?? store ?? null;

  useEffect(() => {
    if (!store) return;
    const packageSlug = resolveEffectiveStorePackage(store);
    setForm({
      ...store,
      theme_slug: sanitizeThemeForPackage(packageSlug, store.theme_slug),
      services_json: store.services_json ?? store.services ?? [],
      opening_hours: store.opening_hours ?? {},
      social_links_json: store.social_links_json ?? {},
      banner_json: store.banner_json ?? {},
      featured_product_ids: store.featured_product_ids ?? [],
    });
  }, [store]);

  const packageSlug = resolveEffectiveStorePackage({
    package_slug: activeStore?.package_slug,
    subscription_status: activeStore?.subscription_status,
    subscription_end_date: activeStore?.subscription_end_date,
  });
  const allowedThemes = useMemo(() => allowedStoreThemes(packageSlug), [packageSlug]);
  const selectedTheme = sanitizeThemeForPackage(packageSlug, activeStore?.theme_slug);
  const canEditColor = packageSlug === "silver" || packageSlug === "gold" || packageSlug === "diamond";
  const canEditLayout = packageSlug === "gold" || packageSlug === "diamond";
  const canUseBanner = packageSlug === "gold" || packageSlug === "diamond";
  const canFeatureProducts = packageSlug !== "free";

  const updateField = <K extends keyof BuilderStore>(key: K, value: BuilderStore[K]) => {
    setForm((current) => ({ ...(current ?? {}), [key]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activeStore?.id) throw new Error("No store selected");
      const services = activeStore.services_json ?? [];
      const payload = {
        name: activeStore.name,
        slug: activeStore.slug,
        description: activeStore.description,
        logo_url: activeStore.logo_url,
        cover_image_url: activeStore.cover_image_url,
        address: activeStore.address,
        location: activeStore.location,
        phone: activeStore.phone,
        whatsapp: activeStore.whatsapp,
        email: activeStore.email,
        website: activeStore.website,
        services,
        services_json: services,
        opening_hours: activeStore.opening_hours ?? {},
        social_links_json: activeStore.social_links_json ?? {},
        featured_product_ids: canFeatureProducts ? activeStore.featured_product_ids ?? [] : [],
        theme_slug: sanitizeThemeForPackage(packageSlug, activeStore.theme_slug),
        theme_color: canEditColor ? activeStore.theme_color || "#2563eb" : null,
        banner_json: canUseBanner ? activeStore.banner_json ?? {} : {},
        custom_design_json: canEditLayout ? activeStore.custom_design_json ?? {} : {},
      };

      const { error } = await supabase.from("stores").update(payload).eq("id", activeStore.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-theme-builder"] });
      toast.success("Store profile saved");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  const handleImage = async (file: File | undefined, kind: "logo" | "cover") => {
    if (!file || !activeStore?.id) return;
    try {
      if (kind === "logo") setLogoUploading(true);
      else setCoverUploading(true);
      const url = await uploadStoreImage(activeStore.id, file, kind);
      updateField(kind === "logo" ? "logo_url" : "cover_image_url", url);
      toast.success(`${kind === "logo" ? "Logo" : "Cover image"} uploaded`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      if (kind === "logo") setLogoUploading(false);
      else setCoverUploading(false);
    }
  };

  if (isLoading || !activeStore) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const previewStyle = {
    "--store-accent": activeStore.theme_color || "#2563eb",
  } as CSSProperties;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Store Theme Builder</h1>
          <p className="text-muted-foreground">Build a dedicated mini website for {activeStore.name}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="capitalize" variant="outline">{packageSlug}</Badge>
          <Button variant="outline" asChild>
            <Link to={`/stores/${activeStore.slug || activeStore.id}`} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Page
            </Link>
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Builder
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Profile Builder</CardTitle>
            <CardDescription>Logo, contact, services, hours, social links, products, theme, color, and banner controls.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="profile">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="theme">Theme</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-6 space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Store Name</Label>
                    <Input value={activeStore.name || ""} onChange={(event) => updateField("name", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Public Slug</Label>
                    <Input value={activeStore.slug || ""} onChange={(event) => updateField("slug", event.target.value)} placeholder="store-name" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <Textarea value={activeStore.description || ""} onChange={(event) => updateField("description", event.target.value)} rows={4} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={activeStore.phone || ""} onChange={(event) => updateField("phone", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input value={activeStore.whatsapp || ""} onChange={(event) => updateField("whatsapp", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={activeStore.email || ""} onChange={(event) => updateField("email", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input value={activeStore.website || ""} onChange={(event) => updateField("website", event.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Address</Label>
                    <Input value={activeStore.address || activeStore.location || ""} onChange={(event) => updateField("address", event.target.value)} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="media" className="mt-6 space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">Logo Upload</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border bg-muted">
                        {activeStore.logo_url ? <img src={activeStore.logo_url} alt="" className="h-full w-full object-cover" /> : <StoreIcon className="h-8 w-8 text-muted-foreground" />}
                      </div>
                      <Button variant="outline" disabled={logoUploading} className="relative overflow-hidden">
                        {logoUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                        Upload Logo
                        <input className="absolute inset-0 opacity-0" type="file" accept="image/*" onChange={(event) => handleImage(event.target.files?.[0], "logo")} />
                      </Button>
                      <Input value={activeStore.logo_url || ""} onChange={(event) => updateField("logo_url", event.target.value)} placeholder="Logo URL" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">Cover Image Upload</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-2xl border bg-muted">
                        {activeStore.cover_image_url ? <img src={activeStore.cover_image_url} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-8 w-8 text-muted-foreground" />}
                      </div>
                      <Button variant="outline" disabled={coverUploading} className="relative overflow-hidden">
                        {coverUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                        Upload Cover
                        <input className="absolute inset-0 opacity-0" type="file" accept="image/*" onChange={(event) => handleImage(event.target.files?.[0], "cover")} />
                      </Button>
                      <Input value={activeStore.cover_image_url || ""} onChange={(event) => updateField("cover_image_url", event.target.value)} placeholder="Cover image URL" />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="theme" className="mt-6 space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  {STORE_THEME_OPTIONS.map((theme) => {
                    const locked = !canUseStoreTheme(packageSlug, theme.slug);
                    const selected = selectedTheme === theme.slug;
                    return (
                      <button
                        key={theme.slug}
                        type="button"
                        disabled={locked}
                        onClick={() => updateField("theme_slug", theme.slug)}
                        className={cn(
                          "rounded-2xl border p-4 text-left transition",
                          selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                          locked && "cursor-not-allowed opacity-60",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold">{theme.label}</div>
                          {locked ? <Lock className="h-4 w-4" /> : selected ? <Sparkles className="h-4 w-4 text-primary" /> : null}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{locked ? getLockedThemeMessage(packageSlug, theme.slug) : theme.description}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <Label>Brand Color</Label>
                  <div className="flex gap-3">
                    <Input type="color" className="h-11 w-16 p-1" disabled={!canEditColor} value={activeStore.theme_color || "#2563eb"} onChange={(event) => updateField("theme_color", event.target.value)} />
                    <Input disabled={!canEditColor} value={activeStore.theme_color || "#2563eb"} onChange={(event) => updateField("theme_color", event.target.value)} />
                  </div>
                  {!canEditColor && <p className="text-sm text-muted-foreground">Custom color selection is available for Silver stores and above.</p>}
                </div>
              </TabsContent>

              <TabsContent value="content" className="mt-6 space-y-5">
                <div className="space-y-2">
                  <Label>Services</Label>
                  <Textarea rows={6} value={stringifyList(activeStore.services_json)} onChange={(event) => updateField("services_json", parseList(event.target.value))} placeholder={"Screen Repair\nBattery Replacement\nAccessories"} />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {OPENING_DAYS.map((day) => (
                    <div key={day} className="space-y-2">
                      <Label>{day}</Label>
                      <Input
                        value={activeStore.opening_hours?.[day] || ""}
                        onChange={(event) => updateField("opening_hours", { ...(activeStore.opening_hours ?? {}), [day]: event.target.value })}
                        placeholder="10:00 AM - 7:00 PM"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {(["facebook", "instagram", "tiktok", "youtube", "website"] as const).map((key) => (
                    <div key={key} className="space-y-2">
                      <Label className="capitalize">{key}</Label>
                      <Input value={activeStore.social_links_json?.[key] || ""} onChange={(event) => updateField("social_links_json", { ...(activeStore.social_links_json ?? {}), [key]: event.target.value })} />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Featured Products</Label>
                    {!canFeatureProducts && <Badge variant="outline">Upgrade required</Badge>}
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {products?.map((product) => {
                      const selected = activeStore.featured_product_ids?.includes(product.id) ?? false;
                      return (
                        <button
                          key={product.id}
                          type="button"
                          disabled={!canFeatureProducts}
                          onClick={() => {
                            const current = activeStore.featured_product_ids ?? [];
                            updateField("featured_product_ids", selected ? current.filter((id) => id !== product.id) : [...current, product.id].slice(0, 6));
                          }}
                          className={cn("rounded-xl border p-3 text-left text-sm", selected ? "border-primary bg-primary/5" : "border-border")}
                        >
                          {product.title}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Card className={!canUseBanner ? "opacity-70" : ""}>
                  <CardHeader>
                    <CardTitle className="text-base">Banner Section</CardTitle>
                    <CardDescription>{canUseBanner ? "Gold and Diamond stores can publish a promotional banner." : "Upgrade to Gold to unlock banner sections."}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <Input disabled={!canUseBanner} placeholder="Banner title" value={activeStore.banner_json?.title || ""} onChange={(event) => updateField("banner_json", { ...(activeStore.banner_json ?? {}), title: event.target.value })} />
                    <Input disabled={!canUseBanner} placeholder="CTA label" value={activeStore.banner_json?.cta_label || ""} onChange={(event) => updateField("banner_json", { ...(activeStore.banner_json ?? {}), cta_label: event.target.value })} />
                    <Input disabled={!canUseBanner} placeholder="CTA URL" value={activeStore.banner_json?.cta_url || ""} onChange={(event) => updateField("banner_json", { ...(activeStore.banner_json ?? {}), cta_url: event.target.value })} />
                    <Input disabled={!canUseBanner} placeholder="Subtitle" value={activeStore.banner_json?.subtitle || ""} onChange={(event) => updateField("banner_json", { ...(activeStore.banner_json ?? {}), subtitle: event.target.value })} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Live Preview
            </CardTitle>
            <CardDescription>Preview changes before saving.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={cn("overflow-hidden rounded-3xl border", selectedTheme === "luxury" || selectedTheme === "atelier" || selectedTheme === "custom" ? "bg-neutral-950 text-white" : "bg-background")} style={previewStyle}>
              <div className="relative min-h-[220px]">
                {activeStore.cover_image_url ? (
                  <img src={activeStore.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-[var(--store-accent)]/15" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="relative flex min-h-[220px] items-end p-6 text-white">
                  <div className="flex items-end gap-4">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/15">
                      {activeStore.logo_url ? <img src={activeStore.logo_url} alt="" className="h-full w-full object-cover" /> : <StoreIcon className="h-8 w-8" />}
                    </div>
                    <div>
                      <Badge className="mb-2 bg-white/15 text-white hover:bg-white/15">{allowedThemes.find((theme) => theme.slug === selectedTheme)?.label ?? "Theme"}</Badge>
                      <h2 className="text-3xl font-bold">{activeStore.name}</h2>
                      <p className="mt-1 max-w-md text-sm text-white/75">{activeStore.description || "Store description preview appears here."}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 p-6 md:grid-cols-3">
                {(activeStore.services_json ?? []).slice(0, 3).map((service) => (
                  <div key={service} className="rounded-2xl border bg-background/70 p-4 text-foreground">
                    <div className="font-semibold">{service}</div>
                    <p className="mt-2 text-sm text-muted-foreground">Featured store service.</p>
                  </div>
                ))}
                {(activeStore.services_json ?? []).length === 0 && (
                  <div className="rounded-2xl border bg-background/70 p-4 text-foreground">
                    <div className="font-semibold">Add Services</div>
                    <p className="mt-2 text-sm text-muted-foreground">Your service cards will render here.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border bg-muted/30 p-4">
              <div className="font-semibold">Package locks</div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Free: no custom theme.</li>
                <li>Silver: basic theme.</li>
                <li>Gold: three public themes and banner section.</li>
                <li>Diamond: premium themes and custom design controls.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
