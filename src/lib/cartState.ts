import type { Product } from "@/hooks/useProducts";

export interface StoredCartItem {
  product: Product;
  quantity: number;
}

/** Checkout edge functions enforce their own max quantity of ten per item. */
export const MAX_CART_ITEM_QUANTITY = 10;
export const MAX_CART_DISTINCT_ITEMS = 50;

export function safeCartQuantity(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) return null;
  if (value <= 0) return null;
  return Math.min(value, MAX_CART_ITEM_QUANTITY);
}

/** Local storage is untrusted; malformed or stale entries must not crash the app. */
export function normalizeStoredCart(value: unknown): StoredCartItem[] {
  if (!Array.isArray(value)) return [];
  const byId = new Map<string, StoredCartItem>();
  for (const entry of value.slice(0, 250)) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    const product = record.product;
    if (typeof product !== "object" || product === null || Array.isArray(product)) continue;
    const p = product as Record<string, unknown>;
    if (typeof p.id !== "string" || !p.id.trim() ||
        typeof p.name !== "string" || !p.name.trim() ||
        typeof p.price !== "string" ||
        (p.price_value != null && (typeof p.price_value !== "number" || !Number.isFinite(p.price_value) || p.price_value < 0))) {
      continue;
    }
    const quantity = safeCartQuantity(record.quantity);
    if (quantity === null) continue;
    const id = p.id.trim();
    const existing = byId.get(id);
    if (existing) {
      existing.quantity = Math.min(MAX_CART_ITEM_QUANTITY, existing.quantity + quantity);
      continue;
    }
    if (byId.size >= MAX_CART_DISTINCT_ITEMS) break;
    byId.set(id, { product: product as Product, quantity });
  }
  return [...byId.values()];
}

/** All displayed cart totals are estimates; secure checkout recalculates on the server. */
export function cartItemIdentity(product: Pick<Product, "id">): string {
  return product.id;
}
