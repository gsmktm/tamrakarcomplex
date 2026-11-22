/** Cart-only quantity validation. Checkout must independently validate quantities server-side. */
export const isValidCartQuantity = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

export function sanitizePersistedCart<T extends { product: { id: string }; quantity: number }>(
  value: unknown,
): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is T =>
    item !== null &&
    typeof item === "object" &&
    item.product !== null &&
    typeof item.product === "object" &&
    typeof item.product.id === "string" &&
    item.product.id.length > 0 &&
    isValidCartQuantity(item.quantity)
  );
}
