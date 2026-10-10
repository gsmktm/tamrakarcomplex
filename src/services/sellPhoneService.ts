// Service for sell phone valuation and leads

import { supabase } from "@/integrations/supabase/client";
import { isValidEmail, isValidImei, isValidNepalPhone, normalizeEmail, normalizePhone, sanitizeText } from "@/lib/security";
import { PRODUCTS, estimateDevicePrice } from "@/utils/productData";
import { masterCatalogService } from "./masterCatalogService";
import { SAMSUNG_DEVICE_CATALOG } from "@/data/samsungDeviceCatalog";
import { SAMSUNG_DEVICE_CATALOG_2022_2023 } from "@/data/samsungDeviceCatalog2022";
import { APPLE_DEVICE_CATALOG } from "@/data/appleDeviceCatalog";

export interface DeviceInspection {
  battery_health?: number;
  display_condition?: string;
  camera_condition?: string;
  biometric_status?: string;
  box_available?: boolean;
  bill_available?: boolean;
  warranty_available?: boolean;
  is_repaired?: boolean;
  water_damage?: boolean;
  accessories_available?: boolean;
  location?: string;
  vibo_score?: number;
}

export interface ValuationRequest {
  catalog_product_id: string;
  storage: string;
  condition: string;
  defects: string[];
  age_months: number;
  inspection?: DeviceInspection;
  mode?: "cash" | "exchange";
}

export interface ValuationOutcome {
  estimated_price: number;
  base_price: number;
  inspection_factor: number;
  exchange_bonus: number;
  source: "database_rpc" | "catalog_fallback" | "floor_fallback";
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
  inspection?: DeviceInspection;
  exchange_mode?: boolean;
  submission_key?: string;
}

const EXCHANGE_MODE_BONUS_FACTOR = 1.05;

/**
 * Deterministic inspection adjustment applied uniformly on top of the database
 * RPC price and the local fallback price, so both paths stay comparable.
 * Clamped to [0.75, 1.06] so a single bad input cannot swing the quote wildly.
 */
