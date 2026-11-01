import { describe, expect, it } from "vitest";
import { requireOrderQueryData } from "@/lib/orderQueryResult";

describe("order query failure propagation", () => {
  it("throws the original order-list error instead of returning zero orders", () => {
    const failure = new Error("orders unavailable");
    expect(() => requireOrderQueryData({ data: null, error: failure }, "orders")).toThrow(failure);
  });

  it("throws the original store order-item lookup error", () => {
    const failure = new Error("store order lookup denied");
    expect(() => requireOrderQueryData({ data: null, error: failure }, "store order lookup")).toThrow(failure);
  });

  it("preserves genuinely empty successful results", () => {
    expect(requireOrderQueryData({ data: [], error: null }, "orders")).toEqual([]);
    expect(requireOrderQueryData({ data: [], error: null }, "store order lookup")).toEqual([]);
  });

  it("preserves successful populated results", () => {
    const rows = [{ id: "order-a" }];
    expect(requireOrderQueryData({ data: rows, error: null }, "orders")).toBe(rows);
  });

  it("fails closed on malformed null data without an explicit error", () => {
    expect(() => requireOrderQueryData({ data: null, error: null }, "orders")).toThrow("orders returned no data");
  });
});
