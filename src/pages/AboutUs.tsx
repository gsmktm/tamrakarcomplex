import { Link } from "react-router-dom";
import { ArrowRight, Building2, CheckCircle2, MapPin, RefreshCw, Search, ShieldCheck, ShoppingBag, Smartphone, Store, Wrench } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { breadcrumbSchema } from "@/lib/seo";

const capabilities = [
  { icon: Search, title: "Discover", text: "Compare current Nepal price references, specifications, brands and models before visiting a seller.", href: "/cat/mobiles" },
  { icon: Store, title: "Find stores", text: "Explore stores by name, package, services and location, then contact the seller directly.", href: "/stores" },
  { icon: ShoppingBag, title: "Buy & sell", text: "Browse active marketplace stock or submit a device for an estimated resale or exchange quote.", href: "/marketplace" },
  { icon: Wrench, title: "Repair & unlock", text: "Request repair assessment, follow repair guidance and find lawful device-unlocking support.", href: "/repair" },
];

const trustPoints = [
  "Reference prices are distinguished from confirmed store offers.",
  "A final resale value is confirmed only after physical inspection.",
  "Independent stores remain responsible for their stock, invoice, warranty and fulfilment.",
  "Store subscriptions control visibility and platform features; they do not replace seller verification.",
];

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="About Tamrakar Complex | Nepal-first Gadget Platform"
        description="Learn how Tamrakar Complex connects gadget discovery, Nepal price intelligence, marketplace listings, device valuation, exchange, repair and trusted store discovery."
        url="/about-us"
        schema={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "About Us", url: "/about-us" },
        ])}
      />
      <Header />

      <main>
        <section className="relative overflow-hidden border-b bg-slate-950 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(59,130,246,.22),transparent_34%),radial-gradient(circle_at_85%_10%,rgba(216,255,62,.14),transparent_30%)]" />
          <div className="container relative py-20 lg:py-28">
            <div className="max-w-4xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#D8FF3E]">
                <Building2 className="h-4 w-4" /> New Road roots · Nepal-first platform
              </div>
              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
                One clearer way to discover, value and care for gadgets in Nepal.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
                Tamrakar Complex brings product discovery, price intelligence, store profiles, marketplace listings, device resale and exchange, repair booking and trusted-store discovery into one connected digital platform.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full bg-[#D8FF3E] text-slate-950 hover:bg-[#c8ef30]">
                  <Link to="/stores">Explore stores <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  <Link to="/sell-your-phone">Value my device</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="container py-16 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">What we are</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">The digital discovery layer for a landmark gadget market.</h2>
              <p className="mt-5 leading-7 text-muted-foreground">
                The physical Tamrakar Complex area in New Road is known for mobile phones, electronics, accessories and technical services. This website helps customers understand products and find participating sellers before they visit, call or transact.
              </p>
              <div className="mt-6 flex items-start gap-3 rounded-2xl border bg-muted/30 p-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div><div className="font-bold">New Road, Kathmandu, Nepal</div><div className="mt-1 text-sm text-muted-foreground">Store availability, hours and exact shop location are shown on each store profile when supplied by that store.</div></div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {capabilities.map(({ icon: Icon, title, text, href }) => (
                <Link key={title} to={href} className="group rounded-3xl border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                  <h3 className="mt-5 text-xl font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                  <span className="mt-5 inline-flex items-center text-sm font-bold text-primary">Open service <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y bg-muted/25">
          <div className="container grid gap-10 py-16 lg:grid-cols-2 lg:py-20">
            <Card className="rounded-3xl border-0 bg-slate-950 text-white shadow-2xl">
              <CardContent className="p-8 sm:p-10">
                <ShieldCheck className="h-10 w-10 text-[#D8FF3E]" />
                <h2 className="mt-5 text-3xl font-black">Transparency before transaction</h2>
                <p className="mt-4 leading-7 text-white/65">We separate product information, estimated prices and confirmed seller offers so customers know what still needs verification.</p>
                <div className="mt-7 space-y-4">
                  {trustPoints.map((point) => <div key={point} className="flex gap-3 text-sm leading-6 text-white/80"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#D8FF3E]" />{point}</div>)}
                </div>
              </CardContent>
            </Card>
            <div className="flex flex-col justify-center">
              <RefreshCw className="h-10 w-10 text-primary" />
              <h2 className="mt-5 text-3xl font-black">A connected gadget lifecycle</h2>
              <p className="mt-4 leading-7 text-muted-foreground">A customer can research a model, compare its market context, find a store, buy or contact the seller, estimate an older device, request an exchange, and book repair support without losing the product context.</p>
              <div className="mt-7 grid grid-cols-2 gap-3 text-sm font-bold sm:grid-cols-4">
                {["Research", "Choose", "Transact", "Maintain"].map((label, index) => <div key={label} className="rounded-2xl border bg-background p-4"><span className="block text-xs text-primary">0{index + 1}</span><span className="mt-2 block">{label}</span></div>)}
              </div>
            </div>
          </div>
        </section>

        <section className="container py-16 text-center lg:py-24">
          <Smartphone className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-black sm:text-4xl">Start with the device you have—or the one you want next.</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Browse the catalog, explore active store profiles, or receive an instant indicative resale estimate.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild className="rounded-full"><Link to="/cat/mobiles">Browse mobiles</Link></Button>
            <Button asChild variant="outline" className="rounded-full"><Link to="/contact-us">Contact Tamrakar Complex</Link></Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
