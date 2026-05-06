import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  ClipboardCheck,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";

const serviceCards = [
  {
    title: "Sell Your Phone",
    description: "Get an instant valuation, submit device details, and move into payout-ready lead handling.",
    href: "/sell-your-phone",
    icon: CircleDollarSign,
    badge: "Cash Offer",
  },
  {
    title: "Exchange Upgrade",
    description: "Trade in your current device and roll its value toward your next phone or laptop purchase.",
    href: "/exchange-your-phone",
    icon: RefreshCw,
    badge: "Trade In",
  },
  {
    title: "Repair Booking",
    description: "Book diagnostics, screen repair, battery replacement, charging fixes, and service follow-up.",
    href: "/repair",
    icon: Wrench,
    badge: "Service Desk",
  },
  {
    title: "Marketplace Selling",
    description: "Create your own listing if you want more control over pricing and direct buyer conversations.",
    href: "/marketplace/sell",
    icon: ShoppingBag,
    badge: "Self-Service",
  },
  {
    title: "Price Intelligence",
    description: "Check mobile and laptop prices, compare options, and avoid paying blind in the local market.",
    href: "/compare",
    icon: Smartphone,
    badge: "Research",
  },
  {
    title: "Store Discovery",
    description: "Find verified stores, official distributors, and service partners with contact details and maps.",
    href: "/stores",
    icon: Store,
    badge: "Trusted Network",
  },
  {
    title: "Device Unlocking",
    description: "FRP removal, Bootloader unlock, IMEI repair, and software fixes for latest 2022-2026 models.",
    href: "/unlocking",
    icon: ShieldCheck,
    badge: "Advanced Tech",
  },
];

const workflowSteps = [
  {
    title: "Choose the right flow",
    description: "Pick buy, sell, exchange, marketplace listing, or repair based on your goal.",
  },
  {
    title: "Get an estimate or shortlist",
    description: "Use valuation, price pages, comparisons, and store discovery before making a decision.",
  },
  {
    title: "Submit details securely",
    description: "Create a request, place an order, or list a device with the information the team needs.",
  },
  {
    title: "Track and follow through",
    description: "Use your dashboard to monitor requests, listings, and customer communication in one place.",
  },
];

const trustPillars = [
  "Instant quote and valuation-first flows",
  "Exchange and direct-sell options without duplicate funnels",
  "Repair intake with issue categorization and scheduling",
  "Marketplace plus store directory for multiple buying paths",
  "News, reviews, and guides to support decisions before checkout",
  "Admin tooling for products, content, stores, valuation, support, and leads",
];

const faqs = [
  {
    question: "Can customers buy, sell, exchange, and repair from the same platform?",
    answer:
      "Yes. The website now supports discovery, price research, direct buying, marketplace listing, instant selling, exchange requests, and repair booking under one navigation structure.",
  },
  {
    question: "What is the difference between instant sell and marketplace sell?",
    answer:
      "Instant sell is for users who want a faster quote-led flow. Marketplace sell is for users who want to publish their own listing and control the asking price.",
  },
  {
    question: "How does the exchange flow fit with valuation?",
    answer:
      "Valuation helps customers understand fair value first. The exchange flow then uses that value as the starting point for a device upgrade conversation.",
  },
  {
    question: "How does the platform build trust?",
    answer:
      "It combines price references, comparisons, verified stores, guided content, repair intake, and structured admin follow-up instead of leaving users in disconnected flows.",
  },
];

export default function ServicesHub() {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Tamrakar Services Hub - Buy, Sell, Exchange, Repair"
        description="Use one Nepal-first gadget platform for buying, selling, exchange, repair booking, price research, and trusted store discovery."
        url="/services"
      />
      <Header />

      <main className="flex-1">
        <section className="border-b border-border/60 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.14),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_30%)]">
          <div className="container py-16">
            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/10">Unified Commerce Platform</Badge>
                <h1 className="max-w-3xl font-display text-4xl font-bold tracking-tight md:text-5xl">
                  Buy, sell, exchange, repair, compare, and discover stores in one place.
                </h1>
                <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
                  The strongest parts of gadget retail, resale, trade-in, service support, and editorial discovery now live in one cleaner experience without overlapping menus or duplicate flows.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button size="lg" asChild>
                    <Link to="/sell-your-phone">Start Selling</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/exchange-your-phone">Explore Exchange</Link>
                  </Button>
                  <Button size="lg" variant="ghost" asChild>
                    <Link to="/repair">Book Repair</Link>
                  </Button>
                </div>
              </div>

              <Card className="border-border/60 bg-card/80 shadow-xl backdrop-blur">
                <CardHeader>
                  <CardTitle>Everything connected</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {workflowSteps.map((step, index) => (
                    <div key={step.title} className="flex gap-4 rounded-2xl border border-border/60 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{step.title}</div>
                        <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-14">
          <div className="container">
            <div className="mb-8 max-w-2xl">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Core Flows</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">A single menu for every gadget journey</h2>
              <p className="mt-3 text-muted-foreground">
                Each path has a clear purpose so users can act fast without bouncing between duplicate pages.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {serviceCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Card key={card.title} className="group border-border/60 transition-all hover:-translate-y-1 hover:shadow-lg">
                    <CardHeader className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Icon className="h-6 w-6" />
                        </div>
                        <Badge variant="secondary">{card.badge}</Badge>
                      </div>
                      <CardTitle>{card.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{card.description}</p>
                      <Button variant="ghost" className="mt-4 px-0 text-primary" asChild>
                        <Link to={card.href}>
                          Open flow
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-secondary/20 py-14">
          <div className="container">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle>Trust and conversion signals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {trustPillars.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      Quote before commitment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Valuation-driven selling and exchange reduce guesswork and make conversations more transparent.
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ClipboardCheck className="h-5 w-5 text-primary" />
                      Structured support intake
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Repair and contact flows capture the details the team needs, which helps close support loops faster.
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Store className="h-5 w-5 text-primary" />
                      Omnichannel buying
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Customers can shop catalog products, browse listings, or find stores based on the level of confidence they need.
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Wrench className="h-5 w-5 text-primary" />
                      After-sales support
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Repair booking keeps service inside the same ecosystem instead of forcing users into a separate channel.
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14">
          <div className="container">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">FAQs</div>
                <h2 className="mt-3 text-3xl font-bold tracking-tight">Common questions about the combined platform</h2>
                <p className="mt-3 text-muted-foreground">
                  These answers help users understand where each function belongs so the website feels simpler, not larger.
                </p>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((item, index) => (
                  <AccordionItem key={item.question} value={`faq-${index}`}>
                    <AccordionTrigger>{item.question}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
