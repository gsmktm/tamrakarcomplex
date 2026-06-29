import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ModelCard } from "@/components/mobile/ModelCard";
import { SafeImage } from "@/components/common/SafeImage";
import { mobileMasterService } from "@/services/mobileMasterService";
import type { CategoryFilter } from "@/services/mobileMasterService";
import { Search, ChevronRight, ChevronDown, ChevronUp, MapPin, Phone, Mail } from "lucide-react";

const SORT_OPTIONS: { value: CategoryFilter["sort"]; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
  { value: "rating", label: "Top Rated" },
];

const FILTER_CHIPS: { label: string; filter: Partial<CategoryFilter> }[] = [
  { label: "All", filter: {} },
  { label: "Featured", filter: { is_featured: true } },
  { label: "Upcoming", filter: { is_upcoming: true } },
  { label: "Top Rated", filter: { is_top_rated: true } },
  { label: "Under Rs.80k", filter: { maxPrice: 80000 } },
];

export default function MobileBrandPage() {
  const { brand: brandSlug } = useParams<{ brand: string }>();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<CategoryFilter["sort"]>("latest");
  const [activeChip, setActiveChip] = useState(0);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Fetch brand detail (brand + models + series)
  const { data: brandDetail, isLoading } = useQuery({
    queryKey: ["brand-detail", brandSlug],
    queryFn: () => mobileMasterService.getBrandDetail(brandSlug!),
    enabled: !!brandSlug,
    staleTime: 5 * 60 * 1000,
  });

  // Apply client-side filters on top of loaded models
  const filter: CategoryFilter = useMemo(() => ({
    ...FILTER_CHIPS[activeChip].filter,
    sort,
    search: search || undefined,
  }), [activeChip, sort, search]);

  const allModels = brandDetail?.models ?? [];

  const filteredModels = useMemo(() => {
    let items = allModels;
    if (filter.is_featured) items = items.filter((m) => m.is_featured);
    if (filter.is_upcoming) items = items.filter((m) => m.is_upcoming);
    if (filter.is_top_rated) items = items.filter((m) => m.is_top_rated);
    if (filter.maxPrice) items = items.filter((m) => m.min_price !== undefined && m.min_price <= filter.maxPrice!);
    if (filter.search) {
      const q = filter.search.toLowerCase();
      items = items.filter((m) => m.name.toLowerCase().includes(q));
    }
    if (sort === "price_asc") items = [...items].sort((a, b) => (a.min_price ?? Infinity) - (b.min_price ?? Infinity));
    else if (sort === "price_desc") items = [...items].sort((a, b) => (b.min_price ?? -Infinity) - (a.min_price ?? -Infinity));
    else if (sort === "rating") items = [...items].sort((a, b) => (b.expert_overall ?? 0) - (a.expert_overall ?? 0));
    return items;
  }, [allModels, filter, sort]);

  const brand = brandDetail;
  const brandName = brand?.name ?? brandSlug ?? "";
  const overview = brand?.overview_text ?? "";
  const faqItems = brand?.faq ?? [];
  const serviceCenters = brand?.service_centers ?? [];
  const seriesDescriptions = brand?.series_descriptions ?? [];

  return (
    <>
      <Helmet>
        <title>{brandName} Phone Price in Nepal 2026 | Tamrakar Complex</title>
        <meta
          name="description"
          content={`All ${brandName} phone prices in Nepal. Compare ${brandName} models, specs, and buy online.`}
        />
      </Helmet>

      <Header />

      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to="/cat/mobiles" className="hover:text-foreground transition-colors">Mobile Phones</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">{brandName} Phones</span>
          </nav>

          {/* Brand header */}
          <div className="flex items-center gap-4">
            {brand?.logo && (
              <SafeImage
                src={brand.logo}
                alt={brandName}
                className="h-12 w-auto object-contain"
              />
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{brandName} Phones</h1>
              {brand?.total_models != null && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {brand.total_models} models listed
                </p>
              )}
            </div>
          </div>

          {/* Brand overview (expandable) */}
          {overview && (
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <p className={`text-sm text-muted-foreground leading-relaxed ${overviewExpanded ? "" : "line-clamp-3"}`}>
                {overview}
              </p>
              <button
                onClick={() => setOverviewExpanded((v) => !v)}
                className="text-xs font-medium text-primary flex items-center gap-1 hover:underline"
              >
                {overviewExpanded ? (
                  <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
                ) : (
                  <><ChevronDown className="h-3.5 w-3.5" /> Show more</>
                )}
              </button>
            </div>
          )}

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${brandName} phones…`}
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter chips + sort */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {FILTER_CHIPS.map((chip, i) => (
                <Button
                  key={chip.label}
                  variant={activeChip === i ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveChip(i)}
                  className="h-8 px-3 text-xs"
                >
                  {chip.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-1">
              {SORT_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={sort === opt.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSort(opt.value)}
                  className="h-8 px-3 text-xs"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Results count */}
          {!isLoading && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{brandName} Phones</span>
              {" "}({filteredModels.length} Products Listed)
            </p>
          )}

          {/* Model grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No phones found. Try changing filters.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredModels.map((m) => (
                <ModelCard key={m.id} model={m} />
              ))}
            </div>
          )}

          {/* Price table */}
          {filteredModels.length > 0 && (
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b">
                <h2 className="font-semibold text-sm">{brandName} Phone Price in Nepal [Updated]</h2>
              </div>
              <div className="divide-y">
                {filteredModels.slice(0, 20).map((m) => (
                  <Link
                    key={m.id}
                    to={`/mobile/${m.slug}`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors text-sm"
                  >
                    <span className="hover:text-primary transition-colors">{m.name}</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 text-right shrink-0 ml-4">
                      {m.min_price ? `रु ${m.min_price.toLocaleString('en-NP')}` : "TBA"}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Brand overview sections */}
          {overview && (
            <div className="space-y-4 border-t pt-6">
              <h2 className="text-xl font-bold">{brandName}: Brand Overview</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{overview}</p>
            </div>
          )}

          {/* Series descriptions */}
          {seriesDescriptions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">{brandName} in Nepal</h2>
              {seriesDescriptions.map((s, i) => (
                <div key={i}>
                  <h3 className="font-semibold text-base mb-1">{s.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Service Centers */}
          {serviceCenters.length > 0 && (
            <div className="space-y-3 border-t pt-6">
              <h2 className="text-lg font-bold">{brandName} Service Centers in Nepal</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {serviceCenters.map((sc, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-1 text-sm">
                    <div className="font-medium">{sc.name}</div>
                    {sc.address && (
                      <div className="flex items-start gap-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{sc.address}</span>
                      </div>
                    )}
                    {sc.phone && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{sc.phone}</span>
                      </div>
                    )}
                    {sc.email && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span>{sc.email}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQ */}
          {faqItems.length > 0 && (
            <div className="space-y-3 border-t pt-6">
              <h2 className="text-lg font-bold">Frequently Asked Questions</h2>
              <div className="space-y-2">
                {faqItems.map((faq, i) => (
                  <div key={i} className="rounded-lg border overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left hover:bg-muted/30 transition-colors"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    >
                      <span>{faq.question}</span>
                      {openFaq === i ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                    {openFaq === i && (
                      <div className="px-4 pb-3 text-sm text-muted-foreground leading-relaxed border-t bg-muted/10">
                        <div className="pt-2">{faq.answer}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
