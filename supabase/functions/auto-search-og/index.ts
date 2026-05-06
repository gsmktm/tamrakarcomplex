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

function fit(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data } = await supabase
    .from("auto_search_pages")
    .select("h1, meta_description, intent, quality_score")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  const title = fit(data?.h1 ?? "Tamrakar Complex Search", 76);
  const description = fit(data?.meta_description ?? "Real product, store, repair, price, and marketplace matches from TamrakarComplex.com.", 118);
  const intent = fit(data?.intent ?? "search", 18).toUpperCase();
  const quality = typeof data?.quality_score === "number" ? `${data.quality_score}/100` : "Live data";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="0.54" stop-color="#111827"/>
      <stop offset="1" stop-color="#7c2d12"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="56" y="54" width="1088" height="522" rx="28" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.18)"/>
  <text x="92" y="120" fill="#fbbf24" font-family="Inter,Arial,sans-serif" font-size="30" font-weight="700">TamrakarComplex.com</text>
  <text x="92" y="180" fill="#ffffff" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="700">${escapeXml(intent)} • ${escapeXml(quality)}</text>
  <text x="92" y="285" fill="#ffffff" font-family="Inter,Arial,sans-serif" font-size="58" font-weight="800">${escapeXml(title)}</text>
  <text x="92" y="360" fill="#d1d5db" font-family="Inter,Arial,sans-serif" font-size="28">${escapeXml(description)}</text>
  <text x="92" y="492" fill="#fde68a" font-family="Inter,Arial,sans-serif" font-size="26" font-weight="700">Products • Stores • Repair • Price • Marketplace</text>
  <circle cx="1028" cy="146" r="74" fill="rgba(251,191,36,0.18)" stroke="rgba(251,191,36,0.55)" stroke-width="3"/>
  <text x="984" y="160" fill="#fbbf24" font-family="Inter,Arial,sans-serif" font-size="46" font-weight="900">TC</text>
</svg>`;

  return new Response(svg, {
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=900",
    },
  });
});
