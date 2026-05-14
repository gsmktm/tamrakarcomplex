import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, LogIn, Smartphone, Search, Store, UserCheck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Slider } from "@/components/ui/slider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/common/SEO";
import { sellPhoneService } from "@/services/sellPhoneService";
import { storeDirectoryService, type StoreDirectoryItem } from "@/services/storeDirectoryService";
import type { DeviceCatalogRow } from "@/types/app";
import { breadcrumbSchema, faqSchema } from "@/lib/seo";

// Types
interface Device {
  id: string;
  brand: string;
  model: string;
  image?: string;
  variant: string | null;
  storage: string | null;
  ram: string | null;
  release_year: number | null;
  canonical_slug: string;
}

interface CatalogDeviceWithJoins {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  release_year?: number | null;
  brand?: { name: string };
  model?: { name: string };
  variant?: { storage?: string; ram?: string; color?: string };
}

interface ValuationResult {
  estimated_price: number;
  currency: string;
  breakdown: {
    base_price: number;
    condition_adjustment: number;
    storage_adjustment: number;
  };
  valid_until: string;
}

const BRAND_LOGOS: Record<string, string> = {
  Apple: "https://cdn.simpleicons.org/apple/000000",
  Samsung: "https://cdn.simpleicons.org/samsung/1428A0",
  Xiaomi: "https://cdn.simpleicons.org/xiaomi/FF6700",
  OnePlus: "https://cdn.simpleicons.org/oneplus/F3122E",
  Google: "https://cdn.simpleicons.org/google/4285F4",
  Realme: "https://cdn.simpleicons.org/realme/FFCD00",
  Oppo: "https://cdn.simpleicons.org/oppo/05BA4B",
  Vivo: "https://cdn.simpleicons.org/vivo/415FFF",
  Honor: "https://cdn.simpleicons.org/honor/000000",
  Huawei: "https://cdn.simpleicons.org/huawei/FF0000",
  Infinix: "https://cdn.simpleicons.org/infinix/000000",
  Tecno: "https://cdn.simpleicons.org/tecnomobile/00529B",
  Poco: "https://cdn.simpleicons.org/poco/000000",
  Nothing: "https://cdn.simpleicons.org/nothing/000000",
  Motorola: "https://cdn.simpleicons.org/motorola/000000",
  Nokia: "https://cdn.simpleicons.org/nokia/001135",
  Sony: "https://cdn.simpleicons.org/sony/000000",
  Asus: "https://cdn.simpleicons.org/asus/00539B",
  ZTE: "https://cdn.simpleicons.org/zte/005EB4",
  Lenovo: "https://cdn.simpleicons.org/lenovo/E2231A"
};

const SELL_PHONE_DRAFT_KEY = "tamrakar_sell_phone_draft";

