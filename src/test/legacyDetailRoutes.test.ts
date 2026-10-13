import { describe, expect, it } from "vitest";
import { legacyDetailDestination } from "@/lib/legacyDetailRoutes";

describe("legacy detail redirects", () => {
  it("preserves search and fragment when moving a brand route", () => {
    expect(legacyDetailDestination("/cat/mobiles", "Samsung", "?sort=price", "#models"))
      .toBe("/cat/mobiles/Samsung?sort=price#models");
  });
  it("encodes slashes rather than allowing injected route segments", () => {
    expect(legacyDetailDestination("/mobile", "iphone/17")).toBe("/mobile/iphone%2F17");
  });
  it("falls back to a directory when the parameter is absent", () => {
    expect(legacyDetailDestination("/stores", undefined)).toBe("/stores");
  });
  it("preserves query/hash on legacy store links", () => {
    expect(legacyDetailDestination("/stores", "new-road-shop", "?ref=merchant", "#contact"))
      .toBe("/stores/new-road-shop?ref=merchant#contact");
  });
});
