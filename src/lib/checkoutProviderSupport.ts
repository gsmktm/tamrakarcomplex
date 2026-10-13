/**
 * Public checkout availability must match the checked-in SQL contract.
 * Migration 20260826090000_atomic_idempotent_checkout.sql only accepts
 * 'cod' and 'esewa'. Do not expose Khalti as selectable until the actual
 * Tamrakar database, migration and sandbox payment flow are verified.
 */
export const CHECKOUT_DB_PAYMENT_METHODS = ["cod", "esewa"] as const;

export function constrainCheckoutMethods<T extends { slug: string; is_ready: boolean }>(
  methods: readonly T[],
): T[] {
  return methods.map(method => ({
    ...method,
    is_ready: method.is_ready &&
      CHECKOUT_DB_PAYMENT_METHODS.some(supported => supported === method.slug),
  }));
}
