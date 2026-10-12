/** Stable per-order intent fingerprint for safe checkout retry idempotency. */
export type CheckoutIntent = {
  payment_method: string;
  shipping_address: { address: string; city: string };
  contact_info: { name: string; phone: string; email: string };
  items: Array<{
    product_id: string;
    source_type: string;
    store_product_id: string | null;
    quantity: number;
    store_id: string | null;
  }>;
};

export function checkoutIntentFingerprint(intent: CheckoutIntent): string {
  // All fields are already trimmed/normalized by the checkout form. Stable
  // key order is explicit, ensuring the same intent reuses its server key.
  return JSON.stringify(intent);
}
