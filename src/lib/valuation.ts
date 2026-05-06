export type DeviceCondition = "new" | "like_new" | "used" | "fair";

export const CONDITION_LABELS: Record<DeviceCondition, string> = {
  new: "New",
  like_new: "Like New",
  used: "Used",
  fair: "Fair",
};

// Normalize legacy/other condition values into the edge-function schema.
export function normalizeCondition(value: string | null | undefined): DeviceCondition {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "new") return "new";
  if (v === "like_new" || v === "like new" || v === "excellent") return "like_new";
  if (v === "used" || v === "good") return "used";
  if (v === "fair" || v === "poor") return "fair";
  return "used";
}

export type ValuationEstimatePayload = {
  brand?: string;
  model?: string;
  canonical_slug?: string;
  variant?: string | null;
  storage?: string | null;
  ram?: string | null;
  condition: DeviceCondition;
  defects?: string[];
  ageMonths?: number;
};

export type ValuationEstimateResponse = {
  device_id: string | null;
  base_price: number;
  condition_factor: number;
  defect_adjustment: number;
  age_adjustment: number;
  demand_factor: number;
  quoted_value: number;
  confidence: number;
};

export function slugifyDeviceKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function normalizeStorage(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, "");
  // Accept "256", "256GB", "1TB", "1024"
  if (/^\d+$/.test(cleaned)) return `${cleaned}GB`;
  const upper = cleaned.toUpperCase();
  if (/^\d+GB$/.test(upper) || /^\d+TB$/.test(upper)) return upper;
  return raw;
}

