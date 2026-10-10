import { useNavigate } from "react-router-dom";
import { ArrowRight, ShoppingBag, Banknote, Wrench, Repeat2, Unlock, Activity, Store, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/home/Reveal";

const actions = [
  { number: "01", title: "Buy New", subtitle: "Phones & Laptops", route: "/buy", tag: "Most Popular", icon: ShoppingBag, size: "large" as const, accent: "blue" },
  { number: "02", title: "Sell Used", subtitle: "Get Instant Cash", route: "/sell-your-phone", tag: "Fast Payout", icon: Banknote, size: "large" as const, accent: "emerald" },
  { number: "03", title: "Repair", subtitle: "Screen · Battery", route: "/repair", tag: null, icon: Wrench, size: "medium" as const, accent: "amber" },
  { number: "04", title: "Exchange", subtitle: "Upgrade Your Device", route: "/exchange-your-phone", tag: null, icon: Repeat2, size: "medium" as const, accent: "violet" },
  { number: "05", title: "Unlock", subtitle: "iCloud · Network", route: "/unlocking", tag: null, icon: Unlock, size: "medium" as const, accent: "sky" },
  { number: "06", title: "Diagnose", subtitle: "Hardware Check", route: "/repair#diagnostics-section", tag: null, icon: Activity, size: "medium" as const, accent: "rose" },
  { number: "07", title: "Find Stores", subtitle: "250+ Shops in Nepal", route: "/stores", tag: "Verified Network", icon: Store, size: "wide" as const, accent: "primary" },
];

const accentMap: Record<string, { text: string; bg: string; gradient: string }> = {
  blue:    { text: "text-blue-600",   bg: "bg-blue-600/10",   gradient: "from-blue-600/10 via-transparent to-blue-600/5" },
  emerald: { text: "text-emerald-600", bg: "bg-emerald-600/10", gradient: "from-emerald-600/10 via-transparent to-emerald-600/5" },
  amber:   { text: "text-amber-600",   bg: "bg-amber-600/10",   gradient: "from-amber-600/10 via-transparent to-amber-600/5" },
  violet:  { text: "text-violet-600",  bg: "bg-violet-600/10",  gradient: "from-violet-600/10 via-transparent to-violet-600/5" },
  sky:     { text: "text-sky-600",     bg: "bg-sky-600/10",     gradient: "from-sky-600/10 via-transparent to-sky-600/5" },
  rose:    { text: "text-rose-600",    bg: "bg-rose-600/10",    gradient: "from-rose-600/10 via-transparent to-rose-600/5" },
  primary: { text: "text-primary",     bg: "bg-primary/10",     gradient: "from-primary/10 via-transparent to-primary/5" },
};

export const HomeQuickActions = () => {
  const navigate = useNavigate();
  const large  = actions.filter((a) => a.size === "large");
  const medium = actions.filter((a) => a.size === "medium");
  const wide   = actions.filter((a) => a.size === "wide");

  return (
    <section className="py-16 lg:py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-section pointer-events-none" />
      <div className="container relative">
        <Reveal className="max-w-2xl mb-10">
          <p className="text-caption text-primary mb-3">What would you like to do?</p>
          <h2 className="text-display-lg mb-3">One platform, every gadget need.</h2>
          <p className="text-body-lg">
            From browsing the latest iPhones to selling your old device — everything flows through one connected exchange.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {large.map((action, i) => (
            <Reveal key={action.title} delay={i * 100}>
              <ActionTile action={action} onNavigate={navigate} variant="large" />
            </Reveal>
          ))}
          {medium.map((action, i) => (
            <Reveal key={action.title} delay={200 + i * 80}>
              <ActionTile action={action} onNavigate={navigate} variant="medium" />
            </Reveal>
          ))}
          {wide.map((action, i) => (
            <Reveal key={action.title} delay={500 + i * 100}>
              <ActionTile action={action} onNavigate={navigate} variant="wide" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

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
  const isMedium = variant === "medium";
  const isWide   = variant === "wide";
  const Icon = action.icon;
  const accent = accentMap[action.accent];

  return (
    <button
      onClick={() => onNavigate(action.route)}
      className={cn(
        "card-premium group relative w-full text-left overflow-hidden",
        isLarge ? "p-6 lg:p-7 flex flex-col justify-between min-h-[220px]" : "",
        isMedium ? "p-5 flex flex-col min-h-[140px]" : "",
        isWide ? "p-5 flex flex-col justify-center min-h-[180px] md:col-span-2" : "",
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none", accent.gradient)} />

      <div className="relative">
        {action.tag && (
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4", accent.bg, accent.text)}>
            <Sparkles className="h-3 w-3" />
            {action.tag}
          </span>
        )}
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110", accent.bg)}>
          <Icon className={cn("h-5 w-5", accent.text)} />
        </div>
        <p className="text-xs font-bold text-muted-foreground/50 tracking-wider mb-1">{action.number}</p>
        <h3 className={cn("font-display font-bold text-foreground leading-tight", isLarge ? "text-xl lg:text-2xl" : "text-base")}>
          {action.title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{action.subtitle}</p>
        {(isLarge || isWide) && (
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors">
            Get started <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        )}
      </div>

      {isLarge && (
        <ArrowRight className="absolute top-6 right-6 h-5 w-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
      )}
    </button>
  );
}
