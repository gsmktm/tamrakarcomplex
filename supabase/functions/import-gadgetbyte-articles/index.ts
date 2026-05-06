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
    .replace(/-review$/i, "")
    .replace(/-guide$/i, "")
    .replace(/-comparison$/i, "");
  const words = cleaned.split("-").filter(Boolean);
  return words
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

function categoryFromUrl(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("review")) return "review";
  if (u.includes("comparison")) return "comparison";
  if (u.includes("guide")) return "guide";
  if (u.includes("price")) return "price";
  if (u.includes("laptop")) return "laptop";
  if (u.includes("mobile")) return "mobile";
  if (u.includes("tablet")) return "tablet";
  if (u.includes("audio") || u.includes("earbud") || u.includes("headphone")) return "audio";
  if (u.includes("watch")) return "watch";
  if (u.includes("gaming")) return "gaming";
  return "news";
}

function categoryLabel(category: string): string {
  return category.length ? category[0].toUpperCase() + category.slice(1) : "News";
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
    const url = sitemapUrl?.trim() || "https://www.gadgetbytenepal.com/sitemaps/posts.xml";
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
        .eq("module_key", "content")
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

    const articles = parsed
      .map(({ loc, image }) => {
        let pathname = "";
        try {
          pathname = new URL(loc).pathname;
        } catch {
          return null;
        }
        const slug = pathname.replace(/\/+$/, "").split("/").filter(Boolean).pop();
        if (!slug) return null;

        const category = categoryFromUrl(loc);
        return {
          slug,
          title: titleCaseFromSlug(slug),
          excerpt: null,
          content: null,
          image,
          category,
          category_label: categoryLabel(category),
          author: "GadgetByte Nepal",
          read_time: "5 min read",
          featured: false,
          published: true,
          views: 0,
          source_url: loc,
          source_site: "gadgetbytenepal.com",
        };
      })
      .filter((a): a is NonNullable<typeof a> => !!a);

    const uniqueBySlug = new Map<string, (typeof articles)[number]>();
    for (const a of articles) uniqueBySlug.set(a.slug, a);
    const uniqueArticles = Array.from(uniqueBySlug.values());

    const slugs = uniqueArticles.map((a) => a.slug);
    const existing = new Set<string>();

    for (let i = 0; i < slugs.length; i += 500) {
      const chunk = slugs.slice(i, i + 500);
      const { data: rows, error } = await admin.from("articles").select("slug").in("slug", chunk);
      if (error) throw error;
      for (const row of rows ?? []) {
        if (row.slug) existing.add(row.slug);
      }
    }

    const toInsert = uniqueArticles.filter((a) => !existing.has(a.slug));
    if (toInsert.length > 0) {
      const { error } = await admin.from("articles").insert(toInsert);
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({
        sitemapUrl: url,
        parsed: uniqueArticles.length,
        inserted: toInsert.length,
        skipped: uniqueArticles.length - toInsert.length,
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
