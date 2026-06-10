import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ModelCard } from "@/components/mobile/ModelCard";
import { mobileMasterService, CategoryFilter } from "@/services/mobileMasterService";
import { Search } from "lucide-react";

const FILTER_CHIPS = [
  { label: 'All', filter: {} },
  { label: 'iPhones', filter: { brand_id: '' } }, // resolved at runtime via brand lookup
  { label: 'Upcoming', filter: { is_upcoming: true } },
  { label: 'Featured', filter: { is_featured: true } },
  { label: 'Top Rated', filter: { is_top_rated: true } },
  { label: 'Under Rs.80k', filter: { maxPrice: 80000 } },
  { label: 'Budget', filter: { maxPrice: 30000 } },
];

const SORT_OPTIONS: { value: CategoryFilter['sort']; label: string }[] = [
  { value: 'latest', label: 'Latest' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
];

export default function MobileCategoryPage() {
  const [activeChip, setActiveChip] = useState(0);
  const [sort, setSort] = useState<CategoryFilter['sort']>('latest');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 24;

  const { data: brands } = useQuery({
    queryKey: ['brands_list'],
    queryFn: () => mobileMasterService.getBrands(),
    staleTime: 10 * 60 * 1000,
  });

  // Resolve Apple brand_id for iPhone chip
  const appleBrand = brands?.find(b => b.slug === 'apple' || b.name.toLowerCase() === 'apple');

  const chipFilter: CategoryFilter = (() => {
    const base = FILTER_CHIPS[activeChip].filter as CategoryFilter;
    if (activeChip === 1 && appleBrand) return { brand_id: appleBrand.id };
    if (activeChip === 1 && !appleBrand) return {}; // fallback: show all
    return base;
  })();

  const filters: CategoryFilter = {
    ...chipFilter,
    sort,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['model_list', filters],
    queryFn: () => mobileMasterService.getModelList(filters),
    staleTime: 3 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const filtered = (data?.items ?? []).filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.brand_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>Mobile Price in Nepal 2026 | Tamrakar Complex</title>
        <meta name="description" content="Latest mobile phone prices in Nepal. Compare iPhone, Samsung, Xiaomi, OnePlus prices. Updated daily." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <div className="bg-gradient-to-b from-primary/5 to-background border-b">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-2">Mobile Price in Nepal</h1>
            <p className="text-muted-foreground mb-6">Latest prices, specs & expert reviews for phones available in Nepal.</p>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search iPhone, Samsung, Xiaomi..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
              />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Filter chips + sort */}
          <div className="flex flex-wrap items-center gap-2">
            {FILTER_CHIPS.map((chip, i) => (
              <Button
                key={chip.label}
                size="sm"
                variant={activeChip === i ? 'default' : 'outline'}
                onClick={() => { setActiveChip(i); setPage(0); }}
              >
                {chip.label}
              </Button>
            ))}
            <div className="ml-auto flex gap-2">
              {SORT_OPTIONS.map(o => (
                <Button
                  key={o.value}
                  size="sm"
                  variant={sort === o.value ? 'default' : 'ghost'}
                  onClick={() => setSort(o.value)}
                >
                  {o.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Brand quick links */}
          {brands && brands.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {brands.filter(b => b.status === 'active').map(b => (
                <Link key={b.id} to={`/cat/mobiles/${b.slug}`}>
                  <Badge variant="outline" className="cursor-pointer hover:border-primary hover:text-primary transition-colors">
                    {b.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-square rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No phones found. Try a different filter.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filtered.map(m => <ModelCard key={m.id} model={m} />)}
            </div>
          )}

          {/* Pagination */}
          {(data?.total ?? 0) > PAGE_SIZE && (
            <div className="flex justify-center gap-2 pt-4">
              <Button variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="flex items-center text-sm text-muted-foreground px-4">
                Page {page + 1} of {Math.ceil((data?.total ?? 0) / PAGE_SIZE)}
              </span>
              <Button variant="outline" disabled={(page + 1) * PAGE_SIZE >= (data?.total ?? 0)} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}

          {/* SEO content */}
          <div className="prose prose-sm max-w-none pt-8 border-t">
            <h2>Mobile Phone Price in Nepal</h2>
            <p>Tamrakar Complex provides the most up-to-date mobile phone prices in Nepal, covering all major brands including Apple, Samsung, Xiaomi, OnePlus, Realme, and more. Our prices are verified with authorized dealers in Kathmandu.</p>
            <h3>How to choose a phone in Nepal?</h3>
            <p>Consider your budget, required storage, camera requirements, and battery life. For flagship performance, Apple iPhone 16 series and Samsung Galaxy S25 are top picks. For value, Xiaomi and Realme offer excellent specs at mid-range prices.</p>
          </div>
        </div>
      </div>
    </>
  );
}
