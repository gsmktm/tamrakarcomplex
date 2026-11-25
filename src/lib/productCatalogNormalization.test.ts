import { describe, expect, it } from "vitest";
import { canonicalProductKey, formatNprPrice, groupDuplicateProducts, parseNprPrice } from "./productCatalogNormalization";

const product = (overrides: Record<string, unknown> = {}) => ({
  id: "1", name: "OnePlus 11 Pro", slug: "oneplus-11-pro-983", brand: "OnePlus", price: "Rs. 46,835", price_value: 46835,
  source_site: "gsmarena-mock", in_stock: false, ...overrides,
});

describe("product catalog normalization", () => {
  it("groups random-slug copies by normalized brand and model", () => {
    expect(canonicalProductKey(product())).toBe(canonicalProductKey(product({ id: "2", slug: "oneplus-11-pro-858" })));
  });

  it("keeps the higher-quality canonical record and reports price conflicts", () => {
    const groups = groupDuplicateProducts([
      product(),
      product({ id: "2", slug: "oneplus-11-pro", source_site: "evostore.com.np", in_stock: true, price_value: 89999 }),
    ]);
    expect(groups[0].primary.id).toBe("2");
    expect(groups[0].duplicates.map((row) => row.id)).toEqual(["1"]);
    expect(groups[0].hasPriceConflict).toBe(true);
  });

  it("parses and formats NPR prices consistently", () => {
    expect(parseNprPrice("NPR 1,39,999")).toBe(139999);
    expect(formatNprPrice(139999)).toBe("Rs. 1,39,999");
    expect(() => parseNprPrice("Contact us")).toThrow();
  });

  it("accepts familiar Nepalese price entry formats", () => {
    expect(parseNprPrice("Rs. 46,835")).toBe(46835);
    expect(parseNprPrice("Rs. 1,000/-")).toBe(1000);
    expect(parseNprPrice("रु. 500")).toBe(500);
    expect(parseNprPrice("1200")).toBe(1200);
  });

  it("rejects negative, misleading, zero and malformed prices", () => {
    for (const value of ["-500", "Rs. -500", "USD 500", "500abc", "1e6", "1.2.3", "0", "Rs. 0", "Infinity", "123.456"]) {
      expect(() => parseNprPrice(value)).toThrow("Enter a valid price greater than zero");
    }
  });
});
