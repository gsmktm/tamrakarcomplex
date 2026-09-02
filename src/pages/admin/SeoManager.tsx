import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, CheckCircle2, Download, ExternalLink, FileSearch, FileText, Link2, Loader2, PackageSearch, RefreshCw, Save, Search, ShieldCheck, Zap, Target, BookOpen, Globe } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SEO_PAGES_COLUMNS } from "@/lib/supabaseColumnMaps";
import { DEFAULT_OG_IMAGE, SEO_PAGE_CONFIGS, absoluteUrl, interpolateSeoTemplate } from "@/lib/seo";
import { seoContentRules, seoKeywordClusters, seoAeoSignals, type SeoKeywordCluster } from "@/data/seoKeywordStrategy";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";

function handleSupabaseError(err: unknown, context: string) {
  const msg = err instanceof Error ? err.message : String(err);
  toast.error(`${context}: ${msg}`);
}

type SeoPageRow = {
  id?: string;
  route_key: string;
  path: string;
  title: string | null;
  description: string | null;
  keywords: string[] | string | null;
  og_image: string | null;
  noindex?: boolean | null;
  is_active?: boolean | null;
  updated_at?: string | null;
};

type SitemapRow = {
  loc: string;
  lastmod: string | null;
  changefreq: string;
  priority: number;
  source_type: string;
};

type SeoInventoryProduct = {
  id: string;
  name: string;
  slug: string | null;
  brand: string | null;
  category: string | null;
  description: string | null;
  image: string | null;
  price_value: number | null;
  in_stock: boolean | null;
  updated_at: string | null;
};

type SeoInventoryArticle = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content: string | null;
  image: string | null;
  og_image: string | null;
  author: string | null;
  meta_title: string | null;
  meta_description: string | null;
  published: boolean | null;
  updated_at: string | null;
};

const CANONICAL_STATIC_SITEMAP_ROWS: SitemapRow[] = [
  { loc: absoluteUrl("/"), lastmod: new Date().toISOString(), changefreq: "daily", priority: 1.0, source_type: "static" },
  { loc: absoluteUrl("/cat/mobiles"), lastmod: new Date().toISOString(), changefreq: "daily", priority: 0.9, source_type: "static" },
  { loc: absoluteUrl("/stores"), lastmod: new Date().toISOString(), changefreq: "daily", priority: 0.8, source_type: "static" },
  { loc: absoluteUrl("/marketplace"), lastmod: new Date().toISOString(), changefreq: "hourly", priority: 0.8, source_type: "static" },
  { loc: absoluteUrl("/sell-your-phone"), lastmod: new Date().toISOString(), changefreq: "weekly", priority: 0.8, source_type: "static" },
  { loc: absoluteUrl("/repair"), lastmod: new Date().toISOString(), changefreq: "weekly", priority: 0.8, source_type: "static" },
  { loc: absoluteUrl("/stores/article"), lastmod: new Date().toISOString(), changefreq: "daily", priority: 0.7, source_type: "static" },
];

