import { useHomepageSettings } from "@/hooks/useHomepageSettings";
import { Reveal } from "@/components/home/Reveal";

export const HomeTrustStats = () => {
  const { data: settings } = useHomepageSettings();
  const raw = settings?.trust_stats;

  const stats = [
    {
      value: raw?.stores ?? "250+",
      label: "Verified stores",
      note: "across Nepal",
      delay: "delay-0",
    },
    {
      value: raw?.monthly_flow ?? "100K+",
      label: "Monthly transactions",
      note: "buy, sell, repair",
      delay: "delay-100",
    },
    {
      value: "7",
      label: "Services in one place",
      note: "buy · sell · repair · unlock · exchange · diagnose · compare",
      delay: "delay-200",
    },
    {
      value: "NP#1",
      label: "Nepal's gadget hub",
      note: "Tamrakar Complex, Kathmandu",
      delay: "delay-300",
    },
  ];

  return (
    <section className="border-y border-border bg-background">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border">
          {stats.map((stat, i) => (
            <Reveal
              key={stat.value}
              delay={(i as 0 | 1 | 2 | 3 | 4 | 5)}
              className={[
                "py-12 px-6 group",
              ].join(" ")}
            >
              {/* Large number */}
              <p
                className="font-syne font-bold text-4xl md:text-5xl leading-none text-foreground mb-2"
                aria-label={`${stat.value} ${stat.label}`}
              >
                {stat.value}
              </p>

              {/* Label */}
              <p className="text-sm font-semibold text-foreground/80">{stat.label}</p>

              {/* Note */}
              <p className="text-xs text-muted-foreground mt-1 text-pretty leading-snug">
                {stat.note}
              </p>

              {/* Saffron accent — thin rule, grows left on section enter */}
              <div className="mt-5 h-0.5 w-8 bg-primary/40 group-hover:w-16 transition-[width] duration-300" style={{ transitionTimingFunction: "var(--ease-out-quart)" }} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
