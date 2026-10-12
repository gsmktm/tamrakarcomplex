/**
 * Payment boundaries shared by Edge Function handlers.
 * Keep this file dependency-free so Deno and Vitest execute identical rules.
 */
export function assertMatchingPaymentMethod(recorded: unknown, requested: unknown): void {
  if (typeof recorded !== "string" || typeof requested !== "string" ||
      !recorded || !requested || recorded !== requested) {
    throw new Error("Payment method does not match the order");
  }
}

type JsonObject = Record<string, unknown>;

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Accepts both eSewa legacy verification and v2 signed return field names. */
export function parseEsewaVerification(body: JsonObject): {
  orderId: string;
  amount: string | number;
  referenceId: string;
} {
  const payload = body.transaction_data && typeof body.transaction_data === "object" &&
    !Array.isArray(body.transaction_data)
    ? body.transaction_data as JsonObject
    : {};

  const orderId = nonEmptyString(body.orderId) ?? nonEmptyString(body.order_id) ??
    nonEmptyString(body.oid) ?? nonEmptyString(payload.oid);
  const amount = body.amount ?? body.amt ?? payload.total_amount ?? payload.amt;
  const referenceId = nonEmptyString(body.refId) ?? nonEmptyString(body.ref_id) ??
    nonEmptyString(body.rid) ?? nonEmptyString(payload.transaction_uuid) ??
    nonEmptyString(payload.refId);

  if (!orderId || !referenceId ||
      !(typeof amount === "string" || typeof amount === "number") ||
      !String(amount).trim() || !Number.isFinite(Number(amount)) || Number(amount) < 0) {
    throw new Error("Missing or invalid eSewa verification data");
  }
  return { orderId, amount, referenceId };
}
