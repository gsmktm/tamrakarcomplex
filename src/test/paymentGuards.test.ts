import { describe, expect, it } from "vitest";
import { assertMatchingPaymentMethod, parseEsewaVerification } from "../../supabase/functions/_shared/paymentGuards";

describe("payment provider matches the recorded order", () => {
  it("permits matching gateway or cash methods", () => {
    expect(() => assertMatchingPaymentMethod("esewa", "esewa")).not.toThrow();
    expect(() => assertMatchingPaymentMethod("cod", "cod")).not.toThrow();
  });
  it("rejects switching an unpaid order to COD or another provider", () => {
    expect(() => assertMatchingPaymentMethod("esewa", "cod")).toThrow(/does not match/);
    expect(() => assertMatchingPaymentMethod("khalti", "esewa")).toThrow(/does not match/);
    expect(() => assertMatchingPaymentMethod("esewa", null)).toThrow(/does not match/);
  });
});

describe("eSewa callback normalization", () => {
  it("reads v2 signed payload fields with the order ID from the URL", () => {
    expect(parseEsewaVerification({
      orderId: "order-123",
      transaction_data: { transaction_uuid: "tx-123", total_amount: "500.00", status: "COMPLETE" },
    })).toEqual({ orderId: "order-123", amount: "500.00", referenceId: "tx-123" });
  });
  it("preserves legacy callback compatibility", () => {
    expect(parseEsewaVerification({ oid: "order-123", amt: "500", refId: "ref-456" }))
      .toEqual({ orderId: "order-123", amount: "500", referenceId: "ref-456" });
  });
  it("rejects malformed gateway callbacks", () => {
    expect(() => parseEsewaVerification({ orderId: "abc", transaction_data: {} })).toThrow();
    expect(() => parseEsewaVerification({ oid: "abc", amt: "not-a-number", refId: "tx" })).toThrow();
  });
});
