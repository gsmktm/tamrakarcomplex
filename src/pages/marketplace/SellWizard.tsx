import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ListingType } from "@/types/marketplace";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, CalendarIcon, ShieldCheck, Sparkles } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { SEO } from "@/components/common/SEO";
import { cn, getErrorMessage } from "@/lib/utils";
import type { SellListingRow } from "@/types/app";
import { decodeListingDescription, encodeListingDescription, toCoarseLocation } from "@/lib/listingMeta";

import { useMyStores } from "@/hooks/useMyStores";
import { useCreateListing, useUpdateListing } from "@/hooks/useMarketplace";

const formSchema = z.object({
  listing_type: z.string().default("sell"),
  store_id: z.string().optional(),
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  price: z.coerce.number().min(1, "Price must be greater than 0"),
  condition: z.enum(["new", "like_new", "used", "fair"]),
  category: z.enum(["mobile", "laptop", "tablet", "audio", "watch", "gaming", "accessories", "other"]),
  subcategory: z.string().optional().default(""),
  brand: z.string().optional(),
  model: z.string().optional(),
  location: z.string().min(3, "Location is required"),
  hide_precise_location: z.boolean().default(false),
  location_radius_km: z.coerce.number().min(0).max(50).default(0),
  delivery_meetup: z.boolean().default(true),
  delivery_home_delivery: z.boolean().default(false),
  delivery_courier: z.boolean().default(false),
  delivery_notes: z.string().max(200, "Keep delivery notes under 200 characters").optional().default(""),
  available_date: z.date().optional(),
  item_details: z.string().max(500, "Keep item details under 500 characters").optional().default(""),
  specs_storage: z.string().optional().default(""),
  specs_ram: z.string().optional().default(""),
  specs_color: z.string().optional().default(""),
  specs_battery: z.string().optional().default(""),
  specs_cpu: z.string().optional().default(""),
  specs_gpu: z.string().optional().default(""),
  specs_screen: z.string().optional().default(""),
  contact_info: z.string().min(5, "Contact info is required"),
  images: z.array(z.string()).min(1, "At least one image is required"),
});

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const CATEGORY_OPTIONS = [
  { value: "mobile" as const, label: "Mobile Phones" },
  { value: "laptop" as const, label: "Laptops / MacBook" },
  { value: "tablet" as const, label: "Tablets / iPad" },
  { value: "audio" as const, label: "Audio" },
  { value: "watch" as const, label: "Smartwatches" },
  { value: "gaming" as const, label: "Gaming" },
  { value: "accessories" as const, label: "Accessories" },
  { value: "other" as const, label: "Electronics, TVs, & More" },
];

/**
 * Map a store_products.product_type back into a SellWizard form category.
 * Phone types collapse to "mobile"; store "accessory" aligns with the form's
 * "accessories" option; laptop/tablet/audio/watch/gaming/other pass through.
 */
function storeProductTypeToFormCategory(productType: string | null | undefined): string {
  const value = productType || "new_phone";
  if (["new_phone", "used_phone", "phone"].includes(value)) return "mobile";
  if (value === "accessory") return "accessories";
  return value;
}

const SUBCATEGORY_OPTIONS: Record<string, string[]> = {
  mobile: ["Smartphone", "Feature Phone", "Accessories Bundle"],
  laptop: ["MacBook", "Windows Laptop", "Gaming Laptop", "Ultrabook"],
  tablet: ["iPad", "Android Tablet", "iPod"],
  audio: ["Headphones", "Earbuds", "Bluetooth Speaker", "Microphone"],
  watch: ["Apple Watch", "Samsung Watch", "Fitness Band"],
  gaming: ["Console", "Controller", "Game Disc", "Gaming Accessory"],
  accessories: ["Charger", "Cable", "Case", "Power Bank", "Adapter"],
  other: ["Electronics", "TVs", "Camera", "Camera Reel Based (Not Digital)"],
};

