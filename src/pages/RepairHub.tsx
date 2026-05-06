import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, Shield, Clock, Wrench, Smartphone, Settings, Laptop, ChevronRight, PenTool, CheckCircle2, ChevronLeft, LayoutGrid, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { useRepairDevices, useRepairCategories, useRepairCategory, type RepairDevice, type RepairCategory } from "@/hooks/useRepair";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const BRANDS = ["Apple", "Samsung", "Xiaomi", "OnePlus", "Google"];

export default function RepairHub() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [currentCategorySlug, setCurrentCategorySlug] = useState<string | null>(null);

  const { data: rootCategories, isLoading: categoriesLoading } = useRepairCategories();
  const { data: activeCategory, isLoading: activeCategoryLoading } = useRepairCategory(currentCategorySlug || "");
  const { data: allDevices, isLoading: devicesLoading } = useRepairDevices();

  useEffect(() => {
    const slug = searchParams.get("category");
    if (slug) setCurrentCategorySlug(slug);
  }, [searchParams]);

  const displayCategories = activeCategory?.children || rootCategories;
  const displayDevices = activeCategory?.repair_devices || (currentCategorySlug ? [] : allDevices);

  const filteredDevices = displayDevices?.filter((device: RepairDevice) => {
    const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         device.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBrand = selectedBrand ? device.brand.toLowerCase() === selectedBrand.toLowerCase() : true;
    return matchesSearch && matchesBrand;
  });

  const handleCategoryClick = (slug: string) => {
    setCurrentCategorySlug(slug);
    setSelectedBrand(null);
    setSearchQuery("");
    navigate(`/repair?category=${encodeURIComponent(slug)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBrandClick = (brand: string) => {
    setSelectedBrand(selectedBrand === brand ? null : brand);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <SEO
        title="Repair Guides & Device Support - iFixit Style"
        description="Find step-by-step repair guides or book a professional repair for your smartphone, tablet, or laptop at Tamrakar Complex, Kathmandu."
        url="/repair"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "How do I track my repair request at Tamrakar Complex?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "You can track your repair request by visiting the Repair Tracking page and entering your Repair ID or Phone Number used during the booking."
              }
            },
            {
              "@type": "Question",
              "name": "What devices do you repair at Tamrakar Complex?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "We provide repair services and guides for a wide range of devices including iPhones, Samsung Galaxy phones, Xiaomi, OnePlus, Google Pixel, and various laptop brands like Apple MacBook, Dell, HP, and Lenovo."
              }
            },
            {
              "@type": "Question",
              "name": "Are the repair guides free to use?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, all repair guides on Tamrakar Complex are free to access. They are provided by our community of experts to help you fix your own gadgets."
              }
            }
          ]
        }}
      />
      <Header />

      <main className="flex-1 pb-20">
        {/* Hero Section */}
        <div className="bg-slate-900 text-white py-24 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/10 mix-blend-overlay" />
          <div className="container max-w-5xl text-center space-y-10 relative z-10">
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-6 py-2 rounded-full text-primary font-black uppercase tracking-widest text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Community Repair Manual
            </div>
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9]">
              Repair is <br />
              <span className="text-primary">Everything.</span>
            </h1>
            <div className="bg-white/5 p-6 rounded-2xl backdrop-blur-sm border border-white/10 max-w-3xl mx-auto text-left">
              <p className="text-xl md:text-2xl text-slate-200 leading-relaxed font-medium">
                <strong>Repair Hub:</strong> The official digital platform for smartphone, tablet, and laptop repair services at Tamrakar Complex, Nepal. We provide expert repair manuals and professional technician booking for all major tech brands.
              </p>
            </div>
            <div className="relative max-w-3xl mx-auto group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 h-8 w-8 group-focus-within:text-primary transition-all" />
              <Input
                className="pl-16 h-20 bg-white text-black text-2xl rounded-3xl border-none shadow-2xl focus-visible:ring-8 focus-visible:ring-primary/20 transition-all"
                placeholder="Search device or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" className="h-12 rounded-full px-8 font-black" asChild>
                <Link to="/repair/custom">Submit Repair Request</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 rounded-full border-white/30 bg-white/10 px-8 font-black text-white hover:bg-white/20" asChild>
                <Link to="/repair/track">Track Repair</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="container mt-16 space-y-20">
          {/* Breadcrumbs / Navigation */}
          <div className="flex items-center gap-3 text-sm bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-10 gap-2 font-black uppercase tracking-widest text-[10px]"
              onClick={() => {
                setCurrentCategorySlug(null);
                setSelectedBrand(null);
                navigate("/repair");
              }}
            >
              <LayoutGrid className="h-4 w-4" />
              Root
            </Button>
            {currentCategorySlug && (
              <>
                <ChevronRight className="h-4 w-4 text-slate-300" />
                <span className="font-black text-primary uppercase tracking-widest text-[10px]">{activeCategory?.name}</span>
              </>
            )}
          </div>

          {/* Categories Grid */}
          <section className="space-y-10">
            <div className="flex items-end justify-between border-b-4 border-slate-100 pb-6">
              <div>
                <h2 className="text-4xl font-black tracking-tight text-slate-900">
                  {currentCategorySlug ? `Explore ${activeCategory?.name}` : "Browse Everything"}
                </h2>
                <p className="text-lg text-slate-500 mt-2 font-medium">Select a category to narrow down your search.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
              {categoriesLoading || activeCategoryLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-56 w-full rounded-[2.5rem]" />
                ))
              ) : displayCategories?.map((cat: RepairCategory) => (
                <div
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className="group cursor-pointer flex flex-col items-center p-10 bg-white rounded-[3rem] shadow-sm border-2 border-transparent hover:border-primary hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 text-center"
                >
                  <div className="h-28 w-28 mb-6 bg-slate-50 rounded-[2rem] flex items-center justify-center group-hover:bg-primary/5 transition-colors overflow-hidden">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="h-16 w-16 object-contain group-hover:scale-125 transition-transform duration-700" />
                    ) : (
                      <Box className="h-12 w-12 text-slate-200 group-hover:text-primary transition-colors" />
                    )}
                  </div>
                  <span className="font-black text-md text-slate-900 group-hover:text-primary transition-colors leading-tight">{cat.name}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Devices Grid */}
          {(displayDevices?.length > 0 || devicesLoading) && (
            <section className="space-y-10 pt-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-slate-100 pb-6">
                <div>
                  <h2 className="text-4xl font-black tracking-tight text-slate-900">Devices</h2>
                  <p className="text-lg text-slate-500 mt-2 font-medium">Choose a specific model for repair guides.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {BRANDS.map(brand => (
                    <Button 
                      key={brand} 
                      variant={selectedBrand === brand ? "default" : "outline"} 
                      size="sm" 
                      className={cn(
                        "rounded-full transition-all font-black uppercase tracking-widest text-[10px] px-6 h-10",
                        selectedBrand === brand ? "shadow-xl shadow-primary/30 scale-105" : "hover:bg-slate-100"
                      )}
                      onClick={() => handleBrandClick(brand)}
                    >
                      {brand}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
                {devicesLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-64 w-full rounded-[2.5rem]" />
                  ))
                ) : filteredDevices && filteredDevices.length > 0 ? (
                  filteredDevices.map((device: RepairDevice) => (
                    <Link 
                      key={device.id} 
                      to={`/repair/device/${device.slug}`}
                      className="group flex flex-col items-center p-8 bg-white rounded-[2.5rem] shadow-sm border-2 border-transparent hover:border-primary hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 text-center"
                    >
                      <div className="h-32 w-32 mb-6 relative">
                        <img 
                          src={device.image || "/placeholder.svg"} 
                          alt={device.name}
                          className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-700"
                        />
                      </div>
                      <span className="font-black text-sm text-slate-900 group-hover:text-primary transition-colors leading-tight">{device.name}</span>
                      <span className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest">{device.brand}</span>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
                    <Smartphone className="h-16 w-16 text-slate-100 mx-auto mb-6" />
                    <p className="text-xl text-slate-400 font-black uppercase tracking-widest">No devices found</p>
                    <Button variant="link" className="mt-2 text-primary font-black uppercase tracking-widest text-xs" onClick={() => setSelectedBrand(null)}>Clear filters</Button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* iFixit Style "Repair is Noble" Section */}
          <section className="grid md:grid-cols-2 gap-8 py-12">
            <div className="bg-blue-600 rounded-[2.5rem] p-12 text-white flex flex-col justify-between">
              <div className="space-y-6">
                <h2 className="text-4xl font-black">Repair is Noble.</h2>
                <p className="text-xl text-blue-100 leading-relaxed">
                  Repair is better than recycling. It saves you money, saves the planet, and teaches you how things work.
                </p>
              </div>
              <Button size="lg" variant="outline" className="w-fit mt-8 rounded-full border-white/30 text-white hover:bg-white/10" asChild>
                <Link to="/about">Our Mission</Link>
              </Button>
            </div>
            <div className="bg-slate-900 rounded-[2.5rem] p-12 text-white flex flex-col justify-between overflow-hidden relative">
              <div className="absolute right-0 bottom-0 opacity-10 -rotate-12 translate-x-1/4 translate-y-1/4">
                <Wrench className="h-64 w-64" />
              </div>
              <div className="space-y-6 relative z-10">
                <h2 className="text-4xl font-black">Professional Service.</h2>
                <p className="text-xl text-slate-400 leading-relaxed">
                  Not feeling confident? Our certified technicians at Tamrakar Complex can handle it for you.
                </p>
              </div>
              <Button size="lg" className="w-fit mt-8 rounded-full px-10" asChild>
                <Link to="/repair/custom">Book a Repair</Link>
              </Button>
            </div>
          </section>

          {/* FAQ Section for AI SEO */}
          <section className="space-y-12 py-12">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <h2 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic">Common Repair Questions</h2>
              <p className="text-lg text-slate-500 font-medium">Everything you need to know about getting your tech fixed at Tamrakar Complex.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  q: "How do I track my repair request?",
                  a: "Visit our tracking page and enter your unique Repair ID to see real-time updates from our technicians."
                },
                {
                  q: "What devices do you repair?",
                  a: "We specialize in smartphones, tablets, and laptops from Apple, Samsung, Xiaomi, and all other major brands."
                },
                {
                  q: "Are these guides safe to follow?",
                  a: "Our community guides are written by experts, but we recommend professional service for complex internal repairs."
                }
              ].map((faq, i) => (
                <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all">
                  <h3 className="text-xl font-black text-slate-900 mb-4 leading-tight">{faq.q}</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
