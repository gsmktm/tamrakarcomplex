import { format } from "date-fns";
import DOMPurify from "dompurify";
import { useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Award,
  BatteryCharging,
  CheckCircle2,
  Clock,
  Clock3,
  ExternalLink,
  Globe2,
  HardDrive,
  Info,
  Loader2,
  Lock,
  Plus,
  MonitorSmartphone,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShoppingBag,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Store as StoreIcon,
  Tablet,
  Wrench,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useMyStores } from "@/hooks/useMyStores";
import { STORES } from "@/data/storeData";
import { BASIC_TAMRAKAR_STORES } from "@/data/basicStoreData";
import { SEEDED_FALLBACK_STORES, storeDirectoryService, type StoreDirectoryItem } from "@/services/storeDirectoryService";
import { SEO } from "@/components/common/SEO";
import { isAdminRole } from "@/lib/roles";
import { cn, getErrorMessage } from "@/lib/utils";
import type { SellListingRow, StorePageRow, StoreRow } from "@/types/app";
import { sanitizeThemeForPackage } from "@/lib/storeThemeBuilder";
import { absoluteUrl, breadcrumbSchema } from "@/lib/seo";
import { getPublicStoreSlug } from "@/lib/storeRoutes";
import { isDatabaseStoreId, requireAuthoritativeStoreRows } from "@/lib/storeOfferIntegrity";
import { isValidEmail, isValidNepalPhone, normalizeEmail, normalizePhone, sanitizeOptionalText, sanitizeText } from "@/lib/security";

type StoreDetailRow = StoreRow & {
  subscription_tier?: string;
  services?: string[];
  services_json?: string[];
  shop_number?: string | null;
  banner_url?: string | null;
  cover_image_url?: string | null;
  seo_slug?: string | null;
  public_status?: string | null;
  // columns added via migrations — extend the base StoreRow type
  slug?: string | null;
  status?: string | null;
  theme_slug?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  meta_keywords?: string | null;
};

