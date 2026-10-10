import { Link } from "react-router-dom";
import { ArrowUpRight, Scale, ShieldCheck, Store, Wrench } from "lucide-react";
import { Reveal } from "@/components/home/Reveal";

/** Capability-led trust content: no unverified counts, sales volumes or ratings. */
const promises = [
  {
    icon: Scale,
    number: "01",
    title: "Compare choices",
    description: "Review prices, model details and available listings before making a decision.",
    href: "/cat/mobiles",
  },
  {
    icon: Store,
    number: "02",
    title: "Know the seller",
    description: "Explore shop profiles, locations and contact details in the store directory.",
    href: "/stores",
  },
  {
    icon: Wrench,
    number: "03",
    title: "Repair with clarity",
    description: "Review options, book a repair and follow the tracking journey.",
    href: "/repair",
  },
  {
    icon: ShieldCheck,
    number: "04",
    title: "Understand the terms",
    description: "Check conditions, payment information and marketplace disclosures.",
    href: "/marketplace-disclosure",
  },
];

export function HomeTrustStats() {
  return (
    <section className="relative border-y border-border/70 bg-muted/30 py-16 lg:py-20" aria-labelledby="home-trust-title">
      <div className="container">
        <Reveal className="mb-9 max-w-2xl">
          <p className="text-caption text-primary mb-3">Built for informed decisions</p>
          <h2 id="home-trust-title" className="text-display-lg mb-3">Clarity at every step.</h2>
          <p className="text-body-lg">A connected marketplace should make your choices easier to understand.</p>
        </Reveal>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {promises.map(({ icon: Icon, number, title, description, href }, index) => (
            <Reveal key={number} delay={index * 65}>
              <Link
                to={href}
                className="group flex h-full min-h-[220px] flex-col rounded-2xl border border-border/70 bg-card p-6 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <span className="text-xs font-black text-muted-foreground/70">{number}</span>
                </div>
                <h3 className="mt-6 font-display text-lg font-extrabold">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-primary">Explore <ArrowUpRight size={16} aria-hidden="true" /></span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
