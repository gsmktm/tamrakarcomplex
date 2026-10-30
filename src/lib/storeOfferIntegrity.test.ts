import { describe, expect, it } from "vitest";
import { isDatabaseStoreId, requireAuthoritativeStoreRows } from "./storeOfferIntegrity";

describe("store detail commerce integrity", () => {
  it("accepts only database UUID store identifiers for merchant inventory queries", () => {
    expect(isDatabaseStoreId("b4e4a596-74f7-4b5e-9a4d-6d9b9d915a11")).toBe(true);
    expect(isDatabaseStoreId("i-fix-nepal-shop-25")).toBe(false);
    expect(isDatabaseStoreId("")).toBe(false);
    expect(isDatabaseStoreId(undefined)).toBe(false);
  });

  it("does not invent stock when the store has no inventory records", () => {
    expect(requireAuthoritativeStoreRows(null, null)).toEqual([]);
    expect(requireAuthoritativeStoreRows([], null)).toEqual([]);
  });

  it("preserves genuine merchant-provided inventory unchanged", () => {
    const rows = [{ id: "real-1", store_id: "store-uuid", stock_quantity: 2, price: 500 }];
    expect(requireAuthoritativeStoreRows(rows, null)).toBe(rows);
  });

  it("propagates failed inventory, accessory and repair queries rather than fabricating offers", () => {
    const error = new Error("database unavailable");
    expect(() => requireAuthoritativeStoreRows(null, error)).toThrow(error);
    expect(() => requireAuthoritativeStoreRows([{ id: "stale" }], error)).toThrow(error);
  });
});
