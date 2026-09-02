import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { assertAllowedOrigin, getCorsHeaders } from "../_shared/cors.ts";

const BRAND_NAMES = ["Apple", "Asus", "Dell", "Google", "Honor", "Huawei", "Infinix", "Lenovo", "Motorola", "Nokia", "Nothing", "OnePlus", "Oppo", "Poco", "Realme", "Samsung", "Sony", "Tecno", "Vivo", "Xiaomi", "ZTE"] as const;
const ALLOWED_BRANDS = new Map(BRAND_NAMES.map((brand) => [brand.toLowerCase(), brand]));
const headers = (req: Request) => ({ ...getCorsHeaders(req), "Content-Type": "application/json" });

function jwtSubject(value: string | null) {
  try {
    const token = value?.replace("Bearer ", "").trim() || "";
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return (JSON.parse(atob(payload.padEnd(payload.length + ((4 - payload.length % 4) % 4), "="))) as { sub?: string }).sub || null;
  } catch { return null; }
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: headers(req) });
  try {
    assertAllowedOrigin(req);
    const userId = jwtSubject(req.headers.get("Authorization"));
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: headers(req) });
    const url = Deno.env.get("SUPABASE_URL") || "";
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const admin = createClient(url, key);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "suadmin");
    if (!roles?.length) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: headers(req) });
    const { apply = false } = await req.json().catch(() => ({}));
    const { data, error } = await admin.from("products").select("id,name,slug,brand,price,price_value,source_site,in_stock,description,image,specs,updated_at,created_at").limit(10000);
    if (error) throw error;

    type ProductRow = NonNullable<typeof data>[number];
    const invalidIds: string[] = [];
    const candidates: ProductRow[] = [];
    const normalizations: Array<{ id: string; brand: string; price: string; price_value: number }> = [];
    for (const row of data || []) {
      const brand = ALLOWED_BRANDS.get((row.brand || "").trim().toLowerCase());
      const priceValue = Math.round(Number(row.price_value || String(row.price || "").replace(/[^0-9.]/g, "")));
      const isMock = (row.source_site || "").toLowerCase().includes("mock");
      if (!brand || !row.name?.trim() || !Number.isFinite(priceValue) || priceValue <= 0 || isMock) {
        invalidIds.push(row.id);
        continue;
      }
      candidates.push(row);
      const formattedPrice = `Rs. ${priceValue.toLocaleString("en-IN")}`;
      if (row.brand !== brand || row.price !== formattedPrice || Number(row.price_value) !== priceValue) {
        normalizations.push({ id: row.id, brand, price: formattedPrice, price_value: priceValue });
      }
    }

    const groups = new Map<string, ProductRow[]>();
    for (const row of candidates) {
      const key = `${normalize(row.brand || "")}|${normalize(row.name)}`;
      groups.set(key, [...(groups.get(key) || []), row]);
    }
    const duplicateIds: string[] = [];
    for (const rows of groups.values()) {
      rows.sort((a, b) => {
        const score = (row: ProductRow) => ((row.source_site && !row.source_site.includes("mock")) ? 100 : 0) + (row.in_stock ? 20 : 0) + (row.description ? 5 : 0) + (row.image ? 3 : 0);
        return score(b) - score(a) || String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at));
      });
      duplicateIds.push(...rows.slice(1).map((row) => row.id));
    }

    const removeIds = [...new Set([...invalidIds, ...duplicateIds])];
    if (apply) {
      for (let index = 0; index < removeIds.length; index += 500) {
        const { error: deleteError } = await admin.from("products").delete().in("id", removeIds.slice(index, index + 500));
        if (deleteError) throw deleteError;
      }
      for (let index = 0; index < normalizations.length; index += 20) {
        await Promise.all(normalizations.slice(index, index + 20).map((update) => admin.from("products").update(update).eq("id", update.id)));
      }
    }

    return new Response(JSON.stringify({ apply, scanned: data?.length || 0, invalid: invalidIds.length, duplicates: duplicateIds.length, removed: apply ? removeIds.length : 0, normalized: apply ? normalizations.length : 0, remaining: (data?.length || 0) - removeIds.length, allowed_brands: BRAND_NAMES }), { headers: headers(req) });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message || "Cleanup failed" }), { status: 500, headers: headers(req) });
  }
});
