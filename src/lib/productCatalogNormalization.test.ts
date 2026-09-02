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
});
