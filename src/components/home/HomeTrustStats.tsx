import { useHomepageSettings } from "@/hooks/useHomepageSettings";
import { Reveal } from "@/components/home/Reveal";
import { Store, ArrowUpRight, Layers, Award } from "lucide-react";

const statIcons = [Store, ArrowUpRight, Layers, Award];

export const HomeTrustStats = () => {
  const { data: settings } = useHomepageSettings();
  const raw = settings?.trust_stats;

  const stats = [
    { value: raw?.stores ?? "250+", label: "Verified stores", note: "across Nepal" },
    { value: raw?.monthly_flow ?? "100K+", label: "Monthly transactions", note: "buy, sell, repair" },
    { value: "7", label: "Services in one place", note: "buy · sell · repair · unlock · exchange · diagnose" },
    { value: "NP#1", label: "Nepal's gadget hub", note: "Tamrakar Complex, Kathmandu" },
  ];

  return (
    <section className="py-16 lg:py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-section pointer-events-none" />
      <div className="container relative">
        <Reveal className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-caption text-primary mb-3">Why Tamrakar</p>
          <h2 className="text-display-lg mb-3">Trusted by thousands of gadget lovers.</h2>
          <p className="text-body-lg">Nepal's most connected gadget exchange — one place to buy, sell, repair, and discover.</p>
        </Reveal>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/50 rounded-2xl overflow-hidden border border-border/50">
          {stats.map((stat, i) => {
            const Icon = statIcons[i];
            return (
              <Reveal key={stat.value} delay={i * 100} className="bg-background group">
                <div className="p-6 lg:p-8 text-center h-full flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-display font-extrabold text-3xl md:text-4xl lg:text-5xl leading-none text-foreground mb-2 tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-sm font-semibold text-foreground/80">{stat.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 text-pretty leading-snug">{stat.note}</p>
                  <div className="mt-4 h-0.5 w-8 bg-primary/30 group-hover:w-14 transition-[width] duration-300" />
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};
