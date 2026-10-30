import { describe, expect, it } from "vitest";
import { getFallbackProducts, queryFallbackProducts } from "./publicFallbackData";

describe("reference-only product fallback catalog", () => {
  it("never fabricates purchasable stock, ratings or featured merchant offers", () => {
    const products = getFallbackProducts();
    expect(products.length).toBeGreaterThan(0);
    for (const product of products) {
      expect(product.source_site).toBe("local-fallback");
      expect(product.in_stock).toBe(false);
      expect(product.rating).toBeNull();
      expect(product.featured).toBe(false);
      expect(product.description).toContain("not a verified merchant offer");
      expect(product.created_at).toBeUndefined();
      expect(product.updated_at).toBeUndefined();
    }
  });

  it("keeps reference items non-purchasable after catalog search and pagination", () => {
    const result = queryFallbackProducts({ page: 1, pageSize: 10 });
    expect(result.total).toBeGreaterThan(0);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((product) => product.in_stock === false)).toBe(true);
  });
});
