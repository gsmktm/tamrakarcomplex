import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import logo from "@/assets/logo.png";
import { Calculator, Smartphone, Loader2, AlertCircle, ArrowRight, CheckCircle2, ChevronRight, Laptop, Tablet, Watch, Clock } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/common/SEO";
import { normalizeCondition, normalizeStorage, slugifyDeviceKey } from "@/lib/valuation";
import { PRODUCTS, estimateDevicePrice } from "@/utils/productData";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type ValuationResult = {
  quoted_value: number;
  base_price: number;
  condition_factor: number;
  defect_adjustment: number;
  age_adjustment: number;
  demand_factor: number;
  confidence: number;
  manual_quote_required?: boolean;
  source?: "edge" | "local";
  error?: string;
};

const BRAND_ICONS: Record<string, string> = {
  "Apple": "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
  "Samsung": "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg",
  "Xiaomi": "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_2021.svg",
  "OnePlus": "https://upload.wikimedia.org/wikipedia/commons/c/c9/OnePlus_Logo.svg",
  "Google": "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
  "Oppo": "https://upload.wikimedia.org/wikipedia/commons/0/05/OPPO_Logo.svg",
  "Vivo": "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png",
  "Realme": "https://upload.wikimedia.org/wikipedia/commons/1/13/Realme_logo.svg",
  "Infinix": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Infinix_logo.svg/1200px-Infinix_logo.svg.png",
  "Huawei": "https://upload.wikimedia.org/wikipedia/commons/0/03/Huawei_Logo.svg",
  "Nothing": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Nothing_Logo.svg/1200px-Nothing_Logo.svg.png",
  "Honor": "https://upload.wikimedia.org/wikipedia/commons/8/80/Honor_Logo.svg",
  "Motorola": "https://upload.wikimedia.org/wikipedia/commons/4/4e/Motorola_new_logo.svg",
  "Asus": "https://upload.wikimedia.org/wikipedia/commons/d/de/Asus_Logo.svg",
  "Sony": "https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg",
  "Tecno": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Tecno_Mobile_logo.svg/1200px-Tecno_Mobile_logo.svg.png",
  "Benco": "https://upload.wikimedia.org/wikipedia/commons/0/02/Nokia_wordmark.svg",
  "Poco": "https://upload.wikimedia.org/wikipedia/commons/b/b5/POCO_Logo.svg",
  "Nokia": "https://upload.wikimedia.org/wikipedia/commons/0/02/Nokia_wordmark.svg",
};

