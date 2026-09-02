import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, BadgeCheck, Box, CheckCircle2, Clock3, LayoutGrid, Search, ShieldCheck, Smartphone, Sparkles, Star, Wrench, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { SafeImage } from "@/components/common/SafeImage";
import { DiagnosticsFlow } from "@/components/repair/DiagnosticsFlow";
import { useRepairCategories, useRepairCategory, useRepairDevices, type RepairCategory, type RepairDevice } from "@/hooks/useRepair";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const FALLBACK_BRANDS = ["Apple", "Samsung", "Xiaomi", "OnePlus", "Google"];
const INITIAL_COUNT = 12;
const steps = [
  ["01", "Choose your device", "Find your exact model or start with a symptom if you are unsure.", Smartphone],
  ["02", "See the likely fix", "Review transparent estimates, repair options, and expected turnaround.", Zap],
  ["03", "Book and track", "Submit once, receive a Repair ID, and follow every status update.", CheckCircle2],
] as const;
const faqs = [
  ["How do I track my repair?", "Open Repair Tracking and enter the Repair ID or phone number used during booking."],
  ["What devices do you repair?", "We support smartphones, tablets, laptops, and accessories from major brands."],
  ["Is there a repair warranty?", "Eligible completed repairs include a 90-day service warranty confirmed before work begins."],
] as const;

