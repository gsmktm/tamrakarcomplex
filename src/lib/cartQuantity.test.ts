import { describe, expect, it } from "vitest";
import { isValidCartQuantity, sanitizePersistedCart } from "./cartQuantity";

describe("cart quantity integrity", () => {
  it("accepts positive safe integers only", () => {
    expect(isValidCartQuantity(1)).toBe(true);
    expect(isValidCartQuantity(3)).toBe(true);
    for (const value of [0, -2, 1.5, NaN, Infinity, -Infinity, "2", null, undefined, Number.MAX_SAFE_INTEGER + 1]) {
      expect(isValidCartQuantity(value)).toBe(false);
    }
  });

  it("recovers from malformed storage and drops invalid entries", () => {
    expect(sanitizePersistedCart({})).toEqual([]);
    expect(sanitizePersistedCart(null)).toEqual([]);
    const good = { product: { id: "synthetic", price_value: 100 }, quantity: 2 };
    const bad = [
      null, {}, { product: null, quantity: 1 },
      { product: { id: "" }, quantity: 1 },
      { product: { id: "bad" }, quantity: -2 },
      { product: { id: "bad" }, quantity: "2" },
      { product: { id: "bad" }, quantity: null },
    ];
    expect(sanitizePersistedCart([good, ...bad])).toEqual([good]);
  });
});
