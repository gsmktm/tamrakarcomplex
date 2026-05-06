import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildXmlResponse(req: Request, body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": status === 200 ? "public, max-age=900, s-maxage=900" : "no-store",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { ...getCorsHeaders(req), Allow: "GET, HEAD, OPTIONS" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return buildXmlResponse(req, "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!-- Sitemap generation failed: missing Supabase environment -->", 500);
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase.rpc("generate_seo_sitemap");
  if (error) {
    return buildXmlResponse(req, `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Sitemap generation failed: ${escapeXml(error.message)} -->`, 500);
  }

  const urls = (data ?? []).map((row: { loc: string; lastmod?: string | null; changefreq?: string; priority?: number }) => {
    const lastmod = row.lastmod ? `<lastmod>${new Date(row.lastmod).toISOString()}</lastmod>` : "";
    const changefreq = row.changefreq ? `<changefreq>${escapeXml(row.changefreq)}</changefreq>` : "";
    const priorityValue = Number(row.priority);
    const priority = Number.isFinite(priorityValue) ? `<priority>${priorityValue.toFixed(1)}</priority>` : "";
    return `  <url><loc>${escapeXml(row.loc)}</loc>${lastmod}${changefreq}${priority}</url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

  return new Response(req.method === "HEAD" ? null : xml, {
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=900",
    },
  });
});
