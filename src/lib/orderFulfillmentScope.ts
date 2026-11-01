/**
 * Fail closed until the UI has an explicit per-store fulfillment selector.
 * A user who manages two stores in the same order must not advance both
 * stores from a single order-level button.
 * RLS remains the authoritative authorization boundary.
 */
export interface StoreOrderFulfillment {
  id: string;
  store_id: string;
  status: string;
}

export function getSingleAuthorizedFulfillment(
  fulfillments: StoreOrderFulfillment[] | null | undefined,
  authorizedStoreIds: readonly string[],
): StoreOrderFulfillment | null {
  const authorized = new Set(authorizedStoreIds.filter(Boolean));
  if (authorized.size === 0) return null;

  const candidates = (fulfillments ?? []).filter(
    (fulfillment) => fulfillment?.id && authorized.has(fulfillment.store_id),
  );

  return candidates.length === 1 ? candidates[0] : null;
}
