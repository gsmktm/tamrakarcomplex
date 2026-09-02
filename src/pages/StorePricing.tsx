import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/common/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STORE_PACKAGE_META, STORE_SUBSCRIPTION_PACKAGES } from "@/lib/storePackages";
import { supabase } from "@/integrations/supabase/client";

const formatNpr = (value: number) => new Intl.NumberFormat("en-NP").format(value);

export default function StorePricing() {
  const [yearly, setYearly] = useState(true);
  const { data: databasePackages } = useQuery({
    queryKey: ["public-store-packages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_packages").select("slug,name,price,yearly_price,product_limit,accessory_limit,repair_enabled,exchange_enabled,analytics_level,featured_enabled,verified_badge_enabled,homepage_promotion_enabled,is_active,is_popular,sort_order").eq("is_active", true).order("sort_order").order("price");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const plans = useMemo(() => STORE_SUBSCRIPTION_PACKAGES.filter((plan) => plan.is_active).map((plan) => {
    const live = databasePackages?.find((item) => item.slug === plan.slug || item.name?.toLowerCase() === plan.slug);
    const liveFeatures = live ? [
      `Up to ${live.product_limit >= 100000 || live.product_limit < 0 ? "unlimited" : live.product_limit} product listings`,
      `Up to ${live.accessory_limit >= 100000 || live.accessory_limit < 0 ? "unlimited" : live.accessory_limit} accessory listings`,
      live.repair_enabled ? "Repair service management" : null,
      live.exchange_enabled ? "Exchange request management" : null,
      live.analytics_level && live.analytics_level !== "none" ? `${live.analytics_level} analytics` : null,
      live.featured_enabled ? "Featured directory placement" : null,
      live.verified_badge_enabled ? "Verified store badge" : null,
      live.homepage_promotion_enabled ? "Homepage promotion" : null,
    ].filter((feature): feature is string => Boolean(feature)) : plan.features_json;

    return {
      ...plan,
      monthly_price: live?.price ?? plan.monthly_price,
      yearly_price: Number(live?.yearly_price ?? plan.yearly_price),
      features_json: liveFeatures,
    };
  }), [databasePackages]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEO
        title="Store Pricing & Membership Plans"
        description="Compare Free, Silver, Gold, and Diamond store plans for Tamrakar Complex merchants."
        url="/stores/pricing"
      />
      <Header />

      <main className="flex-1">
        <section className="border-b bg-gradient-to-b from-primary/10 via-background to-background">
          <div className="container py-16 text-center md:py-24">
            <Badge variant="outline" className="mb-5 gap-2 rounded-full px-4 py-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Store memberships
            </Badge>
            <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold tracking-tight md:text-6xl">
              Grow your gadget store with the right plan
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Start free, publish your inventory, and upgrade when you need more leads, staff access, analytics, and featured placement.
            </p>

            <div className="mx-auto mt-8 inline-flex rounded-full border bg-card p-1 shadow-sm" aria-label="Billing period">
              <button
                type="button"
                onClick={() => setYearly(false)}
                className={cn("rounded-full px-5 py-2 text-sm font-semibold transition", !yearly ? "bg-foreground text-background" : "text-muted-foreground")}
                aria-pressed={!yearly}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setYearly(true)}
                className={cn("rounded-full px-5 py-2 text-sm font-semibold transition", yearly ? "bg-foreground text-background" : "text-muted-foreground")}
                aria-pressed={yearly}
              >
                Yearly
              </button>
            </div>
          </div>
        </section>

        <section className="container py-14 md:py-20">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => {
              const meta = STORE_PACKAGE_META[plan.slug as keyof typeof STORE_PACKAGE_META];
              const price = yearly ? plan.yearly_price : plan.monthly_price;
              const featured = (live as any)?.is_popular ?? plan.slug === "gold";

              return (
                <article
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col rounded-3xl border bg-card p-6 shadow-sm",
                    featured && "border-amber-400 shadow-lg shadow-amber-500/10",
                  )}
                >
                  {featured && (
                    <Badge className="absolute -top-3 left-6 bg-amber-500 text-slate-950 hover:bg-amber-500">
                      Best value
                    </Badge>
                  )}
                  <div className="mb-6">
                    <h2 className="font-display text-2xl font-bold">{meta.shortName}</h2>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{meta.tagline}</p>
                  </div>

                  <div className="mb-7 border-y py-5">
                    <div className="flex items-end gap-1">
                      <span className="text-sm font-semibold text-muted-foreground">NPR</span>
                      <span className="text-4xl font-black tracking-tight">{formatNpr(price)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {price === 0 ? "No payment required" : yearly ? "billed yearly" : "per month"}
                    </p>
                  </div>

                  <ul className="mb-8 flex-1 space-y-3">
                    {plan.features_json.map((feature) => (
                      <li key={feature} className="flex gap-2.5 text-sm leading-5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button asChild variant={featured ? "default" : "outline"} className="w-full rounded-full">
                    <Link to={`/stores/apply?plan=${plan.slug}`}>
                      {plan.slug === "free" ? "List your store" : `Choose ${meta.shortName}`}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </article>
              );
            })}
          </div>

          <div className="mt-12 rounded-3xl border bg-muted/30 p-6 text-center md:p-10">
            <h2 className="font-display text-2xl font-bold">Need help choosing?</h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              Tell us about your store, inventory, and team. We’ll help you select a plan that fits your current stage.
            </p>
            <Button asChild variant="link" className="mt-3">
              <Link to="/contact-us">Contact Tamrakar Complex <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
