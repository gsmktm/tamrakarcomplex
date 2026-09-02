import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Battery, Camera, Check, ChevronRight, Droplets, Headphones, Loader2, MonitorSmartphone, Search, ShieldCheck, Sparkles, Wrench, Zap } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { SafeImage } from "@/components/common/SafeImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useRepairDevices, type RepairDevice } from "@/hooks/useRepair";
import { useRepairPricingByDevice } from "@/hooks/useRepairPricing";
import { useRepairSubmit } from "@/hooks/useRepairSubmit";
import { cn } from "@/lib/utils";
import { isValidEmail, isValidNepalPhone, normalizeEmail, normalizePhone } from "@/lib/security";

const ISSUES = [
  { id: "screen", label: "Screen & touch", icon: MonitorSmartphone },
  { id: "battery", label: "Battery", icon: Battery },
  { id: "charging", label: "Charging port", icon: Zap },
  { id: "camera", label: "Camera & flash", icon: Camera },
  { id: "water_damage", label: "Water damage", icon: Droplets },
  { id: "audio", label: "Sound & audio", icon: Headphones },
  { id: "software", label: "Software & lock", icon: Sparkles },
  { id: "other", label: "Something else", icon: Wrench },
] as const;
const QUALITIES = [
  { id: "original", label: "Original grade", detail: "Manufacturer-grade or equivalent part", badge: "Recommended" },
  { id: "compatible", label: "Premium compatible", detail: "Quality-tested compatible part", badge: "Best value" },
  { id: "refurbished", label: "Refurbished original", detail: "Tested original refurbished part", badge: "Lower cost" },
] as const;
const STEPS = ["Device", "Issue", "Repair option", "Your details", "Review"];
type FormErrors = Partial<Record<"name" | "phone" | "email", string>>;
const money = (value: number) => `NPR ${Math.round(value).toLocaleString("en-NP")}`;

