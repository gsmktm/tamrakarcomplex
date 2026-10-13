import { describe, it, expect } from "vitest";
import { getSearchResultDestination } from "@/lib/searchResultDestination";

describe("getSearchResultDestination", () => {
  it("honors explicit canonical mobile product routes", () => {
    expect(getSearchResultDestination({ type: "product", slug: "iphone-17", href: "/mobile/iphone-17" }))
      .toBe("/mobile/iphone-17");
  });

  it("uses the standard product path when no explicit route exists", () => {
    expect(getSearchResultDestination({ type: "product", slug: "iphone-17" }))
      .toBe("/product/iphone-17");
  });

  it("routes stores, articles, guides and services correctly", () => {
    expect(getSearchResultDestination({ type: "store", slug: "new-road-shop" }))
      .toBe("/stores/new-road-shop");
    expect(getSearchResultDestination({ type: "article", slug: "review" }))
      .toBe("/stores/article/review");
    expect(getSearchResultDestination({ type: "guide", slug: "screen-repair" }))
      .toBe("/guide/screen-repair");
    expect(getSearchResultDestination({ type: "service", slug: "repair", href: "/repair" }))
      .toBe("/repair");
  });

  it("does not navigate to an external or script URL from result metadata", () => {
    expect(getSearchResultDestination({ type: "product", slug: "safe", href: "javascript:alert(1)" }))
      .toBe("/product/safe");
    expect(getSearchResultDestination({ type: "store", slug: "safe", href: "/" + "/example.com" }))
      .toBe("/stores/safe");
  });

  it("encodes unsafe path characters in fallback routes", () => {
    expect(getSearchResultDestination({ type: "product", slug: "phone/20" }))
      .toBe("/product/phone%2F20");
  });
});
