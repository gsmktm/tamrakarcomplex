// Service for sell phone valuation and leads

import { supabase } from "@/integrations/supabase/client";
import { isValidEmail, isValidImei, isValidNepalPhone, normalizeEmail, normalizePhone, sanitizeText } from "@/lib/security";
import { PRODUCTS, estimateDevicePrice } from "@/utils/productData";

export interface ValuationRequest {
  catalog_product_id: string;
  storage: string;
  condition: string;
  defects: string[];
  age_months: number;
}

export interface LeadData {
  brand: string;
  model: string;
  catalog_product_id?: string;
  storage: string;
  condition: string;
  defects: string[];
  age_months: number;
  quoted_value: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  imei?: string;
  assigned_store_id?: string;
  source?: string;
}

function isMissingColumnError(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "42703" || message.includes("does not exist") || message.includes("schema cache");
}

function isCompatibilityInsertError(error: { message?: string; code?: string } | null) {
  return isMissingColumnError(error) || error?.code === "23502" || error?.code === "23514";
}

function isMissingTableError(error: { message?: string; code?: string } | null, tableName: string) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "42P01" || message.includes(tableName) || message.includes("schema cache");
}

function normalizeSellCondition(condition: string) {
  const value = condition.trim().toLowerCase();
  if (value === "like_new" || value === "like new" || value === "open_box") return "like_new";
  if (value === "fair" || value === "poor") return "fair";
  if (value === "new" || value === "brand_new") return "new";
  return "used";
}

function normalizeLegacyCondition(condition: string) {
  const normalized = normalizeSellCondition(condition);
  return normalized === "new" ? "new" : "used";
}

function getConditionFactor(condition: string) {
  const normalized = normalizeSellCondition(condition);
  if (normalized === "new") return 0.92;
  if (normalized === "like_new") return 0.82;
  if (normalized === "fair") return 0.52;
  return 0.68;
}

function getDefectDeduction(defects: string[]) {
  const deductions: Record<string, number> = {
    screen_crack: 8000,
    battery_weak: 4000,
    camera_issue: 5000,
    face_id_fail: 6000,
    speaker_issue: 2000,
    buttons_issue: 1500,
  };

  return defects.reduce((total, defect) => total + (deductions[defect] ?? 0), 0);
}

async function getFallbackCatalogPrice(catalogProductId: string) {
  if (!catalogProductId) return 0;

  const numericId = Number(catalogProductId.replace(/^(arko|fallback-product)-/, ""));
  const localProduct = Number.isFinite(numericId)
    ? PRODUCTS.find((product) => product.id === numericId)
    : undefined;
  if (localProduct?.retail_npr) return localProduct.retail_npr;

  const { data, error } = await supabase
    .from("catalog_products")
    .select("price_npr, price_text")
    .eq("id", catalogProductId)
    .maybeSingle();

  if (error) return 0;
  const numericPrice = Number(data?.price_npr ?? 0);
  if (numericPrice > 0) return numericPrice;

  const parsed = String(data?.price_text ?? "").replace(/[^\d.]/g, "");
  return Number(parsed || 0);
}

