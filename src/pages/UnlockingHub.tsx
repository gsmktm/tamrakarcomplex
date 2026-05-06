import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Shield, Zap, Smartphone, ChevronRight, Lock, Unlock, RefreshCw, Cpu, Key, UserCheck, ArrowLeft, Info, CheckCircle2, Loader2, CreditCard, Clock3, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { useUnlockCatalog, createUnlockRequest } from "@/hooks/useRepair";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ALL_UNLOCKING_SERVICE_OFFERS, UNLOCKING_SERVICE_CATEGORIES, type UnlockingServiceCategory, type UnlockingServiceOffer } from "@/data/unlockingServices";

const ITEMS_PER_PAGE = 20;
const SERVICES_PER_PAGE = 12;

const FEATURES = [
  { id: "frp", label: "FRP Bypass", icon: Key, color: "text-red-500 bg-red-500/10", description: "Factory Reset Protection removal for locked Google/Samsung accounts", models: 81 },
  { id: "imei", label: "IMEI Repair", icon: Cpu, color: "text-blue-500 bg-blue-500/10", description: "Restore your IMEI number after hardware issues", models: 41 },
  { id: "network", label: "Network Unlock", icon: RefreshCw, color: "text-emerald-500 bg-emerald-500/10", description: "Unlock your phone from carrier network restrictions", models: 83 },
  { id: "root", label: "Root Access", icon: Zap, color: "text-amber-500 bg-amber-500/10", description: "Get root access for full system control and customization", models: 8 },
];

