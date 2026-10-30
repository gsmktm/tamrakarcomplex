import type { Product } from "@/hooks/useProducts";

export type RestoredCartItem = {
  product: Product;
  quantity: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Browser storage is user-controlled and can contain stale or malformed data.
 * Restore only structurally usable cart entries so one bad value cannot crash
 * the entire storefront. Server checkout still verifies price and inventory.
 */
export function restoreCartFromStorage(read: () => string | null): RestoredCartItem[] {
  try {
    const stored = read();
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    const seenIds = new Set<string>();
    const restored: RestoredCartItem[] = [];

    for (const entry of parsed) {
      if (!isRecord(entry) || !isRecord(entry.product)) continue;
      const product = entry.product;
      const quantity = entry.quantity;

      if (
        typeof product.id !== "string" || !product.id.trim() ||
        typeof product.name !== "string" || !product.name.trim() ||
        typeof product.slug !== "string" || !product.slug.trim() ||
        typeof product.price !== "string" ||
        !Number.isSafeInteger(quantity) || (quantity as number) < 1 ||
        seenIds.has(product.id)
      ) {
        continue;
      }

      seenIds.add(product.id);
      restored.push({ product: product as Product, quantity: quantity as number });
    }

    return restored;
  } catch {
    // Storage can be blocked or contain invalid JSON. Start with an empty cart.
    return [];
  }
}
