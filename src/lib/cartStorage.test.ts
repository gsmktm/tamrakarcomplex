import { describe, expect, it } from "vitest";
import { restoreCartFromStorage } from "./cartStorage";

const validProduct = {
  id: "store-product-1",
  name: "Verified Store Device",
  slug: "verified-store-device",
  price: "NPR 12,500",
  price_value: 12500,
  brand: "Example",
  image: null,
  rating: null,
  category: "Smartphones",
};

describe("restoreCartFromStorage", () => {
  it("restores valid cart entries and preserves product metadata", () => {
    const saved = [{ product: validProduct, quantity: 2 }];
    expect(restoreCartFromStorage(() => JSON.stringify(saved))).toEqual(saved);
  });

  it("returns an empty cart for invalid JSON and non-array roots", () => {
    expect(restoreCartFromStorage(() => "{broken")).toEqual([]);
    expect(restoreCartFromStorage(() => JSON.stringify({ cart: [] }))).toEqual([]);
    expect(restoreCartFromStorage(() => "null")).toEqual([]);
    expect(restoreCartFromStorage(() => null)).toEqual([]);
  });

  it("ignores malformed rows without discarding valid entries", () => {
    const saved = [
      null,
      { product: validProduct, quantity: 1 },
      { product: validProduct, quantity: "2" },
      { product: { ...validProduct, id: "bad-zero" }, quantity: 0 },
      { product: { ...validProduct, id: "bad-negative" }, quantity: -2 },
      { product: { ...validProduct, id: "bad-fraction" }, quantity: 1.5 },
      { product: { ...validProduct, id: "bad-name", name: null }, quantity: 1 },
      { product: { ...validProduct, id: "bad-slug", slug: null }, quantity: 1 },
      { product: { ...validProduct, id: "bad-price", price: null }, quantity: 1 },
      { product: validProduct, quantity: 4 },
      { product: { ...validProduct, id: "store-product-2" }, quantity: 3 },
    ];
    expect(restoreCartFromStorage(() => JSON.stringify(saved))).toEqual([
      { product: validProduct, quantity: 1 },
      { product: { ...validProduct, id: "store-product-2" }, quantity: 3 },
    ]);
  });

  it("does not crash when browser storage is blocked", () => {
    expect(restoreCartFromStorage(() => {
      throw new Error("SecurityError: storage disabled");
    })).toEqual([]);
  });

  it("does not accept missing product identity or unsafe quantities", () => {
    const saved = [
      { product: { ...validProduct, id: "" }, quantity: 1 },
      { product: { ...validProduct, name: "" }, quantity: 1 },
      { product: { ...validProduct, id: "unsafe-quantity" }, quantity: Number.MAX_SAFE_INTEGER + 1 },
    ];
    expect(restoreCartFromStorage(() => JSON.stringify(saved))).toEqual([]);
  });
});
