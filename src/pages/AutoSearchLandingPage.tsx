import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, MessageCircle, Phone, RefreshCw, Search, ShieldCheck, Store, Wrench } from "lucide-react";
import { SEO } from "@/components/common/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { autoSearchPageService, type AutoSearchPage } from "@/services/autoSearchPageService";
import { absoluteUrl } from "@/lib/seo";

function textValue(record: Record<string, unknown>, key: string, fallback = "") {
  const value = record[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

function priceValue(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number") return `Rs. ${value.toLocaleString("en-IN")}`;
    if (typeof value === "string" && value.trim()) return value;
  }
  return "Ask for latest price";
}

function firstImage(record: Record<string, unknown>) {
  const image = record.image_url || record.logo_url;
  if (typeof image === "string" && image) return image;
  const images = record.images;
  if (Array.isArray(images) && typeof images[0] === "string") return images[0];
  return "/default-product.svg";
}

function productSchema(page: AutoSearchPage) {
  const products = page.sections.products ?? [];
  const listings = page.sections.listings ?? [];
  return [...products, ...listings].slice(0, 8).map((item) => {
    const name = textValue(item, "name", textValue(item, "title", page.primary_query));
    const price = textValue(item, "price_npr", textValue(item, "price", ""));
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name,
      image: absoluteUrl(firstImage(item)),
      offers: price
        ? {
            "@type": "Offer",
            priceCurrency: "NPR",
            price: String(price).replace(/[^\d.]/g, ""),
            availability: "https://schema.org/InStock",
          }
        : undefined,
    };
  });
}

function sectionHasItems(page: AutoSearchPage) {
  return Boolean(
    page.sections.products?.length ||
    page.sections.stores?.length ||
    page.sections.repairs?.length ||
    page.sections.listings?.length,
  );
}

