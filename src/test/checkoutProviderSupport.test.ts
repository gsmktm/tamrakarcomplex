import { describe, it, expect } from "vitest";
import { constrainCheckoutMethods } from "@/lib/checkoutProviderSupport";
describe("checkout payment provider contract", () => {
  it("does not advertise ready payment methods outside the atomic checkout SQL", () => {
    expect(constrainCheckoutMethods([
      { slug: "esewa", is_ready: true },
      { slug: "cod", is_ready: true },
      { slug: "khalti", is_ready: true },
    ])).toEqual([
      { slug: "esewa", is_ready: true },
      { slug: "cod", is_ready: true },
      { slug: "khalti", is_ready: false },
    ]);
  });
  it("preserves disabled methods instead of enabling them", () => {
    expect(constrainCheckoutMethods([{ slug: "esewa", is_ready: false }]))
      .toEqual([{ slug: "esewa", is_ready: false }]);
  });
});
