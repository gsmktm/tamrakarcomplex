import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ModelCard } from "@/components/mobile/ModelCard";
import { SafeImage } from "@/components/common/SafeImage";
import { mobileMasterService, CategoryFilter } from "@/services/mobileMasterService";
import { Search, ChevronRight } from "lucide-react";

export default function MobileBrandPage() {
  const { brand: brandSlug } = useParams<{ brand: string }>();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<CategoryFilter['sort']>('latest');

  const { data: brands } = useQuery({
    queryKey: ['brands_list'],
    queryFn: () => mobileMasterService.getBrands(),
    staleTime: 10 * 60 * 1000,
  });

  const brand = brands?.find(b => b.slug === brandSlug);

  const { data, isLoading } = useQuery({
    queryKey: ['model_list_brand', brandSlug, sort, brand?.id],
    queryFn: () => mobileMasterService.getModelList({
      brand_id: brand?.id,
      sort,
      limit: 100,
    }),
    enabled: !!brands, // wait until brands loaded so brand?.id is resolved
    staleTime: 3 * 60 * 1000,
  });

  const filtered = (data?.items ?? []).filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase())
  );

  const brandName = brand?.name ?? (brandSlug ? brandSlug.charAt(0).toUpperCase() + brandSlug.slice(1) : 'Brand');

  return (
    <>
      <Helmet>
        <title>{brandName} Phone Price in Nepal 2026 | Tamrakar Complex</title>
        <meta name="description" content={`All ${brandName} phone prices in Nepal. Compare ${brandName} models, specs, and buy online.`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Brand hero */}
        <div className="bg-gradient-to-b from-primary/5 to-background border-b">
          <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
              <Link to="/" className="hover:text-foreground">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <Link to="/cat/mobiles/" className="hover:text-foreground">Mobiles</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">{brandName}</span>
            </nav>

            <div className="flex items-center gap-4 mb-4">
              {brand?.logo && (
                <div className="h-12 w-12 rounded-xl border bg-white p-1 flex-shrink-0">
                  <SafeImage src={brand.logo} alt={brandName} className="w-full h-full object-contain" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold">{brandName} Price in Nepal</h1>
                <p className="text-muted-foreground">{data?.total ?? 0} models available</p>
              </div>
            </div>

            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={`Search ${brandName} phones...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Sort */}
          <div className="flex gap-2">
            {(['latest', 'price_asc', 'price_desc'] as const).map(s => (
              <Button key={s} size="sm" variant={sort === s ? 'default' : 'outline'} onClick={() => setSort(s)}>
                {s === 'latest' ? 'Latest' : s === 'price_asc' ? 'Price ↑' : 'Price ↓'}
              </Button>
            ))}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No {brandName} phones found.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map(m => <ModelCard key={m.id} model={m} />)}
            </div>
          )}

          {/* SEO */}
          <div className="prose prose-sm max-w-none pt-8 border-t">
            <h2>{brandName} Mobile Price in Nepal</h2>
            <p>Browse all {brandName} mobile phones available in Nepal with official prices. Find the latest {brandName} models, compare specs, and check EMI options from authorized dealers.</p>
          </div>
        </div>
      </div>
    </>
  );
}
