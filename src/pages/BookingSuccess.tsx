import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, Copy, MapPin, MessageSquare, Phone, Shield } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { readAppSettings } from "@/lib/siteSettings";

export default function BookingSuccess() {
  const [params] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const trackingId = params.get("trackingId") ?? "";
  const brand = params.get("brand") ?? "";
  const model = params.get("model") ?? "";
  const issue = params.get("issue") ?? "";
  const total = Number(params.get("total") || 0);
  const contact = readAppSettings().contact_info;
  const message = encodeURIComponent(`Hi Tamrakar Complex, I am following up on repair ${trackingId} for my ${brand} ${model}.`);
  const whatsappUrl = `https://wa.me/${contact.whatsapp.replace(/\D/g, "")}?text=${message}`;

  const copyTrackingId = async () => {
    if (!trackingId) return;
    await navigator.clipboard.writeText(trackingId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return <div className="min-h-screen flex flex-col bg-muted/20">
    <SEO title="Repair Request Confirmed" description="Your repair request was received. Save your tracking ID to follow its progress." url="/repair/success" noIndex />
    <Header />
    <main className="flex-1"><div className="mx-auto max-w-xl space-y-6 px-4 py-10 md:py-16">
      <div className="text-center"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/10"><CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden /></span><h1 className="mt-5 text-3xl font-black">Request received</h1><p className="mt-2 text-muted-foreground">No payment was taken. A service partner will confirm the diagnosis and final price.</p></div>
      <Card className="border-primary/20"><CardContent className="p-6 text-center"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your tracking ID</p><p className="mt-2 select-all font-mono text-3xl font-black text-primary">{trackingId || "Pending"}</p>{trackingId && <Button variant="outline" className="mt-4 w-full" onClick={copyTrackingId}><Copy className="mr-2 h-4 w-4" />{copied ? "Copied" : "Copy tracking ID"}</Button>}<p aria-live="polite" className="sr-only">{copied ? "Tracking ID copied" : ""}</p></CardContent></Card>
      {(brand || model || issue) && <Card><CardContent className="space-y-3 p-5"><h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Booking summary</h2><Row label="Device" value={`${brand} ${model}`.trim()} /><Row label="Issue" value={issue} />{total > 0 && <Row label="Provisional estimate" value={`NPR ${total.toLocaleString("en-NP")}`} />}</CardContent></Card>}
      <div className="grid gap-3 sm:grid-cols-2"><Button asChild size="lg"><Link to={trackingId ? `/repair/track?id=${encodeURIComponent(trackingId)}` : "/repair"}>Track this repair</Link></Button><Button asChild size="lg" variant="outline"><a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageSquare className="mr-2 h-4 w-4" /> WhatsApp support</a></Button></div>
      <Card className="bg-card"><CardContent className="p-5"><h2 className="font-bold">What happens next</h2><ol className="mt-4 space-y-4"><Step icon={Clock} text="A service partner normally confirms your request within 24 hours." /><Step icon={Phone} text="Keep your tracking ID ready when the technician calls or messages." /><Step icon={Shield} text="Eligible completed repairs include a 90-day service warranty; terms are confirmed before work." /></ol></CardContent></Card>
      <div className="flex flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground sm:flex-row sm:gap-4"><a href={`tel:${contact.phone}`} className="inline-flex min-h-8 items-center gap-1 hover:text-primary"><Phone className="h-3 w-3" />{contact.phone}</a><span className="hidden sm:block">·</span><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{contact.address}</span></div>
    </div></main>
    <Footer />
  </div>;
}

function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4 text-sm"><span className="text-muted-foreground">{label}</span><strong className="text-right">{value}</strong></div>; }
function Step({ icon: Icon, text }: { icon: typeof Clock; text: string }) { return <li className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10"><Icon className="h-4 w-4 text-primary" aria-hidden /></span><span className="pt-1 text-sm text-muted-foreground">{text}</span></li>; }
