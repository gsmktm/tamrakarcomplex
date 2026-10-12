import { describe, it, expect } from "vitest";
import { isConfirmedPaymentVerification } from "@/lib/paymentVerification";

describe("secure checkout verification response", () => {
  it("only confirms explicit server success", () => {
    expect(isConfirmedPaymentVerification({ success: true })).toBe(true);
    expect(isConfirmedPaymentVerification({ success: true, message: "Paid" })).toBe(true);
    expect(isConfirmedPaymentVerification({ success: false })).toBe(false);
    expect(isConfirmedPaymentVerification({ error: "Unreachable" })).toBe(false);
    expect(isConfirmedPaymentVerification(undefined)).toBe(false);
    expect(isConfirmedPaymentVerification({ success: "true" })).toBe(false);
    expect(isConfirmedPaymentVerification([])).toBe(false);
  });
});
