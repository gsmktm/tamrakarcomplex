import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const actions = [
  {
    number: "01",
    title: "Buy New",
    subtitle: "Phones & Laptops",
    description: "Latest devices with warranty from 250+ verified stores",
    route: "/buy",
    tag: "Most Popular",
    size: "large",
  },
  {
    number: "02",
    title: "Sell Used",
    subtitle: "Get Instant Cash",
    description: "Best price for your old device, paid same day",
    route: "/sell-your-phone",
    tag: "Fast Payout",
    size: "large",
  },
  {
    number: "03",
    title: "Repair",
    subtitle: "Screen · Battery · Software",
    description: "Expert service at trusted shops in your area",
    route: "/repair",
    tag: null,
    size: "medium",
  },
  {
    number: "04",
    title: "Exchange",
    subtitle: "Upgrade Your Device",
    description: "Trade in your old phone toward a new one",
    route: "/exchange-your-phone",
    tag: null,
    size: "medium",
  },
  {
    number: "05",
    title: "Unlock",
    subtitle: "iCloud · Network · OS",
    description: "Software & carrier unlock services",
    route: "/unlocking",
    tag: null,
    size: "medium",
  },
  {
    number: "06",
    title: "Diagnose",
    subtitle: "Hardware & Software Check",
    description: "Know what's wrong before you spend",
    route: "/repair#diagnostics-section",
    tag: null,
    size: "medium",
  },
  {
    number: "07",
    title: "Find Stores",
    subtitle: "250+ Shops in Nepal",
    description: "Locate verified gadget stores near you",
    route: "/stores",
    tag: "Verified Network",
    size: "wide",
  },
] as const;

export const HomeQuickActions = () => {
  const navigate = useNavigate();

  const large  = actions.filter((a) => a.size === "large");
  const medium = actions.filter((a) => a.size === "medium");
  const wide   = actions.filter((a) => a.size === "wide");

  return (
    <section className="py-16 border-y border-border">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-10 animate-fade-up delay-0">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">
            Services
          </p>
          <h2 className="font-syne text-3xl md:text-4xl font-bold text-foreground">
            What do you need today?
          </h2>
        </div>

        {/* Large 2-col primary actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border mb-px border border-border animate-fade-up delay-100">
          {large.map((action) => (
            <ActionTile key={action.number} action={action} onNavigate={navigate} variant="large" />
          ))}
        </div>

        {/* Medium 4-col secondary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border mb-px border border-border animate-fade-up delay-200">
          {medium.map((action) => (
            <ActionTile key={action.number} action={action} onNavigate={navigate} variant="medium" />
          ))}
        </div>

      </div>
    </section>
  );
};

// ─── Tile ─────────────────────────────────────────────────────────────────────

type TileVariant = "large" | "medium" | "wide";

function ActionTile({
  action,
  onNavigate,
  variant,
}: {
  action: (typeof actions)[number];
  onNavigate: (route: string) => void;
  variant: TileVariant;
}) {
  const isLarge  = variant === "large";
  const isWide   = variant === "wide";
  const isMedium = variant === "medium";

  return (
    <button
      onClick={() => onNavigate(action.route)}
      className={[
        "group relative bg-background flex items-start gap-4 text-left",
        "transition-colors duration-200 hover:bg-secondary/40",
        "pressable",
        isLarge  ? "p-8 md:p-10"                              : "",
        isMedium ? "p-6"                                       : "",
        isWide   ? "p-6 md:p-8 flex-row items-center"         : "",
      ].join(" ")}
    >
      {/* Number index */}
      <span
        className={[
          "font-syne font-bold leading-none text-primary/20 select-none shrink-0",
          "group-hover:text-primary/40 transition-colors duration-200",
          isLarge ? "text-5xl" : "text-3xl",
        ].join(" ")}
      >
        {action.number}
      </span>

      {/* Content */}
      <div className={["flex-1 min-w-0", isWide ? "flex items-center gap-8" : ""].join(" ")}>
        <div className={isWide ? "flex-1" : ""}>
          {action.tag && (
            <span className="inline-block text-[10px] font-bold tracking-widest uppercase text-primary border border-primary/30 rounded-sm px-2 py-0.5 mb-3">
              {action.tag}
            </span>
          )}
          <h3
            className={[
              "font-syne font-bold text-foreground leading-tight",
              isLarge ? "text-2xl md:text-3xl" : "text-xl",
            ].join(" ")}
          >
            {action.title}
          </h3>
          <p className="text-sm font-medium text-primary mt-0.5">{action.subtitle}</p>
          {(isLarge || isWide) && (
            <p className="text-sm text-muted-foreground mt-2 text-pretty">{action.description}</p>
          )}
        </div>

        {isWide && (
          <span className="text-sm font-semibold text-foreground hidden md:flex items-center gap-1.5 shrink-0">
            Browse all stores
            <ArrowRight
              className="h-4 w-4 translate-x-0 group-hover:translate-x-1.5 transition-transform duration-200"
              style={{ transitionTimingFunction: "var(--ease-out-quart)" }}
            />
          </span>
        )}
      </div>

      {/* Arrow for large tiles */}
      {isLarge && (
        <ArrowRight
          className="h-5 w-5 text-muted-foreground shrink-0 mt-1 translate-x-0 group-hover:translate-x-1.5 transition-transform duration-200 self-start"
          style={{ transitionTimingFunction: "var(--ease-out-quart)" }}
        />
      )}

      {/* Saffron sweep on hover */}
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary group-hover:w-full transition-[width] duration-300"
        style={{ transitionTimingFunction: "var(--ease-out-quart)" }}
      />
    </button>
  );
}
