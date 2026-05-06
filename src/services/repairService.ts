import { supabase } from "@/integrations/supabase/client";
import { isValidEmail, isValidNepalPhone, normalizeEmail, normalizePhone, sanitizeOptionalText, sanitizeText } from "@/lib/security";

export const REPAIR_STATUSES = [
  "new",
  "assigned",
  "inspection",
  "repairing",
  "ready",
  "completed",
  "cancelled",
] as const;

export type RepairStatus = (typeof REPAIR_STATUSES)[number];

export type RepairRequestInput = {
  user_id?: string | null;
  assigned_store_id?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  device_brand: string;
  device_model: string;
  issue_type: string;
  description?: string | null;
  images?: string[];
  estimated_cost?: number | null;
  final_cost?: number | null;
  status?: RepairStatus;
  preferred_date?: string | null;
  guide_id?: string | null;
  device_id?: string | null;
};

export type RepairRequestRecord = RepairRequestInput & {
  id: string;
  tracking_id: string;
  status: RepairStatus;
  created_at: string;
  updated_at: string;
  stores?: { name: string; package_slug?: string | null } | null;
};

export type EligibleRepairStore = {
  id: string;
  name: string;
  package_slug: "gold" | "diamond" | string;
};

function isMissingColumnError(error: { message?: string; code?: string } | null) {
  const message = (error?.message ?? "").toLowerCase();
  const code = error?.code ?? "";
  return code === "42703" || message.includes("does not exist") || message.includes("column");
}

export function repairStatusLabel(status: string | null | undefined) {
  const normalized = status === "in_progress" ? "repairing" : status === "pending" ? "new" : status;
  if (normalized === "new") return "New";
  if (normalized === "assigned") return "Assigned";
  if (normalized === "inspection") return "Inspection";
  if (normalized === "repairing") return "Repairing";
  if (normalized === "ready") return "Ready";
  if (normalized === "completed") return "Completed";
  if (normalized === "cancelled") return "Cancelled";
  return "New";
}

export async function createRepairRequest(values: RepairRequestInput): Promise<RepairRequestRecord> {
  const phone = normalizePhone(values.phone);
  if (!isValidNepalPhone(phone)) throw new Error("Invalid Nepal mobile number");
  const email = values.email ? normalizeEmail(values.email) : null;
  if (email && !isValidEmail(email)) throw new Error("Invalid email address");

  const payload = {
    ...values,
    user_id: values.user_id ?? null,
    name: sanitizeText(values.name, 120),
    phone,
    email,
    device_brand: sanitizeText(values.device_brand, 80),
    device_model: sanitizeText(values.device_model, 120),
    issue_type: sanitizeText(values.issue_type, 80),
    description: sanitizeOptionalText(values.description, 3000),
    assigned_store_id: values.assigned_store_id ?? null,
    images: values.images ?? [],
    estimated_cost: values.estimated_cost ?? null,
    final_cost: values.final_cost ?? null,
    status: values.status ?? "new",
  };

  const attempt = await supabase.from("repair_requests").insert(payload).select("*").single();
  if (!attempt.error) return attempt.data as RepairRequestRecord;

  if (!isMissingColumnError(attempt.error)) throw attempt.error;

  const legacyPayload = {
    user_id: payload.user_id,
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    device_brand: payload.device_brand,
    device_model: payload.device_model,
    issue_type: payload.issue_type,
    description: payload.description,
    preferred_date: payload.preferred_date,
    status: "pending",
  };

  const fallback = await supabase.from("repair_requests").insert(legacyPayload).select("*").single();
  if (fallback.error) throw fallback.error;
  return fallback.data as RepairRequestRecord;
}

export async function getEligibleRepairStores(): Promise<EligibleRepairStore[]> {
  const rpc = await supabase.rpc("get_eligible_repair_stores");
  if (!rpc.error) return (rpc.data ?? []) as EligibleRepairStore[];

  const fallback = await supabase
    .from("stores")
    .select("id, name, package_slug")
    .eq("status", "active")
    .eq("subscription_status", "active")
    .in("package_slug", ["gold", "diamond"])
    .order("package_slug", { ascending: true })
    .order("name", { ascending: true });

  if (fallback.error) throw fallback.error;
  return (fallback.data ?? []) as EligibleRepairStore[];
}