export default function UnlockingHub() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFeatureDetail, setShowFeatureDetail] = useState<string | null>(null);

  // Request Dialog State
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedModelForRequest, setSelectedModelForRequest] = useState<string | null>(null);
  const [selectedServiceForRequest, setSelectedServiceForRequest] = useState<string | null>(null);
  const [selectedOfferForRequest, setSelectedOfferForRequest] = useState<UnlockingServiceOffer | null>(null);
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<UnlockingServiceCategory | "all">("all");
  const [servicePage, setServicePage] = useState(1);
  const [requestForm, setRequestForm] = useState({
    name: "",
    phone: "",
    email: "",
    imei: "",
    serialNumber: "",
    paymentMethod: "cash_at_store",
    urgency: "standard",
    notes: ""
  });

  const { data: allModels, isLoading } = useUnlockCatalog(selectedBrand || undefined);

  // Set initial form data if user is logged in
  React.useEffect(() => {
    if (user) {
      setRequestForm(prev => ({
        ...prev,
        name: user.user_metadata?.full_name || user.user_metadata?.name || "",
        email: user.email || "",
        phone: user.user_metadata?.phone || ""
      }));
    }
  }, [user]);

  const filteredModels = useMemo(() => {
    if (!allModels) return [];
    
    return allModels.filter((item) => {
      const matchesSearch = item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.brand.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [allModels, searchQuery]);

  const featureFilteredModels = useMemo(() => {
    if (!showFeatureDetail) return filteredModels;
    
    return filteredModels.filter((item) => {
      const featureLower = showFeatureDetail.toLowerCase();
      if (featureLower.includes('frp')) {
        return item.supported_features.some(f => f.toLowerCase().includes('frp'));
      }
      if (featureLower.includes('imei')) {
        return item.supported_features.some(f => f.toLowerCase().includes('imei') || f.toLowerCase().includes('repair imei'));
      }
      if (featureLower.includes('network') || featureLower.includes('unlock')) {
        return item.supported_features.some(f => 
          f.toLowerCase().includes('network') || 
          f.toLowerCase().includes('direct unlock') ||
          f.toLowerCase().includes('bootloader unlock')
        );
      }
      if (featureLower.includes('root')) {
        return item.supported_features.some(f => 
          f.toLowerCase().includes('root') || 
          f.toLowerCase().includes('magisk') || 
          f.toLowerCase().includes('superuser')
        );
      }
      return true;
    });
  }, [filteredModels, showFeatureDetail]);

  const filteredServiceOffers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return ALL_UNLOCKING_SERVICE_OFFERS.filter((service) => {
      const matchesCategory = selectedServiceCategory === "all" || service.category === selectedServiceCategory;
      const matchesSearch = !query ||
        service.name.toLowerCase().includes(query) ||
        service.category.toLowerCase().includes(query) ||
        service.tags.some((tag) => tag.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedServiceCategory]);

  const serviceTotalPages = Math.max(1, Math.ceil(filteredServiceOffers.length / SERVICES_PER_PAGE));
  const paginatedServiceOffers = useMemo(() => {
    const start = (servicePage - 1) * SERVICES_PER_PAGE;
    return filteredServiceOffers.slice(start, start + SERVICES_PER_PAGE);
  }, [filteredServiceOffers, servicePage]);

  React.useEffect(() => {
    setServicePage(1);
  }, [searchQuery, selectedServiceCategory]);

  const totalPages = Math.ceil((featureFilteredModels?.length || 0) / ITEMS_PER_PAGE);
  const paginatedModels = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return featureFilteredModels.slice(start, start + ITEMS_PER_PAGE);
  }, [featureFilteredModels, currentPage]);

  const handleRequestUnlock = (model: string, brand: string, feature: string, offer?: UnlockingServiceOffer) => {
    setSelectedModelForRequest(`${brand} ${model}`);
    setSelectedServiceForRequest(offer?.name || feature);
    setSelectedOfferForRequest(offer || null);
    setRequestDialogOpen(true);
  };

  const handleBuyService = (offer: UnlockingServiceOffer) => {
    const firstTag = offer.tags.find((tag) => ["iPhone", "Samsung", "Tecno", "Infinix", "iTel", "Verizon", "T-Mobile"].includes(tag));
    setSelectedModelForRequest(firstTag ? `${firstTag} Device` : "Customer Device");
    setSelectedServiceForRequest(offer.name);
    setSelectedOfferForRequest(offer);
    setRequestDialogOpen(true);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelForRequest || !selectedServiceForRequest) return;
    
    setIsSubmitting(true);
    try {
      const [brand, ...modelParts] = selectedModelForRequest.split(" ");
      const model = modelParts.join(" ");

      await createUnlockRequest({
        user_id: user?.id || null,
        brand,
        model,
        service_type: selectedServiceForRequest,
        service_id: selectedOfferForRequest?.id || null,
        quoted_price_npr: selectedOfferForRequest?.estimatedNpr || null,
        payment_method: requestForm.paymentMethod,
        payment_status: "pending",
        imei: requestForm.imei || null,
        serial_number: requestForm.serialNumber || null,
        urgency: requestForm.urgency,
        customer_name: requestForm.name,
        customer_phone: requestForm.phone,
        customer_email: requestForm.email || null,
        notes: [
          selectedOfferForRequest ? `Service: ${selectedOfferForRequest.name}` : null,
          selectedOfferForRequest ? `Category: ${selectedOfferForRequest.category}` : null,
          selectedOfferForRequest ? `Estimated price: Rs. ${selectedOfferForRequest.estimatedNpr.toLocaleString()} (${selectedOfferForRequest.creditPrice} credit)` : null,
          selectedOfferForRequest ? `Turnaround: ${selectedOfferForRequest.turnaround}` : null,
          requestForm.notes,
        ].filter(Boolean).join("\n")
      });

      toast.success(selectedOfferForRequest ? "Service order created. Staff will verify payment and eligibility." : "Request submitted successfully! A technician will contact you shortly.");
      setRequestDialogOpen(false);
      setSelectedOfferForRequest(null);
      setRequestForm(prev => ({ ...prev, imei: "", serialNumber: "", notes: "" }));
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeatureClick = (featureLabel: string) => {
    setShowFeatureDetail(featureLabel);
    setCurrentPage(1);
  };

  const handleBackToAll = () => {
    setShowFeatureDetail(null);
    setCurrentPage(1);
  };

  const getFeatureIcon = (feature: string) => {
    const f = feature.toLowerCase();
    if (f.includes('unlock') && !f.includes('bootloader')) return <Unlock className="h-4 w-4" />;
    if (f.includes('lock')) return <Lock className="h-4 w-4" />;
    if (f.includes('reset') || f.includes('bypass')) return <RefreshCw className="h-4 w-4" />;
    if (f.includes('imei') || f.includes('repair imei')) return <Cpu className="h-4 w-4" />;
    if (f.includes('root')) return <Zap className="h-4 w-4" />;
    if (f.includes('frp')) return <Key className="h-4 w-4" />;
    if (f.includes('it admin') || f.includes('mdm')) return <UserCheck className="h-4 w-4" />;
    if (f.includes('diagnostic')) return <Info className="h-4 w-4" />;
    return <CheckCircle2 className="h-4 w-4" />;
  };

  const getFeatureBadgeColor = (feature: string) => {
    const f = feature.toLowerCase();
    if (f.includes('frp')) return "bg-red-500/10 text-red-600 border-red-200";
    if (f.includes('imei') || f.includes('repair imei')) return "bg-blue-500/10 text-blue-600 border-blue-200";
    if (f.includes('network') || f.includes('direct unlock')) return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
    if (f.includes('root')) return "bg-amber-500/10 text-amber-600 border-amber-200";
    if (f.includes('bootloader')) return "bg-purple-500/10 text-purple-600 border-purple-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://tamrakarcomplex.com/" },
      { "@type": "ListItem", position: 2, name: "Unlocking Services", item: "https://tamrakarcomplex.com/unlocking" },
    ],
  };

  const serviceCatalogSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Phone Unlocking Services in Kathmandu",
    numberOfItems: ALL_UNLOCKING_SERVICE_OFFERS.length,
    itemListElement: ALL_UNLOCKING_SERVICE_OFFERS.slice(0, 24).map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Service",
        name: service.name,
        serviceType: service.category,
        areaServed: "Nepal",
        provider: { "@type": "Organization", name: "Tamrakar Complex" },
        offers: {
          "@type": "Offer",
          priceCurrency: "NPR",
          price: service.estimatedNpr,
          availability: "https://schema.org/InStock",
        },
      },
    })),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Can I purchase iPhone carrier unlock service online?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. You can choose a carrier unlock service, submit IMEI and contact details, then staff verifies eligibility and payment before processing.",
        },
      },
      {
        "@type": "Question",
        name: "Do unlocking services require IMEI?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most carrier checks, network unlocks, and unbarring services require IMEI. Some iCloud or MDM services may require serial number, ECID, iOS version, or device inspection.",
        },
      },
      {
        "@type": "Question",
        name: "Are unlocking prices final?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Displayed prices are estimates based on credit rates. Final eligibility, turnaround, and price are verified by staff before processing.",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <SEO
        title="Phone Unlocking Services in Nepal - iPhone, Samsung FRP, MDM, IMEI"
        description="Buy or request phone unlocking services in Kathmandu: iPhone carrier unlock, Samsung FRP, MDM remove, iCloud bypass tools, IMEI checks, unbarring, and Android software service."
        url="/unlocking"
        keywords={["phone unlocking Nepal", "iPhone unlock Kathmandu", "Samsung FRP Nepal", "MDM remove Nepal", "IMEI check Nepal", "Tamrakar unlocking"]}
        structuredData={[breadcrumbSchema, serviceCatalogSchema, faqSchema]}
      />
      <Header />

      <main className="flex-1 pb-20">
        {/* Hero Section */}
        <div className="bg-slate-900 text-white py-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/10 mix-blend-overlay" />
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
          
          <div className="container max-w-5xl text-center space-y-8 relative z-10">
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-6 py-2 rounded-full text-primary font-black uppercase tracking-widest text-xs">
              <Shield className="h-4 w-4" />
              Official Tamrakar Unlocking Lab
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95]">
              Master <br />
              <span className="text-primary">Unlocking.</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Advanced software services for all major brands. FRP bypass, IMEI repair, network unlock, and root access.
            </p>
            <div className="relative max-w-2xl mx-auto group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 h-6 w-6 group-focus-within:text-primary transition-all" />
              <Input
                className="pl-16 h-14 bg-white text-black text-lg rounded-2xl border-none shadow-2xl focus-visible:ring-8 focus-visible:ring-primary/20 transition-all"
                placeholder="Search model (e.g. Pixel 9, S24 Ultra)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>

        <div className="container mt-12 space-y-10">
          {/* Purchase Service Catalog */}
          <section className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <Badge variant="outline" className="mb-2 bg-emerald-50 text-emerald-700 border-emerald-200">
                  Purchase Service
                </Badge>
                <h2 className="text-2xl font-bold text-slate-900">Unlocking Service Menu</h2>
                <p className="text-sm text-slate-500 max-w-2xl">
                  Select a specific carrier, FRP, MDM, iCloud tool, check, or unbarring service. Prices are estimates from credit rate and staff verifies final eligibility before processing.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={selectedServiceCategory === "all" ? "default" : "outline"}
                  onClick={() => setSelectedServiceCategory("all")}
                  className="rounded-full"
                >
                  All Services
                </Button>
                {UNLOCKING_SERVICE_CATEGORIES.map((category) => (
                  <Button
                    key={category}
                    size="sm"
                    variant={selectedServiceCategory === category ? "default" : "outline"}
                    onClick={() => {
                      setSelectedServiceCategory(category);
                      setServicePage(1);
                    }}
                    className="rounded-full"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {paginatedServiceOffers.map((service) => (
                <Card key={service.id} className="rounded-2xl border-slate-200 hover:border-primary/40 hover:shadow-lg transition-all">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-wider">
                          {service.category}
                        </Badge>
                        <h3 className="mt-2 text-base font-black text-slate-900 leading-snug">
                          {service.name}
                        </h3>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <CreditCard className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Estimate</div>
                        <div className="font-black text-slate-900">Rs. {service.estimatedNpr.toLocaleString()}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Credit</div>
                        <div className="font-black text-slate-900">{service.creditPrice}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock3 className="h-4 w-4 text-primary" />
                      {service.turnaround}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {service.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="rounded-full border bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <Button className="w-full rounded-xl font-bold" onClick={() => handleBuyService(service)}>
                      Buy / Request Service <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredServiceOffers.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-white p-10 text-center">
                <Search className="mx-auto h-8 w-8 text-slate-300" />
                <h3 className="mt-3 font-bold text-slate-900">No matching services</h3>
                <p className="mt-1 text-sm text-slate-500">Try another keyword or category.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-slate-500">
                  Showing {paginatedServiceOffers.length} of {filteredServiceOffers.length} services from the complete service export.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={servicePage <= 1}
                    onClick={() => setServicePage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </Button>
                  <span className="px-2 text-xs font-black text-slate-500">
                    {servicePage} / {serviceTotalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={servicePage >= serviceTotalPages}
                    onClick={() => setServicePage((page) => Math.min(serviceTotalPages, page + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* Feature Tabs */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">Select a Service</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                const count = filteredModels.filter(item => 
                  item.supported_features.some(f => {
                    const fl = f.toLowerCase();
                    if (feature.id === 'frp') return fl.includes('frp');
                    if (feature.id === 'imei') return fl.includes('imei');
                    if (feature.id === 'network') return fl.includes('network') || fl.includes('direct unlock') || fl.includes('bootloader unlock');
                    if (feature.id === 'root') return fl.includes('root');
                    return false;
                  })
                ).length;

                return (
                  <button
                    key={feature.id}
                    onClick={() => handleFeatureClick(feature.label)}
                    className={cn(
                      "relative p-6 rounded-3xl border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl text-left",
                      showFeatureDetail === feature.label 
                        ? "border-primary bg-primary/5 shadow-lg" 
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", feature.color)}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">{feature.label}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">{feature.description}</p>
                    <Badge variant="secondary" className="text-xs font-bold">
                      {count} Models
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feature Detail View */}
          {showFeatureDetail && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={handleBackToAll} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back to All Services
                </Button>
                <div className="h-8 w-px bg-slate-200" />
                <h2 className="text-2xl font-bold text-slate-900">{showFeatureDetail} Supported Devices</h2>
                <Badge variant="outline" className="text-sm font-bold">
                  {featureFilteredModels.length} devices
                </Badge>
              </div>
              
              {/* Sub-description for feature */}
              <div className="bg-slate-900 text-white p-6 rounded-2xl">
                <div className="flex items-start gap-4">
                  {FEATURES.find(f => f.label === showFeatureDetail)?.icon && (
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", 
                      FEATURES.find(f => f.label === showFeatureDetail)?.color
                    )}>
                      {(() => {
                        const Icon = FEATURES.find(f => f.label === showFeatureDetail)?.icon;
                        return Icon ? <Icon className="h-6 w-6" /> : null;
                      })()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg mb-1">{showFeatureDetail} Service</h3>
                    <p className="text-slate-400">
                      {FEATURES.find(f => f.label === showFeatureDetail)?.description}. 
                      Select your device below and click "Request Service" to get started.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Brand Filter */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              size="sm"
              variant={selectedBrand === null ? "default" : "outline"}
              className="rounded-full px-4 h-9 font-bold text-xs"
              onClick={() => {
                setSelectedBrand(null);
                setCurrentPage(1);
              }}
            >
              All Brands
            </Button>
            {FEATURES.map(f => (
              <Button
                key={f.id}
                size="sm"
                variant={showFeatureDetail === f.label ? "default" : "outline"}
                className="rounded-full px-4 h-9 font-bold text-xs"
                onClick={() => {
                  setShowFeatureDetail(showFeatureDetail === f.label ? null : f.label);
                  setCurrentPage(1);
                }}
              >
                {f.label}
              </Button>
            ))}
            {["Apple", "Samsung", "Xiaomi", "OnePlus", "Google", "Vivo", "Oppo", "Realme", "Motorola", "Honor"].map(brand => (
              <Button
                key={brand}
                size="sm"
                variant={selectedBrand === brand ? "default" : "outline"}
                className="rounded-full px-4 h-9 font-bold text-xs"
                onClick={() => {
                  setSelectedBrand(selectedBrand === brand ? null : brand);
                  setCurrentPage(1);
                }}
              >
                {brand}
              </Button>
            ))}
          </div>

          {/* Results Count */}
          <div className="text-center text-sm text-slate-500">
            Showing {paginatedModels.length} of {featureFilteredModels.length} devices
            {showFeatureDetail && ` supporting ${showFeatureDetail}`}
            {selectedBrand && ` from ${selectedBrand}`}
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-52 w-full rounded-2xl" />
              ))
            ) : paginatedModels.length > 0 ? paginatedModels.map((item) => (
              <Card key={item.id} className="rounded-2xl border border-slate-200 hover:border-primary/30 hover:shadow-lg transition-all duration-300 overflow-hidden group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                        {item.brand}
                      </Badge>
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors">
                        {item.model}
                      </h3>
                      <span className="text-xs text-slate-400 font-medium">{item.release_year}</span>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
                      <Smartphone className="h-6 w-6 text-slate-400" />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.supported_features.slice(0, 6).map((feature, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          "inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold border",
                          getFeatureBadgeColor(feature)
                        )}
                      >
                        {getFeatureIcon(feature)}
                        {feature}
                      </span>
                    ))}
                    {item.supported_features.length > 6 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                        +{item.supported_features.length - 6} more
                      </span>
                    )}
                  </div>

                  <Button 
                    className="w-full mt-4 h-11 rounded-xl font-bold gap-2 shadow-md"
                    onClick={() => handleRequestUnlock(item.model, item.brand, showFeatureDetail || "Full Unlock Service")}
                  >
                    Request Device Service
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )) : (
              <div className="col-span-2 text-center py-20">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No devices found</h3>
                <p className="text-slate-500">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full w-10 h-10 p-0"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </Button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="rounded-full w-10 h-10 p-0 font-bold"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              <Button
                variant="outline"
                size="sm"
                className="rounded-full w-10 h-10 p-0"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Info Section */}
          <div className="bg-slate-900 rounded-3xl p-8 text-white mt-16">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <h2 className="text-3xl font-black">Advanced Software Features</h2>
              <p className="text-slate-400">
                Our lab is equipped with official licenses for ChimeraTool, Octopus Box, and Z3X, allowing us to perform deep-level software operations safely and efficiently.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
                {FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.id} className="space-y-2">
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mx-auto", feature.color)}>
                        <Icon className="h-7 w-7" />
                      </div>
                      <p className="font-bold text-sm">{feature.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-3xl p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b bg-white px-5 py-4 sm:px-6">
            <DialogTitle className="text-xl font-black leading-tight">
              {selectedOfferForRequest ? "Purchase Unlocking Service" : "Request Unlocking Service"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-5">
              {selectedOfferForRequest ? "Create a verified service order. Staff confirms eligibility and payment before processing." : (
                <>Submit a request for <strong>{selectedModelForRequest}</strong> - <strong>{selectedServiceForRequest}</strong>.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitRequest} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
            {selectedOfferForRequest && (
              <div className="overflow-hidden rounded-2xl border bg-slate-50">
                <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div className="min-w-0">
                    <Badge className="mb-2 max-w-full truncate">{selectedOfferForRequest.category}</Badge>
                    <div className="text-base font-black leading-snug text-slate-900 sm:text-lg">{selectedOfferForRequest.name}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 font-bold">
                        <Clock3 className="h-3.5 w-3.5 text-primary" />
                        {selectedOfferForRequest.turnaround}
                      </span>
                      <span className="rounded-full bg-white px-2 py-1 font-bold">
                        {selectedOfferForRequest.creditPrice} Credit
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 text-left shadow-sm sm:text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Estimate</div>
                    <div className="whitespace-nowrap text-lg font-black text-primary">Rs. {selectedOfferForRequest.estimatedNpr.toLocaleString()}</div>
                  </div>
                </div>
                <div className="grid gap-2 border-t bg-white/70 px-4 py-3 sm:grid-cols-2">
                  {selectedOfferForRequest.requirements.map((item) => (
                    <div key={item} className="flex min-w-0 items-start gap-2 text-xs font-medium text-slate-600">
                      <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                {selectedOfferForRequest.riskNote && (
                  <p className="border-t border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                    {selectedOfferForRequest.riskNote}
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                required
                value={requestForm.name}
                onChange={(e) => setRequestForm(prev => ({ ...prev, name: e.target.value }))}
              />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="98XXXXXXXX"
                  required
                  value={requestForm.phone}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={requestForm.email}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="imei">IMEI</Label>
                <Input
                  id="imei"
                  placeholder="15 digit IMEI"
                  value={requestForm.imei}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, imei: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial / SN</Label>
                <Input
                  id="serialNumber"
                  placeholder="Optional"
                  value={requestForm.serialNumber}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, serialNumber: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Payment</Label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    ["cash_at_store", "Cash at Store"],
                    ["esewa_khalti", "eSewa / Khalti"],
                    ["bank_transfer", "Bank Transfer"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRequestForm(prev => ({ ...prev, paymentMethod: value }))}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors",
                        requestForm.paymentMethod === value ? "border-primary bg-primary/5 text-primary" : "border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Urgency</Label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    ["standard", "Standard"],
                    ["urgent", "Urgent"],
                    ["check_only", "Check Only"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRequestForm(prev => ({ ...prev, urgency: value }))}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors",
                        requestForm.urgency === value ? "border-primary bg-primary/5 text-primary" : "border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any specific issues or requirements?"
                className="min-h-24 resize-none"
                value={requestForm.notes}
                onChange={(e) => setRequestForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            </div>
            <DialogFooter className="shrink-0 border-t bg-white px-5 py-4 sm:px-6">
              <Button type="submit" className="h-12 w-full rounded-xl font-black" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  selectedOfferForRequest ? "Create Service Order" : "Submit Request"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