async function mirrorLeadQuote(leadData: LeadData, phone: string, email: string) {
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id || undefined;
  const device = {
    brand: sanitizeText(leadData.brand, 80),
    model: sanitizeText(leadData.model, 120),
    storage: sanitizeText(leadData.storage, 40),
    condition: normalizeSellCondition(leadData.condition),
    defects: leadData.defects.map((defect) => sanitizeText(defect, 80)),
    imei: leadData.imei ? sanitizeText(leadData.imei, 15) : undefined,
    catalog_product_id: leadData.catalog_product_id,
    age_months: leadData.age_months,
  };

  const richPayload = {
    user_id: currentUserId,
    type: "cash",
    device,
    condition: device.condition,
    defects: device.defects,
    quoted_value: leadData.quoted_value,
    quote_amount: leadData.quoted_value,
    name: sanitizeText(leadData.customer_name, 120),
    phone,
    email,
    device_brand: device.brand,
    device_model: device.model,
    assigned_store: leadData.assigned_store_id || null,
    partner_store_id: leadData.assigned_store_id || null,
    status: "new",
    notes: `Source: ${sanitizeText(leadData.source ?? "website", 60)}`,
  };

  try {
    const first = await supabase.from("leads_quotes").insert(richPayload);
    if (!first.error || !isCompatibilityInsertError(first.error)) return;

    await supabase.from("leads_quotes").insert({
      user_id: currentUserId,
      type: "cash",
      device,
      condition: device.condition,
      defects: device.defects,
      quoted_value: leadData.quoted_value,
      partner_store_id: leadData.assigned_store_id || null,
      status: "new",
    });
  } catch {
    // The canonical sell_phone_leads write already succeeded; this mirror is for admin compatibility.
  }
}

// Brand structure for fallback
interface BrandData {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  active: boolean;
}

// Device structure for fallback
interface DeviceData {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  brand?: { name: string; logo_url?: string };
  model?: { name: string };
  variant?: { storage?: string; ram?: string; color?: string };
  release_year?: number;
}

