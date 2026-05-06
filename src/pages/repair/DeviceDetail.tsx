import { useParams, Link } from "react-router-dom";
import { ChevronRight, Clock, Hammer, Shield, Wrench, Package, CheckCircle2, Info, List, Settings, AlertCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { useRepairDevice, useRepairGuides } from "@/hooks/useRepair";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { breadcrumbSchema, faqSchema } from "@/lib/seo";

type RepairGuideSummary = {
  id: string;
  title: string;
  slug: string;
  image: string | null;
  summary: string | null;
  difficulty: string | null;
  time_estimate: string | null;
  guide_type?: string | null;
};

export default function DeviceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: device, isLoading: deviceLoading } = useRepairDevice(slug || "");
  const { data: guides, isLoading: guidesLoading } = useRepairGuides(device?.id);

  if (deviceLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="container flex-1 py-12 space-y-8">
          <div className="flex flex-col md:flex-row gap-8">
            <Skeleton className="h-64 w-64 rounded-2xl" />
            <div className="space-y-4 flex-1">
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Device Not Found</h1>
        <Button asChild>
          <Link to="/repair">Back to Repair Hub</Link>
        </Button>
      </div>
    );
  }

  // Group guides by type
  const groupedGuides = (guides as RepairGuideSummary[] | undefined)?.reduce<Record<string, RepairGuideSummary[]>>((acc, guide) => {
    const type = guide.guide_type || 'repair';
    if (!acc[type]) acc[type] = [];
    acc[type].push(guide);
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <SEO
        title={`${device.name} Repair Guide and Service`}
        description={`Repair your ${device.name} with free step-by-step guides, professional service booking, parts, and tools at Tamrakar Complex.`}
        image={device.image || undefined}
        url={`/repair/device/${device.slug}`}
        structuredData={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Repair", url: "/repair" },
            { name: device.name, url: `/repair/device/${device.slug}` },
          ]),
          faqSchema([
            {
              question: `Can I book professional ${device.name} repair?`,
              answer: `Yes. You can submit a repair request for ${device.name} from Tamrakar Complex and track the repair with your tracking ID.`,
            },
            {
              question: `Are ${device.name} repair guides free?`,
              answer: `Yes. Tamrakar Complex repair guides are free to browse and help you understand common repair steps before booking service.`,
            },
          ]),
        ]}
      />
      <Header />

      <main className="flex-1 pb-20">
        {/* Device Hero */}
        <div className="bg-white border-b border-slate-200 py-16">
          <div className="container">
            <div className="flex flex-col lg:flex-row gap-16 items-center lg:items-start">
              <div className="w-full max-w-sm">
                <div className="p-10 bg-slate-50 rounded-[3rem] border-4 border-white shadow-2xl relative group">
                  <img 
                    src={device.image || "/placeholder.svg"} 
                    alt={device.name}
                    className="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute -bottom-6 -right-6 h-20 w-20 bg-primary text-white rounded-3xl flex items-center justify-center shadow-xl rotate-12">
                    <Wrench className="h-10 w-10" />
                  </div>
                </div>
              </div>
              
              <div className="flex-1 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-widest">
                    <Link to="/repair" className="hover:underline">Repair Hub</Link>
                    <ChevronRight className="h-3 w-3" />
                    <span>{device.brand}</span>
                  </div>
                  <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-tight">
                    {device.name} <br />
                    <span className="text-primary">Repair Manual</span>
                  </h1>
                </div>
                
                <p className="text-xl text-slate-600 max-w-3xl leading-relaxed font-medium">
                  {device.summary}
                </p>

                <div className="flex flex-wrap gap-4 pt-4">
                  <Button size="lg" className="rounded-full px-10 h-14 text-lg font-black shadow-xl shadow-primary/20" asChild>
                    <Link to="/repair/custom">Book Repair Service</Link>
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full px-10 h-14 text-lg font-black border-2" onClick={() => {
                    const el = document.getElementById('guides-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}>
                    Browse Guides
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mt-16">
          <div className="grid lg:grid-cols-12 gap-12">
            {/* Left Content - Guides & Details */}
            <div className="lg:col-span-8 space-y-16">
              
              {/* Device Background / Identification */}
              <section className="space-y-6">
                <h2 className="text-3xl font-black flex items-center gap-3 text-slate-900">
                  <Info className="h-8 w-8 text-primary" />
                  Background & Identification
                </h2>
                <div className="prose prose-slate max-w-none text-lg text-slate-600 leading-relaxed font-medium bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                  {device.summary || "No background information available for this device."}
                  <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                    <Settings className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                    <p className="text-sm text-blue-800 italic">
                      Identify your device by checking the model number: <span className="font-bold">{device.model_number || "Check back for updates"}</span>
                    </p>
                  </div>
                </div>
              </section>

              {/* Guides Section */}
              <section id="guides-section" className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-black flex items-center gap-3 text-slate-900">
                    <List className="h-8 w-8 text-primary" />
                    Repair Guides
                  </h2>
                  <Badge className="bg-slate-100 text-slate-600 border-none font-bold">{guides?.length || 0} Total</Badge>
                </div>

                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="bg-white p-1 rounded-2xl border border-slate-100 shadow-sm w-fit mb-8">
                    <TabsTrigger value="all" className="rounded-xl font-bold px-6">All</TabsTrigger>
                    {Object.keys(groupedGuides || {}).map(type => (
                      <TabsTrigger key={type} value={type} className="rounded-xl font-bold px-6 capitalize">
                        {type}s
                      </TabsTrigger>
                    ))}
                    <TabsTrigger value="troubleshooting" className="rounded-xl font-bold px-6">Troubleshooting</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="grid sm:grid-cols-2 gap-8">
                    {guidesLoading ? (
                      Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-3xl" />)
                    ) : guides?.map(guide => (
                      <GuideCard key={guide.id} guide={guide} />
                    ))}
                  </TabsContent>

                  {Object.entries(groupedGuides || {}).map(([type, items]) => (
                    <TabsContent key={type} value={type} className="grid sm:grid-cols-2 gap-8">
                      {items.map((guide) => (
                        <GuideCard key={guide.id} guide={guide} />
                      ))}
                    </TabsContent>
                  ))}

                  <TabsContent value="troubleshooting">
                    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                      <div className="flex items-center gap-4 text-amber-600">
                        <AlertCircle className="h-8 w-8" />
                        <h3 className="text-2xl font-black">Common Problems</h3>
                      </div>
                      <p className="text-slate-600 text-lg leading-relaxed">
                        Identify and fix common issues with your {device.name}. 
                        Our community has documented the following symptoms and solutions.
                      </p>
                      <div className="grid gap-4">
                        {[
                          "Device won't power on",
                          "Battery drains too quickly",
                          "Display is flickering or dark",
                          "Overheating during normal use"
                        ].map(issue => (
                          <div key={issue} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer group">
                            <span className="font-bold text-slate-900">{issue}</span>
                            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </section>
            </div>

            {/* Right Sidebar - Specifications & Shopping */}
            <aside className="lg:col-span-4 space-y-10">
              {/* Specifications Card */}
              <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
                <CardHeader className="bg-slate-900 text-white p-8">
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-primary" />
                    Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-4">
                    {device.specifications && Object.keys(device.specifications).length > 0 ? (
                      Object.entries(device.specifications).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-start gap-4 pb-3 border-b border-slate-50 last:border-0">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{key}</span>
                          <span className="text-sm font-bold text-slate-900 text-right">{String(value)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-sm text-slate-400 italic">No specifications listed yet.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Shopping Quick Links */}
              <div className="space-y-6">
                <h3 className="text-2xl font-black text-slate-900">Shop for {device.name}</h3>
                <div className="grid gap-4">
                  <Button variant="outline" className="h-20 rounded-[1.5rem] border-2 flex justify-between px-6 group hover:border-primary hover:bg-primary/5 transition-all" asChild>
                    <Link to={`/stores?search=${device.brand}`}>
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          <Package className="h-5 w-5 text-slate-600 group-hover:text-primary" />
                        </div>
                        <div className="text-left">
                          <p className="font-black text-slate-900">Replacement Parts</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Batteries, Screens, etc.</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-20 rounded-[1.5rem] border-2 flex justify-between px-6 group hover:border-primary hover:bg-primary/5 transition-all" asChild>
                    <Link to="/stores?search=tools">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          <Wrench className="h-5 w-5 text-slate-600 group-hover:text-primary" />
                        </div>
                        <div className="text-left">
                          <p className="font-black text-slate-900">Pro Toolkit</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ESD-Safe Essentials</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Support CTA */}
              <div className="bg-primary rounded-[2.5rem] p-10 text-white space-y-6 shadow-2xl shadow-primary/30">
                <h3 className="text-2xl font-black">Need help?</h3>
                <p className="text-primary-foreground/80 font-medium">
                  Our certified technicians can handle the repair for you. Get a free quote today.
                </p>
                <Button className="w-full h-12 rounded-2xl bg-white text-primary font-black hover:bg-slate-100">
                  <Link to="/repair/custom" className="w-full">Book Service</Link>
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function GuideCard({ guide }: { guide: RepairGuideSummary }) {
  return (
    <Link to={`/repair/guide/${guide.slug}`}>
      <Card className="h-full group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border-none rounded-[2.5rem] overflow-hidden bg-white">
        <div className="aspect-video relative overflow-hidden bg-slate-100">
          <img 
            src={guide.image || "/placeholder.svg"} 
            alt={guide.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
          <div className="absolute top-6 left-6">
            <Badge className="bg-white/95 text-slate-900 border-none backdrop-blur-md shadow-lg capitalize font-black px-4 py-1.5">
              {guide.difficulty}
            </Badge>
          </div>
        </div>
        <CardHeader className="p-8">
          <CardTitle className="text-2xl font-black group-hover:text-primary transition-colors leading-tight">
            {guide.title}
          </CardTitle>
          <CardDescription className="line-clamp-2 mt-4 text-md font-medium text-slate-500 leading-relaxed">
            {guide.summary}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-0 flex items-center gap-6 text-sm font-bold text-slate-400 border-t border-slate-50 mt-auto">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span>{guide.time_estimate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Hammer className="h-4 w-4 text-primary" />
            <span>{guide.guide_type || 'Repair'}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
