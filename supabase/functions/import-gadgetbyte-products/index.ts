import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { assertAllowedOrigin, getCorsHeaders } from "../_shared/cors.ts";

const jsonHeaders = (req: Request) => ({ ...getCorsHeaders(req), "Content-Type": "application/json" });

type ImportRequest = {
  sitemapUrl?: string;
  limit?: number;
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

function titleCaseFromSlug(slug: string): string {
  const cleaned = slug
    .replace(/-price-in-nepal$/i, "")
    .replace(/-in-nepal$/i, "")
    .replace(/-price$/i, "")
    .replace(/-review$/i, "")
    .replace(/-news$/i, "");
  const words = cleaned.split("-").filter(Boolean);
  return words
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

function categoryFromUrl(url: string): string {
  const u = url.toLowerCase();
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

    const { sitemapUrl, limit }: ImportRequest = await req.json().catch(() => ({}));
    const url = sitemapUrl?.trim() || "https://www.gadgetbytenepal.com/sitemaps/products.xml";
    const max = Math.min(Math.max(Number(limit ?? 200), 1), 2000);

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
        .select("can_create")
        .eq("user_id", userId)
        .eq("module_key", "price_list")
        .maybeSingle();
      if (!perms?.can_create) {
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
    const parsed = parseSitemap(xml).slice(0, max);

    const products = parsed
      .map(({ loc, image }) => {
        let pathname = "";
        try {
          pathname = new URL(loc).pathname;
        } catch {
          return null;
        }
        const slug = pathname.replace(/\/+$/, "").split("/").filter(Boolean).pop();
        if (!slug) return null;

        return {
          slug,
          name: titleCaseFromSlug(slug),
          category: categoryFromUrl(loc),
          price: "N/A",
          image,
          source_url: loc,
          source_site: "gadgetbytenepal.com",
          featured: false,
          in_stock: true,
        };
      })
      .filter((p): p is NonNullable<typeof p> => !!p);

    const uniqueBySlug = new Map<string, (typeof products)[number]>();
    for (const p of products) uniqueBySlug.set(p.slug, p);
    const uniqueProducts = Array.from(uniqueBySlug.values());

    const slugs = uniqueProducts.map((p) => p.slug);
    const existing = new Set<string>();

    for (let i = 0; i < slugs.length; i += 500) {
      const chunk = slugs.slice(i, i + 500);
      const { data: rows, error } = await admin.from("products").select("slug").in("slug", chunk);
      if (error) throw error;
      for (const row of rows ?? []) {
        if (row.slug) existing.add(row.slug);
      }
    }

    const toInsert = uniqueProducts.filter((p) => !existing.has(p.slug));

    if (toInsert.length > 0) {
      const { error } = await admin.from("products").insert(toInsert);
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({
        sitemapUrl: url,
        parsed: uniqueProducts.length,
        inserted: toInsert.length,
        skipped: uniqueProducts.length - toInsert.length,
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