export const sellPhoneService = {
  // Get all brands with fallback to arkostoreData
  async getBrands() {
    const { data, error } = await supabase
      .from("brands")
      .select("id, name, slug, logo_url, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    // If DB fails or returns empty, use fallback
    if (!error && data && data.length > 0) {
      return data as BrandData[];
    }

    // Fallback: Generate from arkostoreData
    const fallbackBrands = Array.from(
      new Map(
        PRODUCTS.map((device) => [
          device.brand,
          {
            id: device.brand.toLowerCase().replace(/\s+/g, "-"),
            name: device.brand,
            slug: device.brand.toLowerCase().replace(/\s+/g, "-"),
            logo_url: undefined,
            active: true,
          } as BrandData,
        ])
      ).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    return fallbackBrands;
  },

  // Get popular devices for selection with fallback
  async getPopularDevices(limit = 20) {
    const { data, error } = await supabase
      .from("catalog_products")
      .select(`
        id, name, slug, image_url, brand:brands(name, logo_url), model:device_models(name),
        admin_pinned, popularity_score, search_count, click_count
      `)
      .eq("is_active", true)
      .eq("verified", true)
      .eq("is_price_list_item", true)
      .order("admin_pinned", { ascending: false })
      .order("popularity_score", { ascending: false })
      .order("search_count", { ascending: false })
      .limit(limit);

    // If DB has data, use it
    if (!error && data && data.length > 0) {
      return data;
    }

    // Fallback: Return top devices from arkostoreData
    const topDevices = PRODUCTS.slice(0, limit).map((device, idx) => ({
      id: `arko-${device.id}`,
      name: `${device.brand} ${device.model}`,
      slug: `${device.brand.toLowerCase()}-${device.model.toLowerCase().replace(/\s+/g, "-")}`,
      image_url: device.image,
      brand: { name: device.brand, logo_url: undefined },
      model: { name: device.model },
      admin_pinned: idx < 5,
      popularity_score: 100 - idx * 2,
      search_count: 50 - idx,
      click_count: 20 - (idx % 10),
    }));

    return topDevices;
  },

  // Get devices by brand with fallback
  async getDevicesByBrand(brandId: string) {
    // First try to get from brands table to find the brand name
    const { data: brandData } = await supabase
      .from("brands")
      .select("name")
      .eq("id", brandId)
      .single();

    const brandName = brandData?.name || brandId;

    const { data, error } = await supabase
      .from("catalog_products")
      .select(`
        id, name, slug, image_url, brand:brands(name), model:device_models(name),
        variant:device_variants(storage, ram, color), release_year
      `)
      .eq("brand_id", brandId)
      .eq("is_active", true)
      .eq("verified", true)
      .eq("is_price_list_item", true)
      .order("popularity_score", { ascending: false });

    // If DB has data, use it
    if (!error && data && data.length > 0) {
      return data;
    }

    // Fallback: Filter from arkostoreData
    const fallbackDevices = PRODUCTS
      .filter((device) => device.brand.toLowerCase() === brandName.toLowerCase())
      .map((device) => ({
        id: `arko-${device.id}`,
        name: device.model,
        slug: device.model.toLowerCase().replace(/\s+/g, "-"),
        image_url: device.image,
        brand: { name: device.brand },
        model: { name: device.model },
        variant: { storage: undefined, ram: undefined, color: undefined },
        release_year: new Date().getFullYear() - Math.floor(Math.random() * 5),
      }))
      .slice(0, 50); // Limit to 50 per brand

    return fallbackDevices;
  },

  // Calculate valuation using database rules with fallback to arkostoreData
  async calculateValuation(request: ValuationRequest) {
    // Try database RPC first
    try {
      const { data, error } = await supabase
        .rpc("calculate_device_valuation", {
          p_catalog_product_id: request.catalog_product_id,
          p_storage: request.storage,
          p_condition: request.condition,
          p_defects: request.defects,
          p_age_months: request.age_months
        });

      if (!error && Number(data) > 0) return Math.round(Number(data));
    } catch {
      // Continue to fallback
    }

    // Get fallback price from catalog
    const basePrice = await getFallbackCatalogPrice(request.catalog_product_id);
    
    // If we have a catalog price, use it
    if (basePrice > 0) {
      const storageFactor = request.storage === "1TB" ? 1.14 : request.storage === "512GB" ? 1.08 : request.storage === "256GB" ? 1.04 : 1;
      const ageFactor = Math.max(0.5, 1 - Math.min(request.age_months, 48) * 0.01);
      const estimate = basePrice * storageFactor * getConditionFactor(request.condition) * ageFactor - getDefectDeduction(request.defects);
      return Math.max(5000, Math.round(estimate));
    }

    // Final fallback: use arkostoreData with local estimation
    // This shouldn't happen often but ensures wizard works even with no data
    return Math.max(5000, Math.round(20000 * getConditionFactor(request.condition)));
  },

  // Save lead
  async saveLead(leadData: LeadData) {
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id || undefined;
    const email = normalizeEmail(leadData.customer_email);
    const phone = normalizePhone(leadData.customer_phone);
    if (!isValidEmail(email)) throw new Error("Invalid email address");
    if (!isValidNepalPhone(phone)) throw new Error("Invalid Nepal mobile number");
    if (leadData.imei && !isValidImei(leadData.imei)) throw new Error("Invalid IMEI");

    const canonicalPayload = {
      user_id: currentUserId,
      assigned_store_id: leadData.assigned_store_id || null,
      brand: sanitizeText(leadData.brand, 80),
      model: sanitizeText(leadData.model, 120),
      storage: sanitizeText(leadData.storage, 40),
      condition: normalizeSellCondition(leadData.condition),
      defects: leadData.defects.map((defect) => sanitizeText(defect, 80)),
      age_months: leadData.age_months,
      quoted_value: leadData.quoted_value,
      customer_name: sanitizeText(leadData.customer_name, 120),
      customer_phone: phone,
      customer_email: email,
      imei: leadData.imei ? sanitizeText(leadData.imei, 15) : undefined,
      source: sanitizeText(leadData.source ?? "website", 60),
    };

    let { data, error } = await supabase
      .from("sell_phone_leads")
      .insert([canonicalPayload])
      .select()
      .single();

    if (error?.code === "23514") {
      const constraintResult = await supabase
        .from("sell_phone_leads")
        .insert([{ ...canonicalPayload, condition: normalizeLegacyCondition(canonicalPayload.condition) }])
        .select()
        .single();

      data = constraintResult.data;
      error = constraintResult.error;
    }

    if (error && isCompatibilityInsertError(error)) {
      const legacyPayload: Record<string, unknown> = {
        user_id: currentUserId,
        name: canonicalPayload.customer_name,
        phone,
        device_brand: canonicalPayload.brand,
        device_model: canonicalPayload.model,
        condition: normalizeLegacyCondition(canonicalPayload.condition),
        asking_price: canonicalPayload.quoted_value,
        status: "new",
      };

      if (error?.code === "23502") {
        Object.assign(legacyPayload, canonicalPayload);
      }

      const legacyResult = await supabase
        .from("sell_phone_leads")
        .insert([legacyPayload])
        .select()
        .single();

      data = legacyResult.data;
      error = legacyResult.error;
    }

    if (error && isMissingTableError(error, "sell_phone_leads")) {
      const fallbackLead = {
        id: `fallback-${Date.now()}`,
        ...canonicalPayload,
      };

      try {
        await supabase.from("contact_messages").insert({
          name: canonicalPayload.customer_name,
          email,
          subject: `Sell phone lead - ${canonicalPayload.brand} ${canonicalPayload.model}`,
          message: JSON.stringify({
            type: "sell_phone_lead",
            ...canonicalPayload,
          }),
        });
      } catch {
        // Returning the validated fallback lead keeps the user flow complete when optional intake tables lag behind.
      }

      await mirrorLeadQuote(leadData, phone, email);
      return fallbackLead;
    }

    if (error) throw error;

    await mirrorLeadQuote(leadData, phone, email);

    try {
      await supabase.from("device_search_events").insert({
        catalog_product_id: leadData.catalog_product_id,
        brand_name: leadData.brand,
        model_name: leadData.model,
        query: `${leadData.brand} ${leadData.model}`.trim(),
        event_type: "quote"
      });
    } catch {
      // Lead capture should not fail if optional popularity tracking is unavailable.
    }

    return data;
  },

  // Get stores that accept leads
  async getStoresForLeads(brand?: string, maxQuote?: number) {
    let query = supabase
      .from("stores")
      .select(`
        id, name, slug, package_slug, logo_url,
        lead_preferences:store_lead_preferences(*)
      `)
      .eq("status", "active");

    if (brand) {
      query = query.eq("lead_preferences.accepts_brands", `["${brand}"]`);
    }

    if (maxQuote) {
      query = query.or(`lead_preferences.max_quote_amount.is.null,lead_preferences.max_quote_amount.gte.${maxQuote}`);
    }

    const { data, error } = await query
      .order("package_slug", { ascending: false }) // Diamond first
      .limit(10);

    if (error) throw error;
    return data;
  },

  // Update device popularity
  async updateDevicePopularity(catalogProductId: string, eventType: "search" | "click" | "view" | "quote") {
    const updateField = eventType === "search" ? "search_count" :
                       eventType === "click" ? "click_count" : "popularity_score";

    await supabase.rpc("update_device_popularity", {
      p_catalog_product_id: catalogProductId,
      p_event_type: eventType
    });
  },

  // Generate SEO link from product page to sell wizard
  // Returns query params that pre-fill the sell wizard
  getSellWizardLink(brand: string, model: string, storage?: string): string {
    const params = new URLSearchParams();
    params.set("from", "price-list");
    params.set("brand", encodeURIComponent(brand));
    params.set("model", encodeURIComponent(model));
    if (storage) params.set("storage", encodeURIComponent(storage));
    return `/sell-your-phone?${params.toString()}`;
  },

  // Track where user came from (for analytics)
  async trackValuationSource(source: string, brand: string, model: string) {
    try {
      await supabase.from("device_search_events").insert({
        brand_name: brand,
        model_name: model,
        query: `${brand} ${model}`,
        event_type: "valuation_click",
        source: source
      });
    } catch {
      // Silently fail for non-critical tracking
    }
  }
};
