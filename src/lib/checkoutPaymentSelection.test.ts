import { describe, expect, it } from "vitest";
import { chooseReadyPaymentMethod } from "./checkoutPaymentSelection";

describe("chooseReadyPaymentMethod", () => {
  it("replaces a registered but unready COD default with the first ready provider", () => {
    const methods = [
      { slug: "cod", is_ready: false },
      { slug: "bank", is_ready: true },
      { slug: "wallet", is_ready: true },
    ];
    expect(chooseReadyPaymentMethod(methods, "cod")).toBe("bank");
  });

  it("preserves the customer's ready selection when registry order changes", () => {
    const methods = [
      { slug: "bank", is_ready: true },
      { slug: "cod", is_ready: true },
    ];
    expect(chooseReadyPaymentMethod(methods, "cod")).toBe("cod");
  });

  it("falls back when a previously selected provider becomes unready", () => {
    const methods = [
      { slug: "wallet", is_ready: false },
      { slug: "cod", is_ready: true },
    ];
    expect(chooseReadyPaymentMethod(methods, "wallet")).toBe("cod");
  });

  it("clears selection if no payment method is ready", () => {
    expect(chooseReadyPaymentMethod([{ slug: "cod", is_ready: false }], "cod")).toBe("");
    expect(chooseReadyPaymentMethod([], "cod")).toBe("");
  });

  it("chooses the first ready provider for an unknown or missing selection", () => {
    const methods = [
      { slug: "cod", is_ready: false },
      { slug: "bank", is_ready: true },
    ];
    expect(chooseReadyPaymentMethod(methods, "missing")).toBe("bank");
    expect(chooseReadyPaymentMethod(methods, "")).toBe("bank");
  });
});
