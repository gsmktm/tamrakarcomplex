import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { assertAllowedOrigin, getCorsHeaders } from "../_shared/cors.ts";

const jsonHeaders = (req: Request) => ({ ...getCorsHeaders(req), "Content-Type": "application/json" });

type ImportRequest = {
  sitemapUrl?: string;
  limit?: number;
  priceOnly?: boolean;
  brandFilter?: string;
  updateMode?: "upsert" | "priceOnly";
};

type JsonLdProduct = {
  "@type"?: string;
  name?: string;
  image?: string | string[];
  description?: string;
  brand?: { name?: string } | string;
  offers?: { price?: string | number; priceCurrency?: string; availability?: string } | Array<{ price?: string | number; priceCurrency?: string; availability?: string }>;
  additionalProperty?: Array<{ name?: string; value?: string }>;
};

function getJwtUserId(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const token = authorizationHeader.replace("Bearer ", "").trim();
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;

  const payload = parts[1];
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const json = atob(padded);
  const parsed = JSON.parse(json) as { sub?: string; email?: string };
  return parsed.sub ?? null;
}

function categoryFromProduct(name: string, url: string): string {
  const u = `${name} ${url}`.toLowerCase();
  if (u.includes("laptop")) return "Laptops";
  if (u.includes("tablet")) return "Tablets";
  if (u.includes("watch")) return "Smartwatches";
  if (u.includes("earbud") || u.includes("tws") || u.includes("headphone")) return "Earbuds";
  if (u.includes("camera")) return "Cameras";
  if (u.includes("gaming") || u.includes("console")) return "Gaming";
  if (u.includes("accessor")) return "Accessories";
  return "Smartphones";
}

function parseSitemap(xml: string) {
  const urlBlocks = Array.from(xml.matchAll(/<url>([\s\S]*?)<\/url>/g)).map((m) => m[1]);
  const entries = urlBlocks
    .map((block) => {
      const locMatch = block.match(/<loc>(.*?)<\/loc>/);
      const loc = locMatch?.[1]?.trim();
      const imageMatch = block.match(/<image:loc>(.*?)<\/image:loc>/);
      const image = imageMatch?.[1]?.trim();
      if (!loc) return null;
      return { loc, image: image || null };
    })
    .filter((e): e is { loc: string; image: string | null } => !!e);

  if (entries.length > 0) return entries;

  return Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g))
    .map((m) => m[1]?.trim())
    .filter((loc): loc is string => !!loc)
    .map((loc) => ({ loc, image: null }));
}

function parseProductJsonLd(html: string): JsonLdProduct | null {
  const scripts = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script[1]);
      const nodes = Array.isArray(parsed) ? parsed : parsed?.["@graph"] || [parsed];
      const product = nodes.find((node: JsonLdProduct) => node?.["@type"] === "Product");
      if (product) return product;
    } catch {
      // Ignore malformed structured-data blocks and try the next block.
    }
  }
  return null;
}

function slugMatchesBrand(slug: string, name: string, brand: string): boolean {
  if (!brand) return true;
  const b = brand.toLowerCase();
  return `${slug} ${name}`.toLowerCase().includes(b);
}

