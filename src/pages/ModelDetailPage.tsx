import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { SEO } from "@/components/common/SEO";
import { breadcrumbSchema, absoluteUrl, faqSchema, SITE_URL } from "@/lib/seo";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SafeImage } from "@/components/common/SafeImage";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { mobileMasterService, VariantPrice, ExpertScore } from "@/services/mobileMasterService";
import { buildMobilePurchaseWhatsAppUrl, formatPhoneVariant } from "@/lib/mobilePurchaseFlow";
import { ArrowLeft, ChevronRight, Star, ShoppingBag, CreditCard, ExternalLink, Store, MessageSquare } from "lucide-react";
import { AeoFaq } from "@/components/common/AeoFaq";

function ScoreBar({ label, value }: { label: string; value?: number }) {
  if (value == null) return null;
  const pct = (value / 10) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-28 text-muted-foreground">{label}</span>
      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold w-8 text-right">{value}</span>
    </div>
  );
}

function computeOverall(s: ExpertScore): number | null {
  const vals = [
    s.design_score, s.display_score, s.performance_score, s.software_score,
    s.camera_score, s.battery_score, s.value_score,
  ].filter((v): v is number => v != null);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export default function ModelDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [galleryIdx, setGalleryIdx] = useState(0);

  const { data: detail, isLoading, error } = useQuery({
    queryKey: ['model_detail', slug],
    queryFn: () => mobileMasterService.getModelDetail(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background">
          <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Skeleton className="aspect-square rounded-2xl" />
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!detail || error) {
    return (
      <>
        <Header />
        <div className="min-h-[70vh] bg-background flex items-center justify-center px-4">
          <div role="alert" className="max-w-md text-center space-y-4">
            <div>
              <h1 className="text-2xl font-bold">Phone not found</h1>
              <p className="mt-2 text-muted-foreground">
                This model may be unpublished, renamed, or not available in the catalog yet.
              </p>
            </div>
            <Button asChild>
              <Link to="/cat/mobiles">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Browse mobiles
              </Link>
            </Button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const { model, variants, prices, specs, images, expertScore } = detail;
  const overall = expertScore ? computeOverall(expertScore) : null;

  const lowestAvailablePrice = prices
    .filter(price => price.stock_status === "in_stock")
    .reduce<VariantPrice | undefined>((lowest, price) => {
      const effective = price.sale_price ?? price.regular_price;
      const lowestEffective = lowest ? (lowest.sale_price ?? lowest.regular_price) : Number.POSITIVE_INFINITY;
      return effective < lowestEffective ? price : lowest;
    }, undefined);
  const activeVariantId = selectedVariantId ?? lowestAvailablePrice?.variant_id ?? variants[0]?.id ?? null;
  const activeVariant = variants.find(v => v.id === activeVariantId);
  const variantPrices = prices.filter(p => p.variant_id === activeVariantId);
  const defaultPrice: VariantPrice | undefined = variantPrices.find(p => p.is_default) ?? variantPrices[0] ?? prices.find(p => p.is_default) ?? prices[0];
  const visiblePrices = activeVariantId && variantPrices.length > 0 ? variantPrices : prices;
  const activeVariantLabel = formatPhoneVariant(activeVariant);
  const assistedPurchaseUrl = buildMobilePurchaseWhatsAppUrl({
    modelName: model.name,
    modelSlug: model.slug,
    variantLabel: activeVariantLabel,
    price: defaultPrice?.sale_price ?? defaultPrice?.regular_price,
  });
  // A catalog/reference price is not a Merchant Center offer. Only claim an
  // Offer when the seller supplied a real purchase URL for this exact variant.
  const merchantOffer = defaultPrice?.buy_url && defaultPrice.stock_status === "in_stock"
    ? {
        "@type": "Offer",
        priceCurrency: "NPR",
        price: defaultPrice.sale_price ?? defaultPrice.regular_price,
        availability: "https://schema.org/InStock",
        url: defaultPrice.buy_url,
        seller: { "@type": "Organization", name: "Tamrakar Complex", url: SITE_URL },
      }
    : null;

  const galleryImages: string[] = images.length > 0
    ? images.map(i => i.image_url)
    : model.image ? [model.image] : [];

  const specEntries = specs?.full_specs_json
    ? Object.entries(specs.full_specs_json as Record<string, Record<string, string>>)
    : [];
  const modelFaqs = [
    {
      question: `What is ${model.name}?`,
      answer: `${model.name} is a ${(model as any).brands?.name || ""} smartphone catalog entry with Nepal price references, variants, specifications, and available seller offers.`,
    },
    {
      question: `What is the ${model.name} price in Nepal?`,
      answer: defaultPrice
        ? `The displayed reference price starts from NPR ${(defaultPrice.sale_price ?? defaultPrice.regular_price).toLocaleString()}. Confirm the selected variant, seller, stock, and final invoice before payment.`
        : "A current Nepal price has not been confirmed for this model.",
    },
    {
      question: `Can I buy ${model.name} online?`,
      answer: merchantOffer
        ? "A seller purchase link is available for the selected in-stock offer."
        : "This page currently provides catalog information or an assisted enquiry, not a guaranteed online offer.",
    },
    {
      question: `Which ${model.name} details should I compare?`,
      answer: "Compare RAM and storage, display, processor, cameras, battery, software, warranty, seller terms, and the final price for the exact variant.",
    },
  ];

  return (
    <>
      <SEO
        title={(model as any).seo_title ?? `${model.name} Price in Nepal`}
        description={(model as any).seo_description ?? `${model.name} price in Nepal – specs, variants, expert score, and buying guide. Get the best deal from Tamrakar Complex.`}
        url={`/mobile/${model.slug}`}
        image={galleryImages[0]}
        keywords={[`${model.name} price Nepal`, `buy ${model.name} Nepal`, `${model.name} specs`, "Tamrakar Complex"]}
        type="product"
        structuredData={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Mobiles", url: "/cat/mobiles" },
            ...(((model as any).brands?.name) ? [{ name: (model as any).brands.name, url: `/mobile-price/brand/${(model as any).brands?.slug ?? ""}` }] : []),
            { name: model.name, url: `/mobile/${model.slug}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: model.name,
            image: galleryImages,
            description: (model as any).seo_description ?? `${model.name} price in Nepal`,
            brand: {
              "@type": "Brand",
              name: (model as any).brands?.name ?? "",
            },
            url: absoluteUrl(`/mobile/${model.slug}`),
            ...(merchantOffer ? { offers: merchantOffer } : {}),
            ...(overall != null ? { aggregateRating: { "@type": "AggregateRating", ratingValue: overall, bestRating: 10, worstRating: 0, ratingCount: 1 } } : {}),
          },
          faqSchema(modelFaqs),
        ]}
      />

      <Header />
      <div className="min-h-screen bg-background">
        {/* Breadcrumb */}
        <div className="border-b">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <Link to="/cat/mobiles" className="hover:text-foreground">Mobiles</Link>
              <ChevronRight className="h-3 w-3" />
              {(model as any).brands && (
                <>
                  <Link to={`/cat/mobiles/${(model as any).brands.slug}`} className="hover:text-foreground">
                    {(model as any).brands.name}
                  </Link>
                  <ChevronRight className="h-3 w-3" />
                </>
              )}
              <span className="text-foreground">{model.name}</span>
            </nav>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Main: gallery + price panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Gallery */}
            <div className="space-y-3">
              <div className="aspect-square rounded-2xl border bg-muted/20 overflow-hidden">
                {galleryImages.length > 0 ? (
                  <SafeImage
                    src={galleryImages[galleryIdx]}
                    alt={model.name}
                    className="w-full h-full object-contain p-6"
                    loading="eager"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
                )}
              </div>
              {galleryImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {galleryImages.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setGalleryIdx(i)}
                      className={`flex-shrink-0 h-16 w-16 rounded-lg border-2 overflow-hidden transition-all ${i === galleryIdx ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    >
                      <SafeImage src={url} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info panel */}
            <div className="space-y-5 min-w-0">
              <div>
                <div className="text-sm text-muted-foreground mb-1">{(model as any).brands?.name}</div>
                <h1 className="text-2xl md:text-3xl font-bold leading-tight break-words">{model.name}</h1>
                <div className="mt-4 rounded-xl border-l-4 border-primary bg-primary/5 p-4">
                  <p className="font-semibold">TL;DR</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {model.name} is a smartphone catalog page for Nepal buyers, covering variants, specifications, and current price references.
                    A listed reference price is not a confirmed purchase until the exact seller, stock, and checkout or purchase link are available.
                  </p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Compare the selected RAM, storage, and colour variant.</li>
                    <li>Confirm warranty, invoice, delivery, and return terms before payment.</li>
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(model as any).is_upcoming && <Badge variant="secondary">Upcoming</Badge>}
                  {(model as any).is_featured && <Badge className="bg-amber-500 hover:bg-amber-500">Featured</Badge>}
                  {(model as any).market_status === 'discontinued' && <Badge variant="outline" className="text-muted-foreground">Discontinued</Badge>}
                </div>
              </div>

              {/* Expert score badge */}
              {overall && (
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold text-lg">{overall}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Expert Score</div>
                    <div className="flex text-amber-400">
                      {Array.from({ length: Math.min(5, Math.round(overall / 2)) }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Variant picker */}
              {variants.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Variants</div>
                  <div className="flex flex-wrap gap-2">
                    {variants.map(v => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                          activeVariantId === v.id
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {[v.ram, v.storage, v.color].filter(Boolean).join(' / ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Purchase */}
              {defaultPrice ? (
                <div className="rounded-xl border p-4 space-y-3 bg-card">
                  <div className="flex items-end gap-2">
                    <span className="text-2xl sm:text-3xl font-bold break-words">
                      NPR {(defaultPrice.sale_price ?? defaultPrice.regular_price).toLocaleString()}
                    </span>
                    {defaultPrice.sale_price && (
                      <span className="text-muted-foreground line-through text-lg mb-0.5">
                        {defaultPrice.regular_price.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <Badge variant={
                    defaultPrice.stock_status === 'in_stock' ? 'default'
                    : defaultPrice.stock_status === 'pre_order' ? 'secondary'
                    : 'outline'
                  }>
                    {defaultPrice.stock_status === 'in_stock' ? 'In Stock'
                      : defaultPrice.stock_status === 'pre_order' ? 'Pre-Order'
                      : 'Out of Stock'}
                  </Badge>

                  {visiblePrices.length > 1 && (
                    <div className="space-y-2 border-t pt-3">
                      <div className="text-xs font-medium text-muted-foreground">Available offers</div>
                      {visiblePrices.map((price) => (
                        <div key={price.id} className="flex items-center justify-between gap-3 rounded-lg border bg-background p-2 text-sm">
                          <div className="min-w-0">
                            <div className="font-semibold">
                              NPR {(price.sale_price ?? price.regular_price).toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {price.stock_status === "in_stock" ? "In stock" : price.stock_status === "pre_order" ? "Pre-order" : "Out of stock"}
                              {price.emi_available ? " · EMI available" : ""}
                            </div>
                          </div>
                          {price.buy_url ? (
                            <Button size="sm" asChild>
                              <a href={price.buy_url} target="_blank" rel="noopener noreferrer">
                                Buy <ExternalLink className="ml-1 h-3 w-3" />
                              </a>
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" asChild>
                              <Link to="/stores">Stores</Link>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {defaultPrice.buy_url ? (
                    <Button className="w-full gap-2" asChild>
                      <a href={defaultPrice.buy_url} target="_blank" rel="noopener noreferrer">
                        <ShoppingBag className="h-4 w-4" />
                        Buy Now
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Button className="w-full gap-2 bg-[#25D366] text-white hover:bg-[#128C7E]" asChild>
                        <a href={assistedPurchaseUrl} target="_blank" rel="noopener noreferrer">
                          <ShoppingBag className="h-4 w-4" />
                          Buy Now
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </a>
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Opens a prefilled buying request so our team can confirm the store, stock, warranty, and final price.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Button variant="outline" className="gap-2" asChild>
                          <Link to="/stores">
                            <Store className="h-4 w-4" />
                            Find Stores
                          </Link>
                        </Button>
                        <Button variant="outline" className="gap-2" asChild>
                          <Link
                            to={`/contact-us?intent=buy&model=${encodeURIComponent(model.name)}&variant=${encodeURIComponent(activeVariantLabel)}`}
                          >
                            <MessageSquare className="h-4 w-4" />
                            Ask Price
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}

                  {defaultPrice.emi_available && (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => document.getElementById('emi-tab')?.click()}
                    >
                      <CreditCard className="h-4 w-4" />View EMI Options
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border p-4 space-y-3 bg-card">
                  <div>
                    <div className="font-semibold">Price coming soon</div>
                    <p className="text-sm text-muted-foreground">Check stores or ask Tamrakar Complex for the latest availability.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button variant="outline" className="gap-2" asChild>
                      <Link to="/stores">
                        <Store className="h-4 w-4" />
                        Find Stores
                      </Link>
                    </Button>
                    <Button variant="outline" className="gap-2" asChild>
                      <Link to={`/contact-us?intent=buy&model=${encodeURIComponent(model.name)}`}>
                        <MessageSquare className="h-4 w-4" />
                        Ask Price
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

              {/* Quick spec highlights */}
              {specs && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {specs.display && (
                    <div className="bg-muted/50 rounded-lg p-2">
                      <div className="text-xs text-muted-foreground">Display</div>
                      <div className="font-medium truncate">{typeof specs.display === 'string' ? specs.display.split(',')[0] : ''}</div>
                    </div>
                  )}
                  {specs.processor && (
                    <div className="bg-muted/50 rounded-lg p-2">
                      <div className="text-xs text-muted-foreground">Processor</div>
                      <div className="font-medium truncate">{typeof specs.processor === 'string' ? specs.processor.split(',')[0] : ''}</div>
                    </div>
                  )}
                  {specs.camera && (
                    <div className="bg-muted/50 rounded-lg p-2">
                      <div className="text-xs text-muted-foreground">Camera</div>
                      <div className="font-medium truncate">{typeof specs.camera === 'string' ? specs.camera.split(',')[0] : ''}</div>
                    </div>
                  )}
                  {specs.battery && (
                    <div className="bg-muted/50 rounded-lg p-2">
                      <div className="text-xs text-muted-foreground">Battery</div>
                      <div className="font-medium truncate">{typeof specs.battery === 'string' ? specs.battery.split(',')[0] : ''}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Detail tabs */}
          <Tabs defaultValue="specs" className="space-y-4">
            <div className="overflow-x-auto pb-1">
              <TabsList className="min-w-max">
                <TabsTrigger value="specs">Specifications</TabsTrigger>
                {expertScore && <TabsTrigger value="score">Expert Score</TabsTrigger>}
                {(model as any).overview_content && <TabsTrigger value="overview">Overview</TabsTrigger>}
                <TabsTrigger value="emi" id="emi-tab">EMI</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="specs" className="space-y-6">
              {specEntries.length > 0 ? specEntries.map(([category, fields]) => (
                <div key={category}>
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">{category}</h3>
                  <div className="rounded-xl border overflow-hidden">
                    {Object.entries(fields as Record<string, string>).map(([k, v], i) => (
                      <div key={k} className={`grid grid-cols-1 sm:grid-cols-[9rem_1fr] gap-1 sm:gap-4 px-4 py-2.5 text-sm ${i % 2 === 0 ? 'bg-muted/30' : ''}`}>
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-medium min-w-0 break-words">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )) : specs ? (
                <div className="rounded-xl border overflow-hidden">
                  {([
                    ['Display', specs.display],
                    ['Processor', specs.processor],
                    ['Camera', specs.camera],
                    ['Battery', specs.battery],
                    ['Charging', specs.charging],
                    ['OS', specs.os],
                    ['Network', specs.network],
                    ['Body', specs.body],
                  ] as [string, string | undefined][]).filter(([, v]) => v).map(([k, v], i) => (
                    <div key={k} className={`grid grid-cols-1 sm:grid-cols-[6rem_1fr] gap-1 sm:gap-4 px-4 py-2.5 text-sm ${i % 2 === 0 ? 'bg-muted/30' : ''}`}>
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium min-w-0 break-words">{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Specs not available yet.</p>
              )}
            </TabsContent>

            {expertScore && (
              <TabsContent value="score" className="space-y-4 max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold text-2xl">{overall}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-lg">Expert Score</div>
                    <div className="text-sm text-muted-foreground">
                      Based on {[expertScore.design_score, expertScore.display_score, expertScore.performance_score, expertScore.software_score, expertScore.camera_score, expertScore.battery_score, expertScore.value_score].filter(v => v != null).length} dimensions
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <ScoreBar label="Design" value={expertScore.design_score ?? undefined} />
                  <ScoreBar label="Display" value={expertScore.display_score ?? undefined} />
                  <ScoreBar label="Performance" value={expertScore.performance_score ?? undefined} />
                  <ScoreBar label="Software" value={expertScore.software_score ?? undefined} />
                  <ScoreBar label="Camera" value={expertScore.camera_score ?? undefined} />
                  <ScoreBar label="Battery" value={expertScore.battery_score ?? undefined} />
                  <ScoreBar label="Value" value={expertScore.value_score ?? undefined} />
                </div>
              </TabsContent>
            )}

            {(model as any).overview_content && (
              <TabsContent value="overview">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize((model as any).overview_content) }}
                />
              </TabsContent>
            )}

            <TabsContent value="emi">
              <EmiSection modelId={model.id} />
            </TabsContent>
          </Tabs>

          <div className="mt-10 border-t pt-8">
            <h2 className="mb-4 font-display text-2xl font-bold">Model comparison facts</h2>
            <div className="mb-8 overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  <tr><th className="w-2/5 bg-muted/40 p-3 text-left">Brand</th><td className="p-3">{(model as any).brands?.name || "Not specified"}</td></tr>
                  <tr><th className="bg-muted/40 p-3 text-left">Variants</th><td className="p-3">{variants.length || "Not specified"}</td></tr>
                  <tr><th className="bg-muted/40 p-3 text-left">Reference price</th><td className="p-3">{defaultPrice ? `NPR ${(defaultPrice.sale_price ?? defaultPrice.regular_price).toLocaleString()}` : "Not confirmed"}</td></tr>
                  <tr><th className="bg-muted/40 p-3 text-left">Online offer</th><td className="p-3">{merchantOffer ? "Available for selected offer" : "Assisted enquiry or catalog reference"}</td></tr>
                </tbody>
              </table>
            </div>
            <AeoFaq items={modelFaqs} title={`${model.name} FAQs`} />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

function EmiSection({ modelId }: { modelId: string }) {
  const { data: emis } = useQuery({
    queryKey: ['model_emi', modelId],
    queryFn: () => mobileMasterService.getModelEmi(modelId),
    staleTime: 5 * 60 * 1000,
  });
  const { data: plans } = useQuery({
    queryKey: ['emi_plans_public'],
    queryFn: () => mobileMasterService.getEmiPlans(),
    staleTime: 10 * 60 * 1000,
  });
  const planById = new Map((plans ?? []).map((plan) => [plan.id, plan]));

  if (!emis?.length) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <p className="font-medium">No EMI plans configured yet.</p>
        <p className="mt-1 text-sm text-muted-foreground">Contact a store to ask about bank financing for this model.</p>
        <Button variant="outline" size="sm" className="mt-3" asChild>
          <Link to="/contact">
            <MessageSquare className="mr-2 h-4 w-4" />
            Ask About EMI
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Monthly EMI options from Nepal banks and finance companies.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {emis.map(e => {
          const plan = planById.get(e.emi_plan_id);
          return (
          <div key={e.id} className="rounded-xl border bg-card p-4 space-y-2">
            <div>
              <div className="font-semibold">{plan?.bank_name ?? "EMI Plan"}</div>
              {plan && (
                <div className="text-xs text-muted-foreground">
                  {plan.duration_months} months · {plan.interest_rate}% interest · NPR {plan.processing_fee.toLocaleString()} processing
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground">Monthly Payment</div>
            <div className="text-2xl font-bold">NPR {e.monthly_amount.toLocaleString()}</div>
            {e.down_payment > 0 && (
              <div className="text-sm text-muted-foreground">Down payment: NPR {e.down_payment.toLocaleString()}</div>
            )}
            <Button size="sm" className="w-full" asChild>
              <Link to="/contact">Apply / Ask Store</Link>
            </Button>
          </div>
        )})}
      </div>
    </div>
  );
}