const BRAND_SUGGESTIONS = [
  "Apple",
  "Samsung",
  "Xiaomi",
  "OnePlus",
  "Google",
  "Nothing",
  "Oppo",
  "Vivo",
  "Realme",
  "Huawei",
  "Honor",
  "Motorola",
  "Nokia",
  "Sony",
  "Asus",
  "Lenovo",
  "Dell",
  "HP",
  "Acer",
  "MSI",
];

const MODEL_SUGGESTIONS: Record<string, string[]> = {
  apple: [
    "iPhone 11",
    "iPhone 12",
    "iPhone 13",
    "iPhone 14",
    "iPhone 15",
    "iPhone 16",
    "iPhone SE",
    "iPad",
    "iPad Air",
    "iPad Pro",
    "iPod",
    "MacBook Air M1",
    "MacBook Air M2",
    "MacBook Air M3",
    "MacBook Pro 14",
    "MacBook Pro 16",
    "Apple Watch",
    "AirPods Pro",
  ],
  samsung: ["Galaxy S23 Ultra", "Galaxy S24 Ultra", "Galaxy A54", "Galaxy A55", "Galaxy Tab", "Galaxy Watch"],
  xiaomi: ["Redmi Note 13", "Redmi Note 13 Pro", "Xiaomi 13", "Xiaomi 14", "Poco X6", "Poco F6"],
  oneplus: ["OnePlus 11", "OnePlus 12", "OnePlus Nord"],
  google: ["Pixel 7", "Pixel 8", "Pixel 8 Pro", "Pixel 9"],
  lenovo: ["ThinkPad X1", "Legion 5", "Yoga Slim"],
  dell: ["XPS 13", "Inspiron 15"],
  hp: ["Pavilion", "Victus", "Spectre"],
  acer: ["Nitro 5", "Swift 3"],
};

