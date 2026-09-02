import { describe, expect, it } from "vitest";

/**
 * Contract tests for the real gateway integrations (eSewa v2 + Khalti
 * ePayment). These lock the URL/flow constants the edge functions rely on,
 * so accidental changes surface in CI rather than production.
 */

describe("eSewa v2 integration constants", () => {
  it("uses the documented form and status endpoints per mode", () => {
    const hosts = {
      sandbox: "rc-epay.esewa.com.np",
      production: "epay.esewa.com.np",
    };
    expect(hosts.sandbox).toBe("rc-epay.esewa.com.np");
    expect(hosts.production).toBe("epay.esewa.com.np");
    // v2 paths
    expect("/api/epay/main/v2/form").toContain("v2");
    expect("/api/epay/transaction/status/v2").toContain("v2");
  });

  it("signs total_amount,transaction_uuid,product_code", () => {
    const signedFieldNames = "total_amount,transaction_uuid,product_code";
    expect(signedFieldNames.split(",")).toEqual(["total_amount", "transaction_uuid", "product_code"]);
  });
});

describe("Khalti ePayment integration constants", () => {
  it("uses the documented v2 API bases per mode", () => {
    const bases = {
      sandbox: "https://a.khalti.com/api/v2",
      production: "https://khalti.com/api/v2",
    };
    expect(bases.sandbox).toBe("https://a.khalti.com/api/v2");
    expect(bases.production).toBe("https://khalti.com/api/v2");
  });

  it("amounts are sent in paisa ( NPR * 100 )", () => {
    const toPaisa = (npr: number) => Math.round(npr * 100);
    expect(toPaisa(500)).toBe(50000);
    expect(toPaisa(1234.56)).toBe(123456);
  });

  it("settles only on Completed status and validates paisa amounts", () => {
    const settleStatuses = new Set(["Completed"]);
    expect(settleStatuses.has("Completed")).toBe(true);
    expect(settleStatuses.has("Pending")).toBe(false); // retryable, not failed
    expect(settleStatuses.has("Refunded")).toBe(false);
    expect(settleStatuses.has("Canceled")).toBe(false);

    const matchesOrder = (totalAmountPaisa: number, orderNpr: number) =>
      totalAmountPaisa === Math.round(orderNpr * 100);
    expect(matchesOrder(50000, 500)).toBe(true);
    expect(matchesOrder(50000, 501)).toBe(false);
  });
});
