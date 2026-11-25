import { describe, expect, it } from "vitest";
import { getFallbackMarketplaceListings, getFallbackProducts } from "./publicFallbackData";
import { getProductAvailability } from "@/lib/productPresentation";

describe("public offline/reference data", () => {
  it("never pretends reference products are verified inventory", () => {
    const products = getFallbackProducts();
    expect(products.length).toBeGreaterThan(0);
    for (const p of products) {
      expect(p.source_site).toBe("local-fallback");
      expect(p.in_stock).toBe(false);
      expect(p.rating).toBeNull();
      expect(getProductAvailability(p).purchasable).toBe(false);
    }
  });

  it("does not invent owner listings, seller locations or negotiated used prices", () => {
    expect(getFallbackMarketplaceListings(100)).toEqual([]);
  });
});
