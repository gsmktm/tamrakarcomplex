import { useParams, Link } from "react-router-dom";
import { ChevronRight, Clock, Shield, Wrench, Package, CheckCircle2, ChevronLeft, ArrowRight, Share2, Printer, AlertTriangle, ShoppingCart, ExternalLink, Info, Hammer, Box, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { useRepairGuide, RepairTool, RepairPart, RepairStep } from "@/hooks/useRepair";
import { Badge } from "@/components/ui/badge";
import { safeExternalUrl } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { breadcrumbSchema, faqSchema } from "@/lib/seo";

export default function GuideDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: guide, isLoading } = useRepairGuide(slug || "");

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="container flex-1 py-12 space-y-8">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Guide Not Found</h1>
        <Button asChild>
          <Link to="/repair">Back to Repair Hub</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={`${guide.title} - Step-by-Step DIY Guide`}
        description={guide.summary || `Follow this expert guide to repair your device.`}
        image={guide.image || undefined}
        url={`/repair/guide/${guide.slug}`}
        structuredData={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Repair", url: "/repair" },
            ...(guide.repair_devices?.slug ? [{ name: guide.repair_devices.name, url: `/repair/device/${guide.repair_devices.slug}` }] : []),
            { name: guide.title, url: `/repair/guide/${guide.slug}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: guide.title,
            description: guide.summary,
            image: guide.image,
            totalTime: guide.time_estimate,
            supply: guide.parts?.map((part: RepairPart) => ({ "@type": "HowToSupply", name: part.name })),
            tool: guide.tools?.map((tool: RepairTool) => ({ "@type": "HowToTool", name: tool.name })),
            step: guide.steps?.map((step: RepairStep, index: number) => ({
              "@type": "HowToStep",
              position: index + 1,
              name: step.title,
              text: step.instruction,
              image: step.image,
            })),
          },
          faqSchema([
            {
              question: `Is ${guide.title} free to read?`,
              answer: "Yes. Tamrakar Complex repair guides are free to access for users who want to understand repair steps before booking service.",
            },
            {
              question: "Can I book technician help for this repair?",
              answer: "Yes. You can submit a custom repair request and track the repair using your tracking ID.",
            },
          ]),
        ]}
      />
      <Header />

      <main className="flex-1 pb-20">
        {/* Guide Header */}
        <div className="bg-card border-b border-border py-10">
          <div className="container">
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link to="/repair" className="hover:text-primary">Repair Hub</Link>
                <ChevronRight className="h-3 w-3" />
                {guide.repair_devices?.repair_categories && (
                  <>
                    <Link to={`/repair?category=${guide.repair_devices.repair_categories.slug}`} className="hover:text-primary">
                      {guide.repair_devices.repair_categories.name}
                    </Link>
                    <ChevronRight className="h-3 w-3" />
                  </>
                )}
                <Link to={`/repair/device/${guide.repair_devices?.slug}`} className="hover:text-primary">
                  {guide.repair_devices?.name}
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground font-medium">{guide.title}</span>
              </div>

              <div className="flex flex-col lg:grid lg:grid-cols-12 gap-10 items-start">
                <div className="lg:col-span-8 space-y-6">
                  <div className="space-y-4">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
                      {guide.title}
                    </h1>
                    <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
                      {guide.summary}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 items-center p-4 bg-muted rounded-2xl border border-border">
                    <Badge variant="outline" className="px-4 py-1.5 bg-card border-border capitalize font-bold text-foreground">
                      {guide.difficulty} Difficulty
                    </Badge>
                    <div className="h-4 w-px bg-slate-200 mx-2 hidden sm:block" />
                    <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>{guide.time_estimate}</span>
                    </div>
                    <div className="h-4 w-px bg-slate-200 mx-2 hidden sm:block" />
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span>Author: {guide.author}</span>
                    </div>
                  </div>
                </div>
                
                <div className="lg:col-span-4 w-full flex flex-col gap-4">
                  <Card className="border-primary/20 shadow-xl shadow-primary/5 rounded-[2rem] overflow-hidden">
                    <CardHeader className="bg-primary text-white p-6">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Shop this Guide
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Get all the tools and parts you need for this repair from our marketplace.
                      </p>
                      <Button className="w-full rounded-xl h-12 text-md font-bold gap-2" asChild>
                        <Link to="/repair/custom">
                          Book Professional Repair
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full rounded-xl h-12 text-md font-bold gap-2 border-border" asChild>
                        <Link to={`/stores?search=${guide.repair_devices?.name}`}>
                          Find Parts in Stores
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="ghost" className="rounded-xl gap-2 text-sm h-11 hover:bg-card hover:shadow-sm" onClick={() => window.print()}>
                      <Printer className="h-4 w-4" /> Print Guide
                    </Button>
                    <Button variant="ghost" className="rounded-xl gap-2 text-sm h-11 hover:bg-card hover:shadow-sm" onClick={async () => {
                      const url = window.location.href;
                      if (navigator.share) {
                        try { await navigator.share({ title: guide.title, url }); } catch { /* dismissed */ }
                      } else {
                        await navigator.clipboard.writeText(url);
                        // lightweight feedback via native alert fallback is handled by sonner in parent? keep simple
                        alert("Link copied to clipboard");
                      }
                    }}>
                      <Share2 className="h-4 w-4" /> Share
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mt-12">
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-12">
            {/* Sidebar - Tools & Parts */}
            <aside className="lg:col-span-4 space-y-10">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black flex items-center gap-2">
                    <Wrench className="h-6 w-6 text-primary" />
                    Tools
                  </h3>
                  <Badge className="bg-muted text-muted-foreground border-none">{guide.tools?.length || 0}</Badge>
                </div>
                <div className="grid gap-3">
                  {guide.tools && guide.tools.length > 0 ? (
                    guide.tools.map((tool: RepairTool) => (
                      <div key={tool.id} className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                        <div className="h-14 w-14 bg-muted rounded-xl p-2 flex-shrink-0">
                          <img src={tool.image || "/placeholder.svg"} alt={tool.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-foreground">{tool.name}</p>
                          {safeExternalUrl(tool.url) && (
                            <a href={safeExternalUrl(tool.url)!} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider">Buy Tool</a>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center bg-card rounded-2xl border border-dashed">
                      <Info className="h-8 w-8 text-muted mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground italic">Standard toolkit required.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black flex items-center gap-2">
                    <Package className="h-6 w-6 text-primary" />
                    Parts
                  </h3>
                  <Badge className="bg-slate-100 text-muted-foreground border-none">{guide.parts?.length || 0}</Badge>
                </div>
                <div className="grid gap-3">
                  {guide.parts && guide.parts.length > 0 ? (
                    guide.parts.map((part: RepairPart) => (
                      <div key={part.id} className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                        <div className="h-14 w-14 bg-muted rounded-xl p-2 flex-shrink-0">
                          <img src={part.image || "/placeholder.svg"} alt={part.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-foreground">{part.name}</p>
                          <div className="flex items-center justify-between mt-1">
                            {part.estimated_price && (
                              <span className="text-xs text-primary font-black">Rs. {part.estimated_price}</span>
                            )}
                            {safeExternalUrl(part.url) && (
                              <a href={safeExternalUrl(part.url)!} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider">View Part</a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center bg-card rounded-2xl border border-dashed">
                      <Info className="h-8 w-8 text-muted mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground italic">No specific parts listed.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-amber-50 border-2 border-amber-100 rounded-[2rem] p-8 space-y-4">
                <div className="flex items-center gap-3 text-amber-800">
                  <AlertTriangle className="h-6 w-6" />
                  <h4 className="font-black text-lg">Warning!</h4>
                </div>
                <p className="text-sm text-amber-800/80 leading-relaxed font-medium">
                  Repairing high-voltage electronics like MacBook displays or power supplies is extremely dangerous. 
                  Always disconnect power and use ESD-safe tools. If you're not 100% confident, let our pros at Tamrakar Complex handle it.
                </p>
              </div>
            </aside>

            {/* Main Content - Steps */}
            <div className="lg:col-span-8 space-y-12">
              <h2 className="text-4xl font-black text-foreground">Instructions</h2>
              
              <div className="space-y-20">
                {guide.steps && guide.steps.length > 0 ? (
                  guide.steps.map((step: RepairStep, index: number) => (
                    <div key={step.id} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: `${index * 100}ms` }}>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center justify-center w-14 h-14 bg-primary text-white font-black rounded-2xl text-2xl shadow-xl shadow-primary/20 rotate-3 group-hover:rotate-0 transition-transform">
                          {index + 1}
                        </div>
                        <h3 className="text-3xl font-black text-foreground">{step.title || `Step ${index + 1}`}</h3>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-10 items-start">
                        <div className="space-y-6">
                          <div className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap font-medium">
                            {step.content}
                          </div>
                        </div>
                        <div className="space-y-4">
                          {step.images && step.images.length > 0 ? (
                            step.images.map((img: string, i: number) => (
                              <div key={i} className="rounded-3xl overflow-hidden shadow-2xl border-4 border-border group">
                                <img 
                                  src={img} 
                                  alt={`Step ${index + 1} image ${i + 1}`} 
                                  className="w-full h-auto group-hover:scale-105 transition-transform duration-700" 
                                />
                              </div>
                            ))
                          ) : (
                            <div className="aspect-video bg-muted rounded-3xl flex items-center justify-center border-4 border-dashed border-border">
                              <Box className="h-12 w-12 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-card rounded-3xl border-4 border-dashed">
                    <PenTool className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="text-xl text-muted-foreground font-bold">No steps recorded for this guide yet.</p>
                  </div>
                )}
              </div>

              {/* Final Conclusion */}
              <div className="bg-slate-900 rounded-[3rem] p-16 text-center space-y-8 relative overflow-hidden mt-20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 blur-[100px]" />
                
                <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-4 rotate-12">
                  <CheckCircle2 className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-5xl font-black text-white">Repair Success?</h2>
                <p className="text-muted-foreground text-xl max-w-2xl mx-auto leading-relaxed">
                  Congratulations on fixing your device! If you found this guide helpful, consider sharing it with others. 
                  Still having trouble? Visit us at Tamrakar Complex for expert assistance.
                </p>
                <div className="flex flex-wrap justify-center gap-4 pt-8">
                  <Button size="lg" className="rounded-full px-12 h-16 text-lg font-black shadow-2xl shadow-primary/30" asChild>
                    <Link to="/repair/custom">Get Expert Help</Link>
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full px-12 h-16 text-lg font-black border-slate-700 text-white hover:bg-slate-800" asChild>
                    <Link to="/repair">Back to Hub</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
