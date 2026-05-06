import { PRODUCTS, estimateDevicePrice } from "@/utils/productData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Loader2, Smartphone, RefreshCw, Zap, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Slider } from "@/components/ui/slider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/common/SEO";
import { submitLeadQuote } from "@/services/submissionService";
import { normalizeCondition, normalizeStorage, slugifyDeviceKey } from "@/lib/valuation";
import type { DeviceCatalogRow } from "@/types/app";

// Types
interface Device {
  id: string;
  brand: string;
  model: string;
  image?: string;
  original_model: string;
  canonical_slug: string;
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
  Apple: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
  Samsung: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg",
  Xiaomi: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg",
  OnePlus: "https://upload.wikimedia.org/wikipedia/commons/f/f8/OnePlus_logo.svg",
  Google: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
  Realme: "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg",
  Oppo: "https://upload.wikimedia.org/wikipedia/commons/b/b8/OPPO_Logo.svg",
  Vivo: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png",
  Honor: "https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg",
  Huawei: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Huawei_Logo_new.png",
  Infinix: "https://upload.wikimedia.org/wikipedia/commons/c/c2/Infinix_logo.svg",
  Tecno: "https://upload.wikimedia.org/wikipedia/commons/3/36/Tecno_Mobile_logo.svg",
  Poco: "https://upload.wikimedia.org/wikipedia/commons/b/b5/POCO_Logo.svg",
  Nothing: "https://upload.wikimedia.org/wikipedia/commons/e/e6/Nothing_Technology_logo.svg",
  Motorola: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Motorola_new_logo.svg",
  Nokia: "https://upload.wikimedia.org/wikipedia/commons/0/02/Nokia_wordmark.svg",
  Sony: "https://upload.wikimedia.org/wikipedia/commons/c/c3/Sony_logo.svg",
  Asus: "https://upload.wikimedia.org/wikipedia/commons/2/2e/ASUS_Logo.svg",
  ZTE: "https://upload.wikimedia.org/wikipedia/commons/8/86/ZTE_logo_2015.svg",
  Lenovo: "https://upload.wikimedia.org/wikipedia/commons/b/b8/Lenovo_logo_2015.svg"
};