export default function AutoSearchLandingPage() {
  const { slug = "" } = useParams();
  const { data: page, isLoading } = useQuery({
    queryKey: ["auto-search-page", slug],
    queryFn: () => autoSearchPageService.getPageBySlug(slug),
    enabled: Boolean(slug),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!page?.id) return;
    autoSearchPageService.trackEvent(page.id, "impression", { path: page.path });
  }, [page?.id, page?.path]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <section className="container mx-auto px-4 py-12">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="mt-4 h-5 w-full max-w-3xl" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((item) => <Skeleton key={item} className="h-44 rounded-2xl" />)}
          </div>
        </section>
      </main>
    );
  }

  if (!page) {
    return (
      <main className="min-h-screen bg-background">
        <SEO title="Search Page Not Found" description="This generated search page is not available yet." noindex />
        <section className="container mx-auto px-4 py-16 text-center">
          <Search className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-3xl font-bold">Search page not ready</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            This query does not have enough real TamrakarComplex.com data for a public page yet.
          </p>
          <Button asChild className="mt-6">
            <Link to="/buy">Browse gadgets</Link>
          </Button>
        </section>
      </main>
    );
  }

  const schemas = [...(Array.isArray(page.structured_data) ? page.structured_data : []), ...productSchema(page)];

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title={page.title}
        description={page.meta_description}
        image={page.og_image}
        url={page.path}
        keywords={[page.primary_query, `${page.intent} Nepal`, "Tamrakar Complex"]}
        noindex={page.robots_noindex}
        structuredData={schemas}
      />

      <section className="border-b border-border/60 bg-card">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={page.robots_noindex ? "outline" : "default"}>
              Quality {page.quality_score}/100
            </Badge>
            <Badge variant="secondary" className="capitalize">{page.intent}</Badge>
            {page.sitemap_enabled ? <Badge variant="secondary">Sitemap ready</Badge> : <Badge variant="outline">Noindex until stronger</Badge>}
            {page.needs_refresh ? <Badge variant="outline"><RefreshCw className="mr-1 h-3 w-3" /> Refresh queued</Badge> : null}
          </div>
          <h1 className="mt-5 max-w-4xl text-3xl font-bold tracking-tight md:text-5xl">{page.h1}</h1>
          <p className="mt-4 max-w-3xl text-base text-muted-foreground md:text-lg">{page.intro}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to={`/buy?q=${encodeURIComponent(page.primary_query)}`}>
                Check prices <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/stores?search=${encodeURIComponent(page.primary_query)}`}>
                Find stores
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        {!sectionHasItems(page) ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No live product, store, listing, or repair match is available for this generated page.
            </CardContent>
          </Card>
        ) : null}

        {page.sections.products?.length ? (
          <div className="mb-10">
            <h2 className="text-2xl font-semibold">Matched Products and Price Data</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {page.sections.products.map((product) => (
                <Card key={textValue(product, "id", textValue(product, "slug"))} className="overflow-hidden">
                  <img src={firstImage(product)} alt={textValue(product, "name", "Product")} className="h-36 w-full object-contain bg-secondary/30 p-4" />
                  <CardContent className="p-4">
                    <h3 className="line-clamp-2 font-semibold">{textValue(product, "name", "Product")}</h3>
                    <p className="mt-2 font-bold text-primary">{priceValue(product, "price_text", "price_npr")}</p>
                    <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                      <Link to={`/product/${textValue(product, "slug")}`} onClick={() => autoSearchPageService.trackEvent(page.id, "click", { target: "product", id: product.id })}>
                        View details
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        {page.sections.stores?.length ? (
          <div className="mb-10">
            <h2 className="text-2xl font-semibold">Matched Stores</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {page.sections.stores.map((store) => {
                const phone = textValue(store, "phone");
                const whatsapp = textValue(store, "whatsapp", phone).replace(/[^\d]/g, "");
                return (
                  <Card key={textValue(store, "id")} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <img src={firstImage(store)} alt={textValue(store, "name", "Store")} className="h-12 w-12 rounded-xl border object-cover" />
                        <div className="min-w-0">
                          <h3 className="font-semibold">{textValue(store, "name", "Store")}</h3>
                          <p className="text-sm text-muted-foreground">{textValue(store, "location", "Kathmandu")}</p>
                        </div>
                      </div>
                      {store.is_verified ? <Badge variant="secondary" className="mt-3"><BadgeCheck className="mr-1 h-3 w-3" /> Verified</Badge> : null}
                      <div className="mt-4 flex gap-2">
                        <Button asChild size="sm" variant="outline" className="flex-1">
                          <Link to={`/stores/${textValue(store, "slug", textValue(store, "id"))}`} onClick={() => autoSearchPageService.trackEvent(page.id, "click", { target: "store", id: store.id })}>
                            <Store className="mr-1 h-4 w-4" /> Store
                          </Link>
                        </Button>
                        {phone ? (
                          <Button asChild size="sm" variant="outline" onClick={() => autoSearchPageService.trackEvent(page.id, "call", { store_id: store.id })}>
                            <a href={`tel:${phone}`}><Phone className="h-4 w-4" /></a>
                          </Button>
                        ) : null}
                        {whatsapp ? (
                          <Button asChild size="sm" variant="outline" onClick={() => autoSearchPageService.trackEvent(page.id, "whatsapp", { store_id: store.id })}>
                            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /></a>
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : null}

        {page.sections.repairs?.length ? (
          <div className="mb-10">
            <h2 className="text-2xl font-semibold">Matched Repair Services</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {page.sections.repairs.map((repair) => (
                <Card key={textValue(repair, "id")}>
                  <CardContent className="p-5">
                    <Wrench className="h-5 w-5 text-primary" />
                    <h3 className="mt-3 font-semibold">{textValue(repair, "title", "Repair service")}</h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{textValue(repair, "description", textValue(repair, "issue_type", "Repair service"))}</p>
                    <p className="mt-3 font-bold">{priceValue(repair, "estimated_price")}</p>
                    <Button asChild size="sm" className="mt-4">
                      <Link to="/repair" onClick={() => autoSearchPageService.trackEvent(page.id, "booking", { target: "repair", id: repair.id })}>
                        Book repair
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        {page.sections.listings?.length ? (
          <div className="mb-10">
            <h2 className="text-2xl font-semibold">Matched Used and Marketplace Listings</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {page.sections.listings.map((listing) => (
                <Card key={textValue(listing, "id")} className="overflow-hidden">
                  <img src={firstImage(listing)} alt={textValue(listing, "title", "Listing")} className="h-36 w-full object-contain bg-secondary/30 p-4" />
                  <CardContent className="p-4">
                    <h3 className="line-clamp-2 font-semibold">{textValue(listing, "title", "Listing")}</h3>
                    <p className="mt-2 font-bold text-primary">{priceValue(listing, "price")}</p>
                    <p className="text-sm text-muted-foreground capitalize">{textValue(listing, "condition", "used")}</p>
                    <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                      <Link to={`/marketplace/listing/${textValue(listing, "id")}`} onClick={() => autoSearchPageService.trackEvent(page.id, "click", { target: "listing", id: listing.id })}>
                        View listing
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="mt-3 font-semibold">Auto page quality control</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This page enters sitemap only when quality score reaches the safe threshold. Weak pages stay noindex to avoid thin or duplicate SEO.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <Search className="h-5 w-5 text-primary" />
              <h2 className="mt-3 font-semibold">Generated from search demand</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Query: {page.primary_query}. Last refreshed {new Date(page.content_refreshed_at).toLocaleDateString()}.
              </p>
            </CardContent>
          </Card>
        </div>

        {page.faqs?.length ? (
          <div className="mt-10">
            <h2 className="text-2xl font-semibold">FAQ</h2>
            <div className="mt-4 space-y-3">
              {page.faqs.map((faq) => (
                <Card key={faq.question}>
                  <CardContent className="p-5">
                    <h3 className="font-semibold">{faq.question}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
