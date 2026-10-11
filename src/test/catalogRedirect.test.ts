import { describe, expect, it } from "vitest";
import { getCatalogRedirectDestination } from "@/lib/catalogRedirect";

describe("getCatalogRedirectDestination", () => {
  it("preserves product filters and the search query when visiting old buy routes", () => {
    const destination = getCatalogRedirectDestination("?brand=Apple&q=iPhone%2018&sort=price_value&order=asc");
    expect(destination.startsWith("/cat/mobiles?")).toBe(true);
    const params = new URL(destination, "https://tamrakarcomplex.com").searchParams;
    expect(params.get("brand")).toBe("Apple");
    expect(params.get("q")).toBe("iPhone 18");
    expect(params.get("sort")).toBe("price_value");
    expect(params.get("order")).toBe("asc");
    expect(params.get("tab")).toBe("buy");
  });

  it("overrides non-buy legacy tab values and retains anchors", () => {
    expect(getCatalogRedirectDestination("?tab=compare", "#items"))
      .toBe("/cat/mobiles?tab=buy#items");
  });

  it("supports the alias with no additional query", () => {
    expect(getCatalogRedirectDestination("")).toBe("/cat/mobiles?tab=buy");
  });
});
