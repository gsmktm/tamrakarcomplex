import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SafeImage } from "@/components/common/SafeImage";
import { mobileMasterService, VariantPrice, ExpertScore } from "@/services/mobileMasterService";
import { ChevronRight, Star, ShoppingBag, CreditCard, ExternalLink } from "lucide-react";

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
    );
  }

  if (!detail || error) {
    return <div role="alert" className="text-center py-24 text-muted-foreground">Phone not found.</div>;
  }

  const { model, variants, prices, specs, images, expertScore } = detail;
  const overall = expertScore ? computeOverall(expertScore) : null;

  const activeVariantId = selectedVariantId ?? variants[0]?.id ?? null;
  const variantPrices = prices.filter(p => p.variant_id === activeVariantId);
  const defaultPrice: VariantPrice | undefined = variantPrices.find(p => p.is_default) ?? variantPrices[0];

  const galleryImages: string[] = images.length > 0
    ? images.map(i => i.image_url)
    : model.image ? [model.image] : [];

  const specEntries = specs?.full_specs_json
    ? Object.entries(specs.full_specs_json as Record<string, Record<string, string>>)
    : [];

  return (
    <>
      <Helmet>
        <title>{(model as any).seo_title ?? `${model.name} Price in Nepal | Tamrakar Complex`}</title>
        <meta name="description" content={(model as any).seo_description ?? `${model.name} price in Nepal, specs, and expert review. Buy from authorized dealers.`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Breadcrumb */}
        <div className="border-b">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <Link to="/cat/mobiles/" className="hover:text-foreground">Mobiles</Link>
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
            <div className="space-y-5">
              <div>
                <div className="text-sm text-muted-foreground mb-1">{(model as any).brands?.name}</div>
                <h1 className="text-2xl font-bold leading-tight">{model.name}</h1>
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

              {/* Price */}
              {defaultPrice ? (
                <div className="rounded-xl border p-4 space-y-3 bg-card">
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold">
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
                  {defaultPrice.buy_url && (
                    <Button className="w-full gap-2" asChild>
                      <a href={defaultPrice.buy_url} target="_blank" rel="noopener noreferrer">
                        <ShoppingBag className="h-4 w-4" />
                        Buy Now
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                    </Button>
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
                <div className="rounded-xl border p-4 text-muted-foreground text-sm">Price coming soon.</div>
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
            <TabsList>
              <TabsTrigger value="specs">Specifications</TabsTrigger>
              {expertScore && <TabsTrigger value="score">Expert Score</TabsTrigger>}
              {(model as any).overview_content && <TabsTrigger value="overview">Overview</TabsTrigger>}
              <TabsTrigger value="emi" id="emi-tab">EMI</TabsTrigger>
            </TabsList>

            <TabsContent value="specs" className="space-y-6">
              {specEntries.length > 0 ? specEntries.map(([category, fields]) => (
                <div key={category}>
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">{category}</h3>
                  <div className="rounded-xl border overflow-hidden">
                    {Object.entries(fields as Record<string, string>).map(([k, v], i) => (
                      <div key={k} className={`flex gap-4 px-4 py-2.5 text-sm ${i % 2 === 0 ? 'bg-muted/30' : ''}`}>
                        <span className="text-muted-foreground w-36 flex-shrink-0">{k}</span>
                        <span className="font-medium flex-1">{String(v)}</span>
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
                    <div key={k} className={`flex gap-4 px-4 py-2.5 text-sm ${i % 2 === 0 ? 'bg-muted/30' : ''}`}>
                      <span className="text-muted-foreground w-24 flex-shrink-0">{k}</span>
                      <span className="font-medium flex-1">{v}</span>
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
        </div>
      </div>
    </>
  );
}

function EmiSection({ modelId }: { modelId: string }) {
  const { data: emis } = useQuery({
    queryKey: ['model_emi', modelId],
    queryFn: () => mobileMasterService.getModelEmi(modelId),
    staleTime: 5 * 60 * 1000,
  });

  if (!emis?.length) {
    return <p className="text-muted-foreground text-sm">No EMI plans configured for this model.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Monthly EMI options from Nepal banks and finance companies.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {emis.map(e => (
          <div key={e.id} className="rounded-xl border p-4 space-y-1">
            <div className="text-sm text-muted-foreground">Monthly Payment</div>
            <div className="text-2xl font-bold">NPR {e.monthly_amount.toLocaleString()}</div>
            {e.down_payment > 0 && (
              <div className="text-sm text-muted-foreground">Down payment: NPR {e.down_payment.toLocaleString()}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
