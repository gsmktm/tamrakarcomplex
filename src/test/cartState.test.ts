import { describe, expect, it } from "vitest";
import { normalizeStoredCart, safeCartQuantity, MAX_CART_ITEM_QUANTITY } from "@/lib/cartState";

const product = { id: "product-1", name: "Demo device", slug: "demo-device", price: "Rs. 1,000" };
describe("cart normalization", () => {
  it("rejects invalid localStorage structures instead of crashing", () => {
    expect(normalizeStoredCart(null)).toEqual([]);
    expect(normalizeStoredCart({ cart: [] })).toEqual([]);
    expect(normalizeStoredCart("not an array")).toEqual([]);
    expect(normalizeStoredCart([{ product: null, quantity: 1 }])).toEqual([]);
    expect(normalizeStoredCart([{ product, quantity: Infinity }])).toEqual([]);
    expect(normalizeStoredCart([{ product: { ...product, price_value: -1 }, quantity: 1 }])).toEqual([]);
  });
  it("clamps inventory quantities to checkout server bounds", () => {
    expect(safeCartQuantity(12)).toBe(MAX_CART_ITEM_QUANTITY);
    expect(safeCartQuantity(1.5)).toBeNull();
    expect(safeCartQuantity(-3)).toBeNull();
    expect(safeCartQuantity(Number.NaN)).toBeNull();
  });
  it("deduplicates browser-cart items and caps their combined quantity", () => {
    const cart = normalizeStoredCart([
      { product, quantity: 8 },
      { product, quantity: 8 },
      { product: { ...product, id: "product-2" }, quantity: 1 },
    ]);
    expect(cart.map(item => [item.product.id, item.quantity]))
      .toEqual([["product-1", 10], ["product-2", 1]]);
  });
  it("rejects excess distinct entries beyond the secure checkout maximum", () => {
    const many = Array.from({ length: 55 }, (_, n) => ({
      product: { ...product, id: "product-" + n },
      quantity: 1,
    }));
    expect(normalizeStoredCart(many)).toHaveLength(50);
  });
});
