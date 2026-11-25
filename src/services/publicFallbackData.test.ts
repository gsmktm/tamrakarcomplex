import { describe, expect, it } from "vitest";
import { getFallbackMarketplaceListings, getFallbackProducts, getFallbackStoreCards } from "./publicFallbackData";
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

  it("does not represent offline store directory suggestions as verified paid merchants", () => {
    for (const store of getFallbackStoreCards(100)) {
      expect(store.is_verified).toBe(false);
      expect(store.subscription_status).toBeNull();
    }
  });
});