export default function SellWizard() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { session, role } = useAuth();
  const isAdmin = role === "suadmin" || role === "staffadmin";
  const { data: myStores } = useMyStores();
  const createListingMutation = useCreateListing();
  const updateListingMutation = useUpdateListing();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!id);
  const [editSource, setEditSource] = useState<"user_listing" | "store_product">("user_listing");
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState<{ pct: number; missing: string[] } | null>(null);
  const requestedStoreId = searchParams.get("store") || searchParams.get("storeId") || "";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      listing_type: "sell",
      store_id: "",
      title: "",
      description: "",
      price: 0,
      condition: "used",
      category: "mobile",
      subcategory: "",
      brand: "",
      model: "",
      location: "",
      hide_precise_location: false,
      location_radius_km: 3,
      delivery_meetup: true,
      delivery_home_delivery: false,
      delivery_courier: false,
      delivery_notes: "",
      available_date: undefined,
      item_details: "",
      specs_storage: "",
      specs_ram: "",
      specs_color: "",
      specs_battery: "",
      specs_cpu: "",
      specs_gpu: "",
      specs_screen: "",
      contact_info: "",
      images: [],
    },
  });

  // Automatically select the first store if the user has stores
  useEffect(() => {
    if (myStores && myStores.length > 0 && !form.getValues("store_id") && !id) {
      const requestedStore = myStores.find((store) => store.id === requestedStoreId);
      form.setValue("store_id", requestedStore?.id || myStores[0].id);
    }
  }, [myStores, form, id, requestedStoreId]);

  const watched = form.watch();
  const subcategories = SUBCATEGORY_OPTIONS[watched.category] || [];
  const itemDetailsCount = (watched.item_details || "").length;
  const modelSuggestions = MODEL_SUGGESTIONS[(watched.brand || "").toLowerCase()] || [];

  useEffect(() => {
    if (id) {
      const fetchListing = async () => {
        try {
          // Unified marketplace rows can live in sell_listings (personal) or
          // store_products (store inventory). Try the personal table first.
          let rawData: Record<string, any> | null = null;
          let source: "user_listing" | "store_product" = "user_listing";

          const userResult = await supabase
            .from("sell_listings")
            .select("*")
            .eq("id", id)
            .maybeSingle();
          if (userResult.error) throw userResult.error;

          if (userResult.data) {
            rawData = userResult.data;
          } else {
            const storeResult = await supabase
              .from("store_products")
              .select("*, store:stores(id, name, owner_id, owner_user_id)")
              .eq("id", id)
              .maybeSingle();
            if (storeResult.error) throw storeResult.error;
            if (!storeResult.data) throw new Error("Listing not found");
            rawData = storeResult.data;
            source = "store_product";
          }

          const data = rawData;
          const decoded = decodeListingDescription(data.description);
          const meta = decoded.meta;
          const specs = meta?.specs ?? {};

          // Check if user is listing owner, store owner/members, or platform admin.
          let canEdit = Boolean(isAdmin || (session && data.user_id === session.user.id));
          if (!canEdit && session && data.store_id) {
            const { data: storeOwner } = await supabase
              .from("stores")
              .select("owner_id, owner_user_id")
              .eq("id", data.store_id)
              .maybeSingle();
            canEdit = Boolean(
              storeOwner &&
                (storeOwner.owner_id === session.user.id || storeOwner.owner_user_id === session.user.id),
            );
            if (!canEdit) {
              const [{ data: adminRow }, { data: staffRow }] = await Promise.all([
                supabase
                  .from("store_admins")
                  .select("store_id")
                  .eq("store_id", data.store_id)
                  .eq("user_id", session.user.id)
                  .eq("status", "active")
                  .maybeSingle(),
                (supabase as any).from("store_staff").select("store_id").eq("store_id", data.store_id).eq("user_id", session.user.id).eq("status", "active").maybeSingle(),
              ]);
              canEdit = Boolean(adminRow || staffRow);
            }
          }
          if (session && !canEdit) {
            toast({
              title: "Access denied",
              description: "You do not have permission to edit this listing.",
              variant: "destructive",
            });
            navigate("/marketplace");
            return;
          }
          if (!session) {
            navigate("/auth?redirect=" + encodeURIComponent(`/marketplace/edit/${id}`));
            return;
          }

          setEditSource(source);

          const categoryValue = source === "store_product"
            ? storeProductTypeToFormCategory(data.product_type)
            : (data.category as z.infer<typeof formSchema>["category"]) || "mobile";

          form.reset({
            listing_type: data.listing_type || "sell",
            title: data.title,
            description: decoded.text || "",
            price: Number(data.price),
            condition: (data.condition as "new" | "like_new" | "used" | "fair") || "used",
            category: categoryValue,
            subcategory: meta?.subcategory || "",
            brand: data.brand || "",
            model: data.model || "",
            location: data.location || "",
            hide_precise_location: Boolean(meta?.hide_precise_location),
            location_radius_km: typeof meta?.location_radius_km === "number" ? meta.location_radius_km : 3,
            delivery_meetup: Boolean(meta?.delivery?.meetup ?? true),
            delivery_home_delivery: Boolean(meta?.delivery?.home_delivery ?? false),
            delivery_courier: Boolean(meta?.delivery?.courier ?? false),
            delivery_notes: meta?.delivery?.notes || "",
            available_date: meta?.available_date ? new Date(meta.available_date) : undefined,
            item_details: meta?.item_details || "",
            specs_storage: specs.Storage || "",
            specs_ram: specs.RAM || "",
            specs_color: specs.Color || "",
            specs_battery: specs["Battery / Health"] || "",
            specs_cpu: specs.Processor || "",
            specs_gpu: specs.Graphics || "",
            specs_screen: specs.Screen || "",
            contact_info: data.contact_info || "",
            images: data.images || [],
          });
        } catch (error: unknown) {
          toast({
            title: "Error fetching listing",
            description: getErrorMessage(error),
            variant: "destructive",
          });
          navigate("/marketplace");
        } finally {
          setIsLoading(false);
        }
      };

      if (session) {
          fetchListing();
      }
    }
  }, [id, session, isAdmin, navigate, toast, form]);

  useEffect(() => {
    const hydrateProfileCompletion = async () => {
      if (!session?.user?.id) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, bio")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (error) return;
        const missing: string[] = [];
        if (!data?.display_name) missing.push("display name");
        if (!data?.avatar_url) missing.push("profile photo");
        if (!data?.bio) missing.push("bio");
        const pct = Math.round(((3 - missing.length) / 3) * 100);
        setProfileCompletion({ pct, missing });
      } catch {
        // ignore
      }
    };
    void hydrateProfileCompletion();
  }, [session?.user?.id]);

  const recomputeEstimate = useCallback(async () => {
    const values = form.getValues();
    if (!values.brand || !values.model) {
      setEstimate(null);
      return;
    }
    setEstimating(true);
    try {
      const { data, error } = await supabase.functions.invoke("valuation-estimator", {
        body: {
          brand: values.brand,
          model: values.model,
          condition: values.condition,
          defects: [],
          ageMonths: 0,
        },
      });
      if (error) throw error;
      const resp = data as { quoted_value?: number } | null;
      setEstimate(typeof resp?.quoted_value === "number" ? resp.quoted_value : null);
    } catch {
      setEstimate(null);
    } finally {
      setEstimating(false);
    }
  }, [form]);

  useEffect(() => {
    const sub = form.watch((_val) => {
      const t = setTimeout(() => recomputeEstimate(), 300);
      return () => clearTimeout(t);
    });
    return () => sub.unsubscribe();
  }, [form, recomputeEstimate]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!session) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to post a listing.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const specs: Record<string, string> = {};
      if (values.specs_storage?.trim()) specs.Storage = values.specs_storage.trim();
      if (values.specs_ram?.trim()) specs.RAM = values.specs_ram.trim();
      if (values.specs_color?.trim()) specs.Color = values.specs_color.trim();
      if (values.specs_battery?.trim()) specs["Battery / Health"] = values.specs_battery.trim();
      if (values.specs_cpu?.trim()) specs.Processor = values.specs_cpu.trim();
      if (values.specs_gpu?.trim()) specs.Graphics = values.specs_gpu.trim();
      if (values.specs_screen?.trim()) specs.Screen = values.specs_screen.trim();

      const meta = {
        subcategory: values.subcategory?.trim() || undefined,
        item_details: values.item_details?.trim() || undefined,
        available_date: values.available_date ? values.available_date.toISOString() : undefined,
        hide_precise_location: values.hide_precise_location,
        location_radius_km: values.location_radius_km,
        delivery: {
          meetup: values.delivery_meetup,
          home_delivery: values.delivery_home_delivery,
          courier: values.delivery_courier,
          notes: values.delivery_notes?.trim() || undefined,
        },
        specs: Object.keys(specs).length ? specs : undefined,
      };

      const descriptionWithMeta = encodeListingDescription(values.description, meta);
      const safeLocation = values.hide_precise_location ? toCoarseLocation(values.location) : values.location;

      if (id) {
        // Update existing listing — routed to the correct table by source
        const updated = await updateListingMutation.mutateAsync({
          id,
          sourceType: editSource,
          data: {
            title: values.title,
            description: descriptionWithMeta,
            price: values.price,
            condition: values.condition,
            category: values.category,
            brand: values.brand,
            model: values.model,
            location: safeLocation,
            contact_info: values.contact_info,
            images: values.images,
            store_id: values.store_id || null,
          }
        });

        toast({
          title: "Success!",
          description: "Your listing has been updated.",
        });
        navigate(`/marketplace/listing/${updated.id}`);
      } else {
        // Create new listing
        const created = await createListingMutation.mutateAsync({
          title: values.title,
          description: descriptionWithMeta,
          price: values.price,
          condition: values.condition,
          category: values.category,
          brand: values.brand,
          model: values.model,
          location: safeLocation,
          contact_info: values.contact_info,
          images: values.images,
          listing_type: values.listing_type as ListingType,
          store_id: values.store_id || null,
        });

        toast({
          title: "Success!",
          description: "Your listing has been posted.",
        });
        navigate(`/marketplace/listing/${created.id}`);
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SEO title="Marketplace Listing" description="Create or edit your marketplace listing." noindex />
        <Header />
        <div className="flex-1 flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={id ? "Edit Marketplace Listing" : "Create Marketplace Listing"}
        description="Create or update your device marketplace listing with images, pricing, and condition details."
        url={id ? `/marketplace/edit/${id}` : "/marketplace/sell"}
        noindex
      />
      <Header />
      <div className="flex-1 container max-w-6xl py-10">
        <div className="mb-6 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{id ? "Edit Listing" : "Create a Listing"}</h1>
          <p className="text-muted-foreground">
            Nepal’s mobile-first marketplace listing flow: clear specs, clean location controls, and a live ad preview.
          </p>
        </div>

        {profileCompletion && profileCompletion.pct < 100 ? (
          <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">Did you know? Completing your profile increases your sales.</div>
                  <div className="text-sm text-muted-foreground">
                    Completion: {profileCompletion.pct}%{profileCompletion.missing.length ? ` · Missing: ${profileCompletion.missing.join(", ")}` : ""}
                  </div>
                </div>
              </div>
              <Button variant="outline" onClick={() => navigate("/user/me")}>
                Complete your profile
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              {myStores && myStores.length > 0 && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Posting As
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="store_id"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select who is posting" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">Individual Seller (Personal)</SelectItem>
                              {myStores.map((store) => (
                                <SelectItem key={store.id} value={store.id}>
                                  Store: {store.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              {estimate !== null ? (
                <Card className="border-border/70">
                  <CardContent className="p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Instant estimate</span>
                      <Badge variant="outline">
                        {estimating ? "Calculating..." : `Rs. ${Number(estimate).toLocaleString()}`}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <FormField
                    control={form.control}
                    name="images"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Photos</FormLabel>
                        <FormControl>
                          <ImageUpload value={field.value} onChange={field.onChange} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="listing_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Listing Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="sell">Sell</SelectItem>
                              <SelectItem value="buy">Buy</SelectItem>
                              <SelectItem value="exchange">Exchange</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Condition</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select condition" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="new">New (Sealed)</SelectItem>
                              <SelectItem value="like_new">Like New</SelectItem>
                              <SelectItem value="used">Used</SelectItem>
                              <SelectItem value="fair">Fair</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={(val) => {
                              field.onChange(val);
                              form.setValue("subcategory", "");
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CATEGORY_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subcategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subcategory</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select subcategory" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subcategories.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand</FormLabel>
                          <FormControl>
                            <Input list="marketplace-brand-list" placeholder="Apple, Samsung, Xiaomi..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input list="marketplace-model-list" placeholder="iPhone 13 Pro, Galaxy S24..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <datalist id="marketplace-brand-list">
                    {BRAND_SUGGESTIONS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                  <datalist id="marketplace-model-list">
                    {modelSuggestions.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ad Title</FormLabel>
                        <FormControl>
                          <Input placeholder="iPhone 13 Pro Max - 256GB" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (NPR)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="available_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pick a Date (Optional)</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                  type="button"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? field.value.toLocaleDateString() : "Pick a date"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Product Specifications</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="specs_storage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Storage</FormLabel>
                        <FormControl>
                          <Input placeholder="128GB, 256GB, 1TB..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="specs_ram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RAM</FormLabel>
                        <FormControl>
                          <Input placeholder="8GB, 16GB..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="specs_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <FormControl>
                          <Input placeholder="Space Gray, Black..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="specs_screen"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Screen</FormLabel>
                        <FormControl>
                          <Input placeholder="6.1-inch, 13.3-inch..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="specs_battery"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Battery / Health</FormLabel>
                        <FormControl>
                          <Input placeholder="100%, 92%, new battery..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="specs_cpu"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Processor</FormLabel>
                        <FormControl>
                          <Input placeholder="M2, i7 12th Gen..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="specs_gpu"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Graphics</FormLabel>
                        <FormControl>
                          <Input placeholder="Integrated, RTX 3050..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Item Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="item_details"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Details (Accessories, faults, warranty)</FormLabel>
                          <span className={cn("text-xs", itemDetailsCount > 500 ? "text-destructive" : "text-muted-foreground")}>
                            {itemDetailsCount}/500 characters
                          </span>
                        </div>
                        <FormControl>
                          <Textarea
                            placeholder="Used · Like new · Any scratch? Box/charger included? Warranty?"
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Public Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Write a clear description buyers will read."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Location & Delivery</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Kathmandu, Pokhara..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="hide_precise_location"
                      render={({ field }) => (
                        <FormItem className="rounded-xl border p-4 flex items-center justify-between">
                          <div className="space-y-1">
                            <FormLabel className="leading-none">Hide my precise location</FormLabel>
                            <div className="text-xs text-muted-foreground">
                              Only shows city-level location on the listing.
                            </div>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location_radius_km"
                      render={({ field }) => (
                        <FormItem className="rounded-xl border p-4">
                          <FormLabel>Location Radius</FormLabel>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <Input
                              type="number"
                              value={field.value}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">km</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="rounded-xl border p-4 space-y-3">
                    <div className="font-semibold">Delivery</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <FormField
                        control={form.control}
                        name="delivery_meetup"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} />
                            </FormControl>
                            <FormLabel className="font-normal">Meetup</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="delivery_home_delivery"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} />
                            </FormControl>
                            <FormLabel className="font-normal">Home delivery</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="delivery_courier"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} />
                            </FormControl>
                            <FormLabel className="font-normal">Courier</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="delivery_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Notes (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Delivery fee, preferred time, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="contact_info"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Info</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number (recommended) or email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="rounded-lg border bg-muted/20 p-4 text-xs text-muted-foreground flex gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      This form may be protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (id ? "Updating..." : "Posting...") : (id ? "Update Listing" : "Post Listing")}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6 lg:sticky lg:top-24 h-fit">
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle>This is what your ad will look like</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="aspect-video rounded-xl border bg-muted overflow-hidden flex items-center justify-center">
                    {watched.images?.[0] ? (
                      <img src={watched.images[0]} alt="Ad preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-sm text-muted-foreground">Add at least 1 photo</div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="secondary" className="capitalize">{watched.condition.replace(/_/g, " ")}</Badge>
                    <div className="font-bold text-primary">Rs. {Number(watched.price || 0).toLocaleString()}</div>
                  </div>

                  <div className="font-semibold leading-snug line-clamp-2">
                    {watched.title?.trim() || "Your listing title"}
                  </div>

                  <div className="text-sm text-muted-foreground line-clamp-1">
                    {[watched.brand, watched.model].filter(Boolean).join(" ") || "Add brand and model (recommended)"}
                  </div>

                  <div className="text-sm text-muted-foreground line-clamp-1">
                    {watched.hide_precise_location ? toCoarseLocation(watched.location) : watched.location || "Add a location"}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Category: {CATEGORY_OPTIONS.find((c) => c.value === watched.category)?.label || watched.category}
                    {watched.subcategory ? ` · ${watched.subcategory}` : ""}
                  </div>
                </CardContent>
              </Card>
            </div>
          </form>
        </Form>
      </div>
      <Footer />
    </div>
  );
}
