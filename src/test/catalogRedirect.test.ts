import { describe, expect, it } from "vitest";
import { buildBuyCatalogDestination } from "@/lib/catalogRoutes";

describe("Buy catalog navigation", () => {
  it("keeps a shopper's search term through the buy redirect", () => {
    expect(buildBuyCatalogDestination("?q=iPhone%2018")).toBe("/cat/mobiles?q=iPhone+18&tab=buy");
  });
  it("preserves brand, price, category, and fragment", () => {
    expect(buildBuyCatalogDestination("?brand=Samsung&minPrice=20000&category=Phones", "#filters"))
      .toBe("/cat/mobiles?brand=Samsung&minPrice=20000&category=Phones&tab=buy#filters");
  });
  it("forces the buy tab while retaining all other query fields", () => {
    expect(buildBuyCatalogDestination("?tab=compare&q=Galaxy")).toBe("/cat/mobiles?tab=buy&q=Galaxy");
  });
  it("works for navigation without filters", () => {
    expect(buildBuyCatalogDestination()).toBe("/cat/mobiles?tab=buy");
  });
});
