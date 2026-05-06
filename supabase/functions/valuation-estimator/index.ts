import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { assertAllowedOrigin, getCorsHeaders } from "../_shared/cors.ts";

const jsonHeaders = (req: Request) => ({ ...getCorsHeaders(req), "Content-Type": "application/json" });

type EstimateRequest = {
  brand?: string;
  model?: string;
  canonical_slug?: string;
  variant?: string | null;
  storage?: string | null;
  ram?: string | null;
  condition: "new" | "like_new" | "used" | "fair";
  defects?: string[];
  ageMonths?: number;
};

function positiveNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function firstPositive(...values: unknown[]) {
  for (const value of values) {
    const n = positiveNumber(value);
    if (n > 0) return n;
  }
  return 0;
}

function applyFactors(base: number, conditionFactor: number, defectAdj: number, ageAdj: number, demand: number) {
  const v = base * conditionFactor;
  const v2 = v - defectAdj;
  const v3 = Math.max(v2 - ageAdj, 0);
  return Math.round(v3 * demand);
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
    const body: EstimateRequest = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const deviceQuery = admin.from("device_catalog").select("*");
    let dq = deviceQuery;

    if (body.canonical_slug) dq = dq.eq("canonical_slug", body.canonical_slug);
    if (body.brand) dq = dq.ilike("brand", body.brand);
    if (body.model) dq = dq.ilike("model", `%${body.model}%`);
    if (body.storage) dq = dq.ilike("storage", `%${body.storage}%`);
    if (body.ram) dq = dq.ilike("ram", `%${body.ram}%`);
    if (body.variant) dq = dq.ilike("variant", `%${body.variant}%`);

    const { data: device } = await dq.order("release_year", { ascending: false }).limit(1).maybeSingle();

    const deviceId = device?.id ?? null;
    const { data: rules } = deviceId
      ? await admin.from("valuation_rules").select("*").eq("device_id", deviceId)
      : { data: [] as unknown[] };
    const ruleList = Array.isArray(rules) ? rules as Record<string, unknown>[] : [];
    const rule = ruleList.find((entry) => entry?.condition === body.condition) ?? ruleList[0] ?? null;

    let catalogBase = 0;
    if (!rule && (body.brand || body.model || body.canonical_slug)) {
      let catalogQuery = admin.from("catalog_products").select("*");
      if (body.canonical_slug) catalogQuery = catalogQuery.eq("slug", body.canonical_slug);
      if (body.brand) catalogQuery = catalogQuery.ilike("name", `%${body.brand}%`);
      if (body.model) catalogQuery = catalogQuery.ilike("name", `%${body.model}%`);
      const { data: catalogProduct } = await catalogQuery.limit(1).maybeSingle();
      catalogBase = firstPositive(catalogProduct?.price_npr, catalogProduct?.base_price_npr, catalogProduct?.price);
    }

    const base = firstPositive(rule?.base_price, device?.base_price_npr, catalogBase);
    if (base <= 0) {
      return new Response(JSON.stringify({ error: "No valuation rule found" }), {
        status: 422,
        headers: jsonHeaders(req),
      });
    }

    const conditionFactors: Record<string, number> =
      (typeof rule?.condition_factors === "object" ? (rule?.condition_factors as Record<string, number>) : {
        new: positiveNumber(rule?.condition_factor) || 1.0,
        like_new: positiveNumber(rule?.condition_factor) || 0.85,
        used: positiveNumber(rule?.condition_factor) || 0.7,
        fair: positiveNumber(rule?.condition_factor) || 0.5
      });
    const defectsAdjMap: Record<string, number> =
      (typeof rule?.defect_adjustments === "object" ? (rule?.defect_adjustments as Record<string, number>) : {
        screen_crack: positiveNumber(rule?.defect_penalty) || 8000,
        battery_weak: positiveNumber(rule?.defect_penalty) || 4000,
        camera_issue: positiveNumber(rule?.defect_penalty) || 5000,
        face_id_fail: positiveNumber(rule?.defect_penalty) || 6000,
        speaker_issue: positiveNumber(rule?.defect_penalty) || 2000,
        buttons_issue: positiveNumber(rule?.defect_penalty) || 1500,
        // legacy aliases:
        screen: positiveNumber(rule?.defect_penalty) || 8000,
        battery: positiveNumber(rule?.defect_penalty) || 4000,
        body: positiveNumber(rule?.defect_penalty) || 2000,
      });
    const ageCurve: { perMonth?: number; capMonths?: number } =
      (typeof rule?.age_depreciation === "object" ? (rule?.age_depreciation as { perMonth?: number; capMonths?: number }) : {
        perMonth: positiveNumber(rule?.age_penalty) || 0.01,
        capMonths: 48
      });
    const demand = Number(rule?.demand_factor ?? 1.0);

    const conditionFactor = Number(conditionFactors[body.condition] ?? 0.7);
    const defects = body.defects ?? [];
    const defectAdj = defects.reduce((sum, d) => sum + Number(defectsAdjMap[d] ?? 0), 0);
    const monthRate = Number(ageCurve.perMonth ?? 0.01);
    const cap = Number(ageCurve.capMonths ?? 48);
    const months = Math.min(Number(body.ageMonths ?? 0), cap);
    const ageAdj = Math.round(base * monthRate * months);

    const quoted_value = applyFactors(base, conditionFactor, defectAdj, ageAdj, demand);
    if (quoted_value <= 0) {
      return new Response(JSON.stringify({ error: "Manual quote required" }), {
        status: 422,
        headers: jsonHeaders(req),
      });
    }

    const payload = {
        device_id: deviceId,
        base_price: base,
        condition_factor: conditionFactor,
        defect_adjustment: defectAdj,
        age_adjustment: ageAdj,
        demand_factor: demand,
        quoted_value,
        confidence: rule ? 0.7 : 0.45,
      };
    return new Response(
      JSON.stringify(payload),
      { headers: jsonHeaders(req) },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message ?? "Unknown error" }), {
      status: 500,
      headers: jsonHeaders(req),
    });
  }
});