function splitKeywords(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function normalizeCanonicalPath(value: string) {
  const normalized = value.trim().split(/[?#]/, 1)[0].replace(/\/{2,}/g, "/");
  return normalized === "/" ? "/" : normalized.replace(/\/$/, "");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildXml(rows: SitemapRow[]) {
  const body = rows
    .map((row) => {
      const lastmod = row.lastmod ? `<lastmod>${new Date(row.lastmod).toISOString()}</lastmod>` : "";
      return `  <url><loc>${escapeXml(row.loc)}</loc>${lastmod}<changefreq>${escapeXml(row.changefreq)}</changefreq><priority>${Number(row.priority).toFixed(1)}</priority></url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

function clusterBadgeVariant(priority: SeoKeywordCluster["priority"]) {
  if (priority === "High") return "default";
  if (priority === "Medium") return "secondary";
  return "outline";
}

function keywordCount(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "string") return splitKeywords(value).length;
  return 0;
}

function getSourceLabel(sourceType: string) {
  return sourceType.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const SEO_QUERY_PAGE_SIZE = 1000;
const SEO_WRITE_BATCH_SIZE = 250;

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>,
) {
  const allRows: T[] = [];

  for (let from = 0; ; from += SEO_QUERY_PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + SEO_QUERY_PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    allRows.push(...page);
    if (page.length < SEO_QUERY_PAGE_SIZE) break;
  }

  return allRows;
}

function isCompleteIndexableProduct(product: SeoInventoryProduct) {
  return product.in_stock === true &&
    Boolean(product.slug?.trim()) &&
    Boolean(product.name?.trim()) &&
    Boolean(product.description?.trim()) &&
    Boolean(product.image?.trim()) &&
    Boolean(product.brand?.trim()) &&
    Boolean(product.category?.trim()) &&
    Boolean(product.price_value && product.price_value > 0);
}

function buildDefaultSeoRows(): SeoPageRow[] {
  return SEO_PAGE_CONFIGS.map((config) => ({
    route_key: config.route_key,
    path: config.route_key,
    title: config.title,
    description: config.description,
    keywords: config.keywords,
    og_image: config.og_image || DEFAULT_OG_IMAGE,
    is_active: true,
    noindex: false,
    updated_at: new Date().toISOString(),
  }));
}

export default function SeoManager() {
  const queryClient = useQueryClient();
  const [routeKey, setRouteKey] = useState<string>(SEO_PAGE_CONFIGS[0].route_key);
  const [path, setPath] = useState<string>(SEO_PAGE_CONFIGS[0].route_key);
  const [title, setTitle] = useState(SEO_PAGE_CONFIGS[0].title);
  const [description, setDescription] = useState(SEO_PAGE_CONFIGS[0].description);
  const [keywords, setKeywords] = useState(SEO_PAGE_CONFIGS[0].keywords.join(", "));
  const [ogImage, setOgImage] = useState(SEO_PAGE_CONFIGS[0].og_image);
  const [noindex, setNoindex] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [sitemapXml, setSitemapXml] = useState("");
  const [sitemapFallbackReason, setSitemapFallbackReason] = useState<string | null>(null);
  const [pageSearch, setPageSearch] = useState("");
  const [sitemapSource, setSitemapSource] = useState("all");
  const [clusterIntent, setClusterIntent] = useState("all");
  const autoSeedAttempted = useRef(false);

  const { data: pages, isLoading: pagesLoading, error: pagesError } = useQuery({
    queryKey: ["seo-pages-admin"],
    queryFn: async () => {
      try {
        return await fetchAllRows<SeoPageRow>((from, to) =>
          supabase
            .from("seo_pages")
            .select(SEO_PAGES_COLUMNS.join(","))
            .order("route_key", { ascending: true })
            .order("path", { ascending: true })
            .range(from, to) as unknown as Promise<{ data: SeoPageRow[] | null; error: unknown }>
        );
      } catch (err) {
        handleSupabaseError(err, "SeoManager: Failed to fetch SEO pages");
        return [];
      }
    },
    retry: 1,
  });

  const { data: sitemapRows, isLoading: sitemapLoading, refetch: refetchSitemap } = useQuery({
    queryKey: ["seo-sitemap-preview"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc("generate_seo_sitemap");
        if (error) throw error;
        setSitemapFallbackReason(null);
        return (data ?? []) as SitemapRow[];
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setSitemapFallbackReason(message);
        return CANONICAL_STATIC_SITEMAP_ROWS;
      }
    },
    retry: 1,
  });

  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ["seo-content-inventory"],
    queryFn: async () => {
      const [productsResult, articlesResult] = await Promise.all([
        fetchAllRows<SeoInventoryProduct>((from, to) =>
          supabase
            .from("products")
            .select("id,name,slug,brand,category,description,image,price_value,in_stock,updated_at")
            .order("updated_at", { ascending: false })
            .range(from, to) as unknown as Promise<{ data: SeoInventoryProduct[] | null; error: unknown }>
        ),
        fetchAllRows<SeoInventoryArticle>((from, to) =>
          supabase
            .from("articles")
            .select("id,title,slug,excerpt,content,image,og_image,author,meta_title,meta_description,published,updated_at")
            .order("updated_at", { ascending: false })
            .range(from, to) as unknown as Promise<{ data: SeoInventoryArticle[] | null; error: unknown }>
        ),
      ]);
      return {
        products: productsResult,
        articles: articlesResult,
      };
    },
    retry: 1,
  });

  const missingSeo = useMemo(() => {
    const rows = pages ?? [];
    return SEO_PAGE_CONFIGS.map((config) => {
      const exact = rows.find((row) => row.route_key === config.route_key && row.path === config.route_key);
      return {
        ...config,
        hasTitle: Boolean(exact?.title),
        hasDescription: Boolean(exact?.description),
        hasOgImage: Boolean(exact?.og_image),
      };
    }).filter((row) => !row.hasTitle || !row.hasDescription || !row.hasOgImage);
  }, [pages]);

  const selectedConfig = SEO_PAGE_CONFIGS.find((config) => config.route_key === routeKey) ?? SEO_PAGE_CONFIGS[0];
  const snippetTitle = title || selectedConfig.title;
  const snippetDescription = description || selectedConfig.description;
  const rows = pages ?? [];
  const activeRows = rows.filter((row) => row.is_active !== false && !row.noindex);
  const coveragePct = SEO_PAGE_CONFIGS.length
    ? Math.round(((SEO_PAGE_CONFIGS.length - missingSeo.length) / SEO_PAGE_CONFIGS.length) * 100)
    : 100;
  const sitemapSourceOptions = Array.from(new Set((sitemapRows ?? []).map((row) => row.source_type))).sort();
  const filteredSitemapRows = (sitemapRows ?? []).filter((row) => sitemapSource === "all" || row.source_type === sitemapSource);
  const filteredPages = rows.filter((row) => {
    const haystack = `${row.path} ${row.route_key} ${row.title ?? ""} ${row.description ?? ""}`.toLowerCase();
    return haystack.includes(pageSearch.trim().toLowerCase());
  });
  const filteredClusters = seoKeywordClusters.filter((cluster) => clusterIntent === "all" || cluster.intent === clusterIntent);
  const productIssues = (inventory?.products ?? []).filter((product) =>
    product.in_stock === true && !isCompleteIndexableProduct(product)
  );
  const articleIssues = (inventory?.articles ?? []).filter((article) =>
    article.published === true &&
    (!article.slug || !article.meta_title || !article.meta_description || !(article.og_image || article.image) ||
      !article.author || !article.content)
  );
  const indexableProductPaths = new Set(
    (inventory?.products ?? [])
      .filter(isCompleteIndexableProduct)
      .map((product) => `/product/${product.slug}`),
  );
  const productSeoRows = rows.filter((row) => row.route_key === "/product/:slug" && /^\/product\/[^:]+/.test(row.path));
  const exactProductSeoCount = productSeoRows.filter((row) =>
    indexableProductPaths.has(normalizeCanonicalPath(row.path)) && row.noindex !== true && row.is_active !== false
  ).length;
  const withheldProductSeoCount = productSeoRows.length - exactProductSeoCount;
  const exactArticleSeoCount = rows.filter((row) => row.route_key === "/stores/article/:slug" && /^\/stores\/article\/[^:]+/.test(row.path)).length;
  const indexableProductCount = (inventory?.products ?? []).filter(isCompleteIndexableProduct).length;
  const withheldProductCount = (inventory?.products ?? []).filter((product) => product.in_stock !== true).length;
  const auditChecks = [
    { label: "Title is present", passed: title.trim().length > 0, hint: "Add a page-specific title." },
    { label: "Title length is healthy", passed: title.trim().length >= 30 && title.trim().length <= 70, hint: "Aim for 30-70 characters." },
    { label: "Description is present", passed: description.trim().length > 0, hint: "Add a search-result description." },
    { label: "Description length is healthy", passed: description.trim().length >= 80 && description.trim().length <= 180, hint: "Aim for 80-180 characters." },
    { label: "Canonical path starts with /", passed: path.trim().startsWith("/"), hint: "Use a site-relative path like /cat/mobiles." },
    { label: "Open Graph image is set", passed: Boolean(ogImage.trim()), hint: "Add /og-image.png or a full image URL." },
    { label: "Keywords are focused", passed: splitKeywords(keywords).length >= 2 && splitKeywords(keywords).length <= 12, hint: "Use 2-12 focused keywords, not a full keyword dump." },
    { label: "Page is indexable", passed: isActive && !noindex, hint: "Active pages should normally be indexable." },
  ];
  const seoScore = Math.round((auditChecks.filter((check) => check.passed).length / auditChecks.length) * 100);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const canonicalPath = normalizeCanonicalPath(path);
      if (!canonicalPath.startsWith("/") || canonicalPath.includes(":")) {
        throw new Error("Use an exact site path beginning with /. Template placeholders are only valid in the Route selector.");
      }
      if (!title.trim() || !description.trim()) {
        throw new Error("Meta title and description are required.");
      }
      const payload = {
        route_key: routeKey,
        path: canonicalPath,
        title: title.trim(),
        description: description.trim(),
        keywords: splitKeywords(keywords),
        og_image: ogImage.trim() || null,
        is_active: isActive,
        noindex,
      };
      const { error } = await supabase.from("seo_pages").upsert(payload, { onConflict: "path" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seo-pages-admin"] });
      queryClient.invalidateQueries({ queryKey: ["seo-page-override"] });
      queryClient.invalidateQueries({ queryKey: ["seo-sitemap-preview"] });
      toast.success("SEO settings saved");
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Failed to save SEO settings"),
  });

  const syncCatalogSeoMutation = useMutation({
    mutationFn: async () => {
      const existingPaths = new Set((pages ?? []).map((row) => normalizeCanonicalPath(row.path)));
      const generated: SeoPageRow[] = [];

      for (const product of inventory?.products ?? []) {
        if (!isCompleteIndexableProduct(product)) continue;
        const productPath = `/product/${product.slug}`;
        if (existingPaths.has(productPath)) continue;
        const priceText = product.price_value && product.price_value > 0
          ? ` Current listed price: Rs. ${product.price_value.toLocaleString("en-NP")}.`
          : "";
        generated.push({
          route_key: "/product/:slug",
          path: productPath,
          title: `${product.name} Price in Nepal`,
          description: (product.description || `Check ${product.name} specifications, price, availability, and buying information in Nepal.${priceText}`).slice(0, 180),
          keywords: [
            `${product.name} price in Nepal`,
            product.brand ? `${product.brand} price in Nepal` : "",
            product.category || "",
          ].filter(Boolean),
          og_image: product.image || DEFAULT_OG_IMAGE,
          is_active: true,
          noindex: false,
        });
      }

      for (const article of inventory?.articles ?? []) {
        if (article.published !== true || !article.slug || !article.title) continue;
        const articlePath = `/stores/article/${article.slug}`;
        if (existingPaths.has(articlePath)) continue;
        generated.push({
          route_key: "/stores/article/:slug",
          path: articlePath,
          title: (article.meta_title || article.title).slice(0, 70),
          description: (article.meta_description || article.excerpt || `Read ${article.title} from Tamrakar Complex.`).slice(0, 180),
          keywords: ["tech Nepal", "Tamrakar Complex", article.title],
          og_image: article.og_image || article.image || DEFAULT_OG_IMAGE,
          is_active: true,
          noindex: false,
        });
      }

      if (generated.length > 0) {
        for (let index = 0; index < generated.length; index += SEO_WRITE_BATCH_SIZE) {
          const batch = generated.slice(index, index + SEO_WRITE_BATCH_SIZE);
          const { error } = await supabase.from("seo_pages").upsert(batch, { onConflict: "path", ignoreDuplicates: true });
          if (error) throw error;
        }
      }
      return {
        created: generated.length,
        products: generated.filter((row) => row.route_key === "/product/:slug").length,
        articles: generated.filter((row) => row.route_key === "/stores/article/:slug").length,
      };
    },
    onSuccess: async ({ created, products, articles }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["seo-pages-admin"] }),
        queryClient.invalidateQueries({ queryKey: ["seo-sitemap-preview"] }),
      ]);
      toast.success(created
        ? `Created ${created} missing SEO records (${products} products, ${articles} articles)`
        : "All eligible products and published articles already have SEO records");
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Failed to sync catalog SEO"),
  });

  const ensureDefaultSeoRows = async () => {
    const defaults = buildDefaultSeoRows();

    const { error } = await supabase.from("seo_pages").upsert(defaults, { onConflict: "path" });
    if (error) throw error;

    await queryClient.invalidateQueries({ queryKey: ["seo-pages-admin"] });
    await queryClient.invalidateQueries({ queryKey: ["seo-page-override"] });
    await queryClient.invalidateQueries({ queryKey: ["seo-sitemap-preview"] });
    return defaults.length;
  };

  const seedDefaultsMutation = useMutation({
    mutationFn: ensureDefaultSeoRows,
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["seo-sitemap-preview"] });
      toast.success(`SEO defaults repaired for ${count} route templates`);
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Failed to seed SEO defaults"),
  });

  useEffect(() => {
    if (pagesLoading || pagesError || autoSeedAttempted.current || missingSeo.length === 0) return;
    autoSeedAttempted.current = true;
    seedDefaultsMutation.mutate();
  }, [missingSeo.length, pagesError, pagesLoading, seedDefaultsMutation]);

  const handleRouteChange = (value: string) => {
    const config = SEO_PAGE_CONFIGS.find((item) => item.route_key === value) ?? SEO_PAGE_CONFIGS[0];
    const existing = pages?.find((row) => row.route_key === config.route_key && row.path === config.route_key);
    setRouteKey(config.route_key);
    setPath(existing?.path || config.route_key);
    setTitle(existing?.title || config.title);
    setDescription(existing?.description || config.description);
    setKeywords(Array.isArray(existing?.keywords) ? existing.keywords.join(", ") : existing?.keywords || config.keywords.join(", "));
    setOgImage(existing?.og_image || config.og_image);
    setNoindex(Boolean(existing?.noindex));
    setIsActive(existing?.is_active !== false);
  };

  const loadPageRow = (row: SeoPageRow) => {
    setRouteKey(row.route_key || row.path);
    setPath(row.path);
    setTitle(row.title || "");
    setDescription(row.description || "");
    setKeywords(Array.isArray(row.keywords) ? row.keywords.join(", ") : row.keywords || "");
    setOgImage(row.og_image || "");
    setNoindex(Boolean(row.noindex));
    setIsActive(row.is_active !== false);
    toast.success(`Loaded ${row.path}`);
  };

  const generateSitemap = async () => {
    try {
      const insertedDefaults = await ensureDefaultSeoRows();
      const result = await refetchSitemap();
      const rows = result.data ?? sitemapRows ?? [];
      const xml = buildXml(rows);
      setSitemapXml(xml);
      const fallbackNote = sitemapFallbackReason ? " using canonical static fallback" : "";
      toast.success(`Generated ${rows.length} sitemap URLs${fallbackNote}${insertedDefaults ? ` and seeded ${insertedDefaults} SEO defaults` : ""}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate sitemap");
    }
  };

  const applyClusterToEditor = (cluster: SeoKeywordCluster) => {
    setRouteKey(cluster.targetPath);
    setPath(cluster.targetPath);
    setTitle(cluster.titleTemplate);
    setDescription(cluster.metaDescription);
    setKeywords(cluster.keywords.join(", "));
    setOgImage(DEFAULT_OG_IMAGE);
    setNoindex(false);
    setIsActive(true);
    toast.success(`Loaded ${cluster.name} SEO brief`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SEO Growth Center</h1>
          <p className="text-muted-foreground">Manage metadata, snippets, Open Graph images, and indexable sitemap coverage.</p>
        </div>
        <Button onClick={generateSitemap} disabled={sitemapLoading} className="gap-2">
          {sitemapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Generate Sitemap
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Route SEO Coverage</p>
                <p className="mt-1 text-2xl font-bold">{coveragePct}%</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-emerald-600" />
            </div>
            <Progress value={coveragePct} className="mt-4 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Indexable SEO Rows</p>
                <p className="mt-1 text-2xl font-bold">{activeRows.length}</p>
              </div>
              <FileSearch className="h-8 w-8 text-primary" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{rows.length} total rows in SEO settings.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Sitemap URLs</p>
                <p className="mt-1 text-2xl font-bold">{sitemapRows?.length ?? 0}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{sitemapSourceOptions.length || 0} content sources covered.</p>
            {sitemapFallbackReason ? (
              <p className="mt-2 text-xs text-amber-600">RPC fallback active. Run the SEO migration to include dynamic products, stores, listings, repair pages, and articles.</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Editor Score</p>
                <p className="mt-1 text-2xl font-bold">{seoScore}%</p>
              </div>
              {seoScore >= 80 ? <CheckCircle2 className="h-8 w-8 text-emerald-600" /> : <AlertTriangle className="h-8 w-8 text-amber-600" />}
            </div>
            <Progress value={seoScore} className="mt-4 h-2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-primary" />
              Product & Blog SEO Coverage
            </CardTitle>
            <CardDescription className="mt-1">
              Audits every product and published article, then creates only missing exact-path SEO records. Existing manual SEO is preserved.
            </CardDescription>
          </div>
          <Button
            className="shrink-0 gap-2"
            onClick={() => syncCatalogSeoMutation.mutate()}
            disabled={inventoryLoading || syncCatalogSeoMutation.isPending}
          >
            {syncCatalogSeoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync All Product & Blog SEO
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Indexable products</p>
              <p className="mt-1 text-2xl font-bold">{indexableProductCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {exactProductSeoCount} indexable SEO records · {withheldProductCount} products withheld
                {withheldProductSeoCount > 0 ? ` · ${withheldProductSeoCount} historical SEO rows noindexed` : ""}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Published blogs</p>
              <p className="mt-1 text-2xl font-bold">{inventory?.articles.filter((article) => article.published === true).length ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">{exactArticleSeoCount} exact SEO records</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Product data issues</p>
              <p className={`mt-1 text-2xl font-bold ${productIssues.length ? "text-amber-600" : "text-emerald-600"}`}>{productIssues.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Missing slug, description, image, brand/category, or valid in-stock price</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Blog data issues</p>
              <p className={`mt-1 text-2xl font-bold ${articleIssues.length ? "text-amber-600" : "text-emerald-600"}`}>{articleIssues.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Missing metadata, image, author, slug, or content</p>
            </div>
          </div>

          {(productIssues.length > 0 || articleIssues.length > 0) && (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead>Missing or invalid</TableHead>
                    <TableHead className="text-right">Open editor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productIssues.slice(0, 20).map((product) => {
                    const issues = [
                      !product.slug && "slug",
                      !product.description && "description",
                      !product.image && "image",
                      !product.brand && "brand",
                      !product.category && "category",
                      product.in_stock === true && (!product.price_value || product.price_value <= 0) && "price",
                    ].filter(Boolean).join(", ");
                    return (
                      <TableRow key={`product-${product.id}`}>
                        <TableCell><Badge variant="outline">Product</Badge></TableCell>
                        <TableCell className="max-w-[360px] truncate">{product.name}</TableCell>
                        <TableCell className="text-sm text-amber-700">{issues}</TableCell>
                        <TableCell className="text-right">
                          <a href="/suadmin/products"><Button variant="ghost" size="sm">Products</Button></a>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {articleIssues.slice(0, 20).map((article) => {
                    const issues = [
                      !article.slug && "slug",
                      !article.meta_title && "meta title",
                      !article.meta_description && "meta description",
                      !(article.og_image || article.image) && "image",
                      !article.author && "author",
                      !article.content && "content",
                    ].filter(Boolean).join(", ");
                    return (
                      <TableRow key={`article-${article.id}`}>
                        <TableCell><Badge variant="secondary">Blog</Badge></TableCell>
                        <TableCell className="max-w-[360px] truncate">{article.title}</TableCell>
                        <TableCell className="text-sm text-amber-700">{issues}</TableCell>
                        <TableCell className="text-right">
                          <a href="/suadmin/articles"><Button variant="ghost" size="sm">Articles</Button></a>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {(productIssues.length + articleIssues.length) > 40 && (
                <p className="border-t p-3 text-xs text-muted-foreground">
                  Showing the first 40 issues. Fix records in Product Manager or Article Manager, then refresh this page.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Edit Page SEO</CardTitle>
            <CardDescription>Static route defaults plus optional exact-path overrides for product, store, article, and listing pages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Route</Label>
                <Select value={routeKey} onValueChange={handleRouteChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEO_PAGE_CONFIGS.map((config) => (
                      <SelectItem key={config.route_key} value={config.route_key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Canonical path</Label>
                <Input value={path} onChange={(event) => setPath(event.target.value)} placeholder="/product/example-slug" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Meta title</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={70} />
              <p className="text-xs text-muted-foreground">{title.length}/70 characters</p>
            </div>
            <div className="space-y-2">
              <Label>Meta description</Label>
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={180} rows={4} />
              <p className="text-xs text-muted-foreground">{description.length}/180 characters</p>
            </div>
            <div className="space-y-2">
              <Label>Keywords</Label>
              <Input value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="comma, separated, keywords" />
            </div>
            <div className="space-y-2">
              <Label>Open Graph image</Label>
              <Input value={ogImage} onChange={(event) => setOgImage(event.target.value)} placeholder="/og-image.png or https://..." />
            </div>
            <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label>Active override</Label>
                  <p className="text-xs text-muted-foreground">Allow this SEO row to override page defaults.</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label>Noindex</Label>
                  <p className="text-xs text-muted-foreground">Hide duplicate, draft, or temporary pages from search.</p>
                </div>
                <Switch checked={noindex} onCheckedChange={setNoindex} />
              </div>
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save SEO
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Search className="h-4 w-4" /> Google Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-card p-4 text-left">
                <div className="text-sm text-green-700">{absoluteUrl(path)}</div>
                <div className="mt-1 text-xl text-blue-700">{interpolateSeoTemplate(snippetTitle, { brand: "Samsung", name: "iPhone 15", title: "Tech News" })}</div>
                <p className="mt-1 text-sm text-slate-700">{interpolateSeoTemplate(snippetDescription, { brand: "Samsung", name: "iPhone 15", title: "Tech News" })}</p>
              </div>
              <div className="space-y-2">
                {auditChecks.map((check) => (
                  <div key={check.label} className="flex items-start gap-2 text-sm">
                    {check.passed ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    )}
                    <div>
                      <div className="font-medium">{check.label}</div>
                      {!check.passed ? <div className="text-xs text-muted-foreground">{check.hint}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Missing SEO</CardTitle>
              <CardDescription>Important route templates without a title, description, or OG image.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {missingSeo.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" /> All important pages have SEO defaults.</div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    disabled={seedDefaultsMutation.isPending}
                    onClick={() => seedDefaultsMutation.mutate()}
                  >
                    {seedDefaultsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Seed Missing SEO Defaults
                  </Button>
                  {missingSeo.map((item) => (
                    <div key={item.route_key} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <span>{item.label}</span>
                      <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Missing</Badge>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sitemap and Crawl Files</CardTitle>
          <CardDescription>Generated from public, verified, active, or published records only. Draft listings and unpublished articles/guides are excluded.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">{sitemapRows?.length ?? 0} URLs</Badge>
            <a href="/sitemap.xml" target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-2"><ExternalLink className="h-4 w-4" /> Open sitemap</Button>
            </a>
            {sitemapXml && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => navigator.clipboard.writeText(sitemapXml)}>
                <Download className="h-4 w-4" /> Copy XML
              </Button>
            )}
            <a href="/robots.txt" target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-2"><ExternalLink className="h-4 w-4" /> Robots</Button>
            </a>
            <a href="/llms.txt" target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-2"><ExternalLink className="h-4 w-4" /> LLMs</Button>
            </a>
            <Select value={sitemapSource} onValueChange={setSitemapSource}>
              <SelectTrigger className="h-9 w-[190px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {sitemapSourceOptions.map((source) => (
                  <SelectItem key={source} value={source}>{getSourceLabel(source)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSitemapRows.slice(0, 60).map((row) => (
                  <TableRow key={`${row.source_type}-${row.loc}`}>
                    <TableCell className="max-w-[520px] truncate font-mono text-xs">{row.loc}</TableCell>
                    <TableCell><Badge variant="outline">{getSourceLabel(row.source_type)}</Badge></TableCell>
                    <TableCell>{row.priority.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
                {!pagesLoading && filteredSitemapRows.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">No sitemap URLs generated yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved SEO Pages</CardTitle>
          <CardDescription>Review active overrides, edit exact paths, and find duplicates or noindex pages before they affect search.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={pageSearch}
              onChange={(event) => setPageSearch(event.target.value)}
              placeholder="Search path, title, or route..."
            />
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Path</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Keywords</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPages.slice(0, 80).map((row) => (
                  <TableRow key={row.path}>
                    <TableCell className="max-w-[280px] truncate font-mono text-xs">{row.path}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={row.is_active === false ? "secondary" : "outline"}>{row.is_active === false ? "Inactive" : "Active"}</Badge>
                        {row.noindex ? <Badge variant="destructive">Noindex</Badge> : <Badge variant="secondary">Index</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[360px] truncate">{row.title || "Untitled"}</TableCell>
                    <TableCell>{keywordCount(row.keywords)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => loadPageRow(row)}>Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!pagesLoading && filteredPages.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No SEO rows found.</TableCell></TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keyword Clusters and Blog Plan</CardTitle>
          <CardDescription>
            Use these clusters from the uploaded keyword files to create focused pages and posts. Google will not reward keyword stuffing, so each page gets one clear intent, schema, and internal links.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {["all", "price", "local", "category", "comparison", "support"].map((intent) => (
              <Button
                key={intent}
                variant={clusterIntent === intent ? "default" : "outline"}
                size="sm"
                onClick={() => setClusterIntent(intent)}
              >
                {intent === "all" ? "All" : intent}
              </Button>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredClusters.map((cluster) => (
              <div key={cluster.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{cluster.name}</h3>
                      <Badge variant={clusterBadgeVariant(cluster.priority)}>{cluster.priority}</Badge>
                      <Badge variant="outline">{cluster.intent}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{cluster.primaryKeyword}</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => applyClusterToEditor(cluster)}>
                    <Save className="h-4 w-4" /> Load SEO
                  </Button>
                </div>

                <p className="mt-4 text-sm leading-6 text-muted-foreground">{cluster.contentAngle}</p>

                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Target page</div>
                  <a href={cluster.targetPath} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" /> {cluster.targetPath}
                  </a>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Keywords</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {cluster.keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="font-normal">{keyword}</Badge>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Related posts to publish</div>
                  {cluster.articleIdeas.map((idea) => (
                    <div key={idea.slug} className="rounded-md border bg-background p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{idea.title}</span>
                        <Badge variant="outline">{idea.category}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{idea.brief}</p>
                      <div className="mt-2 font-mono text-xs text-muted-foreground">/stores/article/{idea.slug}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Internal links</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {cluster.internalLinks.map((link) => (
                      <a
                        key={`${cluster.id}-${link.href}`}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs hover:bg-muted"
                      >
                        <Link2 className="h-3 w-3" /> {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <h3 className="font-semibold">Rules for first-page quality</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {seoContentRules.map((rule) => (
                <div key={rule} className="flex gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AEO Content Quality Auditor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            AEO Content Quality Checklist
          </CardTitle>
          <CardDescription>
            Answer Engine Optimization signals for Google AI Overviews, ChatGPT, Perplexity, and voice search citation. Fix Critical issues before publishing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-3 text-sm font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Required (Critical — fix before publish)
              </h4>
              <div className="space-y-2">
                {seoAeoSignals.required.map((signal) => (
                  <div key={signal} className="flex gap-2 items-start rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <span>{signal}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-amber-600 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Recommended (Important — improves score)
              </h4>
              <div className="space-y-2">
                {seoAeoSignals.recommended.map((signal) => (
                  <div key={signal} className="flex gap-2 items-start rounded-md border p-3 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span>{signal}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
            <p className="font-medium">AEO Scoring Guide</p>
            <div className="grid gap-1 text-muted-foreground">
              <span>✅ 85–100 — Strong: ready for AI citation</span>
              <span>⚠️ 70–84 — Acceptable: fix recommended signals</span>
              <span>🔶 50–69 — Weak: fix Critical issues first</span>
              <span>❌ 0–49 — Do not publish: missing too many AEO signals</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Snippet Hunter — Featured Snippet Targets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Snippet Hunter — Position Zero Targets
          </CardTitle>
          <CardDescription>
            Priority questions for featured snippet capture. Format each with a 40–60 word direct answer immediately under a question header (H2/H3).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {seoAeoSignals.snippetTargets.map((target) => (
              <div key={target.question} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{target.question}</p>
                  <Badge variant="outline" className="shrink-0">{target.format}</Badge>
                </div>
                <div className="text-xs text-muted-foreground font-mono">{target.targetPath}</div>
                <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                  {target.format === "paragraph" && (
                    <>
                      <p className="font-semibold text-foreground">Format: paragraph snippet (40–60 words)</p>
                      <p>Write a direct answer in the first sentence. Include the primary keyword. No fluff. Immediately follows the H2/H3 question header.</p>
                    </>
                  )}
                  {target.format === "list" && (
                    <>
                      <p className="font-semibold text-foreground">Format: list snippet (5–8 items)</p>
                      <p>Use numbered or bulleted list under the question header. Each item should be concise (5–10 words). Include a brief intro sentence before the list.</p>
                    </>
                  )}
                  {target.format === "table" && (
                    <>
                      <p className="font-semibold text-foreground">Format: table snippet</p>
                      <p>Use a 2–4 column comparison table. Label columns clearly. Keep cells short. Include a header row with keywords.</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SEO Content Writer — Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-500" />
            SEO Content Writer — Page Templates
          </CardTitle>
          <CardDescription>
            Ready-to-use content blueprints for high-priority keyword targets. Each template includes TL;DR block, FAQ schema, and internal links.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {[
            {
              title: "iPhone Store Nepal — Apple Price Page",
              path: "/cat/mobiles/apple",
              tldr: "Tamrakar Complex is Nepal's leading destination to buy genuine iPhones. Check verified iPhone 15 and iPhone 16 prices, EMI plans, and repair services at New Road, Kathmandu.",
              h1: "iPhone Price in Nepal 2026 | Buy iPhone at Tamrakar Complex",
              metaTitle: "iPhone Price in Nepal 2026 | Genuine Apple Store Kathmandu",
              metaDesc: "Check iPhone 15 and iPhone 16 price in Nepal with EMI, warranty, and in-store availability at Tamrakar Complex New Road, Kathmandu. Updated 2026.",
              schema: "Product, FAQPage, BreadcrumbList, LocalBusiness",
              faqs: [
                "Where can I buy an iPhone in Nepal with genuine warranty?",
                "What is the iPhone 16 price in Nepal?",
                "Is there an Apple Store in Nepal?",
                "Can I get an iPhone on EMI in Nepal?",
              ],
            },
            {
              title: "Tamrakar Complex Location — Local SEO Page",
              path: "/stores",
              tldr: "Tamrakar Complex is located at New Road, Kathmandu and is Nepal's largest mobile and electronics shopping hub with 80+ verified stores.",
              h1: "Tamrakar Complex New Road Kathmandu | Nepal's Mobile Hub",
              metaTitle: "Tamrakar Complex New Road Kathmandu — Mobile & Electronics Market",
              metaDesc: "Visit Tamrakar Complex at New Road, Kathmandu for iPhones, Samsung, laptops, repair, and 80+ verified electronics stores. Open Sun–Fri 10 AM–7 PM.",
              schema: "LocalBusiness, GeoCoordinates, FAQPage, BreadcrumbList",
              faqs: [
                "Where is Tamrakar Complex located?",
                "What are Tamrakar Complex opening hours?",
                "What can I buy at Tamrakar Complex?",
                "How do I get to Tamrakar Complex from Ratna Park?",
              ],
            },
            {
              title: "Mobile Price in Nepal — Pillar Price Page",
              path: "/cat/mobiles",
              tldr: "Check the latest mobile phone prices in Nepal for 2026 including Samsung, iPhone, Xiaomi, Realme, and OnePlus from verified Tamrakar Complex stores.",
              h1: "Mobile Price in Nepal 2026 | Latest Phone Price List",
              metaTitle: "Mobile Price in Nepal 2026 | Compare All Brands at Tamrakar Complex",
              metaDesc: "Updated mobile price list for Nepal 2026. Compare Samsung, iPhone, Xiaomi, Realme, OnePlus prices with specs, EMI, and store availability.",
              schema: "ItemList, FAQPage, BreadcrumbList",
              faqs: [
                "Where can I check mobile price in Nepal?",
                "Which mobile brands are available in Nepal?",
                "What is the best phone under 30000 in Nepal?",
                "Can I buy a phone on EMI at Tamrakar Complex?",
              ],
            },
          ].map((template) => (
            <div key={template.path} className="rounded-lg border p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{template.title}</h3>
                  <p className="text-xs font-mono text-muted-foreground mt-1">{template.path}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 shrink-0"
                  onClick={() => {
                    setRouteKey(template.path);
                    setPath(template.path);
                    setTitle(template.metaTitle);
                    setDescription(template.metaDesc);
                    setKeywords(template.faqs.join(", "));
                    setOgImage(DEFAULT_OG_IMAGE);
                    setNoindex(false);
                    setIsActive(true);
                    toast.success(`Loaded template: ${template.title}`);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <Save className="h-4 w-4" /> Load to Editor
                </Button>
              </div>
              <div className="rounded-md bg-blue-500/5 border border-blue-500/20 p-3 text-sm">
                <p className="text-xs font-semibold text-blue-600 mb-1">TL;DR block (place after H1)</p>
                <p className="text-muted-foreground italic">"{template.tldr}"</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">H1 title</p>
                  <p className="font-medium">{template.h1}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Schema types</p>
                  <p className="text-muted-foreground">{template.schema}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">FAQ targets (PAA + FAQPage schema)</p>
                <div className="grid gap-1">
                  {template.faqs.map((faq) => (
                    <div key={faq} className="flex gap-2 text-sm text-muted-foreground">
                      <Search className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{faq}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Multi-Platform SEO Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-purple-500" />
            Multi-Platform Ranking Checklist
          </CardTitle>
          <CardDescription>
            Rank on Google, Bing, AI engines (ChatGPT, Perplexity, Gemini), voice search, and Google Maps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                platform: "Google Search",
                color: "text-blue-600",
                checks: [
                  "Title 30–70 chars with primary keyword",
                  "Meta description 80–160 chars with CTA",
                  "Canonical URL on every page",
                  "Sitemap submitted to Search Console",
                  "Core Web Vitals: LCP < 2.5s, CLS < 0.1",
                  "Structured data (Schema.org) per page type",
                  "Internal links from pillar to supporting pages",
                ],
              },
              {
                platform: "Google Maps / Local",
                color: "text-green-600",
                checks: [
                  "Google Business Profile verified",
                  "NAP consistent (Name, Address, Phone)",
                  "LocalBusiness schema with GeoCoordinates",
                  "Opening hours in schema and page content",
                  "Embed map on store/contact page",
                  "Customer reviews requested and responded to",
                  "Photos uploaded to GBP listing",
                ],
              },
              {
                platform: "AI Engines (ChatGPT, Perplexity, Gemini)",
                color: "text-amber-600",
                checks: [
                  "TL;DR block after every H1",
                  "FAQ section with 4+ direct-answer pairs",
                  "Definition sentence for primary keyword",
                  "FAQPage schema markup",
                  "llms.txt file at /llms.txt",
                  "ClaudeBot and GPTBot allowed in robots.txt",
                  "Short, extractable paragraph answers (40–60 words)",
                ],
              },
              {
                platform: "Bing / DuckDuckGo",
                color: "text-sky-600",
                checks: [
                  "Sitemap submitted to Bing Webmaster Tools",
                  "BingBot allowed in robots.txt",
                  "Open Graph tags complete",
                  "Twitter Card meta tags present",
                  "Clear author and date on articles",
                  "HTTPS with valid SSL",
                ],
              },
              {
                platform: "Voice Search",
                color: "text-purple-600",
                checks: [
                  "Question-based H2/H3 headers",
                  "Conversational 40–60 word answers",
                  "Speakable schema on key answer blocks",
                  "Local info: address, hours, phone in content",
                  "Mobile page speed < 3s",
                  "Structured FAQ content for voice extraction",
                ],
              },
              {
                platform: "Social / Sharing",
                color: "text-pink-600",
                checks: [
                  "og:title, og:description, og:image set",
                  "Twitter card: summary_large_image",
                  "OG image is 1200×630px",
                  "Brand name in og:site_name",
                  "Shareable URL (no tracking params in canonical)",
                ],
              },
            ].map((platform) => (
              <div key={platform.platform} className="rounded-lg border p-4 space-y-3">
                <h4 className={`font-semibold text-sm ${platform.color}`}>{platform.platform}</h4>
                <div className="space-y-1.5">
                  {platform.checks.map((check) => (
                    <div key={check} className="flex gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{check}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