function normalizeStoreIdentifier(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const serviceAccents = [
  "from-blue-500/20 via-cyan-400/5 to-transparent",
  "from-emerald-500/20 via-lime-400/5 to-transparent",
  "from-amber-500/20 via-orange-400/5 to-transparent",
  "from-rose-500/20 via-fuchsia-400/5 to-transparent",
  "from-indigo-500/20 via-blue-400/5 to-transparent",
  "from-teal-500/20 via-emerald-400/5 to-transparent",
];

const serviceIconsBg = [
  "bg-blue-500/15 text-blue-400",
  "bg-emerald-500/15 text-emerald-400",
  "bg-amber-500/15 text-amber-400",
  "bg-rose-500/15 text-rose-400",
  "bg-indigo-500/15 text-indigo-400",
  "bg-teal-500/15 text-teal-400",
];

const tickerItems = [
  "Diamond Service Desk",
  "MacBook Repair",
  "iPhone Screen Repair",
  "iPad Service",
  "Expert Technicians",
  "Fast Turnaround",
  "Transparent Support",
  "Board-Level Repair",
  "Battery Replacement",
  "Trusted Local Store",
  "Data Safety Check",
  "Precision Workflow",
];

function StoreQuickActions({
  storeId,
  isPremiumTheme,
  showOwnerActions,
  reviewCount,
}: {
  storeId: string;
  isPremiumTheme: boolean;
  showOwnerActions?: boolean;
  reviewCount?: number;
}) {
  const actions = [
    { title: "Shop products", description: "Live phones, prices and verified offers", label: "Browse products", href: `/marketplace?store=${storeId}`, icon: ShoppingBag, tone: "from-blue-500/20 to-cyan-500/5 text-blue-400" },
    { title: "Check inventory", description: "See current stock and buying prices", label: "View stock", href: "#inventory", icon: Smartphone, tone: "from-emerald-500/20 to-teal-500/5 text-emerald-400", anchor: true },
    { title: "Exchange a phone", description: "Value your device and upgrade", label: "Start exchange", href: `/exchange-your-phone?store=${storeId}`, icon: ArrowRightLeft, tone: "from-amber-500/20 to-orange-500/5 text-amber-400" },
    { title: "Book a repair", description: "Diagnostics, parts and repair booking", label: "Book repair", href: `/repair/custom?store=${storeId}`, icon: Wrench, tone: "from-fuchsia-500/20 to-rose-500/5 text-fuchsia-400" },
    { title: "Unlock eligibility", description: "Lawful carrier-unlock assessment", label: "Check eligibility", href: `/unlocking?store=${storeId}`, icon: Lock, tone: "from-indigo-500/20 to-violet-500/5 text-indigo-400" },
    { title: "Customer reviews", description: reviewCount ? `${reviewCount} verified customer reviews` : "Ratings and customer experiences", label: "Read reviews", href: "#reviews", icon: Star, tone: "from-yellow-500/20 to-amber-500/5 text-yellow-400", anchor: true },
  ];

  return (
    <div className={cn("mt-8 space-y-4", isPremiumTheme ? "text-white" : "")}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const content = (
            <>
              <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br", action.tone)}><Icon className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className={cn("font-bold", isPremiumTheme ? "text-white" : "text-foreground")}>{action.title}</div>
                <div className={cn("mt-1 text-xs leading-5", isPremiumTheme ? "text-white/50" : "text-muted-foreground")}>{action.description}</div>
                <div className={cn("mt-3 inline-flex items-center text-xs font-bold", isPremiumTheme ? "text-white/80" : "text-primary")}>{action.label}<ArrowUpRight className="ml-1.5 h-3.5 w-3.5" /></div>
              </div>
            </>
          );
          const classes = cn("group flex min-h-36 items-start gap-4 rounded-3xl border p-5 text-left transition-all hover:-translate-y-1 hover:shadow-xl", isPremiumTheme ? "border-white/10 bg-card/5 hover:border-white/20 hover:bg-card/8" : "border-border/60 bg-background/75 hover:border-primary/25");
          return action.anchor
            ? <a key={action.title} href={action.href} className={classes}>{content}</a>
            : <Link key={action.title} to={action.href} className={classes}>{content}</Link>;
        })}
      </div>

      {showOwnerActions ? (
        <div className={cn("flex flex-col gap-4 rounded-3xl border border-dashed p-5 sm:flex-row sm:items-center sm:justify-between", isPremiumTheme ? "border-white/15 bg-card/3" : "border-primary/25 bg-primary/5")}>
          <div className="flex items-center gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Plus className="h-5 w-5" /></div><div><div className="font-bold">Store management</div><div className={cn("text-sm", isPremiumTheme ? "text-white/50" : "text-muted-foreground")}>Add products and manage your live store inventory.</div></div></div>
          <div className="flex gap-2"><Button variant="outline" asChild><Link to="/storeadmin/products">Manage inventory</Link></Button><Button asChild><Link to={`/marketplace/sell?store=${storeId}`}>Add product</Link></Button></div>
        </div>
      ) : null}
    </div>
  );
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function StoreDetail() {
  const params = useParams();
  const id = params.id ?? params.slug ?? params.shop_no;
  const location = useLocation();
  const { user, role } = useAuth();
  const { data: manageableStores = [] } = useMyStores();
  const isAdmin = isAdminRole(role);
  const queryClient = useQueryClient();
  
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [exchangeDialogOpen, setExchangeDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [inquiryDialogOpen, setInquiryDialogOpen] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [purchaseNote, setPurchaseRequestNote] = useState("");
  const [submittingAction, setSubmittingAction] = useState<"purchase" | "inquiry" | "exchange" | "review" | null>(null);

  const handlePurchaseRequest = async () => {
    if (!selectedInventoryItem || !store?.id || submittingAction) return;
    setSubmittingAction("purchase");
    try {
      const result = await storeDirectoryService.createStoreLead(store.id, {
        customer_name: sanitizeText(user?.user_metadata?.full_name || user?.email || "Signed-in customer", 120),
        customer_email: user?.email ? normalizeEmail(user.email) : null,
        customer_phone: null,
        message: sanitizeText(
          `Purchase request for ${selectedInventoryItem.title}.${purchaseNote ? ` Note: ${purchaseNote}` : ""}`,
          1500,
        ),
        lead_type: "purchase",
        status: "new",
        source_page: window.location.pathname,
      });
      if (!result.submitted) throw new Error("The request was not confirmed by the database");
      toast.success(`Request sent to ${store.name} for ${selectedInventoryItem.title}!`);
      setPurchaseDialogOpen(false);
      setSelectedInventoryItem(null);
      setPurchaseRequestNote("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleInquirySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!store?.id || submittingAction) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const phone = normalizePhone(String(values.get("phone") || ""));
    const email = normalizeEmail(String(values.get("email") || ""));
    if (!isValidNepalPhone(phone)) return toast.error("Enter a valid Nepal phone number");
    if (email && !isValidEmail(email)) return toast.error("Enter a valid email address");
    setSubmittingAction("inquiry");
    try {
      const result = await storeDirectoryService.createStoreLead(store.id, {
        customer_name: sanitizeText(String(values.get("name") || ""), 120),
        customer_phone: phone,
        customer_email: email || null,
        message: sanitizeText(String(values.get("message") || ""), 1500),
        lead_type: "inquiry",
        status: "new",
        source_page: window.location.pathname,
      });
      if (!result.submitted) throw new Error("The inquiry was not confirmed by the database");
      toast.success("Inquiry sent! The store will contact you soon.");
      form.reset();
      setInquiryDialogOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleExchangeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!store?.id || submittingAction) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const phone = normalizePhone(String(values.get("phone") || ""));
    const expectedValue = Number(values.get("expected_value"));
    if (!isValidNepalPhone(phone)) return toast.error("Enter a valid Nepal phone number");
    if (!Number.isFinite(expectedValue) || expectedValue <= 0) return toast.error("Enter a valid expected value");
    setSubmittingAction("exchange");
    try {
      const result = await storeDirectoryService.createExchangeRequest(store.id, {
        customer_name: sanitizeText(String(values.get("name") || ""), 120),
        customer_phone: phone,
        old_device: {
          brand: sanitizeText(String(values.get("brand") || ""), 80),
          model: sanitizeText(String(values.get("model") || ""), 120),
          condition: sanitizeText(String(values.get("condition") || "good"), 40),
          storage: "",
          defects: [],
        },
        new_device: {},
        trade_in_value: expectedValue,
        status: "pending",
        notes: sanitizeOptionalText(String(values.get("notes") || ""), 1500),
      });
      if (!result.submitted) throw new Error("The exchange request was not confirmed by the database");
      toast.success("Exchange request sent!");
      form.reset();
      setExchangeDialogOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleReviewSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!store?.id || submittingAction) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    if (reviewRating < 1 || reviewRating > 5) return toast.error("Select a rating from 1 to 5");
    setSubmittingAction("review");
    try {
      const { error, status } = await supabase.from("store_reviews").insert({
        store_id: store.id,
        customer_name: sanitizeText(String(values.get("name") || ""), 120),
        rating: reviewRating,
        review_text: sanitizeText(String(values.get("review") || ""), 2000),
        status: "pending",
      });
      if (error) throw error;
      if (status < 200 || status >= 300) throw new Error("The review was not confirmed by the database");
      toast.success("Thank you! Your review was submitted for moderation.");
      form.reset();
      setReviewDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["store_reviews", store.id] });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmittingAction(null);
    }
  };

  // Determine lookup type based on route
  const isInsideRoute = location.pathname.startsWith('/stores/inside/');
  const isOutsideRoute = location.pathname.startsWith('/stores/outside/');

  const lookupType = isInsideRoute ? 'shop_no' : isOutsideRoute ? 'slug' : 'id_or_slug';
  const isUuid = id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) : false;

  const localStoreFallback = [...STORES, ...SEEDED_FALLBACK_STORES, ...BASIC_TAMRAKAR_STORES].find((item) =>
    item.id === id ||
    item.slug === id ||
    (lookupType === "shop_no" && item.shop_no === id) ||
    item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") === id ||
    (lookupType !== "shop_no" && normalizeStoreIdentifier(item.name) === normalizeStoreIdentifier(id))
  );

  const toLocalStoreFallback = (
    item: (typeof STORES)[number] | (typeof SEEDED_FALLBACK_STORES)[number] | (typeof BASIC_TAMRAKAR_STORES)[number],
  ): StoreDetailRow => ({
    ...(item as unknown as StoreRow),
    slug: item.slug || item.id || "",
    seo_slug: item.slug || item.id || "",
    public_status: "published",
    shop_number: item.shop_no || null,
    banner_url: item.cover_image_url,
    cover_image_url: item.cover_image_url,
    subscription_tier: item.package_slug,
    subscription_status: item.subscription_status,
    subscription_end_date: null,
  });

  const toStoreDetailFallback = (item: StoreDirectoryItem): StoreDetailRow => ({
    ...(item as unknown as StoreRow),
    slug: item.slug || item.seo_slug || item.id,
    seo_slug: item.seo_slug || item.slug || item.id,
    public_status: item.public_status || "published",
    shop_number: item.shop_number || item.shop_no || null,
    banner_url: item.banner_url || item.cover_image_url || null,
    cover_image_url: item.cover_image_url || item.banner_url || null,
    subscription_status: item.subscription_status || "active",
    subscription_end_date: item.subscription_end_date || null,
    subscription_tier: item.subscription_tier || item.package_slug || "free",
  });

  const { data: store, isLoading: isStoreLoading, error: storeError } = useQuery<StoreDetailRow>({
    queryKey: ["store", lookupType, id],
    queryFn: async () => {
      if (!id) throw new Error("missing_store_id");
      try {
        const identifierType = lookupType === "shop_no" ? "shop_no" : isUuid ? "id" : "slug";
        const serviceStore = await storeDirectoryService.getStoreByIdentifier({
          type: identifierType,
          value: id,
          complex_zone: lookupType === "shop_no" ? "inside" : undefined,
        });
        if (serviceStore) return toStoreDetailFallback(serviceStore);
      } catch {
        // The local fallback below keeps seeded profiles available offline.
      }

      if (localStoreFallback) return toLocalStoreFallback(localStoreFallback);
      throw new Error("Store not found");
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 min — store profile changes infrequently
  });

  const { data: products, isLoading: isProductsLoading } = useQuery<SellListingRow[]>({
    queryKey: ["store_products", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      // Local-seed stores carry slug-shaped ids; their uuid store_id tables
      // would 400 on the eq filter, so skip the query entirely.
      if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(store.id)) return [];

      const { data, error } = await supabase
        .from("sell_listings")
        .select("*")
        .eq("store_id", store.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
    staleTime: 3 * 60 * 1000, // 3 min — listings can change more often
  });

  const { data: inventory } = useQuery({
    queryKey: ["store_inventory", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      if (!isDatabaseStoreId(store.id)) return [];
      const { data, error } = await supabase
        .from("store_products")
        .select("*")
        .eq("store_id", store.id)
        .eq("status", "active")
        .gt("stock_quantity", 0)
        .order("created_at", { ascending: false });
      return requireAuthoritativeStoreRows(data, error);
    },
    enabled: !!store?.id,
    staleTime: 3 * 60 * 1000, // 3 min
  });

  const { data: storeReviews } = useQuery({
    queryKey: ["store_reviews", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(store.id)) return [];
      const { data, error } = await supabase
        .from("store_reviews")
        .select("*")
        .eq("store_id", store.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
    staleTime: 5 * 60 * 1000, // 5 min — reviews are slow-changing
  });

  const averageRating = storeReviews?.length 
    ? (storeReviews.reduce((acc: number, r: { rating: number }) => acc + r.rating, 0) / storeReviews.length).toFixed(1)
    : null;

  const { data: storeAccessories } = useQuery({
    queryKey: ["store_accessories", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      if (!isDatabaseStoreId(store.id)) return [];
      const { data, error } = await supabase
        .from("store_accessories")
        .select("*")
        .eq("store_id", store.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return requireAuthoritativeStoreRows(data, error);
    },
    enabled: !!store?.id,
    staleTime: 10 * 60 * 1000, // 10 min — accessories catalogue is stable
  });

  const { data: repairServices } = useQuery({
    queryKey: ["store_repair_services", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      if (!isDatabaseStoreId(store.id)) return [];
      const { data, error } = await supabase
        .from("store_repair_services")
        .select("*")
        .eq("store_id", store.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return requireAuthoritativeStoreRows(data, error);
    },
    enabled: !!store?.id,
    staleTime: 10 * 60 * 1000, // 10 min — repair catalogue is stable
  });

  const { data: pages } = useQuery<StorePageRow[]>({
    queryKey: ["store_pages", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(store?.id)) return [];
      const { data, error } = await supabase
        .from("store_pages")
        .select("*")
        .eq("store_id", store?.id)
        .eq("is_published", true);

      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
    staleTime: 10 * 60 * 1000, // 10 min — CMS pages rarely change
  });

  if (isStoreLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#050816]">
        <Header />
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border border-blue-500/20 bg-blue-500/5" />
              <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-blue-400" />
            </div>
            <p className="text-sm text-white/40 uppercase tracking-[0.2em]">Loading Store</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (storeError || !store) {
    return (
      <div className="flex min-h-screen flex-col bg-[#050816]">
        <Header />
        <div className="container flex flex-1 flex-col items-center justify-center py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
            <StoreIcon className="h-10 w-10 text-red-400" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-white">Store Not Found</h1>
          <p className="mt-2 text-white/50">
            The store you are looking for does not exist or is no longer active.
          </p>
          <Button asChild className="mt-8 rounded-full bg-blue-600 px-8 hover:bg-blue-500">
            <Link to="/stores">Back to Directory</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  // Permission checks:
  // - suadmin/staffadmin can see any store
  // - store owner can see their own store
  // - public can only see "active" stores
  const isAuthorized = 
    (store.status === "active" && (!store.public_status || store.public_status === "published")) || 
    role === "suadmin" || 
    role === "staffadmin" || 
    (user?.id && store.owner_id === user.id) ||
    (user?.id && store.owner_user_id === user.id) ||
    isAdmin;

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen flex-col bg-[#050816]">
        <Header />
          <div className="container flex flex-1 flex-col items-center justify-center py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
              <ShieldCheck className="h-10 w-10 text-amber-400" />
            </div>
          <h1 className="mt-6 text-2xl font-bold text-white">Store Pending Review</h1>
          <p className="mt-2 text-white/50">
            This store is currently inactive or under verification.
          </p>
          <Button asChild className="mt-8 rounded-full bg-blue-600 px-8 hover:bg-blue-500">
            <Link to="/stores">Back to Directory</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const tier = store?.subscription_tier || "free";
  const publicStoreSlug = getPublicStoreSlug(store);
  const isDiamond = tier === "diamond";
  const isGold = tier === "gold";
  const isSilver = tier === "silver";
  const isBasic = tier === "free";
  const showOwnerActions = !!user && (
    user.id === store.owner_id ||
    user.id === store.owner_user_id ||
    isAdmin ||
    manageableStores.some((manageableStore) => manageableStore.id === store.id)
  );

  const services = Array.isArray((store as StoreRow & { services_json?: string[] }).services_json) && (store as StoreRow & { services_json?: string[] }).services_json.length > 0
    ? (store as StoreRow & { services_json?: string[] }).services_json
    : store.services ?? [];
  const publishedPages = pages ?? [];
  const featuredIds = Array.isArray((store as StoreRow & { featured_product_ids?: string[] }).featured_product_ids)
    ? (store as StoreRow & { featured_product_ids?: string[] }).featured_product_ids
    : [];
  const curatedListings = featuredIds.length > 0
    ? (products ?? []).filter((product) => featuredIds.includes(product.id))
    : products ?? [];
  const activeProducts: any[] = curatedListings.length > 0
    ? curatedListings
    : (inventory ?? []).map((item: any) => ({
        ...item,
        category: item.product_type || "new phone",
        price: Number(item.discount_price ?? item.price_sale ?? item.price ?? 0),
        description: item.description || "Current store inventory. Confirm final price, warranty, color and stock before purchase.",
        inventory_source: true,
      }));

  // Theme configuration
  const storeTheme = sanitizeThemeForPackage(tier, store?.theme_slug);
  
  const themes = {
    default: {
      bg: "bg-[#050816]",
      accent: "text-blue-400",
      accentBg: "bg-blue-400",
      border: "border-blue-500/20",
      gradient: "from-blue-500/20 via-cyan-400/5 to-transparent",
      button: "bg-blue-600 hover:bg-blue-500 text-white",
      orb1: "bg-blue-700/20",
      orb2: "bg-cyan-600/15",
      orb3: "bg-indigo-800/18"
    },
    emerald: {
      bg: "bg-[#040d0a]",
      accent: "text-emerald-400",
      accentBg: "bg-emerald-400",
      border: "border-emerald-500/20",
      gradient: "from-emerald-500/20 via-teal-400/5 to-transparent",
      button: "bg-emerald-600 hover:bg-emerald-500 text-white",
      orb1: "bg-emerald-700/20",
      orb2: "bg-teal-600/15",
      orb3: "bg-green-800/18"
    },
    rose: {
      bg: "bg-[#0d0406]",
      accent: "text-rose-400",
      accentBg: "bg-rose-400",
      border: "border-rose-500/20",
      gradient: "from-rose-500/20 via-pink-400/5 to-transparent",
      button: "bg-rose-600 hover:bg-rose-500 text-white",
      orb1: "bg-rose-700/20",
      orb2: "bg-pink-600/15",
      orb3: "bg-purple-800/18"
    },
    basic: {
      bg: "bg-[#101418]",
      accent: "text-slate-100",
      accentBg: "bg-slate-100",
      border: "border-slate-400/20",
      gradient: "from-slate-300/15 via-white/5 to-transparent",
      button: "bg-slate-100 hover:bg-card text-slate-950",
      orb1: "bg-slate-400/10",
      orb2: "bg-card/5",
      orb3: "bg-slate-600/10"
    },
    modern: {
      bg: "bg-[#07120f]",
      accent: "text-teal-300",
      accentBg: "bg-teal-300",
      border: "border-teal-500/20",
      gradient: "from-teal-500/20 via-cyan-400/5 to-transparent",
      button: "bg-teal-500 hover:bg-teal-400 text-slate-950",
      orb1: "bg-teal-700/20",
      orb2: "bg-cyan-600/15",
      orb3: "bg-emerald-800/18"
    },
    editorial: {
      bg: "bg-[#11100d]",
      accent: "text-yellow-200",
      accentBg: "bg-yellow-200",
      border: "border-yellow-200/20",
      gradient: "from-yellow-200/15 via-white/5 to-transparent",
      button: "bg-yellow-200 hover:bg-yellow-100 text-slate-950",
      orb1: "bg-yellow-200/10",
      orb2: "bg-card/5",
      orb3: "bg-stone-500/10"
    },
    premium: {
      bg: "bg-[#050816]",
      accent: "text-blue-400",
      accentBg: "bg-blue-400",
      border: "border-blue-500/20",
      gradient: "from-blue-500/20 via-cyan-400/5 to-transparent",
      button: "bg-blue-600 hover:bg-blue-500 text-white",
      orb1: "bg-blue-700/20",
      orb2: "bg-cyan-600/15",
      orb3: "bg-indigo-800/18"
    },
    luxury: {
      bg: "bg-[#070606]",
      accent: "text-stone-100",
      accentBg: "bg-stone-100",
      border: "border-stone-200/15",
      gradient: "from-stone-100/15 via-white/5 to-transparent",
      button: "bg-stone-100 hover:bg-card text-stone-950",
      orb1: "bg-stone-300/10",
      orb2: "bg-card/5",
      orb3: "bg-zinc-500/10"
    },
    atelier: {
      bg: "bg-[#04100d]",
      accent: "text-emerald-300",
      accentBg: "bg-emerald-300",
      border: "border-emerald-400/20",
      gradient: "from-emerald-400/20 via-lime-300/5 to-transparent",
      button: "bg-emerald-400 hover:bg-emerald-300 text-slate-950",
      orb1: "bg-emerald-600/20",
      orb2: "bg-lime-500/10",
      orb3: "bg-teal-700/15"
    },
    custom: {
      bg: "bg-[#050816]",
      accent: "text-[var(--store-theme-color)]",
      accentBg: "bg-[var(--store-theme-color)]",
      border: "border-white/15",
      gradient: "from-white/10 via-white/5 to-transparent",
      button: "bg-[var(--store-theme-color)] text-white",
      orb1: "bg-card/10",
      orb2: "bg-card/5",
      orb3: "bg-card/8"
    },
    amber: {
      bg: "bg-slate-950",
      accent: "text-amber-400",
      accentBg: "bg-amber-400",
      border: "border-amber-500/20",
      gradient: "from-amber-500/20 via-orange-400/5 to-transparent",
      button: "bg-amber-500 hover:bg-amber-600 text-foreground",
      orb1: "bg-amber-700/20",
      orb2: "bg-orange-600/15",
      orb3: "bg-yellow-800/18"
    }
  };

  // Tier-based theme selection — no heuristics, no fingerprint guessing
  // Diamond gets their chosen theme (or premium blue default)
  // Gold always gets amber/warm dark theme
  // Silver gets light mode (no dark glass)
  const baseTheme = themes[storeTheme as keyof typeof themes] || themes.premium;
  const currentTheme = isGold && !isDiamond ? themes.amber : isDiamond ? baseTheme : themes.default;
  const isPremiumTheme = isDiamond || isGold; // dark glass only for paid dark tiers
  const isDiamondFull = isDiamond; // diamond-exclusive sections (marquee, devices, issues, Apple CTA)
  void isDiamondFull; // used below in JSX via isDiamond directly

  // Public store profiles:
  // - Basic: minimal public profile (no contact details)
  // - Silver: minimal profile to guests, full profile to logged-in users
  // - Gold/Diamond: full profile public
  // ── FREE TIER ────────────────────────────────────────────────────────────
  if (isBasic && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
        <SEO title={store.seo_title || `${store.name} — Store`} description={store.seo_description || store.description || undefined} />
        <Header />
        <main className="flex-1">
          {/* Grayscale hero band */}
          <div className="relative overflow-hidden bg-gradient-to-br from-zinc-200 via-zinc-100 to-white dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(161,161,170,0.18)_0%,_transparent_70%)]" />
            <div className="container relative py-10">
              <Button variant="ghost" asChild className="pl-0 mb-6 text-zinc-500 hover:bg-transparent hover:text-zinc-800 dark:hover:text-zinc-200">
                <Link to="/stores" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Stores
                </Link>
              </Button>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="relative shrink-0">
                  <div className="h-20 w-20 rounded-2xl border-2 border-zinc-300 dark:border-zinc-700 bg-card dark:bg-zinc-800 overflow-hidden flex items-center justify-center shadow-sm">
                    {store.logo_url ? (
                      <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover grayscale" />
                    ) : (
                      <StoreIcon className="h-8 w-8 text-zinc-400" />
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-zinc-300 dark:bg-zinc-600 border-2 border-white dark:border-zinc-950 flex items-center justify-center">
                    <Lock className="h-2.5 w-2.5 text-zinc-600 dark:text-zinc-300" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{store.name}</h1>
                    <Badge className="rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border-0 text-xs font-medium">
                      Free Listing
                    </Badge>
                    {store.is_verified && (
                      <Badge className="rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Verified
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />{store.location}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />Free tier
                    </span>
                  </div>
                  {store.description && (
                    <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400 max-w-xl">{store.description}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="container py-8">
            <div className="mx-auto max-w-3xl space-y-4">
              {Array.isArray(store.services) && store.services.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {store.services.slice(0, 6).map((s) => (
                    <span key={s} className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* Locked contact card */}
              <div className="rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-card dark:bg-zinc-900 p-6">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    <Lock className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200">Contact details hidden</div>
                    <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 leading-5">
                      Phone, email, map, and premium sections require Silver tier or above.
                    </div>
                    <div className="mt-4 space-y-2">
                      {[Phone, Mail, MapPin].map((Icon, i) => (
                        <div key={i} className="flex items-center gap-2 opacity-30 select-none pointer-events-none">
                          <Icon className="h-4 w-4 text-zinc-400 shrink-0" />
                          <div className="h-3 rounded bg-zinc-300 dark:bg-zinc-700" style={{ width: `${[140, 180, 120][i]}px` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Upgrade CTA */}
              <div className="rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-700 p-6 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="font-semibold text-base">Upgrade to unlock your full store profile</div>
                    <div className="mt-1 text-sm text-zinc-400">Silver — Gold — Diamond plans available. Show contact, inventory, pages, and more.</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {showOwnerActions ? (
                      <Button asChild className="rounded-full bg-card text-zinc-900 hover:bg-zinc-100 font-semibold text-sm">
                        <Link to={`/stores/${store.id}/manage`}>
                          <Settings className="mr-2 h-4 w-4" />Manage Store
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild className="rounded-full bg-card text-zinc-900 hover:bg-zinc-100 font-semibold text-sm">
                        <Link to="/stores/pricing">View Plans</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-2xl border bg-card p-4 text-center"><Wrench className="h-6 w-6 mx-auto text-fuchsia-500 mb-2"/><p className="text-sm font-bold">Repair</p><p className="text-xs text-muted-foreground">Diagnostics &amp; parts</p></div>
                <div className="rounded-2xl border bg-card p-4 text-center"><ShoppingBag className="h-6 w-6 mx-auto text-blue-500 mb-2"/><p className="text-sm font-bold">Sales</p><p className="text-xs text-muted-foreground">Phones &amp; accessories</p></div>
                <div className="rounded-2xl border bg-card p-4 text-center"><ArrowRightLeft className="h-6 w-6 mx-auto text-amber-500 mb-2"/><p className="text-sm font-bold">Exchange</p><p className="text-xs text-muted-foreground">Value &amp; upgrade</p></div>
                <div className="rounded-2xl border bg-card p-4 text-center"><Lock className="h-6 w-6 mx-auto text-indigo-500 mb-2"/><p className="text-sm font-bold">Unlocking</p><p className="text-xs text-muted-foreground">Carrier unlock</p></div>
              </div>
              <StoreQuickActions storeId={store.id} isPremiumTheme={false} showOwnerActions={showOwnerActions} reviewCount={storeReviews?.length} />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── SILVER TIER — GUEST (not logged in) ──────────────────────────────────
  if (isSilver && !user && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col bg-muted dark:bg-[#0d1117]">
        <SEO title={store.seo_title || `${store.name} — Store`} description={store.seo_description || store.description || undefined} />
        <Header />
        <main className="flex-1">
          <div className="relative overflow-hidden border-b border-border dark:border-slate-800">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-300/60 via-slate-100/40 to-white dark:from-slate-800/80 dark:via-slate-900/60 dark:to-[#0d1117]" />
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-slate-400/10 dark:bg-muted0/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-80 rounded-full bg-slate-300/20 dark:bg-slate-700/20 blur-3xl" />
            <div className="container relative py-10">
              <Button variant="ghost" asChild className="pl-0 mb-6 text-muted-foreground hover:bg-transparent hover:text-foreground dark:hover:text-slate-200">
                <Link to="/stores" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Stores
                </Link>
              </Button>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="relative shrink-0">
                  <div className="p-0.5 rounded-2xl bg-gradient-to-br from-slate-300 via-white to-slate-400 dark:from-slate-500 dark:via-slate-700 dark:to-slate-600 shadow-lg" style={{width:"fit-content"}}>
                    <div className="rounded-[14px] border border-border dark:border-slate-700 bg-card dark:bg-slate-900 overflow-hidden flex items-center justify-center" style={{height:"80px",width:"80px"}}>
                      {store.logo_url ? (
                        <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
                      ) : (
                        <StoreIcon className="h-8 w-8 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-slate-100">{store.name}</h1>
                    <Badge className="rounded-full bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 text-foreground dark:text-slate-100 border-0 text-xs font-semibold shadow-sm">
                      ✦ Silver
                    </Badge>
                    {store.is_verified && (
                      <Badge className="rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Verified
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />{store.location}
                    </span>
                  </div>
                  {store.description && (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground dark:text-slate-400 max-w-xl">{store.description}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="container py-8">
            <div className="mx-auto max-w-3xl space-y-4">
              {Array.isArray(store.services) && store.services.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {store.services.slice(0, 6).map((s) => (
                    <span key={s} className="inline-flex items-center rounded-full border border-border dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-0.5 text-xs text-muted-foreground dark:text-slate-400 font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <div className="relative overflow-hidden rounded-2xl border border-border dark:border-slate-700 bg-card dark:bg-slate-900 p-6 shadow-sm">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-slate-400/60 dark:via-slate-500/60 to-transparent" />
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 h-10 w-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shrink-0 shadow-sm">
                    <ShieldCheck className="h-5 w-5 text-muted-foreground dark:text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground dark:text-slate-200">Members see the full profile</div>
                    <div className="mt-1 text-sm text-muted-foreground dark:text-slate-400 leading-5">
                      Silver tier stores unlock phone, email, and full contact for logged-in members.
                    </div>
                    <div className="mt-4 space-y-2">
                      {[Phone, Mail, MapPin].map((Icon, i) => (
                        <div key={i} className="flex items-center gap-2 opacity-25 select-none pointer-events-none">
                          <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                          <div className="h-3 rounded-full bg-slate-300 dark:bg-slate-600" style={{ width: `${[150, 190, 130][i]}px` }} />
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button asChild className="rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-card dark:text-foreground text-white font-semibold text-sm shadow-sm">
                        <Link to={`/auth?redirect=/stores/${publicStoreSlug}`}>
                          <Sparkles className="mr-2 h-3.5 w-3.5" />Login / Register
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="rounded-full border-slate-300 dark:border-slate-700 text-sm">
                        <Link to="/stores">Back to Directory</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <StoreQuickActions storeId={store.id} isPremiumTheme={false} reviewCount={storeReviews?.length} />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const initials = store.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const locationLabel = store.location.split(",")[0]?.trim() || store.location;
  
  const diamondBadges = isDiamond
    ? ["Diamond Tier Store", "Premium Experience", locationLabel]
    : isGold
      ? ["Gold Partner Store", locationLabel]
      : [locationLabel];

  const trustPoints = [
    store.is_verified ? "Verified store — trust-first profile" : "Independent store profile",
    store.phone ? "Direct repair line in hero & CTA" : "Contact-ready layout",
    store.website ? "Brand website bridge available" : "Focused in-platform journey",
    activeProducts.length > 0 ? `${activeProducts.length} active listings on-page` : "Ready for inventory listing",
  ];

  // Always use the store's actual services; fall back to tier-appropriate defaults
  const signatureServices = services.length > 0
    ? services
    : isPremiumTheme
      ? ["Device Repair", "Screen Replacement", "Battery Service", "Data Recovery", "Trade-In", "Accessories"]
      : ["Sales", "Support", "Warranty", "Trade-In", "Accessories", "Setup"];

  const workflowSteps = isPremiumTheme
    ? [
        { title: "Book an Appointment", description: "Describe your issue and get a fast route into the service queue.", icon: Smartphone },
        { title: "Get a Clear Quote", description: "Transparent pricing before you commit — no hidden fees.", icon: Award },
        { title: "Confirm Repair", description: "Authorize the work with clear timelines and technician oversight.", icon: Wrench },
        { title: "Collect & Verify", description: "Device tested, collected, and followed up directly by the store.", icon: CheckCircle2 },
      ]
    : [
        { title: "Discover the Store", description: "Find the store via directory, services, and contact details.", icon: StoreIcon },
        { title: "Choose a Service", description: "Browse buying, repair, trade-in, or accessory options.", icon: Star },
        { title: "Get in Touch", description: "Call, map, or visit — direct contact routes from this page.", icon: CheckCircle2 },
        { title: "Complete the Deal", description: "Finalize purchase, repair, or exchange with the store team.", icon: Zap },
      ];

  const premiumPillars = isPremiumTheme
    ? [
        isDiamond ? "Diamond-tier store with premium presentation" : "Gold-tier partner with full contact access",
        "Service categories clearly listed with conversion-ready layout",
        "Live inventory, accessories, and repair catalog visible on page",
        "Direct phone, map, and website contact routes available",
      ]
    : [
        "Silver-tier store — full contact visible to logged-in members",
        "Service-first profile with strong section rhythm",
        "Clear direct actions for contact, map, and website",
        "Ready for inventory and custom page content",
      ];

  type SupportedDeviceCard = {
    title: string;
    subtitle: string;
    description: string;
    icon: LucideIcon;
    color: string;
    accent: string;
    border: string;
    bg?: string;
  };

  const supportedDevices: SupportedDeviceCard[] = isDiamond
    ? [
        {
          title: "MacBook",
          subtitle: "Laptop Repair",
          description: "Diagnostics, liquid-damage checks, keyboard issues, charging faults, and board-level problem isolation.",
          icon: MonitorSmartphone,
          color: "from-blue-600/20 to-blue-900/20",
          accent: "text-blue-400",
          border: "border-blue-500/20",
        },
        {
          title: "iPhone",
          subtitle: "Phone Repair",
          description: "Screen replacement, battery service, camera repair, charging fix, speaker faults, and performance checks.",
          icon: Smartphone,
          color: "from-cyan-600/20 to-cyan-900/20",
          accent: "text-cyan-400",
          border: "border-cyan-500/20",
        },
        {
          title: "iPad",
          subtitle: "Tablet Repair",
          description: "Display issues, battery concerns, software troubleshooting, connectivity problems, and part replacement.",
          icon: Tablet,
          color: "from-indigo-600/20 to-indigo-900/20",
          accent: "text-indigo-400",
          border: "border-indigo-500/20",
        },
      ]
    : [];

  const issueHighlights = isDiamond
    ? [
        { title: "Battery & Power", stat: "01", description: "Fast-draining batteries, charging failure, overheating, and no-power diagnostics.", icon: BatteryCharging, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
        { title: "Screen & Body", stat: "02", description: "Broken display, touch issues, glass damage, frame problems, and hardware inspection.", icon: Smartphone, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
        { title: "Storage & Data", stat: "03", description: "Startup problems, data risk checks, software instability, and storage troubleshooting.", icon: HardDrive, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
        { title: "Turnaround Flow", stat: "04", description: "Quote-first intake, issue verification, repair authorization, and post-service testing.", icon: Clock3, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
      ]
    : [];

  const infoCards = [
    { label: "Service Lines", value: signatureServices.length || 1, note: isPremiumTheme ? "Repair pathways" : "Store services" },
    { label: "Active Listings", value: activeProducts.length, note: activeProducts.length > 0 ? "Live inventory" : "No listings yet" },
    { label: "Published Pages", value: publishedPages.length, note: publishedPages.length > 0 ? "Custom pages" : "Ready for content" },
    { label: "Location", value: store.shop_no ? `#${store.shop_no}` : "Open", note: store.location },
  ];
  const openingHours = ((store as StoreRow & { opening_hours?: Record<string, string> }).opening_hours ?? {}) as Record<string, string>;
  const socialLinks = ((store as StoreRow & { social_links_json?: Record<string, string> }).social_links_json ?? {}) as Record<string, string>;
  const socialLinkEntries = Object.entries(socialLinks)
    .map(([label, value]) => [label, String(value || "").trim()] as const)
    .filter(([, value]) => Boolean(value));
  const publicSocialUrls = socialLinkEntries
    .map(([, value]) => value)
    .filter((value) => /^https?:\/\//i.test(value));
  const banner = ((store as StoreRow & { banner_json?: { title?: string; subtitle?: string; cta_label?: string; cta_url?: string } }).banner_json ?? {}) as {
    title?: string;
    subtitle?: string;
    cta_label?: string;
    cta_url?: string;
  };
  const coverImageUrl = (store as StoreRow & { cover_image_url?: string }).cover_image_url;

  const whatsapp = (store as any).whatsapp || store.phone;
  const whatsappUrl = whatsapp ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}` : null;
  const floor = (store as any).floor;
  const block = (store as any).block;
  const shopNumber = (store as any).shop_number || store.shop_no;
  const openingHoursText = (store as any).opening_hours_text || "10:00 AM - 8:00 PM (Sun-Fri)";

  return (
    <div
      className={`flex min-h-screen flex-col ${isPremiumTheme ? currentTheme.bg : "bg-background"}`}
      style={{ "--store-theme-color": (store as StoreRow & { theme_color?: string }).theme_color || "#2563eb" } as React.CSSProperties}
    >
      <SEO
        title={store.seo_title || store.name}
        description={store.seo_description || store.description || `${store.name} — premium device service page with support, repairs, and direct contact.`}
        image={store.logo_url || coverImageUrl || undefined}
        url={`/stores/${publicStoreSlug}`}
        keywords={[
          store.name,
          ...String(store.meta_keywords || "device repair, store profile, premium service center")
            .split(",")
            .map((keyword) => keyword.trim())
            .filter(Boolean),
        ]}
        structuredData={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Stores", url: "/stores" },
            { name: store.name, url: `/stores/${publicStoreSlug}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: store.name,
            image: store.logo_url || coverImageUrl || undefined,
            description: store.description,
            telephone: store.phone,
            email: store.email,
            url: absoluteUrl(`/stores/${publicStoreSlug}`),
            sameAs: publicSocialUrls,
            address: { "@type": "PostalAddress", streetAddress: store.location, addressLocality: "Kathmandu", addressCountry: "NP" },
            openingHoursSpecification: Object.entries(openingHours).map(([day, hours]) => ({
              "@type": "OpeningHoursSpecification",
              dayOfWeek: day,
              opens: hours?.split("-")[0]?.trim(),
              closes: hours?.split("-")[1]?.trim(),
            })),
          },
        ]}
      />
      <Header />

      <main className="flex-1">

        {/* ─── HERO ─── */}
        <section className={`relative overflow-hidden ${isPremiumTheme ? `${currentTheme.bg} text-white` : "bg-background"}`}>

          {isPremiumTheme && (
            <>
              {/* Animated gradient orbs */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className={`animate-orb-1 absolute left-[-12%] top-[-15%] h-[700px] w-[700px] rounded-full ${currentTheme.orb1} blur-[130px]`} />
                <div className={`animate-orb-2 absolute right-[-8%] top-[10%] h-[500px] w-[500px] rounded-full ${currentTheme.orb2} blur-[110px]`} />
                <div className={`animate-orb-3 absolute bottom-[-15%] left-[35%] h-[600px] w-[600px] rounded-full ${currentTheme.orb3} blur-[120px]`} />
              </div>
              {/* Dot grid */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.025]"
                style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
              />
              {/* Top shimmer line */}
              <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
            </>
          )}

          <div className="container relative py-12 md:py-16">
            {/* Nav row */}
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
              <Button
                variant="ghost"
                asChild
                className={isPremiumTheme ? "pl-0 text-white/50 hover:bg-transparent hover:text-white" : "pl-0 text-muted-foreground hover:bg-transparent"}
              >
                <Link to="/stores" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Stores
                </Link>
              </Button>

              {user && (user.id === store.owner_id || isAdmin) && (
                <Button
                  asChild
                  variant="outline"
                  className={isPremiumTheme ? "gap-2 rounded-full border-white/10 bg-card/5 text-white hover:bg-card/10" : "gap-2 rounded-full"}
                >
                  <Link to={`/stores/${store.id}/manage`}>
                    <Settings className="h-4 w-4" />
                    Manage Store
                  </Link>
                </Button>
              )}
            </div>

            <div className="grid gap-10 xl:grid-cols-[1.25fr_0.75fr] xl:items-start">

              {/* Left */}
              <div>
                {/* Badges */}
                <div className="mb-7 flex flex-wrap items-center gap-3">
                  <Badge
                    className={
                      isPremiumTheme
                        ? `rounded-full border border-white/10 bg-card/5 px-4 py-1.5 text-[11px] uppercase tracking-[0.26em] ${currentTheme.accent} hover:bg-card/10`
                        : "rounded-full bg-foreground px-4 py-1.5 text-[11px] uppercase tracking-[0.26em] text-primary-foreground hover:bg-foreground"
                    }
                  >
                    {isDiamond
                      ? "Diamond Store Experience"
                      : isGold
                        ? "Gold Partner Store"
                        : isSilver
                          ? "Silver Member Store"
                          : "Basic Store"}
                  </Badge>
                  {store.is_verified && (
                    <Badge
                      className={
                        isPremiumTheme
                          ? "rounded-full border border-emerald-400/25 bg-emerald-500/10 px-4 py-1.5 text-[11px] uppercase tracking-[0.26em] text-emerald-300 hover:bg-emerald-500/10"
                          : "rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-sky-700 hover:bg-sky-100"
                      }
                    >
                      <CheckCircle2 className="mr-1.5 h-3 w-3" />
                      Verified Partner
                    </Badge>
                  )}
                </div>

                {/* Logo + Name */}
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                  {/* Logo with glow */}
                  <div className="relative shrink-0">
                    {isPremiumTheme && (
                      <div className={`absolute inset-[-4px] rounded-[32px] ${currentTheme.orb1} blur-xl`} />
                    )}
                    {store.logo_url ? (
                      <img
                        src={store.logo_url}
                        alt={store.name}
                        className={`relative h-24 w-24 rounded-[28px] border object-cover shadow-2xl md:h-32 md:w-32 ${isPremiumTheme ? "border-white/10 bg-card logo-glow" : "border-border"}`}
                      />
                    ) : (
                      <div
                        className={`relative flex h-24 w-24 items-center justify-center rounded-[28px] border text-2xl font-bold shadow-2xl md:h-32 md:w-32 ${
                          isPremiumTheme
                            ? `border-white/10 ${currentTheme.bg} ${currentTheme.accent} logo-glow`
                            : "border-border bg-gradient-to-br from-slate-800 to-slate-900 text-white"
                        }`}
                      >
                        {initials}
                      </div>
                    )}
                  </div>

                  <div className="max-w-2xl">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {isPremiumTheme ? (
                        <h1 className={`${currentTheme.accent} font-display text-5xl font-bold tracking-tight md:text-7xl`}>
                          {store.name}
                        </h1>
                      ) : (
                        <h1 className="font-display text-5xl font-bold tracking-tight md:text-7xl">
                          {store.name}
                        </h1>
                      )}
                      {averageRating && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 text-amber-500 border border-amber-400/20 w-fit">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="text-sm font-bold">{averageRating}</span>
                          <span className="text-[10px] text-amber-500/60 font-medium">({storeReviews?.length})</span>
                        </div>
                      )}
                    </div>
                    <p className={`mt-5 max-w-xl text-[1.05rem] leading-8 ${isPremiumTheme ? "text-white/58" : "text-muted-foreground"}`}>
                      {store.description ||
                        (isPremiumTheme
                          ? `${store.name} is presented as a diamond-tier repair landing page with premium structure, stronger service clarity, and cleaner device-first messaging.`
                          : `${store.name} — premium store experience with clearer service paths, trust signals, and direct contact routes.`)}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2.5">
                      {diamondBadges.map((badge) => (
                        <span
                          key={badge}
                          className={`rounded-full border px-3.5 py-1.5 text-[11px] uppercase tracking-[0.2em] ${
                            isPremiumTheme
                              ? "border-white/10 bg-card/5 text-white/60"
                              : "border-border/60 bg-background/80 text-muted-foreground"
                          }`}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Contact pills */}
                <div className="mt-8 flex flex-wrap gap-2.5">
                  {store.location && (
                    <div className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm backdrop-blur ${isPremiumTheme ? "border-white/10 bg-card/5 text-white/65" : "border-border/60 bg-background/80 text-muted-foreground"}`}>
                      <MapPin className={`h-3.5 w-3.5 ${isPremiumTheme ? currentTheme.accent : "text-primary"}`} />
                      {store.location}
                    </div>
                  )}
                  {shopNumber && (
                    <div className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm backdrop-blur ${isPremiumTheme ? "border-white/10 bg-card/5 text-white/65" : "border-border/60 bg-background/80 text-muted-foreground"}`}>
                      <StoreIcon className={`h-3.5 w-3.5 ${isPremiumTheme ? currentTheme.accent : "text-primary"}`} />
                      Shop #{shopNumber} {floor ? `• Floor ${floor}` : ""} {block ? `• Block ${block}` : ""}
                    </div>
                  )}
                  {openingHoursText && (
                    <div className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm backdrop-blur ${isPremiumTheme ? "border-white/10 bg-card/5 text-white/65" : "border-border/60 bg-background/80 text-muted-foreground"}`}>
                      <Clock3 className={`h-3.5 w-3.5 ${isPremiumTheme ? currentTheme.accent : "text-primary"}`} />
                      {openingHoursText}
                    </div>
                  )}
                  {store.email && (
                    <div className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm backdrop-blur ${isPremiumTheme ? "border-white/10 bg-card/5 text-white/65" : "border-border/60 bg-background/80 text-muted-foreground"}`}>
                      <Mail className={`h-3.5 w-3.5 ${isPremiumTheme ? currentTheme.accent : "text-primary"}`} />
                      {store.email}
                    </div>
                  )}
                </div>

                {/* CTAs */}
                <div className="mt-9 flex flex-wrap gap-4">
                  {store.phone && (
                    <Button
                      size="lg"
                      asChild
                      className={
                        isPremiumTheme
                          ? "group relative overflow-hidden rounded-full bg-blue-600 px-8 text-white shadow-[0_0_24px_rgba(59,130,246,0.4)] hover:bg-blue-500 hover:shadow-[0_0_36px_rgba(59,130,246,0.5)]"
                          : "rounded-full px-8"
                      }
                    >
                      <a href={`tel:${store.phone}`}>
                        <Phone className="mr-2 h-4 w-4" />
                        Call Store
                      </a>
                    </Button>
                  )}
                  {whatsappUrl && (
                    <Button
                      size="lg"
                      asChild
                      className="rounded-full bg-[#25D366] px-8 text-white hover:bg-[#22c35e] shadow-[0_0_24px_rgba(37,211,102,0.3)]"
                    >
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                        <svg className="mr-2 h-5 w-5 fill-current" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        WhatsApp
                      </a>
                    </Button>
                  )}
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full px-8"
                    onClick={() => setExchangeDialogOpen(true)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Exchange Phone
                  </Button>
                  {store.map_url && (
                    <Button
                      size="lg"
                      variant="outline"
                      asChild
                      className={
                        isPremiumTheme
                          ? "rounded-full border-white/12 bg-card/5 px-8 text-white hover:bg-card/10 hover:text-white"
                          : "rounded-full px-8"
                      }
                    >
                      <a href={store.map_url} target="_blank" rel="noopener noreferrer">
                        <MapPin className="mr-2 h-4 w-4" />
                        Open Map
                      </a>
                    </Button>
                  )}
                  {store.website && (
                    <Button
                      size="lg"
                      variant="ghost"
                      asChild
                      className={
                        isPremiumTheme
                          ? "rounded-full px-8 text-white/75 hover:bg-card/5 hover:text-white"
                          : "rounded-full px-8"
                      }
                    >
                      <a href={store.website} target="_blank" rel="noopener noreferrer">
                        Visit Website
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>

                <StoreQuickActions storeId={store.id} isPremiumTheme={isPremiumTheme} showOwnerActions={showOwnerActions} reviewCount={storeReviews?.length} />

                {banner.title ? (
                  <div className={cn("mt-8 rounded-[28px] border p-6", isPremiumTheme ? "border-white/10 bg-card/5 text-white" : "bg-muted/30")}>
                    <div className="text-xl font-bold">{banner.title}</div>
                    {banner.subtitle ? (
                      <p className={cn("mt-2 text-sm leading-6", isPremiumTheme ? "text-white/60" : "text-muted-foreground")}>{banner.subtitle}</p>
                    ) : null}
                    {banner.cta_label && banner.cta_url ? (
                      <Button asChild className={cn("mt-4 rounded-full", isPremiumTheme ? currentTheme.button : "")}>
                        <a href={banner.cta_url}>{banner.cta_label}</a>
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* Right — Glassmorphism cards */}
              <div className="space-y-4">
                {coverImageUrl ? (
                  <div className="overflow-hidden rounded-[32px] border border-white/10 shadow-2xl">
                    <img src={coverImageUrl} alt={`${store.name} cover`} className="aspect-[4/3] w-full object-cover" />
                  </div>
                ) : null}

                <Card
                  className={
                    isPremiumTheme
                      ? "overflow-hidden rounded-[32px] border-white/8 bg-card/5 text-white shadow-2xl backdrop-blur-xl"
                      : "overflow-hidden rounded-[32px] border-border/60 bg-foreground text-primary-foreground shadow-2xl"
                  }
                >
                  <CardContent className="p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className={`text-xs uppercase tracking-[0.26em] ${isPremiumTheme ? "text-white/38" : "text-primary-foreground/55"}`}>
                          Store Pulse
                        </div>
                        <div className="mt-3 text-2xl font-bold">
                          {services.length > 0 ? services[0] : isDiamond ? "Diamond Service Center" : isGold ? "Gold Partner Store" : "Store Services"}
                        </div>
                        <p className={`mt-3 text-sm leading-6 ${isPremiumTheme ? "text-white/55" : "text-primary-foreground/70"}`}>
                          {store.description
                            ? store.description.slice(0, 140)
                            : isPremiumTheme
                              ? `${store.name} — ${tier} tier store with full contact, live inventory, and premium profile.`
                              : "Store profile with service categories, contact routes, and direct links."}
                        </p>
                      </div>
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isPremiumTheme ? "border border-blue-400/20 bg-blue-500/10" : "border border-white/10 bg-card/8"}`}>
                        <Sparkles className={`h-5 w-5 ${isPremiumTheme ? currentTheme.accent : "text-cyan-300"}`} />
                      </div>
                    </div>
                    <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                      {trustPoints.map((item) => (
                        <div
                          key={item}
                          className={`rounded-2xl border p-3.5 text-sm ${isPremiumTheme ? "border-white/8 bg-black/25 text-white/60" : "border-white/10 bg-card/5 text-primary-foreground/75"}`}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-3 sm:grid-cols-2">
                  {infoCards.map((card) => (
                    <Card
                      key={card.label}
                      className={
                        isPremiumTheme
                          ? "rounded-[26px] border-white/8 bg-card/4 backdrop-blur"
                          : "rounded-[26px] border-border/60 bg-card/90 shadow-sm backdrop-blur"
                      }
                    >
                      <CardContent className="p-5">
                        <div className={`text-xs uppercase tracking-[0.22em] ${isPremiumTheme ? "text-white/38" : "text-muted-foreground"}`}>
                          {card.label}
                        </div>
                        <div className={`mt-2.5 text-3xl font-bold ${isPremiumTheme ? "text-white" : ""}`}>
                          {card.value}
                        </div>
                        <p className={`mt-1.5 text-xs leading-5 ${isPremiumTheme ? "text-white/45" : "text-muted-foreground"}`}>
                          {card.note}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {isPremiumTheme && (
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          )}
        </section>

        {/* ─── MARQUEE TICKER — diamond only ─── */}
        {isDiamond && (
          <div className="relative overflow-hidden border-y border-white/6 bg-[#080d1a] py-4">
            <div className="flex">
              <div className="animate-marquee flex shrink-0 items-center gap-0 whitespace-nowrap">
                {[...tickerItems, ...tickerItems].map((item, i) => (
                  <span key={i} className="flex items-center gap-3 px-6 text-sm text-white/45 uppercase tracking-[0.18em]">
                    <span className="h-1 w-1 rounded-full bg-blue-500/60" />
                    {item}
                  </span>
                ))}
              </div>
              <div className="animate-marquee flex shrink-0 items-center gap-0 whitespace-nowrap" aria-hidden>
                {[...tickerItems, ...tickerItems].map((item, i) => (
                  <span key={i} className="flex items-center gap-3 px-6 text-sm text-white/45 uppercase tracking-[0.18em]">
                    <span className="h-1 w-1 rounded-full bg-blue-500/60" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── SERVICES ─── */}
        <section className={`py-16 ${isPremiumTheme ? "bg-[#060b18]" : ""}`}>
          <div className="container">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className={`text-xs font-semibold uppercase tracking-[0.28em] ${isPremiumTheme ? currentTheme.accent : "text-muted-foreground"}`}>
                  {isPremiumTheme ? "Device Service Lines" : "Signature Services"}
                </div>
                <h2 className={`mt-3 text-3xl font-bold tracking-tight md:text-5xl`}>
                  {isPremiumTheme
                    ? `${store.name} — Premium Services`
                    : "Services & what this store offers"}
                </h2>
              </div>
              <Badge
                variant="outline"
                className={`w-fit rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.18em] ${isPremiumTheme ? "border-white/10 text-white/50" : ""}`}
              >
                {signatureServices.length} service categories
              </Badge>
            </div>

            {/* Bento-style service grid */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {signatureServices.map((service, index) => {
                const isFeatured = index === 0;
                return (
                  <Card
                    key={service}
                    className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                      isFeatured ? "xl:col-span-2" : ""
                    } ${
                      isPremiumTheme
                        ? "rounded-[28px] border-white/8 bg-card/4 shadow-none backdrop-blur hover:border-blue-500/20 hover:bg-card/6"
                        : "rounded-[28px] border-border/60 bg-card shadow-card"
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${serviceAccents[index % serviceAccents.length]} opacity-60`} />
                    <CardContent className="relative p-7">
                      <div className="flex items-center justify-between gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isPremiumTheme ? serviceIconsBg[index % serviceIconsBg.length] : "bg-background/90 text-primary"} shadow-sm`}>
                          {index % 3 === 0 ? <Wrench className="h-5 w-5" /> : index % 3 === 1 ? <Zap className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                        </div>
                        <Badge
                          variant="secondary"
                          className={`rounded-full text-[10px] uppercase tracking-[0.18em] ${isPremiumTheme ? "border border-white/10 bg-card/5 text-white/55" : ""}`}
                        >
                          0{index + 1}
                        </Badge>
                      </div>
                      <h3 className={`mt-8 text-2xl font-bold tracking-tight ${isPremiumTheme ? "text-white" : ""}`}>
                        {service}
                      </h3>
                      <p className={`mt-3 text-sm leading-7 ${isPremiumTheme ? "text-white/50" : "text-muted-foreground"}`}>
                        {store.description
                          ? store.description.slice(0, 120)
                          : isPremiumTheme
                            ? `${service} — offered by this ${tier} tier store with priority service flow.`
                            : `${service} available at ${store.name}.`}
                      </p>
                      {isFeatured && isDiamond && (
                        <div className="mt-6 flex flex-wrap gap-2">
                          {["Diamond Store", "Priority Service", "Verified Partner"].map((tag) => (
                            <span key={tag} className={`rounded-full border px-3 py-1 text-xs ${currentTheme.accent} border-current/20 bg-current/10`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── SUPPORTED DEVICES — diamond only ─── */}
        {isDiamond && supportedDevices.length > 0 && (
          <section className="py-16 bg-[#050912]">
            <div className="container">
              <div className="mb-10">
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
                  Supported Apple Devices
                </div>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-5xl">
                  Every Apple device,{" "}
                  <span className="gradient-text-apple">expertly serviced</span>
                </h2>
                <p className="mt-4 max-w-xl text-white/50">
                  {store.name} can highlight MacBook, iPhone, and iPad support in a cleaner, more premium device-service layout.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                {supportedDevices.map((device) => {
                  const Icon = device.icon;
                  return (
                    <div
                      key={device.title}
                      className={`group relative overflow-hidden rounded-[32px] border ${device.border} bg-gradient-to-b ${device.color} p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
                    >
                      {/* Glow orb */}
                      <div className={`absolute right-[-20%] top-[-20%] h-48 w-48 rounded-full ${device.bg || "bg-blue-600/10"} blur-3xl`} />
                      <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border ${device.border} bg-card/5`}>
                        <Icon className={`h-8 w-8 ${device.accent}`} />
                      </div>
                      <div className={`mt-4 text-xs uppercase tracking-[0.22em] ${device.accent}`}>
                        {device.subtitle}
                      </div>
                      <h3 className="mt-2 text-3xl font-bold text-white">{device.title}</h3>
                      <p className="mt-4 text-sm leading-7 text-white/55">{device.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ─── ISSUE HIGHLIGHTS — diamond only ─── */}
        {isDiamond && issueHighlights.length > 0 && (
          <section className="py-16 bg-[#060b18]">
            <div className="container">
              <div className="mb-10">
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
                  Common Repair Paths
                </div>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
                  Identify the issue. Fix it fast.
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {issueHighlights.map((issue) => {
                  const Icon = issue.icon;
                  return (
                    <div
                      key={issue.title}
                      className={`group relative overflow-hidden rounded-[28px] border ${issue.border} bg-card/3 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-card/5`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${issue.bg}`}>
                          <Icon className={`h-6 w-6 ${issue.color}`} />
                        </div>
                        <span className="font-display text-4xl font-bold text-white/8">{issue.stat}</span>
                      </div>
                      <h3 className="mt-6 text-xl font-bold text-white">{issue.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-white/50">{issue.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ─── WORKFLOW ─── */}
        <section className={`py-16 ${isPremiumTheme ? "bg-[#050912]" : "bg-secondary/20"}`}>
          <div className="container">
            <div className="mb-10">
              <div className={`text-xs font-semibold uppercase tracking-[0.28em] ${isPremiumTheme ? currentTheme.accent : "text-muted-foreground"}`}>
                {isPremiumTheme ? "Repair Journey" : "How It Works"}
              </div>
              <h2 className={`mt-3 text-3xl font-bold tracking-tight md:text-4xl ${isPremiumTheme ? "text-white" : ""}`}>
                {isPremiumTheme
                  ? "From diagnosis to delivery — a cleaner repair flow"
                  : "How the store experience flows like a real homepage"}
              </h2>
            </div>

            <div className="grid gap-4 xl:grid-cols-4">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                const isLast = index === workflowSteps.length - 1;
                return (
                  <div key={step.title} className="relative">
                    {/* Connector line */}
                    {!isLast && (
                      <div className="absolute hidden xl:block" style={{ top: "28px", left: "56px", right: "-16px", height: "2px", background: "linear-gradient(90deg, rgba(59,130,246,0.5), rgba(56,189,248,0.15))" }} />
                    )}
                    <Card
                      className={`relative overflow-hidden ${
                        isPremiumTheme
                          ? "rounded-[28px] border-white/8 bg-card/4 backdrop-blur hover:border-blue-500/15 hover:bg-card/6"
                          : "rounded-[28px] border-border/60 bg-card"
                      } transition-all duration-200`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                              isPremiumTheme
                                ? "border border-blue-500/20 bg-blue-500/10"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {isPremiumTheme
                              ? <Icon className="h-5 w-5 text-blue-400" />
                              : <span className="text-sm font-bold">0{index + 1}</span>
                            }
                          </div>
                          {isPremiumTheme && (
                            <span className="font-display text-5xl font-bold text-white/5">0{index + 1}</span>
                          )}
                        </div>
                        <h3 className={`mt-6 text-xl font-bold tracking-tight ${isPremiumTheme ? "text-white" : ""}`}>
                          {step.title}
                        </h3>
                        <p className={`mt-3 text-sm leading-6 ${isPremiumTheme ? "text-white/50" : "text-muted-foreground"}`}>
                          {step.description}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <Dialog open={inquiryDialogOpen} onOpenChange={setInquiryDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Send Inquiry to {store?.name}</DialogTitle>
              <DialogDescription>
                Ask about availability, pricing, or services.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4 py-4" onSubmit={handleInquirySubmit}>
              <div className="space-y-2">
                <Label>Your Name</Label>
                <Input name="name" placeholder="John Doe" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input name="phone" placeholder="98XXXXXXXX" required />
                </div>
                <div className="space-y-2">
                  <Label>Email (Optional)</Label>
                  <Input name="email" type="email" placeholder="john@example.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Your Message</Label>
                <Textarea name="message" placeholder="I am interested in..." required />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submittingAction !== null}>
                  {submittingAction === "inquiry" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Inquiry
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={exchangeDialogOpen} onOpenChange={setExchangeDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Exchange Your Phone</DialogTitle>
              <DialogDescription>
                Get a valuation from {store?.name} for your old device.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4 py-4" onSubmit={handleExchangeSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Your Name</Label>
                  <Input name="name" placeholder="John Doe" required />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input name="phone" placeholder="98XXXXXXXX" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Device Brand</Label>
                  <Input name="brand" placeholder="e.g. Samsung" required />
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input name="model" placeholder="e.g. S24 Ultra" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select name="condition" defaultValue="good">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent (Like New)</SelectItem>
                    <SelectItem value="good">Good (Minor Scratches)</SelectItem>
                    <SelectItem value="fair">Fair (Visible Wear)</SelectItem>
                    <SelectItem value="damaged">Damaged (Broken Screen/etc)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expected Value (NPR)</Label>
                <Input name="expected_value" type="number" placeholder="50000" required />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea name="notes" placeholder="Anything else we should know?" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submittingAction !== null}>
                  {submittingAction === "exchange" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Request
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── LIVE INVENTORY ─── */}
        {(inventory?.length ?? 0) > 0 && activeProducts.length === 0 && (
          <section id="inventory" className={`py-20 ${isPremiumTheme ? "bg-[#080d1a]" : "bg-muted/30"}`}>
            <div className="container">
              <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className={`text-xs font-semibold uppercase tracking-[0.28em] ${isPremiumTheme ? currentTheme.accent : "text-muted-foreground"}`}>
                    Live Mobile Shop
                  </div>
                  <h2 className={`mt-3 text-3xl font-bold tracking-tight md:text-5xl ${isPremiumTheme ? "text-white" : ""}`}>
                    Available Stock & Live Prices
                  </h2>
                  <p className={`mt-4 max-w-xl ${isPremiumTheme ? "text-white/50" : "text-muted-foreground"}`}>
                    Browse our real-time inventory. Prices are updated daily to give you the best deals.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    className={`rounded-full px-4 py-1.5 text-xs ${isPremiumTheme ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "bg-emerald-500 text-white"}`}
                  >
                    {inventory?.length} models in stock
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {inventory?.map((item: any) => (
                  <Card
                    key={item.id}
                    className={`group relative flex flex-col overflow-hidden transition-all duration-500 hover:-translate-y-2 ${
                      isPremiumTheme
                        ? "rounded-[32px] border-white/8 bg-card/4 shadow-none hover:border-emerald-500/30 hover:shadow-[0_30px_70px_rgba(16,185,129,0.15)]"
                        : "rounded-[32px] border-border/60 bg-card shadow-card hover:shadow-2xl"
                    }`}
                  >
                    <div className={`relative aspect-[4/3] overflow-hidden ${isPremiumTheme ? "bg-card/3" : "bg-muted/30"}`}>
                      {(Array.isArray(item.images) && item.images.length > 0) ? (
                        <img
                          src={item.images[0]}
                          alt={item.title}
                          className="h-full w-full object-contain p-8 transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Smartphone className={`h-16 w-16 ${isPremiumTheme ? "text-white/10" : "text-muted-foreground/20"}`} />
                        </div>
                      )}
                      
                      <div className="absolute left-4 top-4 flex flex-col gap-2">
                        <Badge className="w-fit rounded-full bg-emerald-500/90 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md border-none px-3 py-1">
                          {item.condition === 'new' ? 'Brand New' : item.condition.replace('_', ' ')}
                        </Badge>
                        {item.stock_quantity <= 3 && (
                          <Badge className="w-fit rounded-full bg-rose-500/90 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md border-none px-3 py-1">
                            Only {item.stock_quantity} Left
                          </Badge>
                        )}
                      </div>

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center backdrop-blur-[2px]">
                         <Button 
                          variant="secondary"
                          className="rounded-full font-bold shadow-xl"
                          onClick={() => {
                            setSelectedInventoryItem(item);
                            setPurchaseDialogOpen(true);
                          }}
                        >
                          Quick Inquiry
                        </Button>
                      </div>
                    </div>

                    <CardContent className="flex flex-1 flex-col p-7">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${isPremiumTheme ? "text-white/40" : "text-muted-foreground"}`}>
                            {item.product_type || "Store product"}
                          </p>
                          <h3 className={`mt-1 text-xl font-bold tracking-tight ${isPremiumTheme ? "text-white" : ""}`}>
                            {item.title}
                          </h3>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.storage && (
                          <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-medium ${isPremiumTheme ? "border-white/10 bg-card/5 text-white/60" : "bg-muted"}`}>
                            <HardDrive className="h-3 w-3" />
                            {item.storage}
                          </div>
                        )}
                        {item.color && (
                          <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-medium ${isPremiumTheme ? "border-white/10 bg-card/5 text-white/60" : "bg-muted"}`}>
                            <Zap className="h-3 w-3" />
                            {item.color}
                          </div>
                        )}
                      </div>

                      <div className="mt-auto pt-8 flex items-end justify-between">
                        <div>
                          <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${isPremiumTheme ? "text-emerald-400" : "text-emerald-600"}`}>
                            Store Price
                          </p>
                          <div className={`text-3xl font-black tracking-tight ${isPremiumTheme ? "text-white" : "text-primary"}`}>
                            Rs. {item.price.toLocaleString()}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className={`rounded-2xl px-6 h-11 font-bold ${isPremiumTheme ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_10px_30px_rgba(16,185,129,0.3)]" : "bg-emerald-600 shadow-lg shadow-emerald-600/20"}`}
                          onClick={() => {
                            setSelectedInventoryItem(item);
                            setPurchaseDialogOpen(true);
                          }}
                        >
                          Check Stock
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Purchase Dialog */}
        <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Contact {store?.name}</DialogTitle>
              <DialogDescription>
                Request price and availability for {selectedInventoryItem?.title}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl border">
                <div className="h-16 w-16 bg-card rounded-xl border flex items-center justify-center overflow-hidden shrink-0">
                  {Array.isArray(selectedInventoryItem?.images) && selectedInventoryItem.images.length > 0 ? (
                    <img src={selectedInventoryItem.images[0]} className="h-full w-full object-contain" />
                  ) : (
                    <Smartphone className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold">{selectedInventoryItem?.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {[selectedInventoryItem?.storage, selectedInventoryItem?.color, selectedInventoryItem?.condition].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-lg font-black text-primary mt-1">Rs. {selectedInventoryItem?.price?.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Your Message (Optional)</Label>
                <Textarea 
                  placeholder="I'm interested in this model. Is it available in stock?"
                  value={purchaseNote}
                  onChange={(e) => setPurchaseRequestNote(e.target.value)}
                />
              </div>

              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3">
                <Info className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  The store will contact you on your registered phone number/email to finalize the purchase.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPurchaseDialogOpen(false)}>Cancel</Button>
              <Button className="bg-primary text-white" onClick={handlePurchaseRequest} disabled={submittingAction !== null}>
                {submittingAction === "purchase" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── REPAIR SERVICES ─── */}
        {(repairServices?.length ?? 0) > 0 && (
          <section className={`py-16 ${isPremiumTheme ? "bg-[#060b18]" : "bg-muted/10"}`}>
            <div className="container">
              <div className="mb-10">
                <div className={`text-xs font-semibold uppercase tracking-[0.28em] ${isPremiumTheme ? currentTheme.accent : "text-muted-foreground"}`}>
                  Store Services
                </div>
                <h2 className={`mt-3 text-3xl font-bold tracking-tight md:text-4xl ${isPremiumTheme ? "text-white" : ""}`}>
                  Repair & Unlock Services
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {repairServices?.map((service: any) => (
                  <Card key={service.id} className={`${isPremiumTheme ? "bg-card/5 border-white/10 text-white" : ""}`}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold">{service.service_name}</h3>
                          <Badge variant="outline" className="mt-1">{service.device_type}</Badge>
                        </div>
                        <Wrench className="h-6 w-6 text-primary" />
                      </div>
                      <p className={`mt-4 text-sm ${isPremiumTheme ? "text-white/60" : "text-muted-foreground"}`}>
                        {service.description || "Expert repair service provided by certified technicians."}
                      </p>
                      <div className="mt-6 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4" />
                          {service.estimated_time}
                        </div>
                        <div className="text-lg font-bold text-primary">
                          {service.estimated_price ? `Rs. ${service.estimated_price.toLocaleString()}` : "Contact for Quote"}
                        </div>
                      </div>
                      <Button className="mt-5 w-full" asChild>
                        <Link to={String(service.device_type || "").toLowerCase().includes("unlock")
                          ? `/unlocking?store=${store.id}`
                          : `/repair/custom?store=${store.id}&service=${encodeURIComponent(service.service_name)}`}>
                          {String(service.device_type || "").toLowerCase().includes("unlock") ? "Check unlock eligibility" : "Book assessment"}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── ACCESSORIES ─── */}
        {(storeAccessories?.length ?? 0) > 0 && (
          <section id="accessories" className={`py-20 ${isPremiumTheme ? "bg-[#050912]" : "bg-background"}`}>
            <div className="container">
              <div className="mb-12">
                <div className={`text-xs font-semibold uppercase tracking-[0.28em] ${isPremiumTheme ? currentTheme.accent : "text-muted-foreground"}`}>
                  Shop Accessories
                </div>
                <h2 className={`mt-3 text-3xl font-bold tracking-tight md:text-5xl ${isPremiumTheme ? "text-white" : ""}`}>
                  Premium Add-ons & Gear
                </h2>
                <p className={`mt-4 max-w-xl ${isPremiumTheme ? "text-white/50" : "text-muted-foreground"}`}>
                  From protective cases to high-speed chargers, find the perfect companion for your device.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {storeAccessories?.map((acc: any) => (
                  <Card 
                    key={acc.id} 
                    className={`group relative flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                      isPremiumTheme 
                        ? "bg-card/5 border-white/10 text-white hover:bg-card/8 hover:border-white/20"
                        : "border-border/60 hover:shadow-lg"
                    }`}
                  >
                    <div className="relative aspect-square bg-muted/20 overflow-hidden">
                      {acc.images?.[0] ? (
                        <img 
                          src={acc.images[0]} 
                          alt={acc.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Plus className={`h-10 w-10 ${isPremiumTheme ? "text-white/10" : "text-muted-foreground/20"}`} />
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center backdrop-blur-[1px]">
                         <Button 
                          size="sm"
                          variant="secondary"
                          className="rounded-full font-bold shadow-lg"
                          onClick={() => {
                            // Can add a specific accessory inquiry dialog here later
                            setInquiryDialogOpen(true);
                          }}
                        >
                          Inquire
                        </Button>
                      </div>
                    </div>
                    <CardContent className="flex flex-1 flex-col p-5">
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${isPremiumTheme ? "text-white/40" : "text-muted-foreground"}`}>
                        {acc.category}
                      </p>
                      <h3 className={`mt-1 font-bold text-sm line-clamp-2 leading-snug ${isPremiumTheme ? "text-white" : ""}`}>
                        {acc.title}
                      </h3>
                      <div className="mt-auto pt-4 flex items-center justify-between">
                        <span className={`font-black text-lg ${isPremiumTheme ? currentTheme.accent : "text-primary"}`}>
                          Rs. {acc.price?.toLocaleString()}
                        </span>
                        {acc.stock_quantity > 0 ? (
                          <Badge variant="outline" className="text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                            In Stock
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] font-bold uppercase bg-rose-500/10 text-rose-500 border-rose-500/20">
                            Out of Stock
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── PRODUCTS ─── */}
        {(isProductsLoading || activeProducts.length > 0) && (
        <section id="inventory" className={`scroll-mt-24 py-16 ${isPremiumTheme ? "bg-[#060b18]" : "bg-secondary/20"}`}>
          <div className="container">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className={`text-xs font-semibold uppercase tracking-[0.28em] ${isPremiumTheme ? currentTheme.accent : "text-muted-foreground"}`}>
                  Product Floor
                </div>
                <h2 className={`mt-3 text-3xl font-bold tracking-tight md:text-4xl ${isPremiumTheme ? "text-white" : ""}`}>
                  {isPremiumTheme ? "Inventory, accessories & active offers" : "Latest arrivals & active offers"}
                </h2>
              </div>
              {activeProducts.length > 0 && (
                <Badge
                  className={`w-fit rounded-full px-4 py-1.5 text-xs ${isPremiumTheme ? "border border-blue-500/20 bg-blue-500/10 text-blue-300" : ""}`}
                >
                  {activeProducts.length} live listings
                </Badge>
              )}
            </div>

            {isProductsLoading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`h-[320px] animate-pulse rounded-[28px] ${isPremiumTheme ? "bg-card/4" : "bg-muted"}`} />
                ))}
              </div>
            ) : activeProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {activeProducts.map((product, index) => (
                  <Card
                    key={product.id}
                    className={`group overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                      isPremiumTheme
                        ? "rounded-[28px] border-white/8 bg-card/4 shadow-none hover:border-blue-500/20 hover:shadow-[0_20px_60px_rgba(59,130,246,0.12)]"
                        : "rounded-[28px] border-border/60 bg-card shadow-card hover:shadow-xl"
                    }`}
                  >
                    <div className={`relative aspect-square overflow-hidden ${isPremiumTheme ? "bg-card/3" : "bg-muted/30"}`}>
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className={`flex h-full items-center justify-center ${isPremiumTheme ? "bg-gradient-to-br from-blue-950 to-slate-950" : "bg-gradient-to-br from-slate-100 to-slate-200"}`}>
                          <div className="text-center">
                            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${isPremiumTheme ? "bg-card/8" : "bg-card/60"}`}>
                              <StoreIcon className={`h-7 w-7 ${isPremiumTheme ? "text-white/40" : "text-muted-foreground"}`} />
                            </div>
                            <div className={`mt-3 text-xs uppercase tracking-[0.22em] ${isPremiumTheme ? "text-white/30" : "text-muted-foreground"}`}>
                              Listing Preview
                            </div>
                          </div>
                        </div>
                      )}
                      <Badge
                        className={`absolute left-4 top-4 rounded-full ${isPremiumTheme ? "border-white/10 bg-black/50 text-white backdrop-blur" : ""}`}
                        variant={product.condition === "new" ? "default" : "secondary"}
                      >
                        {(product.condition || "active").replace("_", " ")}
                      </Badge>
                      <div className={`absolute bottom-4 right-4 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur ${isPremiumTheme ? "bg-card/10 text-white/60" : "bg-background/90 shadow-sm"}`}>
                        #{index + 1}
                      </div>
                    </div>

                    <CardContent className="p-5">
                      <div className={`text-xs uppercase tracking-[0.22em] ${isPremiumTheme ? "text-white/38" : "text-muted-foreground"}`}>
                        {product.category}
                      </div>
                      <h3 className={`mt-2.5 line-clamp-2 text-lg font-bold tracking-tight transition-colors ${isPremiumTheme ? "text-white group-hover:text-blue-300" : "group-hover:text-primary"}`}>
                        {product.inventory_source && !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(product.id)
                          ? product.title
                          : <Link to={`/marketplace/listing/${product.id}`}>{product.title}</Link>}
                      </h3>
                      <div className={`mt-3 text-2xl font-bold ${isPremiumTheme ? currentTheme.accent : "text-primary"}`}>
                        Rs. {product.price.toLocaleString()}
                      </div>
                      <p className={`mt-2.5 line-clamp-2 text-sm leading-6 ${isPremiumTheme ? "text-white/45" : "text-muted-foreground"}`}>
                        {product.description || "Explore this listing for detailed specs, pricing, and direct store contact."}
                      </p>
                      {product.inventory_source && !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(product.id) ? (
                        <Button className={`mt-5 w-full rounded-full ${isPremiumTheme ? "bg-blue-600/80 text-white hover:bg-blue-600" : ""}`} onClick={() => { setSelectedInventoryItem(product); setPurchaseDialogOpen(true); }}>
                          Check stock <ShoppingBag className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button className={`mt-5 w-full rounded-full ${isPremiumTheme ? "bg-blue-600/80 text-white hover:bg-blue-600" : ""}`} asChild>
                          <Link to={`/marketplace/listing/${product.id}`}>View & buy <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card
                className={`rounded-[32px] border-dashed ${isPremiumTheme ? "border-white/10 bg-card/3" : "border-border/60 bg-card/70"}`}
              >
                <CardContent className="p-12 text-center">
                  <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${isPremiumTheme ? "border border-white/10 bg-card/5" : "bg-secondary"}`}>
                    <StoreIcon className={`h-8 w-8 ${isPremiumTheme ? "text-white/30" : "text-primary"}`} />
                  </div>
                  <h3 className={`mt-6 text-xl font-bold ${isPremiumTheme ? "text-white" : ""}`}>No live listings yet</h3>
                  <p className={`mx-auto mt-3 max-w-md text-sm leading-6 ${isPremiumTheme ? "text-white/45" : "text-muted-foreground"}`}>
                    Once this store adds active listings, they'll appear here as a stronger merchandise section.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
        )}

        {/* ─── BRAND STORY + CONTACT ─── */}
        <section className={`py-16 ${isPremiumTheme ? "bg-[#050912]" : ""}`}>
          <div className="container">
            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">

              {/* Brand story card */}
              <Card
                className={
                  isPremiumTheme
                    ? "relative overflow-hidden rounded-[32px] border-white/8 bg-gradient-to-b from-white/6 to-transparent shadow-2xl backdrop-blur"
                    : "overflow-hidden rounded-[32px] border-border/60 bg-foreground text-primary-foreground shadow-elevated"
                }
              >
                {isPremiumTheme && (
                  <div className="absolute right-[-20%] top-[-20%] h-64 w-64 rounded-full bg-blue-600/15 blur-3xl" />
                )}
                <CardContent className="relative p-8 md:p-10">
                  <div className={`text-xs uppercase tracking-[0.26em] ${isPremiumTheme ? currentTheme.accent : "text-primary-foreground/55"}`}>
                    Brand Story
                  </div>
                  <h2 className={`mt-3 text-3xl font-bold tracking-tight ${isPremiumTheme ? "text-white" : "text-primary-foreground"}`}>
                    {isDiamond
                      ? "Diamond-tier store — premium experience"
                      : isPremiumTheme
                        ? "Gold-tier partner — full access profile"
                        : "A store profile that feels like a destination"}
                  </h2>
                  <p className={`mt-4 max-w-xl text-sm leading-7 ${isPremiumTheme ? "text-white/55" : "text-primary-foreground/76"}`}>
                    {store.description ||
                      `${store.name} — a premium device-service page with stronger structure, direct conversion paths, and clearer trust framing.`}
                  </p>
                  <div className="mt-8 space-y-3">
                    {premiumPillars.map((item) => (
                      <div
                        key={item}
                        className={`flex items-start gap-3 rounded-2xl border p-4 ${
                          isPremiumTheme
                            ? "border-white/8 bg-card/4"
                            : "border-white/10 bg-card/5"
                        }`}
                      >
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                        <span className={`text-sm leading-6 ${isPremiumTheme ? "text-white/65" : "text-primary-foreground/80"}`}>
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Contact + Policy */}
              <div className="space-y-5">
                <Card className={isPremiumTheme ? "rounded-[30px] border-white/8 bg-card/4 backdrop-blur" : "rounded-[30px] border-border/60"}>
                  <CardContent className="p-7">
                    <div className={`text-xs font-semibold uppercase tracking-[0.26em] ${isPremiumTheme ? currentTheme.accent : "text-muted-foreground"}`}>
                      Visit The Store
                    </div>
                    <h3 className={`mt-3 text-2xl font-bold tracking-tight ${isPremiumTheme ? "text-white" : ""}`}>
                      {store.location}
                    </h3>
                    <p className={`mt-3 text-sm leading-6 ${isPremiumTheme ? "text-white/50" : "text-muted-foreground"}`}>
                      {isPremiumTheme
                        ? "Contact the store directly for diagnostics, repair quotes, pickup coordination, or directions to the service desk."
                        : "Move quickly from discovery into a call, map action, or website handoff."}
                    </p>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {store.phone && (
                        <a
                          href={`tel:${store.phone}`}
                          className={`group rounded-2xl border p-4 transition-all ${isPremiumTheme ? "border-white/8 bg-card/3 hover:border-blue-500/20 hover:bg-blue-500/5" : "border-border/60 hover:bg-secondary/50"}`}
                        >
                          <Phone className={`h-5 w-5 ${isPremiumTheme ? currentTheme.accent : "text-primary"}`} />
                          <div className={`mt-3 text-sm font-semibold ${isPremiumTheme ? "text-white" : ""}`}>
                            {isPremiumTheme ? "Service Desk" : "Call"}
                          </div>
                          <div className={`mt-1 text-sm ${isPremiumTheme ? "text-white/50" : "text-muted-foreground"}`}>{store.phone}</div>
                        </a>
                      )}
                      {store.email && (
                        <a
                          href={`mailto:${store.email}`}
                          className={`group rounded-2xl border p-4 transition-all ${isPremiumTheme ? "border-white/8 bg-card/3 hover:border-blue-500/20 hover:bg-blue-500/5" : "border-border/60 hover:bg-secondary/50"}`}
                        >
                          <Mail className={`h-5 w-5 ${isPremiumTheme ? currentTheme.accent : "text-primary"}`} />
                          <div className={`mt-3 text-sm font-semibold ${isPremiumTheme ? "text-white" : ""}`}>Email</div>
                          <div className={`mt-1 text-sm ${isPremiumTheme ? "text-white/50" : "text-muted-foreground"}`}>{store.email}</div>
                        </a>
                      )}
                      {store.map_url && (
                        <a
                          href={store.map_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`group rounded-2xl border p-4 transition-all ${isPremiumTheme ? "border-white/8 bg-card/3 hover:border-blue-500/20 hover:bg-blue-500/5" : "border-border/60 hover:bg-secondary/50"}`}
                        >
                          <MapPin className={`h-5 w-5 ${isPremiumTheme ? currentTheme.accent : "text-primary"}`} />
                          <div className={`mt-3 text-sm font-semibold ${isPremiumTheme ? "text-white" : ""}`}>Map</div>
                          <div className={`mt-1 text-sm ${isPremiumTheme ? "text-white/50" : "text-muted-foreground"}`}>Get directions</div>
                        </a>
                      )}
                      {store.website && (
                        <a
                          href={store.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`group rounded-2xl border p-4 transition-all ${isPremiumTheme ? "border-white/8 bg-card/3 hover:border-blue-500/20 hover:bg-blue-500/5" : "border-border/60 hover:bg-secondary/50"}`}
                        >
                          <Globe2 className={`h-5 w-5 ${isPremiumTheme ? currentTheme.accent : "text-primary"}`} />
                          <div className={`mt-3 text-sm font-semibold ${isPremiumTheme ? "text-white" : ""}`}>Website</div>
                          <div className={`mt-1 text-sm ${isPremiumTheme ? "text-white/50" : "text-muted-foreground"}`}>Visit main site</div>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className={isPremiumTheme ? "rounded-[30px] border-white/8 bg-card/4 backdrop-blur" : "rounded-[30px] border-border/60"}>
                  <CardContent className="p-7">
                    <div className={`text-xs font-semibold uppercase tracking-[0.26em] ${isPremiumTheme ? currentTheme.accent : "text-muted-foreground"}`}>
                      Service Policy
                    </div>
                    <h3 className={`mt-3 text-2xl font-bold tracking-tight ${isPremiumTheme ? "text-white" : ""}`}>
                      {isPremiumTheme ? "Clear expectations before repair" : "Simple, trust-first policies"}
                    </h3>
                    <div className="mt-5 space-y-3">
                      {[
                        {
                          title: isPremiumTheme ? "Service Assurance" : "Warranty Approach",
                          body: isPremiumTheme
                            ? "Use this section to describe your repair assurance, support coverage, and how customers should contact the store after service."
                            : "New products follow manufacturer or store-backed warranty handling. Pre-owned items should be clarified at the point of sale.",
                        },
                        {
                          title: "Before You Visit",
                          body: isPremiumTheme
                            ? "Call ahead to describe your issue and get a rough diagnosis. We'll confirm parts availability and repair timeline before you drop off."
                            : "Call ahead for current stock, exchange terms, service timing, and documentation required for repairs or trade-ins.",
                        },
                      ].map((policy) => (
                        <div
                          key={policy.title}
                          className={`rounded-2xl border p-4 ${isPremiumTheme ? "border-white/8 bg-card/3" : "border-border/60"}`}
                        >
                          <div className={`font-semibold ${isPremiumTheme ? "text-white" : ""}`}>{policy.title}</div>
                          <p className={`mt-2 text-sm leading-6 ${isPremiumTheme ? "text-white/50" : "text-muted-foreground"}`}>
                            {policy.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {Object.keys(openingHours).length > 0 ? (
                  <Card className={isPremiumTheme ? "rounded-[28px] border-white/8 bg-card/5 text-white backdrop-blur-xl" : "rounded-[28px]"}>
                    <CardContent className="p-6">
                      <div className="mb-4 flex items-center gap-2 font-semibold">
                        <Clock3 className={`h-4 w-4 ${isPremiumTheme ? currentTheme.accent : "text-primary"}`} />
                        Opening Hours
                      </div>
                      <div className="grid gap-2 text-sm">
                        {Object.entries(openingHours).map(([day, hours]) => (
                          hours ? (
                            <div key={day} className="flex justify-between gap-4">
                              <span className={isPremiumTheme ? "text-white/55" : "text-muted-foreground"}>{day}</span>
                              <span className="font-medium">{hours}</span>
                            </div>
                          ) : null
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {socialLinkEntries.length > 0 ? (
                  <Card className={isPremiumTheme ? "rounded-[28px] border-white/8 bg-card/5 text-white backdrop-blur-xl" : "rounded-[28px]"}>
                    <CardContent className="p-6">
                      <div className="mb-4 font-semibold">More Contacts</div>
                      <div className="flex flex-wrap gap-2">
                        {socialLinkEntries.map(([label, value]) => {
                          const isUrl = /^https?:\/\//i.test(value);
                          const isPhone = /phone|mobile|tel|whatsapp|viber/i.test(label) || /^[+\d\s()-]{7,}$/.test(value);
                          const href = isUrl ? value : isPhone ? `tel:${value.replace(/[^+\d]/g, "")}` : value;

                          return (
                            <Button key={label} asChild size="sm" variant="outline" className={isPremiumTheme ? "rounded-full border-white/10 bg-card/5 text-white hover:bg-card/10 hover:text-white" : "rounded-full"}>
                              <a href={href} target={isUrl ? "_blank" : undefined} rel={isUrl ? "noopener noreferrer" : undefined}>
                                {label.replace(/_/g, " ")}
                                {isUrl ? <ExternalLink className="ml-2 h-3.5 w-3.5" /> : null}
                              </a>
                            </Button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* ─── CUSTOM PAGES ─── */}
        {publishedPages.length > 0 && (
          <section className={`pb-16 ${isPremiumTheme ? "bg-[#060b18]" : ""}`}>
            <div className="container">
              <div className="mb-8">
                <div className={`text-xs font-semibold uppercase tracking-[0.28em] ${isPremiumTheme ? currentTheme.accent : "text-muted-foreground"}`}>
                  Inside The Brand
                </div>
                <h2 className={`mt-3 text-3xl font-bold tracking-tight md:text-4xl ${isPremiumTheme ? "text-white" : ""}`}>
                  Custom pages & brand content
                </h2>
              </div>
              <div className="grid gap-5 xl:grid-cols-2">
                {publishedPages.map((page, index) => (
                  <Card
                    key={page.id}
                    className={`overflow-hidden ${isPremiumTheme ? "rounded-[28px] border-white/8 bg-card/4 backdrop-blur" : "rounded-[28px] border-border/60 shadow-card"}`}
                  >
                    <div className={`h-1.5 bg-gradient-to-r ${serviceAccents[index % serviceAccents.length]}`} />
                    <CardContent className="p-7">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className={`text-xs uppercase tracking-[0.22em] ${isPremiumTheme ? "text-white/38" : "text-muted-foreground"}`}>
                            {page.slug.replace(/-/g, " ")}
                          </div>
                          <h3 className={`mt-2.5 text-2xl font-bold tracking-tight ${isPremiumTheme ? "text-white" : ""}`}>{page.title}</h3>
                        </div>
                        <Badge
                          variant="outline"
                          className={`rounded-full text-xs ${isPremiumTheme ? "border-white/10 text-white/40" : ""}`}
                        >
                          Section {index + 1}
                        </Badge>
                      </div>
                      <div
                        className={`prose mt-6 max-w-none prose-headings:font-display prose-p:text-muted-foreground ${isPremiumTheme ? "prose-invert" : ""}`}
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.content || "") }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── REVIEWS ─── */}
        <section id="reviews" className={`scroll-mt-24 py-20 ${isPremiumTheme ? "bg-[#040812]" : "bg-muted/5"}`}>
          <div className="container">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
              <div>
                <div className={`text-xs font-semibold uppercase tracking-[0.28em] ${isPremiumTheme ? currentTheme.accent : "text-muted-foreground"}`}>
                  Customer Feedback
                </div>
                <h2 className={`mt-3 text-3xl font-bold tracking-tight md:text-5xl ${isPremiumTheme ? "text-white" : ""}`}>
                  Store Reviews
                </h2>
                {averageRating && (
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={cn(
                            "h-5 w-5", 
                            star <= Math.round(Number(averageRating)) 
                              ? "fill-amber-400 text-amber-400" 
                              : "text-muted-foreground/30"
                          )} 
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-black ${isPremiumTheme ? "text-white" : ""}`}>{averageRating}</span>
                      <span className="text-sm text-muted-foreground">based on {storeReviews?.length} reviews</span>
                    </div>
                  </div>
                )}
              </div>
              <Button 
                onClick={() => setReviewDialogOpen(true)}
                size="lg"
                className={`rounded-full px-8 font-bold ${isPremiumTheme ? "bg-card/10 hover:bg-card/20 text-white border border-white/10" : ""}`}
              >
                <Star className="mr-2 h-4 w-4" /> Write a Review
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {storeReviews?.length === 0 ? (
                <div className={`col-span-full py-20 text-center border-2 border-dashed rounded-[32px] ${isPremiumTheme ? "border-white/10 bg-card/2" : "bg-muted/30"}`}>
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Star className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <h3 className={`text-xl font-bold ${isPremiumTheme ? "text-white" : ""}`}>No reviews yet</h3>
                  <p className="text-muted-foreground mt-2 max-w-xs mx-auto">Be the first to share your experience with {store?.name}!</p>
                  <Button 
                    variant="link" 
                    className="mt-4 text-primary font-bold"
                    onClick={() => setReviewDialogOpen(true)}
                  >
                    Post the first review
                  </Button>
                </div>
              ) : (
                storeReviews?.map((review: any) => (
                  <Card key={review.id} className={`group relative overflow-hidden transition-all duration-300 ${isPremiumTheme ? "bg-card/5 border-white/10 text-white hover:bg-card/8" : "hover:shadow-md"}`}>
                    <CardContent className="p-8">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isPremiumTheme ? "bg-card/10 text-white" : "bg-primary/10 text-primary"}`}>
                            {review.customer_name?.[0]?.toUpperCase() || "C"}
                          </div>
                          <div>
                            <div className="font-bold text-sm leading-none">{review.customer_name}</div>
                            <div className="mt-1 text-[10px] uppercase tracking-widest opacity-40">
                              {format(new Date(review.created_at), "MMM d, yyyy")}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-0.5 text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < review.rating ? "fill-current" : "text-muted-foreground/30"}`} />
                          ))}
                        </div>
                      </div>
                      <p className={`text-sm leading-relaxed italic ${isPremiumTheme ? "text-white/70" : "text-muted-foreground"}`}>
                        "{review.review_text}"
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </section>

        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Rate {store?.name}</DialogTitle>
              <DialogDescription>
                Share your experience with this store to help other customers.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4 py-4" onSubmit={handleReviewSubmit}>
              <div className="space-y-2">
                <Label>Your Name</Label>
                <Input name="name" placeholder="John Doe" required />
              </div>
              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Button 
                      key={i} 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setReviewRating(i + 1)}
                      className={i < reviewRating ? "text-amber-400" : "text-muted-foreground"}
                    >
                      <Star className={`h-8 w-8 ${i < reviewRating ? "fill-current" : ""}`} />
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Your Review</Label>
                <Textarea name="review" placeholder="Tell us about the service, products, or price..." required className="min-h-[120px]" />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full" disabled={submittingAction !== null}>
                  {submittingAction === "review" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Post Review
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── FINAL CTA — gold + diamond ─── */}
        {isPremiumTheme && store.phone && (
          <section className={`relative overflow-hidden py-20 ${isDiamond ? "bg-[#050816]" : "bg-slate-950"}`}>
            {/* Tier-colored glow */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className={`h-[400px] w-[600px] rounded-full blur-[100px] ${isDiamond ? "bg-blue-700/20" : "bg-amber-700/15"}`} />
            </div>
            <div className={`absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent ${isDiamond ? "via-blue-500/40" : "via-amber-500/30"}`} />
            <div className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent ${isDiamond ? "via-blue-500/20" : "via-amber-500/15"}`} />

            <div className="container relative text-center">
              <Badge className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.24em] ${isDiamond ? "border-blue-400/25 bg-blue-500/10 text-blue-300" : "border-amber-400/25 bg-amber-500/10 text-amber-300"}`}>
                {isDiamond ? "Ready to fix your device?" : `Visit ${store.name} today`}
              </Badge>
              <h2 className="mx-auto mt-5 max-w-2xl font-display text-4xl font-bold text-white md:text-6xl">
                {isDiamond ? "Premium service," : "Gold-tier store,"}{" "}
                <span className={isDiamond ? "gradient-text-apple" : currentTheme.accent}>{isDiamond ? "done right" : "full experience"}</span>
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-lg text-white/50">
                {store.description || `${store.name} — a premium store profile with direct contact, live inventory, and full service access.`}
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Button
                  size="lg"
                  asChild
                  className={`rounded-full px-10 text-white ${isDiamond ? "bg-blue-600 shadow-[0_0_32px_rgba(59,130,246,0.45)] hover:bg-blue-500" : "bg-amber-500 shadow-[0_0_32px_rgba(245,158,11,0.35)] hover:bg-amber-400"}`}
                >
                  <a href={`tel:${store.phone}`}>
                    <Phone className="mr-2 h-5 w-5" />
                    Call Store
                    <ArrowUpRight className="ml-2 h-5 w-5" />
                  </a>
                </Button>
                {store.map_url && (
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="rounded-full border-white/12 bg-card/5 px-10 text-white hover:bg-card/10 hover:text-white"
                  >
                    <a href={store.map_url} target="_blank" rel="noopener noreferrer">
                      <MapPin className="mr-2 h-5 w-5" />
                      Find Us on Map
                    </a>
                  </Button>
                )}
              </div>

              {/* Trust row */}
              <div className="mx-auto mt-12 flex max-w-2xl flex-wrap items-center justify-center gap-6">
                {[
                  isDiamond ? "Diamond Tier Store" : "Gold Tier Partner",
                  store.is_verified ? "Verified Store" : "Active Listing",
                  "Direct Contact",
                  "Live Inventory",
                ].map((trust) => (
                  <div key={trust} className="flex items-center gap-2 text-sm text-white/40">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    {trust}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>

      <Footer />
    </div>
  );
}
