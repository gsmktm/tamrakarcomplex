import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useModelHub } from "@/hooks/useModelHub";
import { 
  Smartphone, 
  ShoppingCart, 
  Repeat, 
  Wrench, 
  Unlock, 
  Tag, 
  ChevronRight,
  Info,
  ShieldCheck,
  Zap,
  MapPin,
  Loader2,
  AlertCircle,
  Cpu,
  Monitor,
  Camera,
  Battery,
  Layers,
  CheckCircle2,
  XCircle,
  Trophy,
  History,
  Box,
  Palette,
  Wind,
  ArrowRight,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEO } from "@/components/common/SEO";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export default function ModelHub() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, error } = useModelHub(slug || "");

  const { data: relatedModels } = useQuery({
    queryKey: ["related_models", data?.model?.brand_id, data?.model?.id],
    queryFn: async () => {
      if (!data?.model) return [];
      const { data: res, error: err } = await supabase
        .from("phone_models")
        .select("id, name, slug, image, brands(name)")
        .eq("brand_id", data.model.brand_id)
        .neq("id", data.model.id)
        .limit(4);
      if (err) throw err;
      return res;
    },
    enabled: !!data?.model,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping duration-1000" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary border-2 border-primary/20 shadow-lg">
                <Smartphone className="h-10 w-10" />
              </div>
            </div>
            <p className="text-muted-foreground animate-pulse">Building mobile intelligence hub...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full border-destructive/20">
            <CardContent className="pt-6 text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <h1 className="text-2xl font-bold">Model Not Found</h1>
              <p className="text-muted-foreground">We couldn't find the mobile model you're looking for.</p>
              <Button asChild className="w-full">
                <Link to="/mobile-price">Browse All Models</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const { model, inventory, usedListings, exchangeValues, repairServices, unlockingServices, accessories, specs, variants } = data;

  const highlights = (specs?.highlights as any[]) || [];
  const pros = (specs?.pros as string[]) || [];
  const cons = (specs?.cons as string[]) || [];

  const minPrice = inventory.length > 0 ? Math.min(...inventory.map(i => i.price)) : null;
  const maxPrice = inventory.length > 0 ? Math.max(...inventory.map(i => i.price)) : null;
  const priceRange = minPrice ? (minPrice === maxPrice ? `NPR ${minPrice.toLocaleString()}` : `NPR ${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}`) : "Price on Request";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title={`${model.name} - Buy New/Used, Repair, Exchange & Accessories`}
        description={`Everything for ${model.name} in one place. New & used prices, repair costs, unlocking services, and compatible accessories at Tamrakar Complex.`}
        image={model.image || undefined}
      />
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-muted/50 to-background border-b pt-8 pb-12">
          <div className="container">
            <div className="flex flex-col lg:flex-row gap-12 items-center">
              <div className="flex-1 space-y-8 text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-muted-foreground">
                  <Link to="/" className="hover:text-primary">Home</Link>
                  <ChevronRight className="h-4 w-4" />
                  <Link to="/mobile-price" className="hover:text-primary">Mobiles</Link>
                  <ChevronRight className="h-4 w-4" />
                  <span className="font-medium text-foreground">{model.name}</span>
                </div>
                
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider">
                    <Trophy className="h-3 w-3" /> Central Master Model
                  </div>
                  <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-balance leading-tight">
                    {model.name}
                  </h1>
                  <div className="flex flex-col sm:flex-row items-center gap-4 text-center lg:text-left justify-center lg:justify-start">
                    <p className="text-3xl font-black text-primary">{priceRange}</p>
                    {inventory.length > 0 && (
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                        In Stock at Tamrakar
                      </Badge>
                    )}
                  </div>
                  {variants && variants.length > 0 && (
                    <div className="flex flex-wrap justify-center lg:justify-start gap-2 pt-2">
                      {variants.map((v: any) => (
                        <Badge key={v.id} variant="secondary" className="bg-muted/50 text-[10px] font-bold">
                          {v.ram}/{v.storage}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Key Specs Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-2 bg-background/50 backdrop-blur rounded-2xl border shadow-sm">
                  <KeySpec icon={<Cpu />} label="Processor" value={specs?.processor || "N/A"} />
                  <KeySpec icon={<Monitor />} label="Display" value={specs?.display?.split(",")[0] || "N/A"} />
                  <KeySpec icon={<Camera />} label="Camera" value={specs?.camera?.split(",")[0] || "N/A"} />
                  <KeySpec icon={<Battery />} label="Battery" value={specs?.battery || "N/A"} />
                </div>

                <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                  <Button size="lg" className="rounded-full h-12 px-8 hero-gradient shadow-glow group" asChild>
                    <Link to="#buy">
                      Buy Now
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full h-12 px-8" asChild>
                    <Link to="#exchange">Exchange Device</Link>
                  </Button>
                </div>
              </div>

              <div className="flex-1 relative group">
                <div className="absolute -inset-4 bg-primary/5 rounded-[3rem] blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />
                <div className="relative aspect-[4/5] max-w-md mx-auto bg-background rounded-3xl border shadow-2xl flex items-center justify-center p-12 overflow-hidden ring-1 ring-border/50">
                  <img 
                    src={model.image || "/default-phone.svg"} 
                    alt={model.name}
                    className="max-h-full max-w-full object-contain transition-transform duration-700 group-hover:scale-105"
                  />
                  {inventory.length > 0 && (
                    <Badge className="absolute top-6 right-6 bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20 px-3 py-1">
                      In Stock
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Intelligence Tabs */}
        <section className="container py-12">
          <Tabs defaultValue="overview" className="space-y-12">
            <div className="flex justify-center sticky top-20 z-40 py-4 bg-background/80 backdrop-blur-md">
              <TabsList className="grid grid-cols-2 md:grid-cols-6 h-auto p-1.5 bg-muted/50 rounded-full border shadow-sm">
                <TabsTrigger value="overview" className="rounded-full py-2.5 px-6">Overview</TabsTrigger>
                <TabsTrigger value="buy" className="rounded-full py-2.5 px-6">Buy New/Used</TabsTrigger>
                <TabsTrigger value="exchange" className="rounded-full py-2.5 px-6">Exchange</TabsTrigger>
                <TabsTrigger value="repair" className="rounded-full py-2.5 px-6">Repair</TabsTrigger>
                <TabsTrigger value="unlock" className="rounded-full py-2.5 px-6">Unlock</TabsTrigger>
                <TabsTrigger value="accessories" className="rounded-full py-2.5 px-6">Accessories</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* GadgetByte Style At a Glance */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 bg-muted/20 border-none shadow-none">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                      <Zap className="h-6 w-6 text-primary" /> At a Glance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Display</p>
                      <p className="font-bold">{specs?.display?.split(",")[0] || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Processor</p>
                      <p className="font-bold">{specs?.processor || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Main Camera</p>
                      <p className="font-bold">{specs?.camera?.split(",")[0] || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Battery</p>
                      <p className="font-bold">{specs?.battery || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">OS</p>
                      <p className="font-bold">{specs?.os || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Price in Nepal</p>
                      <p className="font-bold text-primary">{priceRange}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hero-gradient text-white border-none shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Trophy className="h-32 w-32" />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl">Market Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium opacity-80">New Availability</span>
                      <Badge className="bg-white/20 text-white border-none">{inventory.length > 0 ? "Available" : "Check Store"}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium opacity-80">Used Market</span>
                      <Badge className="bg-white/20 text-white border-none">{usedListings.length} Listings</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium opacity-80">Repair Support</span>
                      <Badge className="bg-white/20 text-white border-none">Verified</Badge>
                    </div>
                    <Button className="w-full bg-white text-primary hover:bg-white/90 font-bold rounded-xl h-12 mt-4" asChild>
                      <Link to="#buy">View Stores</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Pros & Cons */}
              {(pros.length > 0 || cons.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card className="bg-green-50/30 dark:bg-green-950/10 border-green-100 dark:border-green-900/30 overflow-hidden">
                    <CardHeader className="bg-green-500/5 border-b border-green-100 dark:border-green-900/30">
                      <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <CheckCircle2 className="h-5 w-5" /> Reasons to Buy
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <ul className="space-y-3">
                        {pros.map((pro, i) => (
                          <li key={i} className="flex gap-3 text-sm">
                            <span className="flex-shrink-0 h-5 w-5 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center font-bold text-[10px]">✓</span>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="bg-red-50/30 dark:bg-red-950/10 border-red-100 dark:border-red-900/30 overflow-hidden">
                    <CardHeader className="bg-red-500/5 border-b border-red-100 dark:border-red-900/30">
                      <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                        <XCircle className="h-5 w-5" /> Reasons to Avoid
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <ul className="space-y-3">
                        {cons.map((con, i) => (
                          <li key={i} className="flex gap-3 text-sm">
                            <span className="flex-shrink-0 h-5 w-5 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center font-bold text-[10px]">✕</span>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Highlights Breakdown */}
              <div className="space-y-12 max-w-4xl mx-auto">
                {highlights.map((h, i) => (
                  <div key={i} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        {h.title === "Design" && <Palette className="h-5 w-5" />}
                        {h.title === "Display" && <Monitor className="h-5 w-5" />}
                        {h.title === "Performance" && <Zap className="h-5 w-5" />}
                        {h.title === "Camera" && <Camera className="h-5 w-5" />}
                        {h.title === "Battery" && <Battery className="h-5 w-5" />}
                        {!["Design", "Display", "Performance", "Camera", "Battery"].includes(h.title) && <Info className="h-5 w-5" />}
                      </div>
                      <h2 className="text-3xl font-bold">{h.title}</h2>
                    </div>
                    <div className="prose dark:prose-invert max-w-none text-lg leading-relaxed text-muted-foreground">
                      {h.content}
                    </div>
                  </div>
                ))}

                {specs?.verdict && (
                  <Card className="bg-primary/5 border-primary/20 mt-16 overflow-hidden">
                    <CardHeader className="bg-primary/10 border-b border-primary/10">
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-primary" /> Expert Verdict
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-8 pb-10 text-xl italic font-medium leading-relaxed text-center px-12">
                      "{specs.verdict}"
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Tech Specs Table */}
              <div className="pt-12">
                <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                  <Info className="h-7 w-7 text-primary" /> Technical Specifications
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1 gap-x-12 border-t pt-8">
                  <SpecRow label="Display" value={specs?.display} />
                  <SpecRow label="Processor" value={specs?.processor} />
                  <SpecRow label="Camera" value={specs?.camera} />
                  <SpecRow label="Battery" value={specs?.battery} />
                  <SpecRow label="Charging" value={specs?.charging} />
                  <SpecRow label="OS" value={specs?.os} />
                  <SpecRow label="Network" value={specs?.network} />
                  <SpecRow label="Body" value={specs?.body} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="buy" className="space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                      <ShieldCheck className="h-6 w-6 text-green-500" />
                      New Stock in Tamrakar
                    </h3>
                    <Badge variant="outline">{inventory.length} Options</Badge>
                  </div>
                  {inventory.length > 0 ? (
                    <div className="space-y-4">
                      {inventory.map(item => (
                        <StoreStockCard key={item.id} item={item} />
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 border-2 border-dashed rounded-3xl text-center space-y-4">
                      <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto">
                        <Box className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">Currently out of stock in verified stores.</p>
                      <Button variant="outline">Notify Me</Button>
                    </div>
                  )}
                </section>

                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                      <Zap className="h-6 w-6 text-yellow-500" />
                      Used Marketplace
                    </h3>
                    <Badge variant="outline">{usedListings.length} Listings</Badge>
                  </div>
                  {usedListings.length > 0 ? (
                    <div className="space-y-4">
                      {usedListings.map(listing => (
                        <UsedListingCard key={listing.id} listing={listing} />
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 border-2 border-dashed rounded-3xl text-center space-y-4">
                      <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto">
                        <History className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">No verified used devices available right now.</p>
                      <Button variant="outline" asChild>
                        <Link to="/marketplace/sell">Post a Listing</Link>
                      </Button>
                    </div>
                  )}
                </section>
              </div>
            </TabsContent>

            <TabsContent value="exchange" className="max-w-4xl mx-auto space-y-8">
              <div className="text-center space-y-4 mb-12">
                <div className="h-16 w-16 bg-blue-500/10 text-blue-600 rounded-3xl flex items-center justify-center mx-auto">
                  <Repeat className="h-8 w-8" />
                </div>
                <h2 className="text-4xl font-bold">Exchange Valuation</h2>
                <p className="text-xl text-muted-foreground">Upgrade to {model.name} or trade yours for cash.</p>
              </div>
              
              {exchangeValues.length > 0 ? (
                <div className="grid gap-6">
                  {exchangeValues.map(val => (
                    <Card key={val.id} className="group hover:border-primary transition-all">
                      <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-between gap-8">
                        <div className="space-y-2 text-center sm:text-left">
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 px-4 py-1 rounded-full">{val.condition_grade} Condition</Badge>
                          <h4 className="text-lg font-bold">Estimated Trade-in Value</h4>
                          <p className="text-sm text-muted-foreground">{val.admin_note || "Guaranteed value at any Tamrakar Complex partner."}</p>
                        </div>
                        <div className="text-center sm:text-right space-y-3">
                          <p className="text-3xl font-black text-primary tabular-nums tracking-tighter">NPR {val.min_value.toLocaleString()} - {val.max_value.toLocaleString()}</p>
                          <Button size="lg" className="w-full hero-gradient shadow-glow">Start Exchange</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-muted/30 border-dashed border-2 rounded-3xl">
                  <CardContent className="py-20 text-center space-y-4">
                    <Info className="h-10 w-10 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground text-lg">Valuation for this specific model is pending. <br/>Visit the ground floor for an instant physical evaluation.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="repair" className="space-y-12">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold flex items-center gap-3">
                  <Wrench className="h-8 w-8 text-orange-500" /> Certified Repairs
                </h2>
                <Badge variant="secondary">Genuine Spare Parts</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {repairServices.map(service => (
                  <Card key={service.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-xl">{service.repair_type}</CardTitle>
                      {service.part_name && <CardDescription className="font-medium text-primary/80">{service.part_name}</CardDescription>}
                    </CardHeader>
                    <CardContent className="flex items-center justify-between pt-4 border-t">
                      <span className="font-bold text-2xl text-foreground">NPR {service.price?.toLocaleString() || "Quote Needed"}</span>
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-widest">
                          <Clock className="h-3 w-3" /> {service.time_required || "1-2 hours"}
                        </span>
                        <span className="text-[10px] text-green-500 font-bold">EXPRESS</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {repairServices.length === 0 && (
                  <div className="col-span-full p-20 text-center border-2 border-dashed rounded-[2.5rem] space-y-4">
                    <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                      <Wrench className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-lg font-medium">Standard repair pricing for {model.name} is being updated.</p>
                    <Button variant="outline">Request a Quote</Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="accessories" className="space-y-12">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold flex items-center gap-3">
                  <Tag className="h-8 w-8 text-blue-500" /> Compatible Accessories
                </h2>
                <Link to="/buy?category=Accessories" className="text-primary hover:underline text-sm font-bold">View All Accessories</Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {accessories.map(acc => (
                  <Card key={acc.id} className="group overflow-hidden hover:border-primary transition-all duration-300 hover:shadow-lg">
                    <CardContent className="p-0">
                      <div className="aspect-square bg-muted/30 flex items-center justify-center p-6">
                        <Tag className="h-10 w-10 text-muted-foreground group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="p-4 space-y-2">
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold px-2 py-0">{acc.category}</Badge>
                        <p className="text-sm font-bold line-clamp-2 leading-snug group-hover:text-primary transition-colors">{acc.name}</p>
                        <p className="text-lg font-black text-primary tabular-nums">NPR {acc.price.toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {accessories.length === 0 && (
                  <div className="col-span-full p-20 text-center border-2 border-dashed rounded-[2.5rem]">
                    <p className="text-muted-foreground text-lg">Verified covers and chargers for {model.name} are coming soon.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* Related Models */}
        {relatedModels && relatedModels.length > 0 && (
          <section className="bg-muted/30 py-24">
            <div className="container space-y-12">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h2 className="text-4xl font-bold">Other {(model as any).brands?.name} Models</h2>
                  <p className="text-muted-foreground">Continue exploring similar smartphones</p>
                </div>
                <Button variant="outline" className="rounded-full" asChild>
                  <Link to={`/brand/${(model as any).brands?.name.toLowerCase()}`}>View All <ChevronRight className="h-4 w-4 ml-1" /></Link>
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {relatedModels.map(rm => (
                  <Link key={rm.id} to={`/mobile/${rm.slug}`} className="group">
                    <Card className="border-none bg-transparent hover:bg-background/50 transition-all duration-500 rounded-[2rem] group-hover:shadow-xl">
                      <CardContent className="p-8 space-y-6">
                        <div className="aspect-square bg-background rounded-3xl flex items-center justify-center p-8 shadow-sm border group-hover:border-primary/20 transition-all">
                          <img src={rm.image || "/default-phone.svg"} alt={rm.name} className="max-h-full transition-transform duration-700 group-hover:scale-110" />
                        </div>
                        <h3 className="font-bold text-xl text-center group-hover:text-primary transition-colors">{rm.name}</h3>
                      </CardContent>
                    </Card>
                  </Link>
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

function KeySpec({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 gap-1 border-r last:border-r-0 border-border/40">
      <div className="text-primary mb-1">{icon}</div>
      <p className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">{label}</p>
      <p className="text-xs font-black text-foreground truncate w-full text-center">{value}</p>
    </div>
  );
}

function SpecRow({ label, value }: { label: string, value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-4 border-b border-border/40 text-base">
      <span className="font-bold text-muted-foreground uppercase tracking-widest text-xs pt-1">{label}</span>
      <span className="text-right font-medium max-w-[60%]">{value}</span>
    </div>
  );
}

function StoreStockCard({ item }: { item: any }) {
  return (
    <Card className="hover:border-primary transition-all duration-300 group hover:shadow-md">
      <CardContent className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <MapPin className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-bold">{item.stores?.name}</p>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-muted text-[10px] font-bold">NEW</Badge>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{item.warranty || "1 Year Warranty"}</p>
            </div>
          </div>
        </div>
        <div className="text-right space-y-2">
          <p className="text-2xl font-black text-primary tabular-nums">NPR {item.price.toLocaleString()}</p>
          <Button size="sm" variant="outline" className="rounded-full px-6">Contact Store</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UsedListingCard({ listing }: { listing: any }) {
  return (
    <Card className="border-yellow-500/20 bg-yellow-500/5 group hover:border-yellow-500 transition-all">
      <CardContent className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="h-14 w-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Smartphone className="h-7 w-7 text-yellow-600" />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-bold">Verified Used Device</p>
            <div className="flex items-center gap-3">
              <Badge className="bg-yellow-500 text-white hover:bg-yellow-600 text-[10px] font-bold">Grade {listing.condition}</Badge>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">7-Day Return</p>
            </div>
          </div>
        </div>
        <div className="text-right space-y-2">
          <p className="text-2xl font-black text-yellow-600 tabular-nums">NPR {listing.expected_price.toLocaleString()}</p>
          <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 rounded-full px-6">View Details</Button>
        </div>
      </CardContent>
    </Card>
  );
}
