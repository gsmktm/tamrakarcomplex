/** Only server-returned repair records can confirm a booking on the success page. */
export type ConfirmedRepair = {
  trackingId: string;
  brand: string;
  model: string;
  issue: string;
  estimatedCost: number | null;
};

export function parseConfirmedRepair(data: unknown, requestedId: string): ConfirmedRepair | null {
  const expected = requestedId.trim().toUpperCase();
  if (!expected) return null;
  // The tracking RPC may return either a one-row array or a single object.
  const row = Array.isArray(data) ? (data.length === 1 ? data[0] : null) : data;
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const fields = row as Record<string, unknown>;
  if (typeof fields.tracking_id !== "string") return null;
  const trackingId = fields.tracking_id.trim().toUpperCase();
  if (!trackingId || trackingId !== expected) return null;

  const text = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 200) : "";
  const cost = fields.estimated_cost;
  return {
    trackingId,
    brand: text(fields.device_brand),
    model: text(fields.device_model),
    issue: text(fields.issue_type),
    estimatedCost: typeof cost === "number" && Number.isFinite(cost) && cost > 0 ? cost : null,
  };
}
