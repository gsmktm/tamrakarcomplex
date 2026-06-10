import { describe, it, expect } from "vitest";
import {
  computeLine,
  computeOrderTotal,
  assertStoreAssigned,
  resolveInitialOrderStatus,
  assertAmountMatches,
  isAlreadyPaid,
  splitPayouts,
  type ResolvedProduct,
} from "../../supabase/functions/_shared/commerce";

const product = (over: Partial<ResolvedProduct> = {}): ResolvedProduct => ({
  id: "p1",
  name: "iPhone 16",
  price_npr: 185000,
  store_id: "store-1",
  ...over,
});

describe("checkout — server-authoritative totals", () => {
  it("recomputes line total from DB price, ignoring client price/total", () => {
    const line = computeLine({ product_id: "p1", quantity: 2, price: 1, total: 1 }, product());
    expect(line.unit_price).toBe(185000);
    expect(line.total_price).toBe(370000); // not the client-sent 1
  });

  it("rejects non-positive DB price", () => {
    expect(() => computeLine({ product_id: "p1" }, product({ price_npr: 0 }))).toThrow(/Invalid price/);
  });

  it("order total is the sum of DB-recomputed lines", () => {
    const lines = [
      computeLine({ product_id: "a", quantity: 1 }, product({ id: "a", price_npr: 100 })),
      computeLine({ product_id: "b", quantity: 3 }, product({ id: "b", price_npr: 50 })),
    ];
    expect(computeOrderTotal(lines)).toBe(250);
  });

  it("floors/clamps quantity to >= 1 integer", () => {
    expect(computeLine({ product_id: "p1", quantity: 2.9 }, product()).quantity).toBe(2);
    expect(computeLine({ product_id: "p1", quantity: 0 }, product()).quantity).toBe(1);
    expect(computeLine({ product_id: "p1", quantity: -5 }, product()).quantity).toBe(1);
  });
});

describe("store_id mandatory for store-sold products", () => {
  it("throws when a store-path product has no store_id", () => {
    expect(() => assertStoreAssigned(product({ store_id: null }), true)).toThrow(/missing a store assignment/);
  });
  it("allows null store_id for catalog (house) path", () => {
    expect(() => assertStoreAssigned(product({ store_id: null }), false)).not.toThrow();
  });
});

describe("order status by payment method", () => {
  it("COD -> confirmed", () => expect(resolveInitialOrderStatus("cod")).toBe("confirmed"));
  it("eSewa -> pending_payment", () => expect(resolveInitialOrderStatus("esewa")).toBe("pending_payment"));
  it("khalti -> pending_payment", () => expect(resolveInitialOrderStatus("khalti")).toBe("pending_payment"));
});

describe("payment tampering & idempotency", () => {
  it("accepts exact amount match", () => {
    expect(() => assertAmountMatches(185000, "185000")).not.toThrow();
  });
  it("rejects inflated/deflated callback amount", () => {
    expect(() => assertAmountMatches(185000, 1)).toThrow(/amount mismatch/);
    expect(() => assertAmountMatches(185000, 999999)).toThrow(/amount mismatch/);
  });
  it("treats already-paid as idempotent (no double settle)", () => {
    expect(isAlreadyPaid("paid")).toBe(true);
    expect(isAlreadyPaid("pending")).toBe(false);
  });
});

describe("payout split — money routes to correct store", () => {
  it("aggregates commissions into one net payout per store", () => {
    const payouts = splitPayouts([
      { store_id: "s1", gross_amount: 100, commission_amount: 10 },
      { store_id: "s1", gross_amount: 200, commission_amount: 20 },
      { store_id: "s2", gross_amount: 50, commission_amount: 5 },
    ]);
    const s1 = payouts.find((p) => p.store_id === "s1")!;
    const s2 = payouts.find((p) => p.store_id === "s2")!;
    expect(s1.net_amount).toBe(270); // (100-10)+(200-20)
    expect(s1.commission_total).toBe(30);
    expect(s2.net_amount).toBe(45); // 50-5
    expect(payouts).toHaveLength(2);
  });

  it("gross = net + commission invariant holds per store", () => {
    const rows = [{ store_id: "s1", gross_amount: 1000, commission_amount: 123 }];
    const [p] = splitPayouts(rows);
    expect(p.net_amount + p.commission_total).toBe(1000);
  });
});
