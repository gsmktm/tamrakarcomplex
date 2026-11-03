import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Clock, Copy, Loader2, MapPin, MessageSquare, Phone, Shield } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { readAppSettings } from "@/lib/siteSettings";
import { supabase } from "@/integrations/supabase/client";
import { parseConfirmedRepair, type ConfirmedRepair } from "@/lib/repairConfirmation";

type Verification = "checking" | "verified" | "unverified";

export default function BookingSuccess() {
  const [params] = useSearchParams();
  const trackingId = (params.get("trackingId") ?? "").trim().toUpperCase();
  const [verified, setVerified] = useState<ConfirmedRepair | null>(null);
  const [verification, setVerification] = useState<Verification>("checking");
  const [copied, setCopied] = useState(false);
  const contact = readAppSettings().contact_info;

  useEffect(() => {
    let cancelled = false;
    setVerified(null);
    if (!trackingId) {
      setVerification("unverified");
      return;
    }
    setVerification("checking");
    const verify = async () => {
      try {
        // Reuse the read-only public tracking RPC. URL fields are never proof of a booking.
        const { data, error } = await supabase.rpc("get_repair_tracking", { p_tracking_id: trackingId });
        if (cancelled) return;
        const confirmed = error ? null : parseConfirmedRepair(data, trackingId);
        setVerified(confirmed);
        setVerification(confirmed ? "verified" : "unverified");
      } catch {
        if (!cancelled) {
          setVerified(null);
          setVerification("unverified");
        }
      }
    };
    void verify();
    return () => { cancelled = true; };
  }, [trackingId]);

  const isConfirmed = verification === "verified" && verified !== null;
  const heading = verification === "checking" ? "Checking repair reference" : isConfirmed ? "Repair request confirmed" : "Repair request not verified";
  const contactMessage = isConfirmed
    ? "Hi Tamrakar Complex, I am following up on repair " + verified.trackingId + "."
    : "Hi Tamrakar Complex, I need help verifying a repair request.";
  const whatsappUrl = "https://wa.me/" + contact.whatsapp.replace(/\D/g, "") + "?text=" + encodeURIComponent(contactMessage);

  const copyTrackingId = async () => {
    if (!verified) return;
    try {
      await navigator.clipboard.writeText(verified.trackingId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SEO title={heading} description="Check your repair request using a verified tracking reference." url="/repair/success" noIndex />
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-xl space-y-6 px-4 py-10 md:py-16">
          <div className="text-center" role="status" aria-live="polite">
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary/10">
              {verification === "checking" ? <Loader2 className="h-10 w-10 animate-spin" aria-hidden />
                : isConfirmed ? <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden />
                  : <AlertCircle className="h-10 w-10 text-amber-600" aria-hidden />}
            </span>
            <h1 className="mt-5 text-3xl font-black">{heading}</h1>
            <p className="mt-2 text-muted-foreground">
              {verification === "checking" ? "Checking the tracking ID against the repair system."
                : isConfirmed ? "The repair system confirms this request. Final work and price require service-partner approval."
                  : "We could not confirm a booking for this reference. This page is not proof that a repair request was received."}
            </p>
          </div>

          {isConfirmed && (
            <>
              <Card className="border-primary/20">
                <CardContent className="p-6 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Verified tracking ID</p>
                  <p className="mt-2 select-all font-mono text-3xl font-black text-primary">{verified.trackingId}</p>
                  <Button variant="outline" className="mt-4 w-full" onClick={copyTrackingId}>
                    <Copy className="mr-2 h-4 w-4" />{copied ? "Copied" : "Copy tracking ID"}
                  </Button>
                  <p aria-live="polite" className="sr-only">{copied ? "Tracking ID copied" : ""}</p>
                </CardContent>
              </Card>
              {(verified.brand || verified.model || verified.issue) && (
                <Card><CardContent className="space-y-3 p-5">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Verified booking details</h2>
                  <Row label="Device" value={[verified.brand, verified.model].filter(Boolean).join(" ")} />
                  <Row label="Issue" value={verified.issue} />
                  {verified.estimatedCost !== null && (
                    <Row label="Provisional estimate (subject to confirmation)" value={"NPR " + verified.estimatedCost.toLocaleString("en-NP")} />
                  )}
                </CardContent></Card>
              )}
              <Card className="bg-card"><CardContent className="p-5">
                <h2 className="font-bold">What happens next</h2>
                <ol className="mt-4 space-y-4">
                  <Step icon={Clock} text="Use your tracking ID to check for updates on your repair request." />
                  <Step icon={Phone} text="Contact support with your tracking ID if you need assistance." />
                  <Step icon={Shield} text="Ask the service partner to confirm any warranty terms in writing before approving repair work." />
                </ol>
              </CardContent></Card>
            </>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild size="lg">
              <Link to={trackingId ? "/repair/track?id=" + encodeURIComponent(trackingId) : "/repair/track"}>Track this repair</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp support
              </a>
            </Button>
          </div>
          {verification === "unverified" && (
            <p className="text-center text-sm text-muted-foreground">
              If you have not submitted a request yet, <Link className="underline" to="/repair/book">book a repair</Link>.
            </p>
          )}
          <div className="flex flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground sm:flex-row sm:gap-4">
            <a href={"tel:" + contact.phone} className="inline-flex min-h-8 items-center gap-1 hover:text-primary">
              <Phone className="h-3 w-3" />{contact.phone}
            </a>
            <span className="hidden sm:block">·</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{contact.address}</span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 text-sm"><span className="text-muted-foreground">{label}</span><strong className="text-right">{value}</strong></div>;
}
function Step({ icon: Icon, text }: { icon: typeof Clock; text: string }) {
  return <li className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10"><Icon className="h-4 w-4 text-primary" aria-hidden /></span><span className="pt-1 text-sm text-muted-foreground">{text}</span></li>;
}