export function inspectionPriceFactor(inspection?: DeviceInspection): number {
  if (!inspection) return 1;

  let factor = 1;

  const battery = inspection.battery_health;
  if (typeof battery === "number") {
    if (battery >= 95) factor *= 1.0;
    else if (battery >= 85) factor *= 0.98;
    else if (battery >= 75) factor *= 0.95;
    else factor *= 0.9;
  }

  switch (inspection.display_condition) {
    case "minor": factor *= 0.97; break;
    case "cracked": factor *= 0.92; break;
    case "perfect": break;
  }

  switch (inspection.camera_condition) {
    case "minor": factor *= 0.98; break;
    case "faulty": factor *= 0.94; break;
    case "perfect": break;
  }

  if (inspection.biometric_status === "not_working") factor *= 0.96;

  if (inspection.water_damage) factor *= 0.85;
  if (inspection.is_repaired) factor *= 0.95;

  let docBonus = 0;
  if (inspection.box_available) docBonus += 0.01;
  if (inspection.bill_available) docBonus += 0.01;
  if (inspection.warranty_available) docBonus += 0.01;
  if (inspection.accessories_available) docBonus += 0.01;
  factor *= 1 + docBonus;

  return Math.max(0.75, Math.min(1.06, factor));
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isDatabaseCatalogId(value: string) {
  return UUID_PATTERN.test(value);
}

export function calculateFallbackValuation(
  basePrice: number,
  request: Pick<ValuationRequest, "storage" | "condition" | "defects" | "age_months">,
) {
  const storageFactor =
    request.storage === "1TB" ? 1.14 :
    request.storage === "512GB" ? 1.08 :
    request.storage === "256GB" ? 1.04 :
    1;
  const ageFactor = Math.max(0.5, 1 - Math.min(Math.max(request.age_months, 0), 48) * 0.01);
  const estimate =
    basePrice *
    storageFactor *
    getConditionFactor(request.condition) *
    ageFactor -
    getDefectDeduction(request.defects);

  return Math.max(5000, Math.round(estimate));
}

async function getFallbackCatalogPrice(catalogProductId: string) {
  if (!catalogProductId) return 0;

  const numericId = Number(catalogProductId.replace(/^(arko|fallback-product)-/, ""));
  const localProduct = Number.isFinite(numericId)
    ? PRODUCTS.find((product) => product.id === numericId)
    : undefined;
  if (localProduct?.retail_npr) return localProduct.retail_npr;

  // Supplemental offline models use readable IDs rather than database UUIDs.
  // Do not send those IDs to PostgREST, where they fail UUID validation.
  if (!isDatabaseCatalogId(catalogProductId)) return 0;

  const { data, error } = await supabase
    .from("catalog_products")
    .select("price_npr, price_text")
    .eq("id", catalogProductId)
    .abortSignal(sellCatalogRequestSignal())
    .maybeSingle();

  if (error) return 0;
  const numericPrice = Number(data?.price_npr ?? 0);
  if (numericPrice > 0) return numericPrice;

  const parsed = String(data?.price_text ?? "").replace(/[^\d.]/g, "");
  return Number(parsed || 0);
}

async function mirrorLeadQuote(leadData: LeadData, phone: string, email: string, userId?: string) {
  // If userId is provided (e.g., after signup), use it directly
  // Otherwise, fetch current session user
  let currentUserId = userId;
  if (!currentUserId) {
    const { data: authData } = await supabase.auth.getUser();
    currentUserId = authData?.user?.id || undefined;
  }
  
  const device = {
    brand: sanitizeText(leadData.brand, 80),
    model: sanitizeText(leadData.model, 120),
    storage: sanitizeText(leadData.storage, 40),
    condition: normalizeSellCondition(leadData.condition),
    defects: leadData.defects.map((defect) => sanitizeText(defect, 80)),
    imei: leadData.imei ? sanitizeText(leadData.imei, 15) : undefined,
    catalog_product_id: leadData.catalog_product_id,
    age_months: leadData.age_months,
    inspection: leadData.inspection
      ? {
          ...leadData.inspection,
          exchange_mode: leadData.exchange_mode ?? false,
        }
      : undefined,
  };

  // `leads_quotes` is a compatibility/history table. Its live contract is
  // intentionally kept to the restored columns; the full inspection snapshot
  // is preserved in notes instead of sending columns that do not exist there.
  const mirrorPayload = {
    user_id: currentUserId ?? null,
    name: sanitizeText(leadData.customer_name, 120),
    phone,
    email,
    device_brand: device.brand,
    device_model: device.model,
    condition: device.condition,
    quote_amount: leadData.quoted_value,
    assigned_store: leadData.assigned_store_id || null,
    status: "new",
    notes: JSON.stringify({
      source: sanitizeText(leadData.source ?? "website", 60),
      storage: device.storage,
      defects: device.defects,
      age_months: device.age_months,
      imei: device.imei,
      catalog_product_id: device.catalog_product_id,
      inspection: device.inspection,
      exchange_mode: leadData.exchange_mode ?? false,
      submission_key: leadData.submission_key,
    }),
  };

  try {
    const result = await supabase.from("leads_quotes").insert(mirrorPayload);
    if (!result.error) return;

    // Older deployments may have a stricter or partially restored history
    // schema. Retry only with the stable required columns; never let a mirror
    // failure turn a successfully persisted canonical lead into a UI failure.
    if (isCompatibilityInsertError(result.error)) {
      await supabase.from("leads_quotes").insert({
        user_id: currentUserId ?? null,
        name: mirrorPayload.name,
        phone: mirrorPayload.phone,
        email: mirrorPayload.email,
        device_brand: mirrorPayload.device_brand,
        device_model: mirrorPayload.device_model,
        condition: mirrorPayload.condition,
        quote_amount: mirrorPayload.quote_amount,
        assigned_store: mirrorPayload.assigned_store,
        status: mirrorPayload.status,
      });
    }
  } catch {
    // The canonical sell_phone_leads write already succeeded; this mirror is
    // for history/admin compatibility and must not block the customer flow.
  }
}

// Brand structure for fallback
interface BrandData {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  active: boolean;
  sort_order?: number;
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
  category?: SellDeviceCategory;
}

export type SellDeviceCategory = "phone" | "tablet" | "watch";

const APPLE_MODEL_IMAGES: Record<string, string> = {
  "iphone 17 pro max": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-17-pro-max.jpg",
  "iphone 17 pro": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-17-pro.jpg",
  "iphone air": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-air.jpg",
  "iphone 17": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-17.jpg",
  "iphone 17e": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-17e.jpg",
  "iphone 16e": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16e.jpg",
  "iphone 16 pro max": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16-pro-max.jpg",
  "iphone 16 pro": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16-pro.jpg",
  "iphone 16 plus": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16-plus.jpg",
  "iphone 16": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16.jpg",
  "iphone 15 pro max": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro-max.jpg",
  "iphone 15 pro": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro.jpg",
  "iphone 15 plus": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-plus-.jpg",
  "iphone 15": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15.jpg",
  "iphone 14 pro max": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14-pro-max-.jpg",
  "iphone 14 pro": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14-pro.jpg",
  "iphone 14 plus": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14-plus.jpg",
  "iphone 14": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14.jpg",
  "iphone 13 pro max": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13-pro-max.jpg",
  "iphone 13 pro": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13-pro.jpg",
  "iphone 13 mini": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13-mini.jpg",
  "iphone 13": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13.jpg",
  "iphone se (2022)": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-se-2022.jpg",
  "iphone se (2020)": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-se-2020.jpg",
  "iphone se": "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-se.jpg",
  "iphone": "/default-product.svg",
};

const SAMSUNG_MODEL_IMAGES: Record<string, string> = {
  "galaxy s26 ultra": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s26-ultra.jpg",
  "galaxy s26+": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s26-plus.jpg",
  "galaxy s26 plus": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s26-plus.jpg",
  "galaxy s26": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s26.jpg",
  "galaxy z fold7": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold7.jpg",
  "galaxy z flip7": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-flip7.jpg",
  "galaxy s25 ultra": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-ultra-sm-s938.jpg",
  "galaxy s25 edge": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-edge.jpg",
  "galaxy s25+": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-plus-sm-s936.jpg",
  "galaxy s25 plus": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-plus-sm-s936.jpg",
  "galaxy s25": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-sm-s931.jpg",
  "galaxy s25 fe": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s25-fe.jpg",
  "galaxy a56": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a56.jpg",
  "galaxy a36": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a36.jpg",
  "galaxy a26": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a26.jpg",
  "galaxy a16": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a16-5g.jpg",
  "galaxy a06": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a06.jpg",
  "galaxy m56": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-m56.jpg",
  "galaxy m36": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-m36.jpg",
  "galaxy m16": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-m16.jpg",
  "galaxy f56": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-f56.jpg",
  "galaxy f36": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-f36.jpg",
  "galaxy z fold6": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold6.jpg",
  "galaxy z flip6": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-flip6.jpg",
  "galaxy s24 ultra": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-ultra-5g-sm-s928.jpg",
  "galaxy s24+": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-plus-5g-sm-s926.jpg",
  "galaxy s24 plus": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-plus-5g-sm-s926.jpg",
  "galaxy s24": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-5g-sm-s921.jpg",
  "galaxy s24 fe": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-fe-r1.jpg",
  "galaxy a55": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a55.jpg",
  "galaxy a35": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a35.jpg",
  "galaxy a25": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a25-5g.jpg",
  "galaxy a15": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a15-5g.jpg",
  "galaxy z fold5": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-fold5-5g.jpg",
  "galaxy z flip5": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-z-flip5-5g.jpg",
  "galaxy s23 ultra": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s23-ultra-5g.jpg",
  "galaxy s23+": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s23-plus-5g.jpg",
  "galaxy s23 plus": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s23-plus-5g.jpg",
  "galaxy s23": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s23-5g.jpg",
  "galaxy s23 fe": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s23-fe.jpg",
  "galaxy a54": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a54.jpg",
  "galaxy a34": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a34.jpg",
  "galaxy a24": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a24-4g.jpg",
  "galaxy a14": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a14-5g.jpg",
};

const SAMSUNG_RECENT_MODELS = [
  ["Galaxy S26 Ultra", 2026],
  ["Galaxy S26+", 2026],
  ["Galaxy S26", 2026],
  ["Galaxy Z Fold7", 2026],
  ["Galaxy Z Flip7", 2026],
  ["Galaxy S25 Ultra", 2025],
  ["Galaxy S25 Edge", 2025],
  ["Galaxy S25+", 2025],
  ["Galaxy S25", 2025],
  ["Galaxy S25 FE", 2025],
  ["Galaxy A56", 2025],
  ["Galaxy A36", 2025],
  ["Galaxy A26", 2025],
  ["Galaxy A16", 2025],
  ["Galaxy A06", 2025],
  ["Galaxy M56", 2025],
  ["Galaxy M36", 2025],
  ["Galaxy M16", 2025],
  ["Galaxy F56", 2025],
  ["Galaxy F36", 2025],
  ["Galaxy Z Fold6", 2024],
  ["Galaxy Z Flip6", 2024],
  ["Galaxy S24 Ultra", 2024],
  ["Galaxy S24+", 2024],
  ["Galaxy S24", 2024],
  ["Galaxy S24 FE", 2024],
  ["Galaxy A55", 2024],
  ["Galaxy A35", 2024],
  ["Galaxy A25", 2024],
  ["Galaxy A15", 2024],
  ["Galaxy Z Fold5", 2023],
  ["Galaxy Z Flip5", 2023],
  ["Galaxy S23 Ultra", 2023],
  ["Galaxy S23+", 2023],
  ["Galaxy S23", 2023],
  ["Galaxy S23 FE", 2023],
  ["Galaxy A54", 2023],
  ["Galaxy A34", 2023],
  ["Galaxy A24", 2023],
  ["Galaxy A14", 2023],
  ...SAMSUNG_DEVICE_CATALOG
    .concat(SAMSUNG_DEVICE_CATALOG_2022_2023)
    .filter((device) => device.category === "phone")
    .map((device) => [device.name, Number(device.announced.slice(0, 4))] as const),
] as const;

const XIAOMI_MODEL_IMAGES: Record<string, string> = {
  "xiaomi 17 ultra": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-17-ultra.jpg",
  "xiaomi 17 pro max": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-17-pro-max.jpg",
  "xiaomi 17 pro": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-17-pro.jpg",
  "xiaomi 17": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-17.jpg",
  "xiaomi 15 ultra": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-15-ultra.jpg",
  "xiaomi 15 pro": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-15-pro.jpg",
  "xiaomi 15": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-15.jpg",
  "xiaomi 14 ultra": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-14-ultra.jpg",
  "xiaomi 14 pro": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-14-pro.jpg",
  "xiaomi 14": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-14.jpg",
  "xiaomi 13 ultra": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-13-ultra.jpg",
  "xiaomi 13 pro": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-13-pro.jpg",
  "xiaomi 13": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-13.jpg",
  "redmi note 15 pro+": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-15-pro-plus.jpg",
  "redmi note 15 pro plus": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-15-pro-plus.jpg",
  "redmi note 15 pro": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-15-pro.jpg",
  "redmi note 15": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-15.jpg",
  "redmi 15c": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-15c.jpg",
  "redmi 15": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-15.jpg",
  "redmi a7": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-a7.jpg",
  "redmi a5": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-a5.jpg",
  "redmi note 14 pro+": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-14-pro-plus-5g.jpg",
  "redmi note 14 pro plus": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-14-pro-plus-5g.jpg",
  "redmi note 14 pro": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-14-pro-5g.jpg",
  "redmi note 14": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-14-5g.jpg",
  "redmi 14c": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-14c.jpg",
  "redmi 14": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-14.jpg",
  "redmi note 13 pro+": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-13-pro-plus-5g.jpg",
  "redmi note 13 pro plus": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-13-pro-plus-5g.jpg",
  "redmi note 13 pro": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-13-pro-5g.jpg",
  "redmi note 13": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-13-5g.jpg",
  "redmi 13c": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-13c.jpg",
  "poco f8 pro": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-poco-f8-pro.jpg",
  "poco f7": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-poco-f7.jpg",
  "poco x8 pro max": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-poco-x8-pro-max.jpg",
  "poco x8 pro": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-poco-x8-pro.jpg",
  "poco x7 pro": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-poco-x7-pro.jpg",
  "poco x6 pro": "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-poco-x6-pro.jpg",
};

const XIAOMI_RECENT_MODELS = [
  ["Xiaomi 17 Ultra", 2026],
  ["Xiaomi 17 Pro Max", 2026],
  ["Xiaomi 17 Pro", 2026],
  ["Xiaomi 17", 2026],
  ["Redmi Note 15 Pro+", 2026],
  ["Redmi Note 15 Pro", 2026],
  ["Redmi Note 15", 2026],
  ["Redmi 15C", 2026],
  ["Redmi 15", 2026],
  ["Redmi A7", 2026],
  ["Redmi A5", 2026],
  ["POCO F8 Pro", 2026],
  ["POCO X8 Pro Max", 2026],
  ["POCO X8 Pro", 2026],
  ["Xiaomi 15 Ultra", 2025],
  ["Xiaomi 15 Pro", 2025],
  ["Xiaomi 15", 2025],
  ["Redmi Note 14 Pro+", 2025],
  ["Redmi Note 14 Pro", 2025],
  ["Redmi Note 14", 2025],
  ["Redmi 14C", 2025],
  ["Redmi 14", 2025],
  ["POCO F7", 2025],
  ["POCO X7 Pro", 2025],
  ["Xiaomi 14 Ultra", 2024],
  ["Xiaomi 14 Pro", 2024],
  ["Xiaomi 14", 2024],
  ["Redmi Note 13 Pro+", 2024],
  ["Redmi Note 13 Pro", 2024],
  ["Redmi Note 13", 2024],
  ["Redmi 13C", 2024],
  ["POCO X6 Pro", 2024],
  ["Xiaomi 13 Ultra", 2023],
  ["Xiaomi 13 Pro", 2023],
  ["Xiaomi 13", 2023],
] as const;

const SELL_BRAND_PRIORITY = ["apple", "samsung", "xiaomi", "oppo", "vivo", "oneplus"];
const GENERIC_PHONE_IMAGE_BRANDS = new Set([
  "oppo",
  "vivo",
  "oneplus",
  "realme",
  "honor",
  "huawei",
  "infinix",
  "tecno",
  "poco",
  "nothing",
  "motorola",
  "nokia",
  "sony",
  "asus",
  "zte",
  "lenovo",
]);

const sellCatalogRequestSignal = () => AbortSignal.timeout(4000);

function sortSellBrands<T extends { name: string; sort_order?: number }>(brands: T[]) {
  return [...brands].sort((a, b) => {
    const aPriority = SELL_BRAND_PRIORITY.indexOf(a.name.toLowerCase());
    const bPriority = SELL_BRAND_PRIORITY.indexOf(b.name.toLowerCase());

    if (aPriority !== -1 || bPriority !== -1) {
      if (aPriority === -1) return 1;
      if (bPriority === -1) return -1;
      return aPriority - bPriority;
    }

    const sortDiff = (a.sort_order ?? 9999) - (b.sort_order ?? 9999);
    if (sortDiff !== 0) return sortDiff;
    return a.name.localeCompare(b.name);
  });
}

function getLocalSellBrands(): BrandData[] {
  return sortSellBrands(Array.from(
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
  ));
}

function normalizeModelName(modelName: string) {
  return modelName
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalSellModelName(modelName: string) {
  return modelName
    .replace(/\s*\(\s*(?:\d+\s*\+\s*)?\d+\s*(?:gb|tb)\s*\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeSellModels(devices: DeviceData[]) {
  const models = new Map<string, DeviceData>();

  for (const device of devices) {
    const sourceName = device.model?.name || device.name;
    const modelName = canonicalSellModelName(sourceName);
    const key = `${device.category ?? "phone"}:${modelName.toLowerCase()}`;
    const existing = models.get(key);

    if (!existing) {
      models.set(key, {
        ...device,
        name: modelName,
        model: { ...device.model, name: modelName },
      });
      continue;
    }

    // Prefer the row with usable artwork and production metadata, while keeping
    // one card per model. Storage remains a separate choice in the next step.
    if ((!existing.image_url && device.image_url) || (!existing.release_year && device.release_year)) {
      models.set(key, {
        ...device,
        name: modelName,
        model: { ...device.model, name: modelName },
      });
    }
  }

  return [...models.values()];
}

function slugifyPhoneName(value: string) {
  return value
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/\s+5g\b/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function genericImageForModel(brandName?: string | null, modelName?: string | null) {
  const brandSlug = slugifyPhoneName(brandName ?? "");
  const modelSlug = slugifyPhoneName(normalizeModelName(modelName ?? ""));
  if (!brandSlug || !modelSlug) return undefined;

  if (modelSlug.startsWith(brandSlug)) {
    return `https://fdn2.gsmarena.com/vv/bigpic/${modelSlug}.jpg`;
  }

  return `https://fdn2.gsmarena.com/vv/bigpic/${brandSlug}-${modelSlug}.jpg`;
}

function appleImageForModel(modelName?: string | null) {
  const rawNormalized = (modelName ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  const normalized = normalizeModelName(modelName ?? "").toLowerCase();
  const direct = APPLE_MODEL_IMAGES[rawNormalized] || APPLE_MODEL_IMAGES[normalized];
  if (direct) return direct;

  // The Apple catalog already carries the GSMArena source slug for every model.
  // Deriving the big-picture path from it fills historical iPhones that are not
  // practical to maintain in the short exception map above.
  const catalogMatch = APPLE_DEVICE_CATALOG
    .filter((device) => device.category === "phone")
    .sort((a, b) => b.name.length - a.name.length)
    .find((device) => {
      const catalogName = normalizeModelName(device.name).toLowerCase();
      return normalized === catalogName || normalized.includes(catalogName);
    });
  const sourceSlug = catalogMatch?.sourceUrl.match(/\/(apple_[^/]+)-\d+\.php$/)?.[1];
  if (sourceSlug) {
    return `https://fdn2.gsmarena.com/vv/bigpic/${sourceSlug.replace(/_/g, "-")}.jpg`;
  }

  const match = Object.entries(APPLE_MODEL_IMAGES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => normalized.includes(key));

  return match?.[1];
}

function samsungImageForModel(modelName?: string | null) {
  const normalized = normalizeModelName(modelName ?? "").toLowerCase().replace(/\s+5g\b/g, "");
  const direct = SAMSUNG_MODEL_IMAGES[normalized];
  if (direct) return direct;

  const match = Object.entries(SAMSUNG_MODEL_IMAGES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => normalized.includes(key));

  return match?.[1];
}

function xiaomiImageForModel(modelName?: string | null) {
  const normalized = normalizeModelName(modelName ?? "")
    .toLowerCase()
    .replace(/\s+5g\b/g, "")
    .replace(/\+/g, " plus");

  const direct = XIAOMI_MODEL_IMAGES[normalized];
  if (direct) return direct;

  const match = Object.entries(XIAOMI_MODEL_IMAGES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => normalized.includes(key.replace(/\+/g, " plus")));

  return match?.[1];
}

function appleReleaseYear(modelName: string) {
  const normalized = normalizeModelName(modelName).toLowerCase();
  if (normalized.includes("17") || normalized.includes("air")) return 2026;
  if (normalized.includes("16")) return 2025;
  if (normalized.includes("15")) return 2023;
  if (normalized.includes("14")) return 2022;
  if (normalized.includes("13")) return 2021;
  return 2020;
}

function appleSortWeight(modelName: string) {
  const normalized = normalizeModelName(modelName).toLowerCase();
  const generation = Number(normalized.match(/iphone\s+(\d+)/)?.[1] ?? (normalized.includes("air") ? 17 : 0));
  const tier =
    normalized.includes("pro max") ? 5 :
    normalized.includes("pro") ? 4 :
    normalized.includes("air") ? 3 :
    normalized.includes("plus") ? 2 :
    normalized.includes("e") ? 0 :
    1;
  const storage =
    normalized.includes("2tb") ? 5 :
    normalized.includes("1tb") ? 4 :
    normalized.includes("512gb") ? 3 :
    normalized.includes("256gb") ? 2 :
    normalized.includes("128gb") ? 1 :
    0;

  return generation * 100 + tier * 10 + storage;
}

function samsungReleaseYear(modelName: string) {
  const normalized = normalizeModelName(modelName).toLowerCase();
  const supplemental = SAMSUNG_RECENT_MODELS.find(([name]) => normalized.includes(name.toLowerCase()));
  if (supplemental) return supplemental[1];
  if (normalized.includes("s26") || normalized.includes("fold7") || normalized.includes("flip7")) return 2026;
  if (normalized.includes("s25") || normalized.match(/\b(a|m|f)(56|36|26|16|06)\b/)) return 2025;
  if (normalized.includes("s24") || normalized.includes("fold6") || normalized.includes("flip6") || normalized.match(/\b(a)(55|35|25|15)\b/)) return 2024;
  if (normalized.includes("s23") || normalized.includes("fold5") || normalized.includes("flip5") || normalized.match(/\b(a)(54|34|24|14)\b/)) return 2023;
  return 2022;
}

function samsungSortWeight(modelName: string) {
  const normalized = normalizeModelName(modelName).toLowerCase();
  const year = samsungReleaseYear(modelName);
  const tier =
    normalized.includes("fold") ? 8 :
    normalized.includes("ultra") ? 7 :
    normalized.includes("flip") ? 6 :
    normalized.includes("edge") ? 5 :
    normalized.includes("+") || normalized.includes("plus") ? 4 :
    normalized.includes(" fe") ? 3 :
    normalized.includes("galaxy s") ? 2 :
    normalized.includes("galaxy a") ? 1 :
    0;

  return year * 100 + tier;
}

function xiaomiReleaseYear(modelName: string) {
  const normalized = normalizeModelName(modelName).toLowerCase();
  const supplemental = XIAOMI_RECENT_MODELS.find(([name]) => normalized.includes(name.toLowerCase().replace(/\+/g, " plus")) || normalized.includes(name.toLowerCase()));
  if (supplemental) return supplemental[1];
  if (normalized.includes("17") || normalized.includes("note 15") || normalized.includes("redmi 15") || normalized.includes("a7") || normalized.includes("a5") || normalized.includes("x8") || normalized.includes("f8")) return 2026;
  if (normalized.includes("15") || normalized.includes("note 14") || normalized.includes("redmi 14") || normalized.includes("x7") || normalized.includes("f7")) return 2025;
  if (normalized.includes("14") || normalized.includes("note 13") || normalized.includes("redmi 13") || normalized.includes("x6")) return 2024;
  if (normalized.includes("13")) return 2023;
  return 2022;
}

function xiaomiSortWeight(modelName: string) {
  const normalized = normalizeModelName(modelName).toLowerCase();
  const year = xiaomiReleaseYear(modelName);
  const tier =
    normalized.includes("ultra") ? 8 :
    normalized.includes("pro max") ? 7 :
    normalized.includes("pro+") || normalized.includes("pro plus") ? 6 :
    normalized.includes("pro") ? 5 :
    normalized.includes("poco f") ? 4 :
    normalized.includes("poco x") ? 3 :
    normalized.includes("note") ? 2 :
    normalized.includes("redmi") ? 1 :
    0;

  return year * 100 + tier;
}

function genericReleaseYear(modelName: string) {
  const normalized = normalizeModelName(modelName).toLowerCase();
  const explicitYear = normalized.match(/\b(202[3-6])\b/)?.[1];
  if (explicitYear) return Number(explicitYear);

  if (normalized.match(/\b(16|17|600|700|x9d|x8d|v70|v60|gt8|find n5|reno 15|edge 60|razr 60|zenfone 12|rog phone 9)\b/)) return 2026;
  if (normalized.match(/\b(15|400|500|x8c|x7d|v50|gt7|reno 14|edge 50|razr 50|phone 3|3a|zenfone 11|rog phone 8)\b/)) return 2025;
  if (normalized.match(/\b(14|300|200|x9b|x8b|v40|gt6|reno 12|edge 40|razr 40|phone 2a|phone 2|zenfone 10|rog phone 7)\b/)) return 2024;
  if (normalized.match(/\b(13|100|x9a|v30|gt5|reno 10|edge 30|phone 1)\b/)) return 2023;
  return 2023;
}

function genericSortWeight(modelName: string) {
  const normalized = normalizeModelName(modelName).toLowerCase();
  const tier =
    normalized.includes("ultra") ? 9 :
    normalized.includes("fold") || normalized.includes("find n") || normalized.includes("magic v") ? 8 :
    normalized.includes("pro+") || normalized.includes("pro plus") ? 7 :
    normalized.includes("pro") ? 6 :
    normalized.includes("gt") || normalized.includes("rog") ? 5 :
    normalized.includes("plus") || normalized.includes("+") ? 4 :
    normalized.includes("note") || normalized.includes("reno") || normalized.includes("edge") ? 3 :
    normalized.includes("lite") || normalized.includes("play") ? 1 :
    2;

  return genericReleaseYear(modelName) * 100 + tier;
}

function withAppleModelImage<T extends DeviceData>(device: T): T {
  const brandName = device.brand?.name ?? "";
  if (brandName.toLowerCase() !== "apple") return device;

  const modelName = device.model?.name || device.name;
  const imageUrl = appleImageForModel(modelName) || device.image_url;

  return {
    ...device,
    image_url: imageUrl,
    release_year: device.release_year ?? appleReleaseYear(modelName),
  };
}

function withSamsungModelImage<T extends DeviceData>(device: T): T {
  const brandName = device.brand?.name ?? "";
  if (brandName.toLowerCase() !== "samsung") return device;

  const modelName = device.model?.name || device.name;
  const imageUrl = device.image_url || samsungImageForModel(modelName);

  return {
    ...device,
    image_url: imageUrl,
    release_year: device.release_year ?? samsungReleaseYear(modelName),
  };
}

function supplementSamsungDevices(devices: DeviceData[], category: SellDeviceCategory = "phone") {
  const seen = new Set(devices.map((device) => normalizeModelName(device.model?.name || device.name).toLowerCase()));
  const catalogDevices = category === "phone"
    ? SAMSUNG_RECENT_MODELS.map(([name, releaseYear]) => ({ name, releaseYear, category: "phone" as const }))
    : SAMSUNG_DEVICE_CATALOG
        .concat(SAMSUNG_DEVICE_CATALOG_2022_2023)
        .filter((device) => device.category === category)
        .map((device) => ({ ...device, releaseYear: Number(device.announced.slice(0, 4)) }));
  const supplemental = catalogDevices
    .filter(({ name }) => {
      const normalizedName = name.toLowerCase();
      if (seen.has(normalizedName)) return false;
      seen.add(normalizedName);
      return true;
    })
    .map(({ name, releaseYear }) => ({
      id: `samsung-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      image_url: samsungImageForModel(name),
      brand: { name: "Samsung" },
      model: { name },
      variant: { storage: undefined, ram: undefined, color: undefined },
      release_year: releaseYear,
      category,
    }));

  return dedupeSellModels([...devices, ...supplemental])
    .sort((a, b) => samsungSortWeight(b.model?.name || b.name) - samsungSortWeight(a.model?.name || a.name));
}

function supplementAppleDevices(devices: DeviceData[], category: SellDeviceCategory = "phone") {
  const seen = new Set(devices.map((device) => normalizeModelName(device.model?.name || device.name).toLowerCase()));
  const supplemental = APPLE_DEVICE_CATALOG
    .filter((device) => device.category === category)
    .filter(({ name }) => {
      const normalizedName = normalizeModelName(name).toLowerCase();
      if (seen.has(normalizedName)) return false;
      seen.add(normalizedName);
      return true;
    })
    .map(({ name, announced }) => ({
      id: `apple-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      image_url: appleImageForModel(name),
      brand: { name: "Apple" },
      model: { name },
      variant: { storage: undefined, ram: undefined, color: undefined },
      release_year: Number.parseInt(announced.slice(0, 4), 10),
      category,
    }));

  return dedupeSellModels([...devices, ...supplemental])
    .sort((a, b) => appleSortWeight(b.model?.name || b.name) - appleSortWeight(a.model?.name || a.name));
}

function withXiaomiModelImage<T extends DeviceData>(device: T): T {
  const brandName = device.brand?.name ?? "";
  if (brandName.toLowerCase() !== "xiaomi" && brandName.toLowerCase() !== "poco") return device;

  const modelName = device.model?.name || device.name;
  const imageUrl = device.image_url || xiaomiImageForModel(modelName);

  return {
    ...device,
    image_url: imageUrl,
    release_year: device.release_year ?? xiaomiReleaseYear(modelName),
  };
}

function supplementXiaomiDevices(devices: DeviceData[]) {
  const seen = new Set(devices.map((device) => normalizeModelName(device.model?.name || device.name).toLowerCase().replace(/\+/g, " plus")));
  const supplemental = XIAOMI_RECENT_MODELS
    .filter(([name]) => !seen.has(name.toLowerCase().replace(/\+/g, " plus")))
    .map(([name, releaseYear]) => ({
      id: `xiaomi-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      image_url: xiaomiImageForModel(name),
      brand: { name: "Xiaomi" },
      model: { name },
      variant: { storage: undefined, ram: undefined, color: undefined },
      release_year: releaseYear,
    }));

  return dedupeSellModels([...devices, ...supplemental])
    .sort((a, b) => xiaomiSortWeight(b.model?.name || b.name) - xiaomiSortWeight(a.model?.name || a.name));
}

function withGenericPhoneImage<T extends DeviceData>(device: T): T {
  const brandName = device.brand?.name ?? "";
  const normalizedBrand = brandName.toLowerCase();
  if (!GENERIC_PHONE_IMAGE_BRANDS.has(normalizedBrand)) return device;

  const modelName = device.model?.name || device.name;
  const imageUrl = device.image_url || genericImageForModel(brandName, modelName);

  return {
    ...device,
    image_url: imageUrl,
    release_year: device.release_year ?? genericReleaseYear(modelName),
  };
}

function supplementGenericBrandDevices(brandName: string, devices: DeviceData[]) {
  const normalizedBrand = brandName.toLowerCase();
  if (!GENERIC_PHONE_IMAGE_BRANDS.has(normalizedBrand)) return devices;

  const seen = new Set(devices.map((device) => slugifyPhoneName(device.model?.name || device.name)));
  const supplemental = PRODUCTS
    .filter((device) => device.brand.toLowerCase() === normalizedBrand)
    .filter((device) => !seen.has(slugifyPhoneName(device.model)))
    .map((device) => ({
      id: `arko-${device.id}`,
      name: device.model,
      slug: slugifyPhoneName(device.model),
      image_url: genericImageForModel(device.brand, device.model) || device.image,
      brand: { name: device.brand },
      model: { name: device.model },
      variant: { storage: undefined, ram: undefined, color: undefined },
      release_year: genericReleaseYear(device.model),
    }));

  return dedupeSellModels([...devices, ...supplemental])
    .sort((a, b) => genericSortWeight(b.model?.name || b.name) - genericSortWeight(a.model?.name || a.name))
    .slice(0, 80);
}

export const sellPhoneService = {
  // Synchronous catalog seeds keep the wizard usable while remote catalog data
  // refreshes in the background (or when Supabase is temporarily unavailable).
  getLocalBrands() {
    return getLocalSellBrands();
  },

  getLocalDevicesByBrand(brandName: string, category: SellDeviceCategory = "phone") {
    const normalizedBrandName = brandName.trim();
    const fallbackDevices = PRODUCTS
      .filter((device) => device.brand.toLowerCase() === normalizedBrandName.toLowerCase())
      .map((device) => ({
        id: `arko-${device.id}`,
        name: device.model,
        slug: device.model.toLowerCase().replace(/\s+/g, "-"),
        image_url:
          normalizedBrandName.toLowerCase() === "apple" ? appleImageForModel(device.model) || device.image :
          normalizedBrandName.toLowerCase() === "samsung" ? samsungImageForModel(device.model) || device.image :
          normalizedBrandName.toLowerCase() === "xiaomi" ? xiaomiImageForModel(device.model) || device.image :
          GENERIC_PHONE_IMAGE_BRANDS.has(normalizedBrandName.toLowerCase()) ? genericImageForModel(normalizedBrandName, device.model) || device.image :
          device.image,
        brand: { name: device.brand },
        model: { name: device.model },
        variant: { storage: undefined, ram: undefined, color: undefined },
        release_year:
          normalizedBrandName.toLowerCase() === "apple" ? appleReleaseYear(device.model) :
          normalizedBrandName.toLowerCase() === "samsung" ? samsungReleaseYear(device.model) :
          normalizedBrandName.toLowerCase() === "xiaomi" ? xiaomiReleaseYear(device.model) :
          GENERIC_PHONE_IMAGE_BRANDS.has(normalizedBrandName.toLowerCase()) ? genericReleaseYear(device.model) :
          undefined,
        category: "phone" as const,
      }))
      .sort((a, b) => {
        if (normalizedBrandName.toLowerCase() === "apple") {
          return appleSortWeight(b.model.name) - appleSortWeight(a.model.name);
        }
        if (normalizedBrandName.toLowerCase() === "samsung") {
          return samsungSortWeight(b.model.name) - samsungSortWeight(a.model.name);
        }
        if (normalizedBrandName.toLowerCase() === "xiaomi") {
          return xiaomiSortWeight(b.model.name) - xiaomiSortWeight(a.model.name);
        }
        if (GENERIC_PHONE_IMAGE_BRANDS.has(normalizedBrandName.toLowerCase())) {
          return genericSortWeight(b.model.name) - genericSortWeight(a.model.name);
        }
        return (b.release_year ?? 0) - (a.release_year ?? 0);
      })
      .slice(0, 50);

    if (normalizedBrandName.toLowerCase() === "apple") {
      return supplementAppleDevices(category === "phone" ? fallbackDevices : [], category).slice(0, 160);
    }
    if (normalizedBrandName.toLowerCase() === "samsung") {
      return supplementSamsungDevices(category === "phone" ? fallbackDevices : [], category).slice(0, 160);
    }
    if (category !== "phone") return [];
    if (normalizedBrandName.toLowerCase() === "xiaomi") {
      return supplementXiaomiDevices(fallbackDevices).slice(0, 60);
    }
    if (GENERIC_PHONE_IMAGE_BRANDS.has(normalizedBrandName.toLowerCase())) {
      return supplementGenericBrandDevices(normalizedBrandName, fallbackDevices);
    }
    return fallbackDevices;
  },

  // Get all brands with fallback to arkostoreData.
  // Real brands schema: logo (not logo_url) and string status (not is_active).
  async getBrands() {
    const { data, error } = await supabase
      .from("brands")
      .select("id, name, slug, logo, sort_order, status")
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .abortSignal(sellCatalogRequestSignal());

    // If DB fails or returns empty, use fallback
    if (!error && data && data.length > 0) {
      return sortSellBrands(
        (data as Array<{ id: string; name: string; slug: string; logo?: string | null; sort_order?: number }>).map(
          (brand) => ({
            id: brand.id,
            name: brand.name,
            slug: brand.slug,
            logo_url: brand.logo ?? undefined,
            active: true,
            sort_order: brand.sort_order,
          }) as BrandData,
        ),
      );
    }

    // Fallback: Generate from arkostoreData
    return getLocalSellBrands();
  },

  // Get popular devices for selection with fallback
  async getPopularDevices(limit = 20) {
    const { data, error } = await supabase
      .from("catalog_products")
      .select(`
        id, name, slug, image_url, brand:brands(name, logo), model:device_models(name),
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
      return (data as Array<Record<string, any>>).map((item) => ({
        ...item,
        brand: item.brand ? { name: item.brand.name, logo_url: item.brand.logo ?? undefined } : item.brand,
      }));
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
  async getDevicesByBrand(brandId: string, category: SellDeviceCategory = "phone", brandNameHint?: string) {
    // First try to get from brands table to find the brand name
    const { data: brandData } = await supabase
      .from("brands")
      .select("name")
      .eq("id", brandId)
      .abortSignal(sellCatalogRequestSignal())
      .single();

    const brandName = brandData?.name || brandNameHint || brandId;
    if (category !== "phone") {
      return this.getLocalDevicesByBrand(brandName, category);
    }

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
      .order("popularity_score", { ascending: false })
      .abortSignal(sellCatalogRequestSignal());

    // If DB has data, use it. Apple is normalized here so catalog rows without
    // images still show iPhone thumbnails and latest models first in the sell flow.
    if (!error && data && data.length > 0) {
      const normalized = (data as DeviceData[])
        .map(withAppleModelImage)
        .map(withSamsungModelImage)
        .map(withXiaomiModelImage)
        .map(withGenericPhoneImage);
      if (brandName.toLowerCase() === "apple") {
        return supplementAppleDevices(normalized);
      }
      if (brandName.toLowerCase() === "samsung") {
        return supplementSamsungDevices(normalized);
      }
      if (brandName.toLowerCase() === "xiaomi") {
        return supplementXiaomiDevices(normalized);
      }
      if (GENERIC_PHONE_IMAGE_BRANDS.has(brandName.toLowerCase())) {
        return supplementGenericBrandDevices(brandName, normalized);
      }
      return normalized;
    }

    // Fallback: Filter from arkostoreData
    return this.getLocalDevicesByBrand(brandName, category);
  },

  // Calculate valuation using database rules with fallback to arkostoreData
  async calculateValuation(request: ValuationRequest): Promise<ValuationOutcome> {
    // Only canonical database UUIDs may be passed to the typed RPC. Offline
    // catalog IDs are handled locally and must never trigger a UUID error.
    if (isDatabaseCatalogId(request.catalog_product_id)) {
      try {
        const { data, error } = await supabase
          .rpc("calculate_device_valuation", {
            p_catalog_product_id: request.catalog_product_id,
            p_storage: request.storage,
            p_condition: request.condition,
            p_defects: request.defects,
            p_age_months: request.age_months
          })
          .abortSignal(sellCatalogRequestSignal());

        if (!error && Number(data) > 0) {
          return this.finalizeValuationOutcome(Math.round(Number(data)), request, "database_rpc");
        }
      } catch {
        // Continue to the deterministic local fallback.
      }
    }

    // Get fallback price from catalog
    const basePrice = await getFallbackCatalogPrice(request.catalog_product_id);

    // If we have a catalog price, use it
    if (basePrice > 0) {
      return this.finalizeValuationOutcome(calculateFallbackValuation(basePrice, {
        storage: request.storage,
        condition: request.condition,
        defects: request.defects,
        age_months: request.age_months,
      }), request, "catalog_fallback");
    }

    // Final fallback: use arkostoreData with local estimation
    // This shouldn't happen often but ensures wizard works even with no data
    const floorPrice = Math.max(5000, Math.round(20000 * getConditionFactor(request.condition)));
    return this.finalizeValuationOutcome(floorPrice, request, "floor_fallback");
  },

  // Apply the shared inspection/exchange adjustments to a base valuation so
  // RPC-backed and locally-estimated quotes respond to the same inputs.
  finalizeValuationOutcome(basePrice: number, request: Pick<ValuationRequest, "inspection" | "mode">, source: ValuationOutcome["source"]): ValuationOutcome {
    const inspectionFactor = inspectionPriceFactor(request.inspection);
    const exchangeBonus = request.mode === "exchange" ? EXCHANGE_MODE_BONUS_FACTOR : 1;
    const estimated = Math.max(5000, Math.round(basePrice * inspectionFactor * exchangeBonus));
    return {
      estimated_price: estimated,
      base_price: basePrice,
      inspection_factor: inspectionFactor,
      exchange_bonus: exchangeBonus,
      source,
    };
  },

  // Save lead
  async saveLead(leadData: LeadData, userId?: string) {
    // If userId is provided (e.g., after signup), use it directly
    // Otherwise, fetch current session user
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: authData } = await supabase.auth.getUser();
      currentUserId = authData?.user?.id || undefined;
    }
    
    const email = normalizeEmail(leadData.customer_email);
    const phone = normalizePhone(leadData.customer_phone);
    if (!isValidEmail(email)) throw new Error("Invalid email address");
    if (!isValidNepalPhone(phone)) throw new Error("Invalid Nepal mobile number");
    if (leadData.imei && !isValidImei(leadData.imei)) throw new Error("Invalid IMEI");

    const inspectionDetails: Record<string, unknown> | undefined = leadData.inspection
      ? {
          ...leadData.inspection,
          exchange_mode: leadData.exchange_mode ?? false,
        }
      : leadData.exchange_mode
        ? { exchange_mode: true }
        : undefined;

    const canonicalPayload: Record<string, unknown> = {
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

    // Optional newer columns — retried without them when the live table lags
    // behind the latest migration.
    if (inspectionDetails) canonicalPayload.inspection_details = inspectionDetails;
    if (leadData.submission_key) canonicalPayload.submission_key = leadData.submission_key;

    const insertQuery = supabase
      .from("sell_phone_leads")
      .insert([canonicalPayload]);

    // Anonymous RLS permits INSERT but not SELECT. Avoid RETURNING for guests;
    // authenticated users can still receive the created row for history links.
    let data: Record<string, unknown> | null = null;
    let error: { message?: string; code?: string } | null = null;
    if (currentUserId) {
      const result = await insertQuery.select().single();
      data = result.data;
      error = result.error;
    } else {
      const result = await insertQuery;
      data = result.data;
      error = result.error;
    }

    // Table without the new optional columns yet — retry the canonical insert
    // without them before degrading to the legacy shape.
    if (error && isMissingColumnError(error) && (inspectionDetails || leadData.submission_key)) {
      const reducedPayload = { ...canonicalPayload };
      delete reducedPayload.inspection_details;
      delete reducedPayload.submission_key;
      const reducedQuery = supabase
        .from("sell_phone_leads")
        .insert([reducedPayload]);
      const reduced = currentUserId
        ? await reducedQuery.select().single()
        : { data: null, error: await reducedQuery };
      data = reduced.data;
      error = reduced.error;
    }

    // Anonymous clients may insert but cannot SELECT rows. A unique-key
    // conflict therefore means a previous attempt already persisted this lead;
    // acknowledge it without an unauthorized lookup.
    if (error?.code === "23505" && leadData.submission_key && !currentUserId) {
      await mirrorLeadQuote(leadData, phone, email, currentUserId);
      return { ...canonicalPayload, idempotent: true };
    }

    // Idempotent resubmission for authenticated users: return the existing
    // lead row so the caller can continue normally after a retry.
    if (error?.code === "23505" && leadData.submission_key) {
      const existing = await supabase
        .from("sell_phone_leads")
        .select()
        .eq("submission_key", leadData.submission_key)
        .maybeSingle();
      if (existing.data) return existing.data;
    }

    if (error?.code === "23514") {
      const constraintQuery = supabase
        .from("sell_phone_leads")
        .insert([{ ...canonicalPayload, condition: normalizeLegacyCondition(canonicalPayload.condition) }]);
      const constraintResult = currentUserId
        ? await constraintQuery.select().single()
        : { data: null, error: await constraintQuery };

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

      const legacyQuery = supabase
        .from("sell_phone_leads")
        .insert([legacyPayload]);
      const legacyResult = currentUserId
        ? await legacyQuery.select().single()
        : { data: null, error: await legacyQuery };

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

      await mirrorLeadQuote(leadData, phone, email, currentUserId);
      return fallbackLead;
    }

    if (error) throw error;

    await mirrorLeadQuote(leadData, phone, email, currentUserId);

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
  // Returns query params that pre-fill the sell wizard — URLSearchParams handles encoding
  getSellWizardLink(brand: string, model: string, storage?: string): string {
    const params = new URLSearchParams();
    params.set("from", "price-list");
    params.set("brand", brand);
    params.set("model", model);
    if (storage) params.set("storage", storage);
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