export default function ValuationEstimator() {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [condition, setCondition] = useState("used");
  const [storage, setStorage] = useState("128GB");
  const [ageMonths, setAgeMonths] = useState("12");
  const [step, setStep] = useState(1);

  const brands = useMemo(() => {
    const data = import.meta.env.DEV ? PRODUCTS : [];
    const unique = Array.from(new Set(data.map((d) => d.brand)));
    
    // Custom sort order: Apple, Samsung, Xiaomi, Realme, Oppo, Vivo, then others alphabetically
    const order = ["Apple", "Samsung", "Xiaomi", "Realme", "Oppo", "Vivo"];
    
    return unique.sort((a, b) => {
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);
      
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      return a.localeCompare(b);
    });
  }, []);

  const models = useMemo(() => {
    if (!brand) return [];
    const data = import.meta.env.DEV ? PRODUCTS : [];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const d of data) {
      if (d.brand !== brand) continue;
      const cleaned = d.model
        .replace(/\s\(\d+\+\d+(?:GB|TB)\)/i, "")
        .replace(/\s\d+(?:GB|TB)/i, "")
        .trim();
      if (!seen.has(cleaned)) {
        seen.add(cleaned);
        list.push(cleaned);
      }
    }
    return list.sort();
  }, [brand]);

  const { data: catalogHint } = useQuery({
    queryKey: ["device-catalog-hint"],
    queryFn: async () => {
      const { data } = await supabase.from("device_catalog").select("id").limit(1);
      return Boolean(data?.length);
    },
    staleTime: 60_000,
  });

  const estimateMutation = useMutation({
    mutationFn: async () => {
      const normalizedCondition = normalizeCondition(condition);
      const normalizedStorage = normalizeStorage(storage);
      const canonical_slug = brand && model ? slugifyDeviceKey(`${brand} ${model}`) : undefined;
      const buildLocalEstimate = () => {
        if (!import.meta.env.DEV) {
          throw new Error("Live valuation service is currently unavailable. Please try again later.");
        }
        
        const matchingDevice = PRODUCTS.find((device) => {
          const sameBrand = device.brand.toLowerCase() === brand.toLowerCase();
          const deviceModel = device.model.toLowerCase();
          const requestedModel = model.toLowerCase();
          const requestedStorage = String(normalizedStorage ?? "").toLowerCase();
          return sameBrand && deviceModel.includes(requestedModel) && (!requestedStorage || deviceModel.includes(requestedStorage));
        });
        const synthetic = matchingDevice ?? { id: 0, brand, model: `${model} ${normalizedStorage ?? ""}`.trim(), image: "" };
        const quoted_value = estimateDevicePrice(synthetic, normalizedCondition, []);
        if (quoted_value <= 0) {
          throw new Error("Manual quote required");
        }

        return {
          quoted_value,
          base_price: matchingDevice?.retail_npr ?? quoted_value,
          condition_factor: 0,
          defect_adjustment: 0,
          age_adjustment: 0,
          demand_factor: 1,
          confidence: 0.35,
          manual_quote_required: !matchingDevice,
          source: "local",
        } satisfies ValuationResult;
      };

      try {
        const { data, error } = await supabase.functions.invoke("valuation-estimator", {
          body: {
            brand,
            model,
            storage: normalizedStorage,
            canonical_slug,
            condition: normalizedCondition,
            defects: [],
            ageMonths: Number(ageMonths || 0),
          },
        });
        if (error) throw error;
        const result = data as ValuationResult | null;
        if (!result || result.error || Number(result.quoted_value) <= 0) {
          throw new Error(result?.error || "No valuation rule found");
        }
        return { ...result, source: "edge" } satisfies ValuationResult;
      } catch {
        return buildLocalEstimate();
      }
    },
    onSuccess: () => {
      setStep(4);
    }
  });

  const handleEstimate = () => {
    if (!brand || !model || !condition || !storage || !ageMonths) {
      toast.error("Please fill all fields");
      return;
    }
    estimateMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Device Valuation Estimator"
        description="Estimate the resale value of your phone using model, condition, storage, and age."
        url="/valuation-estimator"
        keywords={["device valuation Nepal", "phone resale value", "sell phone estimate", "trade in estimate"]}
      />
      <Header />
      <main className="flex-1 pb-20">
        <div className="bg-primary text-primary-foreground py-16">
          <div className="container max-w-4xl text-center space-y-6">
            <div className="flex justify-center mb-4">
              <div className="bg-card p-3 rounded-2xl shadow-glow w-20 h-20 flex items-center justify-center">
                <img src={logo} alt="Tamrakar Complex" className="w-full h-full object-contain" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Instant Device Valuation
            </h1>
            <p className="text-xl text-primary-foreground/80">
              Get an accurate price for your used device in less than a minute.
            </p>
          </div>
        </div>

        <div className="container -mt-10">
          <div className="max-w-5xl mx-auto">
            {/* Step Indicator */}
            <div className="flex justify-center mb-8">
              <div className="flex items-center gap-4 bg-card p-4 rounded-full shadow-sm border border-border">
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} className="flex items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all",
                      step === s ? "bg-primary text-white scale-110 shadow-lg" : 
                      step > s ? "bg-green-500 text-white" : "bg-slate-100 text-slate-400"
                    )}>
                      {step > s ? <CheckCircle2 className="h-6 w-6" /> : s}
                    </div>
                    {s < 4 && <ChevronRight className="h-4 w-4 mx-2 text-slate-300" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {step === 1 && (
                  <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
                    <CardHeader className="bg-card pb-0">
                      <CardTitle className="text-2xl">Step 1: Select Brand</CardTitle>
                      <CardDescription>What kind of device are you valuing today?</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                        {brands.map((b) => (
                          <div
                            key={b}
                            onClick={() => {
                              setBrand(b);
                              setModel("");
                              setStep(2);
                            }}
                            className={cn(
                              "group cursor-pointer p-8 bg-card border-2 rounded-[2rem] transition-all hover:border-primary hover:shadow-xl text-center space-y-4",
                              brand === b ? "border-primary bg-primary/5 shadow-md" : "border-border"
                            )}
                          >
                            <div className="h-16 flex items-center justify-center transition-all">
                              {BRAND_ICONS[b] ? (
                                <img src={BRAND_ICONS[b]} alt={b} className="max-h-full max-w-full object-contain" />
                              ) : (
                                <Smartphone className="h-12 w-12 text-slate-400" />
                              )}
                            </div>
                            <span className="font-bold text-lg block">{b}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {step === 2 && (
                  <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
                    <CardHeader className="bg-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl">Step 2: Select Model</CardTitle>
                          <CardDescription>Choose the specific model of your {brand}.</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-muted-foreground">
                          Change Brand
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {models.map((m) => (
                          <div
                            key={m}
                            onClick={() => {
                              setModel(m);
                              setStep(3);
                            }}
                            className={cn(
                              "cursor-pointer p-4 border-2 rounded-2xl transition-all hover:border-primary flex items-center justify-between",
                              model === m ? "border-primary bg-primary/5" : "border-border/30 bg-muted/20"
                            )}
                          >
                            <span className="font-semibold">{m}</span>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {step === 3 && (
                  <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
                    <CardHeader className="bg-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl">Step 3: Device Condition</CardTitle>
                          <CardDescription>Tell us about the physical state and age.</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-muted-foreground">
                          Change Model
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <Label className="text-lg font-bold">Storage Capacity</Label>
                          <div className="grid grid-cols-2 gap-3">
                            {["64GB", "128GB", "256GB", "512GB", "1TB"].map(s => (
                              <div
                                key={s}
                                onClick={() => setStorage(s)}
                                className={cn(
                                  "cursor-pointer p-3 text-center border-2 rounded-xl font-bold transition-all",
                                  storage === s ? "border-primary bg-primary/5 text-primary" : "border-border"
                                )}
                              >
                                {s}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <Label className="text-lg font-bold">Device Age (Months)</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              className="h-12 pl-12 rounded-xl text-lg font-bold border-2 focus-visible:ring-primary"
                              value={ageMonths}
                              onChange={(e) => setAgeMonths(e.target.value)}
                            />
                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-lg font-bold">Overall Condition</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {[
                            { id: "new", label: "Brand New", desc: "Sealed box" },
                            { id: "like_new", label: "Pristine", desc: "No scratches" },
                            { id: "used", label: "Good", desc: "Minor wear" },
                            { id: "fair", label: "Fair", desc: "Visible scratches" }
                          ].map(c => (
                            <div
                              key={c.id}
                              onClick={() => setCondition(c.id)}
                              className={cn(
                                "cursor-pointer p-4 border-2 rounded-2xl text-center space-y-1 transition-all",
                                condition === c.id ? "border-primary bg-primary/5" : "border-border"
                              )}
                            >
                              <div className={cn("font-bold", condition === c.id ? "text-primary" : "text-foreground")}>{c.label}</div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{c.desc}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button 
                        onClick={handleEstimate} 
                        disabled={estimateMutation.isPending} 
                        className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20"
                      >
                        {estimateMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Analyzing Market Data...
                          </>
                        ) : (
                          <>
                            Get Final Valuation
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {step === 4 && estimateMutation.data && (
                  <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden bg-card animate-in zoom-in-95 duration-500">
                    <div className="bg-green-500 p-8 text-white text-center">
                      <CheckCircle2 className="h-16 w-16 mx-auto mb-4" />
                      <h2 className="text-3xl font-bold">Valuation Complete!</h2>
                    </div>
                    <CardContent className="p-10 space-y-10">
                      <div className="text-center space-y-2">
                        <p className="text-muted-foreground font-medium uppercase tracking-widest text-sm">Estimated Market Value</p>
                        <div className="text-6xl font-black text-foreground">
                          Rs. {estimateMutation.data.quoted_value.toLocaleString()}
                        </div>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm font-bold text-muted-foreground">
                          <AlertCircle className="h-4 w-4" />
                          {estimateMutation.data.manual_quote_required
                            ? "Manual quote required"
                            : `${Math.round((estimateMutation.data.confidence || 0) * 100)}% Price Accuracy`}
                        </div>
                        {estimateMutation.data.source === "local" && (
                          <p className="text-sm text-muted-foreground">
                            Database valuation rule was not available, so this is a fallback estimate pending staff review.
                          </p>
                        )}
                      </div>

                      <div className="grid md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                          <h3 className="font-bold text-lg border-b pb-2">Price Breakdown</h3>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center text-muted-foreground">
                              <span>Base Market Price</span>
                              <span className="font-bold">Rs. {estimateMutation.data.base_price.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-red-500">
                              <span>Condition & Age Adjustment</span>
                              <span className="font-bold">- Rs. {(estimateMutation.data.defect_adjustment + estimateMutation.data.age_adjustment).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-blue-500">
                              <span>Local Demand Multiplier</span>
                              <span className="font-bold">x{estimateMutation.data.demand_factor.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <h3 className="font-bold text-lg border-b pb-2">Next Steps</h3>
                          <div className="grid gap-3">
                            <Button className="w-full h-12 rounded-xl font-bold gap-2" asChild>
                              <Link to="/sell-your-phone">
                                Sell to Tamrakar Marketplace
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="outline" className="w-full h-12 rounded-xl font-bold gap-2 border-border" asChild>
                              <Link to="/exchange-your-phone">
                                Exchange for Upgrade
                                <Smartphone className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" onClick={() => setStep(1)} className="w-full text-muted-foreground">
                              Value another device
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                <Card className="border-none shadow-lg rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
                  <CardContent className="p-8 space-y-6">
                    <div className="p-3 bg-card/10 w-fit rounded-2xl">
                      <Calculator className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">How it works?</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        Our AI algorithm analyzes thousands of recent transactions in Tamrakar Complex and online marketplaces to give you the most accurate resale value.
                      </p>
                    </div>
                    <ul className="space-y-3">
                      {[
                        "Real-time market data",
                        "Condition-based pricing",
                        "Storage & Age adjustments",
                        "Verified by experts"
                      ].map(t => (
                        <li key={t} className="flex items-center gap-2 text-sm text-slate-300">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg rounded-3xl p-8 bg-card space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-primary" />
                    Quick Tips
                  </h3>
                  <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    <p>• Clean your device before photos to get better offers.</p>
                    <p>• Including original box and charger adds 10-15% value.</p>
                    <p>• Newer OS updates usually increase demand.</p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