export default function ExchangeYourPhone() {
  const navigate = useNavigate();
  const { user, signUp } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedCanonicalSlug, setSelectedCanonicalSlug] = useState<string>("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [storage, setStorage] = useState<string>("");
  const [condition, setCondition] = useState<string>("used");
  const [valuation, setValuation] = useState<ValuationResult | null>(null);
  const [defects, setDefects] = useState<string[]>([]);
  const [ageMonths, setAgeMonths] = useState<number>(12);
  const defectsSectionRef = useRef<HTMLDivElement>(null);

  const [exchangeDialogOpen, setExchangeDialogOpen] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPassword, setBuyerPassword] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [deviceImei, setDeviceImei] = useState("");

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cleanModelName = (model: string) =>
    model
      .replace(/\s\(\d+\+\d+(?:GB|TB)\)/i, "")
      .replace(/\s\d+(?:GB|TB)/i, "")
      .trim();

  const selectBrand = (brand: string) => {
    setSelectedBrand(brand);
    setSelectedModel("");
    setSelectedCanonicalSlug("");
    setSelectedDeviceId("");
    setStorage("");
    setValuation(null);
    setStep(2);
    scrollToTop();
  };

  const selectModel = (device: Device) => {
    setSelectedModel(device.model);
    setSelectedDeviceId(device.id);
    setSelectedCanonicalSlug(device.canonical_slug || "");
    setStorage("");
    setValuation(null);
    setStep(3);
    scrollToTop();
  };

  // Queries
  const { data: brands, isLoading: loadingBrands } = useQuery({
    queryKey: ["exchange-brands"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("device_catalog")
          .select("brand")
          .order("brand", { ascending: true });
        if (error) throw error;
        const unique = Array.from(new Set((data ?? []).map((row) => row.brand).filter(Boolean))).sort();
        if (unique.length > 0) return unique;
        
        if (import.meta.env.DEV) {
          return Array.from(new Set(PRODUCTS.map((d) => d.brand))).sort();
        }
        return [];
      } catch {
        if (import.meta.env.DEV) {
          return Array.from(new Set(PRODUCTS.map((d) => d.brand))).sort();
        }
        return [];
      }
    }
  });

  const { data: models, isLoading: loadingModels } = useQuery({
    queryKey: ["exchange-models", selectedBrand],
    queryFn: async () => {
      if (!selectedBrand) return [];
      try {
        const { data, error } = await supabase
          .from("device_catalog")
          .select("id, brand, model, canonical_slug, release_year")
          .ilike("brand", selectedBrand)
          .order("release_year", { ascending: false });
        if (error) throw error;

        const uniqueModels = new Map<string, Device>();
        (data ?? []).forEach((row: Pick<DeviceCatalogRow, "id" | "brand" | "model" | "canonical_slug">) => {
          const key = row.model.trim();
          if (!uniqueModels.has(key)) {
            uniqueModels.set(key, {
              id: row.id,
              brand: row.brand,
              model: row.model,
              image: undefined,
              original_model: row.model,
              canonical_slug: row.canonical_slug,
            });
          }
        });
        const fromCatalog = Array.from(uniqueModels.values());
        if (fromCatalog.length) return fromCatalog;
        throw new Error("empty_catalog");
      } catch {
        if (import.meta.env.DEV) {
          const uniqueModels = new Map<string, Device>();
          PRODUCTS
            .filter((device) => device.brand === selectedBrand)
            .forEach((device) => {
              const model = cleanModelName(device.model);
              if (!uniqueModels.has(model)) {
                uniqueModels.set(model, {
                  id: device.id.toString(),
                  brand: device.brand,
                  model,
                  image: device.image,
                  original_model: device.model,
                  canonical_slug: slugifyDeviceKey(`${device.brand} ${model}`),
                });
              }
            });
          return Array.from(uniqueModels.values());
        }
        return [];
      }
    },
    enabled: !!selectedBrand
  });

  // Mutations
  const valuationMutation = useMutation({
    mutationFn: async (data: {
      deviceId: string;
      storage: string;
      condition: string;
      defects: string[];
    }) => {
      const selectedDevice = PRODUCTS.find((device) => device.id.toString() === data.deviceId);
      if (!selectedDevice) {
        throw new Error("Selected device was not found");
      }

      const normalizedCondition = normalizeCondition(data.condition);
      const normalizedStorage = normalizeStorage(data.storage);
      const canonical_slug = selectedCanonicalSlug || slugifyDeviceKey(`${selectedBrand} ${selectedModel}`);

      const baseDevice = { ...selectedDevice, model: selectedModel };
      const storageDevice = { ...selectedDevice, model: `${selectedModel} ${normalizedStorage ?? ""}`.trim() };

      let estimatedPrice = 0;
      let basePrice = 0;
      let conditionAdj = 0;
      let storageAdj = 0;

      try {
        const { data: edgeData, error } = await supabase.functions.invoke("valuation-estimator", {
          body: {
            brand: selectedBrand,
            model: selectedModel,
            storage: normalizedStorage,
            canonical_slug,
            condition: normalizedCondition,
            defects: data.defects,
            ageMonths,
          },
        });
        if (error) throw error;
        if (edgeData?.quoted_value > 0) {
          estimatedPrice = edgeData.quoted_value;
          basePrice = edgeData.base_price ?? estimatedPrice;
          conditionAdj = edgeData.defect_adjustment ?? 0;
          storageAdj = 0;
        } else {
          throw new Error("Edge function returned zero — using local estimator");
        }
      } catch {
        estimatedPrice = estimateDevicePrice(storageDevice, normalizedCondition, data.defects, ageMonths);
        basePrice = estimateDevicePrice(baseDevice, "like_new", [], ageMonths);
        const conditionPrice = estimateDevicePrice(baseDevice, normalizedCondition, [], ageMonths);
        const storagePrice = estimateDevicePrice(storageDevice, normalizedCondition, [], ageMonths);
        conditionAdj = conditionPrice - basePrice;
        storageAdj = storagePrice - conditionPrice;
      }

      return {
        estimated_price: estimatedPrice,
        currency: "NPR",
        breakdown: {
          base_price: basePrice,
          condition_adjustment: conditionAdj,
          storage_adjustment: storageAdj,
        },
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
    },
    onSuccess: (data) => {
      setValuation(data);
      if (user) {
        setStep(4);
      } else {
        setStep(3.5); // Lead capture step
      }
      scrollToTop();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to get valuation. Please try again."));
      console.error("Valuation error:", error);
    }
  });

  const submitExchangeMutation = useMutation({
    mutationFn: async (data: {
      valuation: ValuationResult;
      buyerName: string;
      buyerEmail: string;
      buyerPhone: string;
      deviceImei: string;
      buyerPassword?: string;
    }) => {
      return submitLeadQuote({
        type: "exchange",
        quotedValue: data.valuation.estimated_price,
        condition,
        defects,
        device: {
          brand: selectedBrand,
          model: selectedModel,
          storage,
          condition,
          defects,
          imei: data.deviceImei,
        },
        customer: {
          name: data.buyerName,
          email: data.buyerEmail,
          phone: data.buyerPhone,
          password: data.buyerPassword,
        },
        currentUserId: user?.id ?? null,
        currentUserEmail: user?.email ?? null,
        createAccount: !user && data.buyerPassword
          ? async () => signUp(data.buyerEmail, data.buyerPassword as string, data.buyerName)
          : undefined,
      });
    },
    onSuccess: (result) => {
      toast.success(
        result.requiresEmailConfirmation
          ? "Exchange request submitted. Check your email to finish account confirmation."
          : "Exchange request submitted successfully!",
      );
      setExchangeDialogOpen(false);
      navigate(result.hasUserDashboard ? "/user" : "/");
    },
    onError: (error) => {
      toast.error("Failed to submit exchange request. Please try again.");
      console.error("Submit error:", error);
    }
  });

  const handleNext = () => {
    if (step === 1 && !selectedBrand) {
      toast.error("Please select a brand");
      return;
    }
    if (step === 2 && !selectedModel) {
      toast.error("Please select a model");
      return;
    }
    if (step === 3) {
      if (!storage) {
        toast.error("Please select storage capacity");
        return;
      }
      // Trigger valuation
      if (!selectedDeviceId) {
        toast.error("Please select a model");
        return;
      }
      valuationMutation.mutate({
        deviceId: selectedDeviceId,
        storage,
        condition,
        defects,
      });
      return;
    }
    setStep((currentStep) => currentStep + 1);
    scrollToTop();
  };

  const handleBack = () => {
    setStep((currentStep) => Math.max(1, currentStep - 1));
    scrollToTop();
  };

  const handleSubmitExchange = () => {
    if (!buyerName || !buyerEmail || !buyerPhone || !deviceImei) {
      toast.error("Please fill all required fields");
      return;
    }
    const phoneDigits = buyerPhone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    const imeiDigits = deviceImei.replace(/\D/g, "");
    if (imeiDigits.length < 14 || imeiDigits.length > 16) {
      toast.error("Please enter a valid IMEI number");
      return;
    }
    if (!user && !buyerPassword) {
      toast.error("Please provide a password to create an account");
      return;
    }
    if (!valuation) {
      toast.error("No valuation available");
      return;
    }

    const selectedDevice = models?.find(m => m.id === selectedDeviceId);
    if (!selectedDevice) return;

    submitExchangeMutation.mutate({
      valuation,
      buyerName,
      buyerEmail,
      buyerPhone,
      deviceImei,
      buyerPassword
    });
  };

  const handleRevealValuation = () => {
    if (!buyerName || !buyerEmail || !buyerPhone) {
      toast.error("Please provide your details to see the valuation");
      return;
    }
    setStep(4);
    scrollToTop();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Exchange Your Phone in Nepal"
        description="Trade in your old device, estimate its value, and move into your next upgrade from one guided exchange flow."
        url="/exchange-your-phone"
        keywords={["exchange phone Nepal", "trade in Nepal", "phone exchange value", "upgrade phone Nepal"]}
      />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <div className="relative bg-slate-950 border-b overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_50%,hsl(158_78%_38%/0.15),transparent_60%)] pointer-events-none" />
          <div className="container py-12 md:py-16 relative text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-6">
              <RefreshCw className="h-3.5 w-3.5" /> Trade-in & Upgrade
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-extrabold mb-3 tracking-tight text-white">
              Exchange Your Phone
            </h1>
            <p className="text-lg text-white/60">Get the best trade-in value and upgrade to your dream device</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          <div className="max-w-4xl mx-auto">
            {/* Progress */}
            <div className="flex items-center mb-10 max-w-lg mx-auto gap-0">
              {[
                { n: 1, label: "Brand" },
                { n: 2, label: "Model" },
                { n: 3, label: "Details" },
                { n: 4, label: "Result" },
              ].map(({ n, label }, idx) => (
                <div key={n} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
                      step > n ? "bg-primary border-primary text-white" :
                      step >= n ? "bg-primary/10 border-primary text-primary" :
                      "bg-muted border-border text-muted-foreground"
                    }`}>
                      {step > n ? <Sparkles className="h-4 w-4" /> : n}
                    </div>
                    <span className={`text-[10px] mt-1 font-semibold uppercase tracking-wider ${step >= n ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
                  </div>
                  {idx < 3 && <div className={`h-0.5 flex-1 mb-4 transition-colors ${step > n ? "bg-primary" : "bg-border"}`} />}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <Card className="p-6">
              {step === 1 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-2xl font-bold text-center text-primary">Select Your Phone Brand</h2>
                  {loadingBrands ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="animate-pulse h-28 bg-muted rounded-xl" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {brands?.map((brand) => (
                        <button
                          key={brand}
                          onClick={() => selectBrand(brand)}
                          className={`h-28 flex flex-col gap-3 items-center justify-center p-4 rounded-xl border-2 hover:border-primary hover:shadow-md transition-all ${
                            selectedBrand === brand ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card"
                          }`}
                        >
                          <div className="h-10 w-full flex items-center justify-center">
                            <img
                              src={BRAND_LOGOS[brand] || "/placeholder.svg"}
                              alt={brand}
                              className="h-full w-auto max-w-[80%] object-contain opacity-90"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg";
                              }}
                            />
                          </div>
                          <span className="font-semibold text-sm">{brand}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Select Model</h2>
                  <p className="text-muted-foreground mb-4">Selected: {selectedBrand}</p>
                  {loadingModels ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-24 bg-muted rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {models && models.length > 0 ? models.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => selectModel(model)}
                          className={`p-4 border rounded-lg hover:border-primary transition-colors text-left ${
                            selectedDeviceId === model.id ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={model.image || "/placeholder.svg"}
                              alt={model.model}
                              className="w-16 h-16 object-contain rounded"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg";
                              }}
                            />
                            <div>
                              <p className="font-medium">{model.model}</p>
                            </div>
                          </div>
                        </button>
                      )) : (
                        <div className="col-span-full rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                          <Smartphone className="mx-auto mb-3 h-10 w-10 opacity-50" />
                          No models found for {selectedBrand}.
                        </div>
                      )}
                    </div>
                  )}
                  <Button variant="outline" onClick={handleBack} className="mt-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Device Details</h2>
                  <div className="space-y-6">
                    <div>
                      <Label className="text-base font-medium">Storage Capacity</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                        {["64GB", "128GB", "256GB", "512GB", "1TB"].map((size) => (
                          <button
                            key={size}
                            onClick={() => setStorage(size)}
                            className={`p-3 border rounded-lg text-center hover:border-primary transition-colors ${
                              storage === size ? 'border-primary bg-primary/5' : 'border-border'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-base font-medium">Device Condition</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                        {[
                          { value: "new", label: "New", desc: "Sealed box, never activated" },
                          { value: "like_new", label: "Like New", desc: "Flawless, 100% battery" },
                          { value: "used", label: "Used", desc: "Minor scratches, fully functional" },
                          { value: "fair", label: "Fair", desc: "Visible wear, functional" }
                        ].map((cond) => (
                          <button
                            key={cond.value}
                            onClick={() => setCondition(cond.value)}
                            className={`p-4 border rounded-lg text-left hover:border-primary transition-colors ${
                              condition === cond.value ? 'border-primary bg-primary/5' : 'border-border'
                            }`}
                          >
                            <p className="font-medium">{cond.label}</p>
                            <p className="text-sm text-muted-foreground">{cond.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-base font-medium">Device Age: {ageMonths} months</Label>
                      <Slider
                        value={[ageMonths]}
                        onValueChange={(value) => setAgeMonths(value[0])}
                        max={60}
                        min={1}
                        step={1}
                        className="mt-2"
                      />
                    </div>

                    <div ref={defectsSectionRef}>
                      <Label className="text-base font-medium">Any Defects?</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                        {[
                          { id: "screen_crack", label: "Cracked Screen" },
                          { id: "battery_weak", label: "Weak Battery" },
                          { id: "camera_issue", label: "Camera Issue" },
                          { id: "face_id_fail", label: "Face ID Fail" },
                          { id: "speaker_issue", label: "Speaker Issue" },
                          { id: "buttons_issue", label: "Button Issue" },
                        ].map((defect) => (
                          <button
                            key={defect.id}
                            onClick={() => {
                              setDefects(prev =>
                                prev.includes(defect.id)
                                  ? prev.filter(d => d !== defect.id)
                                  : [...prev, defect.id]
                              );
                            }}
                            className={`p-3 border rounded-lg text-center hover:border-primary transition-colors ${
                              defects.includes(defect.id) ? 'border-primary bg-primary/5' : 'border-border'
                            }`}
                          >
                            {defect.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                    <div className="flex gap-4 mt-6">
                      <Button variant="outline" onClick={handleBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                      <Button onClick={handleNext} disabled={valuationMutation.isPending}>
                        {valuationMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Getting Valuation...
                          </>
                        ) : (
                          <>
                            Get Exchange Value
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {step === 3.5 && (
                  <div className="max-w-md mx-auto py-8">
                    <div className="text-center mb-8">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Zap className="h-8 w-8 text-primary" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Your Valuation is Ready!</h2>
                      <p className="text-muted-foreground">
                        Enter your details to reveal your device's market value and start your exchange.
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="lead-name">Full Name</Label>
                        <Input 
                          id="lead-name" 
                          placeholder="John Doe" 
                          value={buyerName} 
                          onChange={(e) => setBuyerName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lead-email">Email Address</Label>
                        <Input 
                          id="lead-email" 
                          type="email" 
                          placeholder="john@example.com" 
                          value={buyerEmail} 
                          onChange={(e) => setBuyerEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lead-phone">Phone Number</Label>
                        <Input 
                          id="lead-phone" 
                          placeholder="98XXXXXXXX" 
                          value={buyerPhone} 
                          onChange={(e) => setBuyerPhone(e.target.value)}
                        />
                      </div>
                      
                      <Button className="w-full h-12 text-lg font-bold mt-4 shadow-glow" onClick={handleRevealValuation}>
                        Reveal Valuation <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}

                {step === 4 && valuation && (
                <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                  {/* Side-by-side comparison */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Your Phone */}
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                      <div className="text-xs font-bold uppercase tracking-widest text-red-400/80 mb-3 flex items-center gap-2">
                        <ArrowLeft className="h-3.5 w-3.5" /> Your Device (Trade-in)
                      </div>
                      <div className="text-sm text-muted-foreground mb-1">{selectedBrand} {selectedModel}</div>
                      <div className="text-sm text-muted-foreground mb-3">{storage} · {condition}</div>
                      <div className="text-3xl font-black text-foreground">NPR {valuation.estimated_price.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground mt-1">Trade-in value</div>
                    </div>

                    {/* New Device CTA */}
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                      <div className="text-xs font-bold uppercase tracking-widest text-emerald-400/80 mb-3 flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5" /> Your New Device
                      </div>
                      <div className="text-sm text-muted-foreground mb-3">Browse our catalog to find your upgrade</div>
                      <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10" onClick={() => navigate("/mobile-price")}>
                        Browse Price List →
                      </Button>
                    </div>
                  </div>

                  {/* Valuation breakdown */}
                  <div className="rounded-2xl border bg-card p-5 space-y-3 text-sm">
                    <div className="font-semibold text-base mb-2">Valuation Breakdown</div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base market price</span>
                      <span>NPR {valuation.breakdown.base_price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Condition adjustment</span>
                      <span className={valuation.breakdown.condition_adjustment >= 0 ? "text-emerald-500" : "text-red-500"}>
                        {valuation.breakdown.condition_adjustment >= 0 ? "+" : ""}NPR {valuation.breakdown.condition_adjustment.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Storage adjustment</span>
                      <span>NPR {valuation.breakdown.storage_adjustment.toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold text-base">
                      <span>Final Trade-in Value</span>
                      <span className="text-primary">NPR {valuation.estimated_price.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Valid until {new Date(valuation.valid_until).toLocaleDateString()} · Subject to physical inspection</p>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleBack} className="h-12">
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <Button onClick={() => setExchangeDialogOpen(true)} size="lg" className="flex-1 h-12 hero-gradient shadow-glow font-bold">
                      <RefreshCw className="h-4 w-4 mr-2" /> Claim This Exchange Deal
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Exchange Dialog */}
        <Dialog open={exchangeDialogOpen} onOpenChange={setExchangeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Your Exchange</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="buyerName">Full Name *</Label>
                <Input
                  id="buyerName"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <Label htmlFor="buyerEmail">Email *</Label>
                <Input
                  id="buyerEmail"
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>
              {!user && (
                <div>
                  <Label htmlFor="buyerPassword">Password *</Label>
                  <Input
                    id="buyerPassword"
                    type="password"
                    value={buyerPassword}
                    onChange={(e) => setBuyerPassword(e.target.value)}
                    placeholder="Create a password"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="buyerPhone">Phone Number *</Label>
                <Input
                  id="buyerPhone"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="Enter your phone number"
                />
              </div>
              <div>
                <Label htmlFor="deviceImei">Device IMEI *</Label>
                <Input
                  id="deviceImei"
                  value={deviceImei}
                  onChange={(e) => setDeviceImei(e.target.value)}
                  placeholder="Enter device IMEI number"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExchangeDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitExchange} disabled={submitExchangeMutation.isPending}>
                {submitExchangeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Exchange Request"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
}
