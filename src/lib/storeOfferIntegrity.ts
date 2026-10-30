/**
 * Public store offers must come from real store-scoped database records.
 * Local directory references are not proof of inventory, stock or service pricing.
 */
export function isDatabaseStoreId(id: string | null | undefined): boolean {
  return typeof id === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * A successful empty result stays empty. A failed database query must not
 * turn into invented merchant offers or simulated in-stock inventory.
 */
export function requireAuthoritativeStoreRows<T>(
  data: T[] | null | undefined,
  error: unknown,
): T[] {
  if (error) throw error;
  return data ?? [];
}
