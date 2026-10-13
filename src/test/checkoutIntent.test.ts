import { describe, expect, it } from "vitest";
import { checkoutIntentFingerprint, type CheckoutIntent } from "@/lib/checkoutIntent";

const base: CheckoutIntent = {
  payment_method: "cod",
  shipping_address: { address: "New Road", city: "Kathmandu" },
  contact_info: { name: "Test Customer", phone: "9812345678", email: "user@example.com" },
  items: [{ product_id: "p1", source_type: "product", store_product_id: null, store_id: null, quantity: 1 }],
};

describe("checkout idempotency intent", () => {
  it("uses one key for identical retries", () => {
    expect(checkoutIntentFingerprint(base)).toBe(checkoutIntentFingerprint({ ...base, items: [...base.items] }));
  });
  it("requires a new idempotency key when payment or order contents change", () => {
    const initial = checkoutIntentFingerprint(base);
    expect(checkoutIntentFingerprint({ ...base, payment_method: "esewa" })).not.toBe(initial);
    expect(checkoutIntentFingerprint({ ...base, items: [{ ...base.items[0], quantity: 2 }] })).not.toBe(initial);
    expect(checkoutIntentFingerprint({ ...base, shipping_address: { ...base.shipping_address, city: "Pokhara" } })).not.toBe(initial);
  });
});