export default function SellYourPhone() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signUp } = useAuth();
  const [step, setStep] = useState(1);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedBrandName, setSelectedBrandName] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedCatalogProductId, setSelectedCatalogProductId] = useState<string>("");
  const [brandSearch, setBrandSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [storage, setStorage] = useState<string>("");
  const [condition, setCondition] = useState<string>("used");
  const [valuation, setValuation] = useState<ValuationResult | null>(null);
  const [defects, setDefects] = useState<string[]>([]);
  const [ageMonths, setAgeMonths] = useState<number>(12);
  const defectsSectionRef = useRef<HTMLDivElement>(null);
  const routePrefillRef = useRef(false);

  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [storePickerOpen, setStorePickerOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [storeSearch, setStoreSearch] = useState("");
  const [submissionTargetStoreId, setSubmissionTargetStoreId] = useState<string | undefined>(searchParams.get("store") || undefined);
  const [buyerPassword, setBuyerPassword] = useState("");
  const [deviceImei, setDeviceImei] = useState("");

  const [sourceStore, setSourceStore] = useState<StoreDirectoryItem | null>(null);

  // Fetch store if ID is provided in URL
  useEffect(() => {
    async function fetchSourceStore() {
      if (submissionTargetStoreId) {
        const { data, error } = await storeDirectoryService.getStoreById(submissionTargetStoreId);
        if (data) {
          setSourceStore(data as unknown as StoreDirectoryItem);
          setSelectedStoreId(data.id);
        }
      }
    }
    fetchSourceStore();
  }, [submissionTargetStoreId]);

  const saveDraftAndLogin = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(SELL_PHONE_DRAFT_KEY, JSON.stringify({
        step,
        contactName,
        contactPhone,
        contactEmail,
        selectedBrand,
        selectedBrandName,
        selectedModel,
        selectedCatalogProductId,
        storage,
        condition,
        defects,
        ageMonths,
        deviceImei,
      }));
    }
    navigate(`/auth?redirect=${encodeURIComponent("/sell-your-phone")}`);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(SELL_PHONE_DRAFT_KEY);
    if (!raw) return;

    try {
      const draft = JSON.parse(raw) as {
        step?: number;
        contactName?: string;
        contactPhone?: string;
        contactEmail?: string;
        selectedBrand?: string;
        selectedBrandName?: string;
        selectedModel?: string;
        selectedCatalogProductId?: string;
        storage?: string;
        condition?: string;
        defects?: string[];
        ageMonths?: number;
        deviceImei?: string;
      };

      setStep(Math.min(Math.max(draft.step || 4, 1), 5));
      setContactName(draft.contactName || "");
      setContactPhone(draft.contactPhone || "");
      setContactEmail(draft.contactEmail || "");
      setSelectedBrand(draft.selectedBrand || "");
      setSelectedBrandName(draft.selectedBrandName || "");
      setSelectedModel(draft.selectedModel || "");
      setSelectedCatalogProductId(draft.selectedCatalogProductId || "");
      setStorage(draft.storage || "");
      setCondition(draft.condition || "used");
      setDefects(Array.isArray(draft.defects) ? draft.defects : []);
      setAgeMonths(typeof draft.ageMonths === "number" ? draft.ageMonths : 12);
      setDeviceImei(draft.deviceImei || "");
      window.sessionStorage.removeItem(SELL_PHONE_DRAFT_KEY);
    } catch {
      window.sessionStorage.removeItem(SELL_PHONE_DRAFT_KEY);
    }
  }, []);

  // Pre-fill contact info if user is logged in — always sync email from auth session
  useEffect(() => {
    if (user) {
      setContactName(prev => prev || user.user_metadata?.full_name || "");
      setContactPhone(prev => prev || user.user_metadata?.phone || "");
      // Always use the confirmed email from auth — do not allow empty
      setContactEmail(user.email || "");
    }
  }, [user]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const { data: sellSettings } = useQuery({
    queryKey: ["sell-phone-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["sell_phone_logos", "sell_phone_content"]);
      if (error) throw error;
      
      const settings: Record<string, unknown> = {};
      data?.forEach(item => {
        settings[item.key] = item.value;
      });
      return settings as { sell_phone_logos: Record<string, string>, sell_phone_content: typeof content };
    }
  });

  const rawLogos = sellSettings?.sell_phone_logos || BRAND_LOGOS;
  // Case-insensitive logo lookup helper
  const logos: Record<string, string> = rawLogos;
  const getLogoUrl = (brandName: string, brandLogoUrl?: string): string | undefined => {
    if (brandLogoUrl) return brandLogoUrl;
    if (logos[brandName]) return logos[brandName];
    const lower = brandName.toLowerCase();
    const match = Object.entries(logos).find(([k]) => k.toLowerCase() === lower);
    return match?.[1];
  };
  const content = sellSettings?.sell_phone_content || {
    headline: "Sell Your Phone",
    subheadline: "Get an instant quote in less than 60 seconds.",
    step1_title: "Select your Phone's Brand",
    step2_title: "Select Model",
    step3_title: "Device Details"
  };

  // Queries
  const { data: brands, isLoading: loadingBrands } = useQuery({
    queryKey: ["sell-brands"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("device_catalog")
          .select("brand")
          .order("brand", { ascending: true });
        if (error) throw error;
        
        const unique = Array.from(new Set((data ?? []).map((row) => row.brand).filter(Boolean))).sort();
        if (unique.length > 0) return unique.map(name => ({ id: name, name, slug: name.toLowerCase() }));
        
        return await sellPhoneService.getBrands();
      } catch (error) {
        console.error("Error loading brands:", error);
        return await sellPhoneService.getBrands();
      }
    }
  });

  const { data: models, isLoading: loadingModels } = useQuery({
    queryKey: ["sell-models", selectedBrand],
    enabled: !!selectedBrand,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("device_catalog")
          .select("id, brand, model, canonical_slug, release_year")
          .ilike("brand", selectedBrand)
          .order("release_year", { ascending: false });
        if (error) throw error;
        
        if (data && data.length > 0) {
          return data.map(row => ({
            id: row.id,
            name: row.model,
            slug: row.canonical_slug,
            model: { name: row.model },
            brand: { name: row.brand },
            release_year: row.release_year
          }));
        }
        
        return await sellPhoneService.getDevicesByBrand(selectedBrand);
      } catch {
        return await sellPhoneService.getDevicesByBrand(selectedBrand);
      }
    },
  });

  const { data: sellStores, isLoading: sellStoresLoading } = useQuery({
    queryKey: ["sell-phone-store-picker", selectedBrandName],
    queryFn: async () => {
      const result = await storeDirectoryService.getStoresForDirectory({ limit: 250 });
      return (result.data || []).filter((store) => {
        const haystack = [
          store.name,
          store.location,
          store.address,
          store.shop_no,
          store.description,
          ...(store.services || []),
        ].filter(Boolean).join(" ").toLowerCase();

        const brandMatch = selectedBrandName ? haystack.includes(selectedBrandName.toLowerCase()) : false;
        const serviceMatch = haystack.includes("buy") || haystack.includes("sell") || haystack.includes("exchange") || haystack.includes("mobile") || haystack.includes("apple") || haystack.includes("phone");
        return store.status === "active" && (brandMatch || serviceMatch || store.is_verified);
      });
    },
    enabled: step === 5,
  });

  const filteredSellStores = (sellStores || []).filter((store) => {
    const query = storeSearch.trim().toLowerCase();
    if (!query) return true;
    return [
      store.name,
      store.location,
      store.address,
      store.shop_no,
      store.floor,
      store.package_slug,
      ...(store.services || []),
    ].filter(Boolean).join(" ").toLowerCase().includes(query);
  });

  const selectedStore = (sellStores || []).find((store) => store.id === selectedStoreId);

  useEffect(() => {
    if (routePrefillRef.current || !brands?.length) return;

    const brandParam = searchParams.get("brand")?.trim().toLowerCase();
    if (!brandParam) return;

    const match = brands.find((brand) => brand.name.toLowerCase() === brandParam || brand.slug?.toLowerCase() === brandParam);
    if (!match) return;

    routePrefillRef.current = true;
    setSelectedBrand(match.id);
    setSelectedBrandName(match.name);
    setStep(2);
  }, [brands, searchParams]);

  useEffect(() => {
    if (!models?.length || !searchParams.get("model")) return;

    const modelParam = searchParams.get("model")?.trim().toLowerCase() ?? "";
    const storageParam = searchParams.get("storage")?.trim();
    const match = (models as CatalogDeviceWithJoins[]).find((device) => {
      const names = [device.model?.name, device.name, device.slug].filter(Boolean).map((value) => String(value).toLowerCase());
      return names.some((value) => value === modelParam || value.includes(modelParam) || modelParam.includes(value));
    });

    if (!match || selectedCatalogProductId) return;

    setSelectedModel(match.model?.name || match.name || "");
    setSelectedCatalogProductId(match.id);
    if (storageParam) setStorage(storageParam);
    setStep(3);
  }, [models, searchParams, selectedCatalogProductId]);

  // Estimate Mutation — uses database valuation rules
  const estimateMutation = useMutation({
    mutationFn: async () => {
      const estimatedPrice = await sellPhoneService.calculateValuation({
        catalog_product_id: selectedCatalogProductId,
        storage,
        condition,
        defects,
        age_months: ageMonths,
      });

      return {
        estimated_price: estimatedPrice,
        currency: "Rs.",
        breakdown: {
          base_price: estimatedPrice, // Simplified breakdown
          condition_adjustment: 0,
          storage_adjustment: 0,
        },
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
    },
    onSuccess: (data) => {
      setValuation(data);
      setStep(5);
      scrollToTop();
    },
    onError: () => {
      toast.error("Could not generate estimate. Please try again.");
    }
  });

  const createLeadMutation = useMutation({
    mutationFn: async ({ storeId, userId }: { storeId?: string; userId?: string } = {}) => {
      if (!valuation) throw new Error("No valuation available");

      return sellPhoneService.saveLead({
        brand: selectedBrandName,
        model: selectedModel,
        catalog_product_id: selectedCatalogProductId,
        storage,
        condition,
        defects,
        age_months: ageMonths,
        quoted_value: valuation.estimated_price,
        customer_name: contactName,
        customer_phone: contactPhone,
        customer_email: contactEmail,
        imei: deviceImei,
        assigned_store_id: storeId,
        source: "sell_your_phone"
      }, userId);
    },
    onSuccess: () => {
      const targetStore = submissionTargetStoreId
        ? (sellStores || []).find((store) => store.id === submissionTargetStoreId)
        : null;
      toast.success(
        targetStore
          ? `Sell request sent to ${targetStore.name}. Store admin/staff will contact you soon.`
          : "Sell request sent to Tamrakar Complex admin team. We'll contact you soon."
      );
      setSellDialogOpen(false);
      setStorePickerOpen(false);
      navigate(user ? "/user/history" : "/");
    },
    onError: (error: unknown) => {
      const description = error instanceof Error ? error.message : String(error);
      toast.error("Submission failed", { description });
    }
  });

  const openPlatformSubmit = () => {
    setSubmissionTargetStoreId(undefined);
    setSellDialogOpen(true);
  };

  const openStoreSubmit = (store: StoreDirectoryItem) => {
    setSelectedStoreId(store.id);
    setSubmissionTargetStoreId(store.id);
    setStorePickerOpen(false);
    setSellDialogOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Sell Your Phone in Nepal"
        description="Get an instant phone valuation, submit device details, and start a fast quote-led resale flow."
        url="/sell-your-phone"
        keywords={["sell phone Nepal", "phone valuation Nepal", "sell old mobile", "used phone quote"]}
        structuredData={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Sell Your Phone", url: "/sell-your-phone" },
          ]),
          faqSchema([
            {
              question: "How do I sell my phone at Tamrakar Complex?",
              answer: "Select your brand, model, storage, condition, and defects to get an instant valuation, then submit contact details for a quote-led resale flow.",
            },
            {
              question: "Is the phone valuation final?",
              answer: "The online valuation is an estimate. Final price depends on inspection, device condition, documents, accessories, and market demand.",
            },
          ]),
        ]}
      />
      <Header />
      <main className="flex-1">
        {/* Hero banner */}
        <div className="relative bg-slate-950 border-b overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.15),transparent_60%)] pointer-events-none" />
          <div className="container py-12 md:py-16 relative text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-6">
              <Smartphone className="h-3.5 w-3.5" /> Instant Cash Offer
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-extrabold mb-3 tracking-tight text-white">{content.headline}</h1>
            <p className="text-lg text-white/60">{content.subheadline}</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10 max-w-3xl">
        {/* Progress Steps */}
        <div className="flex items-center mb-10 max-w-xl mx-auto gap-0">
          {[
            { n: 1, label: "Brand" },
            { n: 2, label: "Model" },
            { n: 3, label: "Details" },
            { n: 4, label: "Contact" },
            { n: 5, label: "Quote" },
          ].map(({ n, label }, idx) => (
            <div key={n} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-2 ${
                  step > n ? "bg-primary border-primary text-white" :
                  step === n ? "bg-primary/10 border-primary text-primary shadow-glow" :
                  "bg-muted border-border text-muted-foreground"
                }`}>
                  {step > n ? <CheckCircle2 className="h-4 w-4" /> : n}
                </div>
                <span className={`text-[10px] mt-1 font-semibold uppercase tracking-wider ${step >= n ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
              </div>
              {idx < 4 && <div className={`h-0.5 flex-1 mb-4 transition-colors ${step > n ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <Card className="p-6 sm:p-8 shadow-lg border-border/50">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold text-center text-primary">{content.step1_title}</h2>
              <div className="relative max-w-sm mx-auto mb-8">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search brand (e.g. Apple, Samsung)"
                  className="pl-10 h-11"
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                />
              </div>

              {loadingBrands ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : brands && brands.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {brands
                    .filter(brand => brand.name.toLowerCase().includes(brandSearch.toLowerCase()))
                    .map((brand) => (
                    <Button
                      key={brand.id}
                      variant="outline"
                      className={`h-28 flex flex-col gap-3 items-center justify-center p-4 hover:border-primary hover:shadow-md transition-all ${
                        selectedBrand === brand.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card"
                      }`}
                      onClick={() => {
                        setSelectedBrand(brand.id);
                        setSelectedBrandName(brand.name);
                        setSelectedModel("");
                        setSelectedCatalogProductId("");
                        setStep(2);
                        scrollToTop();
                      }}
                    >
                      {getLogoUrl(brand.name, brand.logo_url) ? (
                        <div className="h-10 w-full flex items-center justify-center">
                          <img
                            src={getLogoUrl(brand.name, brand.logo_url)}
                            alt={brand.name}
                            className="h-full w-auto max-w-[80%] object-contain opacity-90 group-hover:opacity-100"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                          <span className="font-bold text-lg">{brand.name.slice(0, 1)}</span>
                        </div>
                      )}
                      <span className="font-semibold text-sm">{brand.name}</span>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="col-span-full text-center py-16 text-muted-foreground flex flex-col items-center gap-4 bg-secondary/20 rounded-xl border border-dashed">
                  <Smartphone className="h-12 w-12 text-muted-foreground/50" />
                  <div>
                    <p className="font-medium">No brands found.</p>
                    <p className="text-sm">Please initialize the database.</p>
                  </div>
                  <Button variant="outline" onClick={() => navigate("/stores")}>
                    Browse Stores
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <h2 className="text-xl font-semibold">{content.step2_title}</h2>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search model (e.g. iPhone 13)"
                  className="pl-10 h-10"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                />
              </div>
            </div>
            
            {loadingModels ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto p-1">
                {(models as CatalogDeviceWithJoins[])
                  ?.filter(device => device.model?.name?.toLowerCase().includes(modelSearch.toLowerCase()))
                  .map((device) => (
                  <Button
                    key={device.id}
                    variant="outline"
                    className={`h-40 flex flex-col gap-3 items-center justify-between p-4 hover:border-primary hover:shadow-md transition-all ${
                      selectedModel === device.model?.name ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card"
                    }`}
                      onClick={() => {
                        setSelectedModel(device.model?.name || "");
                        setSelectedCatalogProductId(device.id);
                        setStep(3);
                        scrollToTop();
                      }}
                    >
                    <div className="flex-1 flex items-center justify-center w-full">
                      {device.image_url ? (
                        <img 
                          src={device.image_url} 
                          alt={device.model?.name} 
                          className="h-full max-h-24 w-auto object-contain hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <Smartphone className="h-12 w-12 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="text-center w-full">
                      <span className="font-semibold text-sm line-clamp-2 leading-tight">{device.model?.name}</span>
                      {device.release_year && (
                        <span className="text-xs text-muted-foreground block mt-1">{device.release_year}</span>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <h2 className="text-xl font-semibold">{content.step3_title}</h2>
            </div>

            {/* Storage Selection - Grid */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Storage Capacity</Label>
              <div className="grid grid-cols-3 gap-3">
                {["64GB", "128GB", "256GB", "512GB", "1TB"].map((cap) => (
                  <div
                    key={cap}
                    className={`cursor-pointer rounded-xl border-2 p-4 flex items-center justify-center text-center transition-all ${
                      storage === cap 
                        ? "border-primary bg-primary/5 text-primary shadow-sm" 
                        : "border-border hover:border-primary/50 hover:bg-secondary/50"
                    }`}
                    onClick={() => {
                      setStorage(cap);
                      setTimeout(() => {
                        document.getElementById("condition-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }, 300);
                    }}
                  >
                    <span className="font-bold">{cap}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Condition Selection - Grid */}
            <div className="space-y-4" id="condition-section">
              <Label className="text-lg font-semibold">Condition</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: "new", label: "Brand New", desc: "Sealed box, never activated" },
                  { id: "like_new", label: "Like New", desc: "Flawless, 100% battery" },
                  { id: "used", label: "Used", desc: "Minor scratches, normal wear" },
                  { id: "fair", label: "Fair", desc: "Visible dents, fully functional" }
                ].map((item) => (
                  <div
                    key={item.id}
                    className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col gap-1 transition-all ${
                      condition === item.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/50 hover:bg-secondary/50"
                    }`}
                    onClick={() => {
                      setCondition(item.id);
                      setTimeout(() => {
                        document.getElementById("age-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }, 300);
                    }}
                  >
                    <span className="font-bold text-primary">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Age Selection - Slider (Kept as slider for better UX, but styled) */}
            <div className="space-y-4" id="age-section">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">Age of Device</Label>
                <span className="bg-secondary px-3 py-1 rounded-full text-sm font-mono font-medium">
                  {ageMonths} months
                </span>
              </div>
              <div className="px-2">
                <Slider
                  value={[ageMonths]}
                  onValueChange={(val) => {
                    setAgeMonths(val[0]);
                    setTimeout(() => {
                      defectsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 200);
                  }}
                  max={60}
                  step={1}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>New</span>
                  <span>2.5 Years</span>
                  <span>5+ Years</span>
                </div>
              </div>
            </div>

            {/* Defects Selection - Grid */}
            <div className="space-y-4" ref={defectsSectionRef}>
              <Label className="text-lg font-semibold">Functional Issues</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "screen_crack", label: "Cracked Screen" },
                  { id: "battery_weak", label: "Weak Battery" },
                  { id: "camera_issue", label: "Camera Issue" },
                  { id: "face_id_fail", label: "Face ID Fail" },
                  { id: "speaker_issue", label: "Speaker Issue" },
                  { id: "buttons_issue", label: "Button Issue" }
                ].map((defect) => {
                  const isSelected = defects.includes(defect.id);
                  return (
                    <div
                      key={defect.id}
                      className={`cursor-pointer rounded-xl border-2 p-4 flex items-center justify-center text-center transition-all ${
                        isSelected
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 shadow-sm"
                          : "border-border hover:border-red-200 hover:bg-red-50/50"
                      }`}
                      onClick={() => {
                        if (isSelected) setDefects(defects.filter(d => d !== defect.id));
                        else setDefects([...defects, defect.id]);
                      }}
                    >
                      <span className="font-medium text-sm">{defect.label}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground text-center">Select all that apply. Leave empty if none.</p>
            </div>

            <Button 
              className="w-full mt-8 h-12 text-lg hero-gradient shadow-lg hover:shadow-xl transition-all" 
              size="lg"
              disabled={!storage}
              onClick={() => {
                setStep(4);
                scrollToTop();
              }}
            >
              Continue <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <h2 className="text-xl font-semibold">Contact Details</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter your name, phone, and email to get your quote.
            </p>
            {user ? (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
                <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-semibold text-foreground">Logged in as {user.email}</p>
                  <p className="mt-1 text-muted-foreground">Your quote request will be saved to your customer account.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <LogIn className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Already have an account?</p>
                    <p className="mt-1 text-muted-foreground">Login to autofill contact details and track this sell request later.</p>
                  </div>
                </div>
                <Button type="button" variant="outline" className="shrink-0" onClick={saveDraftAndLogin}>
                  Login
                </Button>
              </div>
            )}
            <div className="grid gap-4">
              <div>
                <Label>Name</Label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Your full name" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="98XXXXXXXX" />
              </div>
              {user ? (
                <div>
                  <Label>Email</Label>
                  <Input value={contactEmail} readOnly className="bg-muted cursor-not-allowed" />
                  <p className="text-xs text-muted-foreground mt-1">Using your account email. Change it in profile settings.</p>
                </div>
              ) : (
                <div>
                  <Label>Email</Label>
                  <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" placeholder="you@example.com" />
                </div>
              )}
            </div>
            <Button
              className="w-full h-12 text-lg hero-gradient"
              size="lg"
              disabled={!contactName.trim() || !contactPhone.trim() || (!user && !contactEmail.trim()) || estimateMutation.isPending}
              onClick={() => estimateMutation.mutate()}
            >
              {estimateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing Market Data...
                </>
              ) : (
                <>Get Instant Quote <ArrowRight className="ml-2 h-5 w-5" /></>
              )}
            </Button>
          </div>
        )}

        {step === 5 && !valuation && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Calculating your quote...</p>
            <Button variant="ghost" size="sm" onClick={() => setStep(4)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>
        )}

        {step === 5 && valuation && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            {/* Premium valuation card */}
            <div className="relative rounded-2xl overflow-hidden border border-primary/30 bg-gradient-to-br from-slate-950 via-slate-900 to-primary/5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--primary)/0.2),transparent_60%)] pointer-events-none" />
              <div className="relative p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="text-sm font-semibold uppercase tracking-widest text-primary/80 mb-2">Your Phone's Market Value</p>
                <div className="text-5xl font-black text-white mb-1">
                  {valuation.currency} {valuation.estimated_price.toLocaleString()}
                </div>
                <div className="flex items-center justify-center gap-4 mt-3">
                  <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-3 py-1 rounded-full font-semibold">
                    Instant: {valuation.currency} {Math.floor(valuation.estimated_price * 0.9).toLocaleString()}
                  </span>
                  <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full font-semibold">
                    Best: {valuation.currency} {valuation.estimated_price.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-white/40 mt-3">
                  Quote valid until {new Date(valuation.valid_until).toLocaleDateString()} · Subject to physical inspection
                </p>
              </div>

              {/* Breakdown */}
              <div className="border-t border-white/10 px-8 py-4 space-y-2 text-sm">
                <div className="flex justify-between text-white/60">
                  <span>Base market price</span>
                  <span className="text-white">{valuation.currency} {valuation.breakdown.base_price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Condition ({condition})</span>
                  <span className={valuation.breakdown.condition_adjustment >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {valuation.breakdown.condition_adjustment >= 0 ? "+" : ""}{valuation.breakdown.condition_adjustment.toLocaleString()}
                  </span>
                </div>
                {defects.length > 0 && (
                  <div className="flex justify-between text-white/60">
                    <span>{defects.length} issue(s) noted</span>
                    <span className="text-red-400">Deducted</span>
                  </div>
                )}
                <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-white">
                  <span>Final Offer</span>
                  <span className="text-primary">{valuation.currency} {valuation.estimated_price.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Want to upgrade? CTA */}
            <div className="flex items-center gap-3 bg-muted/50 border rounded-xl px-4 py-3 text-sm">
              <Store className="h-5 w-5 text-primary shrink-0" />
              <span className="text-muted-foreground">Want to upgrade to a new phone?</span>
              <Button size="sm" variant="link" className="text-primary ml-auto p-0 h-auto font-bold" onClick={() => navigate("/exchange-your-phone")}>
                Exchange Instead →
              </Button>
            </div>

            {/* Market price comparison CTA */}
            <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-sm">
              <Search className="h-5 w-5 text-primary shrink-0" />
              <span className="text-muted-foreground">Compare with current market prices</span>
              <Button size="sm" variant="link" className="text-primary ml-auto p-0 h-auto font-bold" onClick={() => navigate(`/mobile-price?brand=${encodeURIComponent(selectedBrandName)}`)}>
                View Price List →
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                size="lg"
                className="h-14 hero-gradient shadow-glow font-bold"
                onClick={openPlatformSubmit}
              >
                {sourceStore ? `Sell at ${sourceStore.name}` : "Sell Now at Tamrakar Complex"}
              </Button>
              {!sourceStore && (
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 border-primary/40 hover:border-primary font-bold"
                  onClick={() => setStorePickerOpen(true)}
                >
                  Choose a Store
                </Button>
              )}
            </div>

            <Dialog open={storePickerOpen} onOpenChange={setStorePickerOpen}>
              <DialogContent className="flex max-h-[92dvh] flex-col p-0 sm:max-w-4xl">
                <DialogHeader className="border-b px-6 py-5">
                  <DialogTitle>Choose a Store for Your Sell Request</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    Select one store to receive this request directly. Store admin and store staff will see it in their dashboard.
                  </p>
                </DialogHeader>

                <div className="border-b px-6 py-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={storeSearch}
                      onChange={(event) => setStoreSearch(event.target.value)}
                      placeholder="Search store name, shop number, floor, package, service..."
                      className="pl-10"
                    />
                  </div>
                  {selectedStore && (
                    <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                      Selected: <span className="font-semibold">{selectedStore.name}</span>
                      {selectedStore.shop_no ? <span className="text-muted-foreground"> · Shop {selectedStore.shop_no}</span> : null}
                    </div>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                  {sellStoresLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : filteredSellStores.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
                      No store matched your search. Try shop number, location, or service keyword.
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {filteredSellStores.map((store) => {
                        const isSelected = selectedStoreId === store.id;
                        return (
                          <button
                            key={store.id}
                            type="button"
                            onClick={() => setSelectedStoreId(store.id)}
                            className={`rounded-2xl border p-4 text-left transition-all hover:border-primary/60 hover:bg-primary/5 ${
                              isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-secondary">
                                {store.logo_url ? (
                                  <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <Store className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="font-semibold leading-tight">{store.name}</h3>
                                  {isSelected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : null}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {[store.location, store.floor, store.shop_no ? `Shop ${store.shop_no}` : null].filter(Boolean).join(" · ")}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase">
                                    {store.subscription_tier_name || store.package_slug || "Basic"}
                                  </span>
                                  {store.is_verified ? (
                                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                      Verified
                                    </span>
                                  ) : null}
                                  {store.is_featured ? (
                                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                      Featured
                                    </span>
                                  ) : null}
                                </div>
                                {store.description ? (
                                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{store.description}</p>
                                ) : null}
                                {store.services?.length ? (
                                  <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                                    Services: {store.services.slice(0, 4).join(", ")}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <DialogFooter className="border-t px-6 py-4">
                  <Button variant="outline" onClick={() => setStorePickerOpen(false)}>
                    Back to Quote
                  </Button>
                  <Button
                    disabled={!selectedStore}
                    onClick={() => selectedStore && openStoreSubmit(selectedStore)}
                    className="hero-gradient"
                  >
                    Submit to Selected Store
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{submissionTargetStoreId ? "Submit to Selected Store" : "Sell It Now"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Device + quote summary */}
                  <div className="bg-secondary/30 rounded-lg p-3 text-sm">
                    <div className="font-semibold">{selectedBrandName} {selectedModel}</div>
                    <div className="text-muted-foreground">Storage: {storage || "N/A"} · Condition: {condition}</div>
                    <div className="text-muted-foreground font-medium text-primary">Quote: {valuation.currency} {valuation.estimated_price.toLocaleString()}</div>
                    <div className="mt-2 rounded-md bg-background/70 px-2 py-1 text-xs">
                      Request goes to: <span className="font-semibold">{selectedStore && submissionTargetStoreId ? selectedStore.name : "Tamrakar Complex Admin Team"}</span>
                    </div>
                  </div>

                  {user ? (
                    /* Logged in: just show pre-filled info + IMEI */
                    <div className="grid gap-3">
                      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm">
                        <UserCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                        <div>
                          <p className="font-semibold">{user.email}</p>
                          <p className="text-xs text-muted-foreground">Contact info auto-filled from your account</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Name</Label>
                          <Input placeholder="Your full name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                        </div>
                        <div>
                          <Label>Mobile Number</Label>
                          <Input placeholder="98XXXXXXXX" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <Label>Device IMEI <span className="text-muted-foreground text-xs">(optional)</span></Label>
                        <Input placeholder="15-digit IMEI — dial *#06# on your phone" value={deviceImei} onChange={(e) => setDeviceImei(e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    /* Not logged in: account options + contact form */
                    <div className="grid gap-3">
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-foreground">Already have an account?</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Login to auto-fill and track this request.</p>
                          </div>
                          <Button type="button" size="sm" variant="outline" onClick={saveDraftAndLogin}>
                            <LogIn className="mr-2 h-4 w-4" /> Login
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">— or fill in your details below —</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Name</Label>
                          <Input placeholder="Your full name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                        </div>
                        <div>
                          <Label>Mobile Number</Label>
                          <Input placeholder="98XXXXXXXX" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input type="email" placeholder="you@example.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                      </div>
                      <div>
                        <Label>Device IMEI <span className="text-muted-foreground text-xs">(optional)</span></Label>
                        <Input placeholder="15-digit IMEI — dial *#06# on your phone" value={deviceImei} onChange={(e) => setDeviceImei(e.target.value)} />
                      </div>
                      <div>
                        <Label>Password</Label>
                        <Input type="password" placeholder="Create a password for your new account" value={buyerPassword} onChange={(e) => setBuyerPassword(e.target.value)} />
                        <p className="text-xs text-muted-foreground mt-1">We'll automatically create a Tamrakar account for you so you can track this request.</p>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSellDialogOpen(false)}>Cancel</Button>
                  <Button
                    disabled={createLeadMutation.isPending}
                    onClick={async () => {
                      if (!contactName.trim()) {
                        toast.error("Please enter your name");
                        return;
                      }
                      const phoneDigits = contactPhone.replace(/\D/g, "");
                      if (phoneDigits.length < 10) {
                        toast.error("Invalid mobile number");
                        return;
                      }
                      // IMEI is optional — only validate format if provided
                      if (deviceImei.trim()) {
                        const imeiDigits = deviceImei.replace(/\D/g, "");
                        if (imeiDigits.length < 14 || imeiDigits.length > 16) {
                          toast.error("Invalid IMEI — must be 15 digits. Leave blank if unknown.");
                          return;
                        }
                      }
                      
                      let authenticatedUserId: string | undefined = undefined;
                      
                      if (!user) {
                        if (!contactEmail.trim()) {
                          toast.error("Email is required");
                          return;
                        }
                        if (!buyerPassword.trim()) {
                          toast.error("Password is required to create your account");
                          return;
                        }
                        
                        // Create account if not logged in
                        const { data: signUpData, error: signUpError } = await signUp(contactEmail, buyerPassword, contactName, contactPhone);
                        if (signUpError) {
                          // If user already exists, prompt them to login instead
                          if (signUpError.message?.toLowerCase().includes("already registered") || signUpError.message?.toLowerCase().includes("user already exists")) {
                            toast.error("An account with this email already exists. Please login instead.", {
                              action: { label: "Login", onClick: saveDraftAndLogin }
                            });
                          } else {
                            toast.error("Account creation failed", { description: signUpError.message });
                          }
                          return;
                        }

                        // Check if session is immediately available (email confirmation disabled)
                        // or if it requires email confirmation (common in production)
                        const { data: authData } = await supabase.auth.getUser();
                        if (authData?.user?.id) {
                          authenticatedUserId = authData.user.id;
                          toast.success("Account created! Submitting your request...");
                        } else if (signUpData?.user?.id) {
                          // Supabase returned a user but session not started — email confirmation required
                          // Still save the lead; user can log in later to track it
                          authenticatedUserId = signUpData.user.id;
                          toast.info("Check your email to confirm your account. Your sell request will be saved and linked once confirmed.", { duration: 8000 });
                        } else {
                          // Complete guest — save lead without user_id
                          toast.info("Sell request submitted. Please check your email to create your tracking account.");
                        }
                      } else {
                        // User already logged in - use their ID
                        authenticatedUserId = user.id;
                      }
                      
                      createLeadMutation.mutate({
                        storeId: submissionTargetStoreId,
                        userId: authenticatedUserId
                      });
                    }}
                  >
                    {createLeadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Submit"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
