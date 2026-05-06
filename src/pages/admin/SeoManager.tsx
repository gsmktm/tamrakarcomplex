import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Download, ExternalLink, Loader2, RefreshCw, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SEO_PAGE_CONFIGS, absoluteUrl, interpolateSeoTemplate } from "@/lib/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

function splitKeywords(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function buildXml(rows: SitemapRow[]) {
  const body = rows
    .map((row) => {
      const lastmod = row.lastmod ? `<lastmod>${new Date(row.lastmod).toISOString()}</lastmod>` : "";
      return `  <url><loc>${row.loc}</loc>${lastmod}<changefreq>${row.changefreq}</changefreq><priority>${row.priority.toFixed(1)}</priority></url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

export default function SeoManager() {
  const queryClient = useQueryClient();
  const [routeKey, setRouteKey] = useState(SEO_PAGE_CONFIGS[0].route_key);
  const [path, setPath] = useState(SEO_PAGE_CONFIGS[0].route_key);
  const [title, setTitle] = useState(SEO_PAGE_CONFIGS[0].title);
  const [description, setDescription] = useState(SEO_PAGE_CONFIGS[0].description);
  const [keywords, setKeywords] = useState(SEO_PAGE_CONFIGS[0].keywords.join(", "));
  const [ogImage, setOgImage] = useState(SEO_PAGE_CONFIGS[0].og_image);
  const [sitemapXml, setSitemapXml] = useState("");

  const { data: pages, isLoading: pagesLoading } = useQuery({
    queryKey: ["seo-pages-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_pages")
        .select("*")
        .order("route_key", { ascending: true })
        .order("path", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SeoPageRow[];
    },
  });

  const { data: sitemapRows, isLoading: sitemapLoading, refetch: refetchSitemap } = useQuery({
    queryKey: ["seo-sitemap-preview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("generate_seo_sitemap");
      if (error) throw error;
      return (data ?? []) as SitemapRow[];
    },
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        route_key: routeKey,
        path,
        title: title.trim(),
        description: description.trim(),
        keywords: splitKeywords(keywords),
        og_image: ogImage.trim() || null,
        is_active: true,
        noindex: false,
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

  const ensureDefaultSeoRows = async () => {
    const { data: existingRows, error: existingError } = await supabase
      .from("seo_pages")
      .select("path");
    if (existingError) throw existingError;

    const existingPaths = new Set((existingRows ?? []).map((row: { path: string }) => row.path));
    const missingDefaults = SEO_PAGE_CONFIGS
      .filter((config) => !existingPaths.has(config.route_key))
      .map((config) => ({
        route_key: config.route_key,
        path: config.route_key,
        title: config.title,
        description: config.description,
        keywords: config.keywords,
        og_image: config.og_image,
        is_active: true,
        noindex: false,
      }));

    if (missingDefaults.length === 0) return 0;

    const { error } = await supabase.from("seo_pages").insert(missingDefaults);
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ["seo-pages-admin"] });
    return missingDefaults.length;
  };

  const handleRouteChange = (value: string) => {
    const config = SEO_PAGE_CONFIGS.find((item) => item.route_key === value) ?? SEO_PAGE_CONFIGS[0];
    const existing = pages?.find((row) => row.route_key === config.route_key && row.path === config.route_key);
    setRouteKey(config.route_key);
    setPath(existing?.path || config.route_key);
    setTitle(existing?.title || config.title);
    setDescription(existing?.description || config.description);
    setKeywords(Array.isArray(existing?.keywords) ? existing.keywords.join(", ") : existing?.keywords || config.keywords.join(", "));
    setOgImage(existing?.og_image || config.og_image);
  };

  const generateSitemap = async () => {
    try {
      const insertedDefaults = await ensureDefaultSeoRows();
      const result = await refetchSitemap();
      const rows = result.data ?? sitemapRows ?? [];
      const xml = buildXml(rows);
      setSitemapXml(xml);
      toast.success(`Generated ${rows.length} sitemap URLs${insertedDefaults ? ` and seeded ${insertedDefaults} SEO defaults` : ""}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate sitemap");
    }
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
            <CardContent>
              <div className="rounded-lg border bg-white p-4 text-left">
                <div className="text-sm text-green-700">{absoluteUrl(path)}</div>
                <div className="mt-1 text-xl text-blue-700">{interpolateSeoTemplate(snippetTitle, { brand: "Samsung", name: "iPhone 15", title: "Tech News" })}</div>
                <p className="mt-1 text-sm text-slate-700">{interpolateSeoTemplate(snippetDescription, { brand: "Samsung", name: "iPhone 15", title: "Tech News" })}</p>
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
                missingSeo.map((item) => (
                  <div key={item.route_key} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <span>{item.label}</span>
                    <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Missing</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sitemap Coverage</CardTitle>
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
                {(sitemapRows ?? []).slice(0, 40).map((row) => (
                  <TableRow key={`${row.source_type}-${row.loc}`}>
                    <TableCell className="max-w-[520px] truncate font-mono text-xs">{row.loc}</TableCell>
                    <TableCell><Badge variant="outline">{row.source_type}</Badge></TableCell>
                    <TableCell>{row.priority.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
                {!pagesLoading && (sitemapRows?.length ?? 0) === 0 && (
                  <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">No sitemap URLs generated yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
