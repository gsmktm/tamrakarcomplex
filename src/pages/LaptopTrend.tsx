import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Laptop, Cpu, Battery, Zap } from "lucide-react";

const trends = [
  {
    title: "Apple Silicon Dominance",
    desc: "M5 and A18 Pro chips bring ARM efficiency to MacBook Air/Pro — 30% faster, 2x battery vs Intel. Nepal price Rs. 135k–946k.",
    icon: Cpu,
    color: "text-slate-800",
    bg: "bg-slate-100",
  },
  {
    title: "Gaming Legion & LOQ Surge",
    desc: "Legion 5/Pro with RTX 5070/5080 and LOQ 15 with RTX 5050/5060 dominate 2025 Nepal gaming — Rs. 228k–774k.",
    icon: Zap,
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    title: "Business ThinkPad & Yoga",
    desc: "ThinkPad X9/P14s with Ultra 258V and Yoga 9 with 2.8K touch cater to enterprise — Rs. 189k–360k.",
    icon: Laptop,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "OLED & 240Hz Standard",
    desc: "2.8K OLED 120-240Hz now standard on IdeaPad Pro, Legion, Predator Helios — premium display at Rs. 270k–950k.",
    icon: Battery,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
];

export default function LaptopTrend() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEO
        title="Laptop Price Trends in Nepal 2026"
        description="Latest laptop price trends in Nepal — Apple MacBook M5, Lenovo Legion/ThinkPad, Acer Predator, Asus ROG, Dell XPS/Alienware price analysis."
        url="/laptop-trends"
      />
      <Header />
      <main className="flex-1">
        <section className="border-b bg-gradient-to-b from-primary/10 via-background to-background">
          <div className="container py-16 text-center">
            <Badge variant="outline" className="mb-4 gap-2 rounded-full px-4 py-2">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Nepal Laptop Market 2026
            </Badge>
            <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold tracking-tight md:text-5xl">
              The Trend of Laptops in Nepal
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              ARM Apple silicon, RTX 50-series gaming, and OLED displays define 2026. Compare 89 new models from Apple, Lenovo, Acer, Asus, Dell, HP, MSI, Razer — Rs. 62k–946k.
            </p>
          </div>
        </section>

        <section className="container py-12">
          <div className="grid gap-6 md:grid-cols-2">
            {trends.map((t) => (
              <Card key={t.title} className="rounded-3xl">
                <CardContent className="p-6">
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${t.bg} ${t.color}`}>
                    <t.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold">{t.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 rounded-3xl border bg-muted/30 p-8 text-center">
            <h2 className="font-display text-2xl font-bold">Laptop Price in Nepal — Complete Catalog</h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              Browse all 89 new laptops plus 5 existing — filter by brand, price, and compare. Data from Nepal retail June 2026, stored in `products` where `category='Laptops'`.
            </p>
            <a href="/laptop-price" className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90">
              View Laptop Prices →
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