export default function RepairHub() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState<string | null>(null);
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { data: rootCategories, isLoading: categoriesLoading } = useRepairCategories();
  const { data: category, isLoading: categoryLoading } = useRepairCategory(categorySlug || "");
  const { data: allDevices = [], isLoading: devicesLoading } = useRepairDevices();

  useEffect(() => setCategorySlug(params.get("category") || null), [params]);
  const categories = category?.children || rootCategories;
  const devices = useMemo(
    () => categorySlug ? category?.repair_devices ?? [] : allDevices,
    [allDevices, category?.repair_devices, categorySlug],
  );
  const brands = useMemo(() => {
    const values = Array.from(new Set(allDevices.map((item) => item.brand).filter(Boolean))).sort();
    return values.length ? values : FALLBACK_BRANDS;
  }, [allDevices]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return devices.filter((item: RepairDevice) => (!term || `${item.name} ${item.brand}`.toLowerCase().includes(term)) && (!brand || item.brand.toLowerCase() === brand.toLowerCase()));
  }, [brand, devices, query]);
  const visible = showAll ? filtered : filtered.slice(0, INITIAL_COUNT);
  const reset = () => { setBrand(null); setQuery(""); setShowAll(false); navigate("/repair#catalog"); };
  const chooseCategory = (slug: string) => { setBrand(null); setQuery(""); setShowAll(false); navigate(`/repair?category=${encodeURIComponent(slug)}#catalog`); };

  return <div className="min-h-screen bg-background text-foreground">
    <SEO title="Device Repair in Kathmandu | Instant Quote & Tracking" description="Diagnose device problems, compare transparent repair estimates, book certified technicians, and track repairs online." url="/repair" structuredData={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) }} />
    <Header />
    <main>
      <section className="relative overflow-hidden bg-[#0d120f] text-white" aria-labelledby="repair-title">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#d8ff3e]/15 blur-3xl" aria-hidden />
        <div className="container relative grid gap-12 py-16 md:py-24 lg:grid-cols-[1.12fr_.88fr] lg:items-center">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d8ff3e]/30 bg-[#d8ff3e]/10 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[#d8ff3e]"><Sparkles className="h-4 w-4" /> Instant guidance · transparent pricing</p>
            <h1 id="repair-title" className="font-display text-4xl font-black leading-[.98] tracking-[-.04em] sm:text-6xl lg:text-7xl">From broken to booked <span className="block text-[#d8ff3e]">in one clear flow.</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/65 md:text-lg">Identify the fault, find your device, review the likely repair, and book a verified technician without guessing what happens next.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-13 rounded-xl bg-[#d8ff3e] px-7 font-bold text-[#11130f] hover:bg-[#e3ff73]" asChild><Link to="/repair/book">Start a repair <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <Button size="lg" variant="outline" className="h-13 rounded-xl border-white/25 bg-white/5 px-7 font-bold text-white hover:bg-white/10 hover:text-white" onClick={() => document.getElementById("diagnostics")?.scrollIntoView({ behavior: "smooth" })}>Diagnose first <Search className="ml-2 h-4 w-4" /></Button>
              <Button size="lg" variant="ghost" className="h-13 text-white/75 hover:bg-white/10 hover:text-white" asChild><Link to="/repair/track">Track repair</Link></Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-5 text-sm text-white/65"><li className="flex gap-2"><BadgeCheck className="h-4 w-4 text-[#d8ff3e]" />Verified technicians</li><li className="flex gap-2"><Clock3 className="h-4 w-4 text-[#d8ff3e]" />Typical response within 24 hours</li><li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-[#d8ff3e]" />90-day eligible warranty</li></ul>
          </div>
          <div className="rounded-[2rem] border border-white/12 bg-white/[.06] p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/10 pb-5"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#d8ff3e]">Repair desk</p><p className="mt-1 text-lg font-bold">Choose your starting point</p></div><Wrench className="h-6 w-6 text-[#d8ff3e]" /></div>
            <div className="mt-5 grid gap-3">{[["I know my device", "Browse models and services", "#catalog", Smartphone], ["I only know the symptom", "Use smart diagnostics", "#diagnostics", Search], ["I have a Repair ID", "Check live progress", "/repair/track", Clock3]].map(([title, copy, href, Icon]) => <Link key={String(title)} to={String(href)} className="group flex min-h-16 items-center gap-4 rounded-xl border border-white/10 bg-black/15 p-4 hover:border-[#d8ff3e]/40 focus-visible:ring-2 focus-visible:ring-[#d8ff3e]"><Icon className="h-5 w-5 text-[#d8ff3e]" /><span className="flex-1"><b className="block">{title}</b><span className="text-sm text-white/50">{copy}</span></span><ArrowRight className="h-4 w-4 text-white/35 group-hover:text-[#d8ff3e]" /></Link>)}</div>
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#d8ff3e]/10 p-3 text-sm text-white/70"><span className="flex text-[#d8ff3e]" aria-label="4.9 out of 5 stars">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}</span>4.9/5 customer rating</div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-card py-10" aria-labelledby="journey-title"><div className="container"><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">One connected journey</p><h2 id="journey-title" className="mt-2 text-2xl font-black md:text-3xl">How your repair moves</h2><ol className="mt-7 grid gap-4 md:grid-cols-3">{steps.map(([number, title, copy, Icon]) => <li key={number} className="rounded-2xl border border-border bg-background p-5"><div className="mb-5 flex justify-between"><span className="text-xs font-black text-primary">STEP {number}</span><Icon className="h-5 w-5 text-muted-foreground" /></div><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p></li>)}</ol></div></section>

      <section id="diagnostics" className="scroll-mt-28 py-16 md:py-20" aria-labelledby="diagnostic-title"><div className="container"><div className="mb-8 max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Smart diagnostic</p><h2 id="diagnostic-title" className="mt-2 text-3xl font-black md:text-4xl">Start with what you notice.</h2><p className="mt-3 text-muted-foreground">Choose the closest symptom to see common causes, estimates, and the correct booking route.</p></div><div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm md:p-8"><DiagnosticsFlow /></div></div></section>

      <section id="catalog" className="scroll-mt-28 border-y border-border bg-muted/35 py-16 md:py-20" aria-labelledby="catalog-title"><div className="container grid gap-8 lg:grid-cols-[270px_1fr]">
        <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-32" aria-label="Repair catalog filters"><div className="flex justify-between"><h2 className="font-bold">Find your device</h2>{(categorySlug || brand || query) && <button onClick={reset} className="min-h-8 text-xs font-bold text-primary hover:underline">Reset</button>}</div><label htmlFor="repair-search" className="mt-5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Search model or brand</label><div className="relative mt-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="repair-search" type="search" value={query} onChange={(e) => { setQuery(e.target.value); setShowAll(false); }} placeholder="e.g. iPhone 15" className="h-11 pl-9" /></div><fieldset className="mt-6"><legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Brand</legend><div className="mt-3 flex flex-wrap gap-2 lg:flex-col"><FilterButton active={!brand} onClick={() => setBrand(null)}>All brands</FilterButton>{brands.map((item) => <FilterButton key={item} active={brand === item} onClick={() => { setBrand(item); setShowAll(false); }}>{item}</FilterButton>)}</div></fieldset></aside>
        <div><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Repair catalog</p><h2 id="catalog-title" className="mt-2 text-3xl font-black md:text-4xl">{category?.name || "Choose a category"}</h2><p className="mt-2 text-sm text-muted-foreground">Open your model for services, guides, and pricing.</p></div><p className="text-sm font-semibold text-muted-foreground" aria-live="polite">{filtered.length} devices found</p></div>
          <div className="mt-7 flex gap-3 overflow-x-auto pb-2"><CategoryButton active={!categorySlug} onClick={reset}><LayoutGrid className="h-4 w-4" />All</CategoryButton>{categoriesLoading || categoryLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-32 shrink-0 rounded-xl" />) : categories?.map((item: RepairCategory) => <CategoryButton key={item.id} active={categorySlug === item.slug} onClick={() => chooseCategory(item.slug)}>{item.image ? <SafeImage src={item.image} alt="" className="h-7 w-7 object-contain" /> : <Box className="h-4 w-4" />}{item.name}</CategoryButton>)}</div>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{devicesLoading ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />) : visible.length ? visible.map((device) => <Link key={device.id} to={`/repair/device/${device.slug}`} className="group flex min-h-56 flex-col rounded-2xl border border-border bg-card p-4 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring"><div className="flex h-32 items-center justify-center rounded-xl bg-muted/60"><SafeImage src={device.image} alt={device.name} className="h-28 w-full object-contain p-2 transition group-hover:scale-105" /></div><p className="mt-4 line-clamp-2 text-sm font-bold group-hover:text-primary">{device.name}</p><p className="mt-auto pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{device.brand}</p></Link>) : <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-10 text-center"><Smartphone className="mx-auto h-8 w-8 text-muted-foreground" /><h3 className="mt-3 font-bold">No matching devices</h3><Button variant="outline" className="mt-5" onClick={reset}>Clear filters</Button></div>}</div>
          {filtered.length > INITIAL_COUNT && <div className="mt-8 text-center"><Button variant="outline" className="min-h-11" onClick={() => setShowAll((value) => !value)}>{showAll ? "Show fewer devices" : `Show all ${filtered.length} devices`}</Button></div>}
        </div>
      </div></section>

      <section className="py-16 md:py-20" aria-labelledby="trust-title"><div className="container grid gap-8 lg:grid-cols-[1fr_.9fr]"><div className="rounded-[2rem] bg-[#11130f] p-7 text-white md:p-10"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#d8ff3e]">Built around trust</p><h2 id="trust-title" className="mt-3 text-3xl font-black md:text-4xl">Clear approval before work begins.</h2><p className="mt-4 leading-7 text-white/60">Technicians diagnose first, confirm scope and estimate, then update the same record you track.</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{["Verified partners", "Estimate before approval", "Status timeline", "Eligible warranty"].map((item) => <div key={item} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-[#d8ff3e]" />{item}</div>)}</div><Button className="mt-8 bg-[#d8ff3e] font-bold text-[#11130f] hover:bg-[#e3ff73]" asChild><Link to="/repair/book">Book a repair <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Common questions</p><h2 className="mt-3 text-3xl font-black">Before you book</h2><div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card px-5">{faqs.map(([q, a], i) => <details key={q} className="py-5" open={i === 0}><summary className="min-h-8 cursor-pointer font-bold focus-visible:ring-2 focus-visible:ring-ring">{q}</summary><p className="mt-3 text-sm leading-6 text-muted-foreground">{a}</p></details>)}</div><Button variant="link" className="mt-4 px-0 font-bold" asChild><Link to="/contact-us">Contact the repair desk <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div></div></section>
    </main><Footer />
  </div>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={cn("min-h-10 rounded-lg border px-3 text-left text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring", active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/50")}>{children}</button>;
}
function CategoryButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={cn("flex min-h-12 shrink-0 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-bold focus-visible:ring-2 focus-visible:ring-ring", active && "border-primary bg-primary text-primary-foreground")}>{children}</button>;
}