export default function RepairWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(0);
  const [brand, setBrand] = useState("");
  const [deviceId, setDeviceId] = useState(params.get("device") ?? "");
  const [deviceSearch, setDeviceSearch] = useState("");
  const [issue, setIssue] = useState(params.get("issue") ?? "");
  const [quality, setQuality] = useState("original");
  const [form, setForm] = useState({ name: user?.user_metadata?.full_name || user?.user_metadata?.display_name || "", phone: user?.user_metadata?.phone || "", email: user?.email || "", location: "Kathmandu", preferredDate: "", notes: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const { data: devices = [], isLoading: devicesLoading } = useRepairDevices();
  const selectedDevice = devices.find((item) => item.id === deviceId) ?? null;
  const { data: priceRows = [], isLoading: pricesLoading } = useRepairPricingByDevice(deviceId);
  const submitRepair = useRepairSubmit();
  const brands = useMemo(() => [...new Set(devices.map((item) => item.brand).filter(Boolean))].sort(), [devices]);
  const visibleDevices = useMemo(() => devices.filter((item) => (!brand || item.brand === brand) && (!deviceSearch || `${item.brand} ${item.name}`.toLowerCase().includes(deviceSearch.toLowerCase()))), [brand, deviceSearch, devices]);

  useEffect(() => { if (selectedDevice && !brand) setBrand(selectedDevice.brand); }, [brand, selectedDevice]);
  useEffect(() => { if (step > 0) headingRef.current?.focus(); }, [step]);

  const issueInfo = ISSUES.find((item) => item.id === issue);
  const qualityInfo = QUALITIES.find((item) => item.id === quality) ?? QUALITIES[0];
  const options = useMemo(() => QUALITIES.map((tier) => {
    const row = priceRows.find((price) => price.service_key === issue && price.quality === tier.id);
    const base = row ? Number(row.total_cache || row.base_price) : null;
    return { ...tier, base, pricingId: row?.id ?? null };
  }), [issue, priceRows]);
  const selectedOption = options.find((item) => item.id === quality) ?? options[0];
  const total = selectedOption.base;

  const validateDetails = () => {
    const next: FormErrors = {};
    if (form.name.trim().length < 2) next.name = "Enter your full name.";
    if (!isValidNepalPhone(form.phone)) next.phone = "Enter a valid Nepal mobile number starting with 97 or 98.";
    if (form.email && !isValidEmail(form.email)) next.email = "Enter a valid email address.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const canContinue = step === 0 ? Boolean(selectedDevice) : step === 1 ? Boolean(issue) : step === 2 ? Boolean(quality) : true;
  const next = () => { if (!canContinue) return; if (step === 3 && !validateDetails()) return; setStep((current) => Math.min(4, current + 1)); };
  const submit = () => {
    if (!selectedDevice || !issueInfo || !validateDetails()) return;
    setSubmitError("");
    submitRepair.mutate({ device_brand: selectedDevice.brand, device_model: selectedDevice.name, device_id: selectedDevice.id, issue_type: issueInfo.id, phone: normalizePhone(form.phone), name: form.name, email: form.email ? normalizeEmail(form.email) : null, location: form.location, description: [`Part option: ${qualityInfo.label}`, form.notes].filter(Boolean).join("\n"), estimated_cost: null, repair_pricing_id: selectedOption.pricingId, part_quality: selectedOption.id, preferred_date: form.preferredDate || null }, {
      onSuccess: (record) => {
        const success = new URLSearchParams({ trackingId: record.tracking_id || record.id, brand: selectedDevice.brand, model: selectedDevice.name, issue: issueInfo.label, ...(total !== null ? { total: String(total) } : {}) });
        navigate(`/repair/success?${success.toString()}`, { replace: true });
      },
      onError: (error) => setSubmitError(error instanceof Error ? error.message : "We could not submit your request. Please try again."),
    });
  };
  const selectionClass = (selected: boolean) => cn("min-h-14 rounded-2xl border-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2", selected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40");

  return <div className="min-h-screen flex flex-col bg-muted/20">
    <SEO title="Book a Device Repair" description="Choose your device and issue, see an estimated repair price, and receive a tracking ID." url="/repair/book" />
    <Header />
    <main className="flex-1 py-8 md:py-12"><div className="container max-w-6xl">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><Link to="/repair" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Repair home</Link><h1 className="text-3xl font-black tracking-tight md:text-5xl">Book your repair</h1><p className="mt-2 text-muted-foreground">A clear estimate now. Final price only after technician inspection.</p></div><Link to="/repair/track" className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary">Already booked? Track repair <ChevronRight className="h-4 w-4" /></Link></div>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside aria-label="Booking progress" className="rounded-3xl border bg-card p-5 lg:self-start lg:sticky lg:top-28"><ol className="grid grid-cols-5 gap-2 lg:grid-cols-1">{STEPS.map((label, index) => <li key={label} className="flex min-w-0 items-center gap-3"><span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold", index <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")} aria-hidden>{index < step ? <Check className="h-4 w-4" /> : index + 1}</span><span className={cn("hidden text-sm font-semibold lg:block", index === step ? "text-foreground" : "text-muted-foreground")} aria-current={index === step ? "step" : undefined}>{label}</span></li>)}</ol></aside>
        <Card className="overflow-hidden rounded-3xl border-border shadow-sm"><CardContent className="p-5 md:p-8">
          <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-black outline-none">{STEPS[step]}</h2><p className="mt-1 mb-6 text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
          {step === 0 && <section className="space-y-6"><div><Label htmlFor="device-search">Search your device</Label><div className="relative mt-2"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input id="device-search" value={deviceSearch} onChange={(event) => setDeviceSearch(event.target.value)} className="h-12 pl-11" placeholder="e.g. iPhone 15 Pro" /></div></div><div aria-label="Filter by brand" className="flex gap-2 overflow-x-auto pb-2">{["", ...brands].map((item) => <button key={item || "all"} type="button" aria-pressed={brand === item} onClick={() => { setBrand(item); setDeviceId(""); }} className={cn("min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold", brand === item ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>{item || "All brands"}</button>)}</div>{devicesLoading ? <p role="status" className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading repair catalog…</p> : visibleDevices.length ? <div className="grid max-h-[430px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">{visibleDevices.map((device) => <DeviceButton key={device.id} device={device} selected={device.id === deviceId} onSelect={() => { setDeviceId(device.id); setBrand(device.brand); }} className={selectionClass(device.id === deviceId)} />)}</div> : <div className="rounded-2xl border border-dashed p-8 text-center"><p className="font-bold">Your model is not listed yet.</p><p className="mt-1 text-sm text-muted-foreground">Send a custom request and we’ll confirm compatibility and price.</p><Button asChild variant="outline" className="mt-4"><Link to="/repair/custom">Request custom repair</Link></Button></div>}</section>}
          {step === 1 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{ISSUES.map((item) => <button key={item.id} type="button" aria-pressed={issue === item.id} onClick={() => setIssue(item.id)} className={cn(selectionClass(issue === item.id), "p-4")}><item.icon className="mb-4 h-7 w-7 text-primary" aria-hidden /><span className="block font-bold">{item.label}</span></button>)}</div>}
          {step === 2 && <div className="space-y-3">{pricesLoading && <p role="status" className="text-sm text-muted-foreground">Checking current prices…</p>}{options.map((option) => <button key={option.id} type="button" aria-pressed={quality === option.id} onClick={() => setQuality(option.id)} className={cn(selectionClass(quality === option.id), "flex w-full items-center justify-between gap-4 p-5")}><span><span className="flex flex-wrap items-center gap-2 font-bold">{option.label}<span className="rounded-full bg-muted px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">{option.badge}</span></span><span className="mt-1 block text-sm text-muted-foreground">{option.detail}</span></span><span className="shrink-0 text-right"><span className="block text-lg font-black">{option.base !== null ? money(option.base) : "Request quote"}</span><span className="text-xs text-muted-foreground">{option.base !== null ? "database price" : "confirmed after inspection"}</span></span></button>)}<p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">Prices shown here come directly from the active repair catalog. If a price is unavailable, the service center confirms a quote after inspection.</p></div>}
          {step === 3 && <div className="grid gap-5 sm:grid-cols-2"><Field id="repair-name" label="Full name" required error={errors.name}><Input id="repair-name" autoComplete="name" value={form.name} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "repair-name-error" : undefined} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: undefined }); }} /></Field><Field id="repair-phone" label="Mobile / WhatsApp" required error={errors.phone}><Input id="repair-phone" inputMode="tel" autoComplete="tel" placeholder="98XXXXXXXX" value={form.phone} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "repair-phone-error" : undefined} onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErrors({ ...errors, phone: undefined }); }} /></Field><Field id="repair-email" label="Email (optional)" error={errors.email}><Input id="repair-email" type="email" autoComplete="email" value={form.email} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "repair-email-error" : undefined} onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: undefined }); }} /></Field><Field id="repair-date" label="Preferred date (optional)"><Input id="repair-date" type="date" min={new Date().toISOString().slice(0, 10)} value={form.preferredDate} onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} /></Field><div className="sm:col-span-2"><Label htmlFor="repair-location">City / area</Label><Input id="repair-location" className="mt-2" autoComplete="address-level2" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div><div className="sm:col-span-2"><Label htmlFor="repair-notes">Anything technicians should know? (optional)</Label><Textarea id="repair-notes" className="mt-2" rows={4} maxLength={1000} placeholder="Symptoms, damage history, or access details" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div></div>}
          {step === 4 && <div className="space-y-5"><div className="rounded-2xl border bg-muted/30 p-5"><SummaryRow label="Device" value={`${selectedDevice?.brand ?? ""} ${selectedDevice?.name ?? ""}`} /><SummaryRow label="Issue" value={issueInfo?.label ?? ""} /><SummaryRow label="Part option" value={qualityInfo.label} /><SummaryRow label="Preferred date" value={form.preferredDate || "Flexible"} /><SummaryRow label="Contact" value={`${form.name} · ${normalizePhone(form.phone)}`} /><div className="mt-4 flex items-end justify-between border-t pt-4"><span><span className="block font-bold">Estimated price</span><span className="text-xs text-muted-foreground">Subject to inspection</span></span><strong className="text-2xl text-primary">{total !== null ? money(total) : "Quote required"}</strong></div></div><div className="flex gap-3 rounded-2xl bg-emerald-500/10 p-4 text-sm"><ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden /><p>No payment is collected now. The service center confirms the diagnosis, parts, warranty, and final price before repair.</p></div>{submitError && <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm font-semibold text-destructive">{submitError}</p>}</div>}
          <div className="mt-8 flex items-center justify-between border-t pt-5"><Button type="button" variant="ghost" onClick={() => step ? setStep(step - 1) : navigate("/repair")}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>{step < 4 ? <Button type="button" onClick={next} disabled={!canContinue}>Continue <ArrowRight className="ml-2 h-4 w-4" /></Button> : <Button type="button" onClick={submit} disabled={submitRepair.isPending}>{submitRepair.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Booking…</> : <>Confirm free booking <Check className="ml-2 h-4 w-4" /></>}</Button>}</div>
        </CardContent></Card>
      </div>
    </div></main><Footer />
  </div>;
}

function DeviceButton({ device, selected, onSelect, className }: { device: RepairDevice; selected: boolean; onSelect: () => void; className: string }) {
  return <button type="button" aria-pressed={selected} onClick={onSelect} className={cn(className, "flex items-center gap-4 p-4")}><span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted"><SafeImage src={device.image || "/default-product.svg"} alt="" className="h-full w-full object-contain p-1" /></span><span className="min-w-0"><span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">{device.brand}</span><span className="block truncate font-bold">{device.name}</span></span>{selected && <Check className="ml-auto h-5 w-5 shrink-0 text-primary" aria-hidden />}</button>;
}
function Field({ id, label, required, error, children }: { id: string; label: string; required?: boolean; error?: string; children: React.ReactNode }) { return <div><Label htmlFor={id}>{label}{required && <span aria-hidden> *</span>}</Label><div className="mt-2">{children}</div>{error && <p id={`${id}-error`} className="mt-1 text-sm font-medium text-destructive">{error}</p>}</div>; }
function SummaryRow({ label, value }: { label: string; value: string }) { return <div className="flex gap-4 border-b py-3 text-sm last:border-0"><span className="text-muted-foreground">{label}</span><span className="ml-auto text-right font-bold">{value}</span></div>; }