async function fetchStructuredProduct(entry: { loc: string; image: string | null }) {
  const response = await fetch(entry.loc, {
    headers: { "User-Agent": "tamrakar-complex-catalog-sync/2.0", Accept: "text/html,application/xhtml+xml" },
  });
  if (!response.ok) throw new Error(`Product page returned ${response.status}`);
  const html = await response.text();
  const product = parseProductJsonLd(html);
  if (!product?.name) throw new Error("Product structured data is missing");

  const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
  const priceValue = Math.round(Number(offer?.price));
  if (!Number.isFinite(priceValue) || priceValue <= 0 || (offer?.priceCurrency && offer.priceCurrency !== "NPR")) {
    throw new Error("Valid NPR price is missing");
  }

  const pathname = new URL(entry.loc).pathname;
  const slug = pathname.replace(/\/+$/, "").split("/").filter(Boolean).pop();
  if (!slug) throw new Error("Product slug is missing");
  const brand = typeof product.brand === "string" ? product.brand : product.brand?.name || "";
  const image = Array.isArray(product.image) ? product.image[0] : product.image || entry.image;
  const specs = Object.fromEntries(
    (product.additionalProperty || [])
      .filter((property) => property.name && property.value)
      .map((property) => [property.name as string, property.value as string]),
  );

  const inStock = String(offer?.availability || "").toLowerCase().endsWith("instock");

  return {
    slug,
    name: product.name.trim(),
    brand: brand.trim() || null,
    category: categoryFromProduct(product.name, entry.loc),
    price: `Rs. ${priceValue.toLocaleString("en-IN")}`,
    price_value: priceValue,
    image: image || null,
    specs: Object.keys(specs).length ? { "Key specifications": specs } : null,
    description: `${product.name.trim()} Nepal price, availability, and specifications reference. Confirm the final variant and seller offer before purchase.`,
    source_url: entry.loc,
    source_site: "gadgetbytenepal.com",
    featured: false,
    in_stock: inStock,
    updated_at: new Date().toISOString(),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders(req),
    });
  }

  try {
    assertAllowedOrigin(req);
    const authorization = req.headers.get("Authorization");
    const userId = getJwtUserId(authorization);

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: jsonHeaders(req),
      });
    }

    const { sitemapUrl, limit, priceOnly, brandFilter, updateMode }: ImportRequest = await req.json().catch(() => ({}));
    const url = sitemapUrl?.trim() || "https://www.gadgetbytenepal.com/sitemaps/products.xml";
    const max = Math.min(Math.max(Number(limit ?? 50), 1), 500);
    const priceMode = priceOnly === true || updateMode === "priceOnly";
    const brand = brandFilter?.trim() || "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: jsonHeaders(req),
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles, error: roleError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["suadmin", "staffadmin"])
      .limit(1);

    const isStaff = roles?.some((row) => row.role === "staffadmin");
    if (roleError || !roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: jsonHeaders(req),
      });
    }
    if (isStaff) {
      const { data: perms } = await admin
        .from("staffadmin_permissions")
        .select("can_create, can_edit")
        .eq("user_id", userId)
        .eq("module_key", "price_list")
        .maybeSingle();
      const canDo = priceMode ? perms?.can_edit : perms?.can_create;
      if (!canDo) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: jsonHeaders(req),
        });
      }
    }

    const sitemapRes = await fetch(url, {
      headers: {
        "User-Agent": "tamrakar-complex-importer/1.0",
        Accept: "application/xml,text/xml,*/*",
      },
    });

    if (!sitemapRes.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch sitemap: ${sitemapRes.status}` }), {
        status: 502,
        headers: jsonHeaders(req),
      });
    }

    const xml = await sitemapRes.text();
    let parsedSitemap = parseSitemap(xml);

    if (brand) {
      parsedSitemap = parsedSitemap.filter((e) => {
        const pathname = new URL(e.loc).pathname.toLowerCase();
        return pathname.includes(brand.toLowerCase().replace(/\s+/g, "-"));
      });
    }
    parsedSitemap = parsedSitemap.slice(0, max);

    const products: Awaited<ReturnType<typeof fetchStructuredProduct>>[] = [];
    const failures: Array<{ url: string; error: string }> = [];
    for (let index = 0; index < parsedSitemap.length; index += 5) {
      const batch = parsedSitemap.slice(index, index + 5);
      const results = await Promise.allSettled(batch.map(fetchStructuredProduct));
      results.forEach((result, batchIndex) => {
        if (result.status === "fulfilled") {
          const p = result.value;
          if (brand && !slugMatchesBrand(p.slug, p.name, p.brand || brand)) return;
          products.push(p);
        } else {
          failures.push({ url: batch[batchIndex].loc, error: result.reason?.message || "Parse failed" });
        }
      });
    }

    const uniqueBySlug = new Map<string, (typeof products)[number]>();
    for (const p of products) uniqueBySlug.set(p.slug, p);
    const allSynced = Array.from(uniqueBySlug.values());

    let synced = 0;
    let updatedPrices = 0;
    let skippedNewProducts = 0;

    if (priceMode) {
      const slugs = allSynced.map((product) => product.slug);
      const existingBySlug = new Map<string, string>();
      for (let index = 0; index < slugs.length; index += 200) {
        const { data: rows, error } = await admin
          .from("products")
          .select("id, slug")
          .in("slug", slugs.slice(index, index + 200));
        if (error) throw error;
        for (const row of rows || []) {
          if (row.slug) existingBySlug.set(row.slug, row.id);
        }
      }

      const toUpdate = allSynced.filter((product) => existingBySlug.has(product.slug));
      skippedNewProducts = allSynced.length - toUpdate.length;

      // Use UPDATE statements instead of partial upserts: a partial insert can fail
      // required-column checks before PostgreSQL resolves the slug conflict.
      for (let index = 0; index < toUpdate.length; index += 10) {
        const results = await Promise.all(
          toUpdate.slice(index, index + 10).map(async (product) => {
            const { error } = await admin
              .from("products")
              .update({
                price: product.price,
                price_value: product.price_value,
                in_stock: product.in_stock,
                updated_at: product.updated_at,
                source_url: product.source_url,
                source_site: product.source_site,
              })
              .eq("id", existingBySlug.get(product.slug) as string);
            if (error) throw error;
          }),
        );
        updatedPrices += results.length;
      }
      synced = updatedPrices;
    } else {
      const { error: upsertError } = await admin.from("products").upsert(allSynced, { onConflict: "slug" });
      if (upsertError) throw upsertError;
      synced = allSynced.length;
    }

    return new Response(
      JSON.stringify({
        sitemapUrl: url,
        mode: priceMode ? "price" : "full",
        brandFilter: brand || null,
        parsed: allSynced.length,
        synced,
        updatedPrices,
        skippedNewProducts,
        failed: failures.length,
        failures: failures.slice(0, 20),
      }),
      { headers: jsonHeaders(req) },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message ?? "Unknown error" }), {
        status: 500,
        headers: jsonHeaders(req),
      });
  }
});
