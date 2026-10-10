import { describe, expect, it } from "vitest";
import { getDiscoveryTarget } from "./homeDiscoveryRoutes";

describe("homepage discovery destinations", () => {
  it("opens the buy tab for device searches", () => {
    expect(getDiscoveryTarget("products", "  iPhone 18  ")).toBe("/cat/mobiles?tab=buy&q=iPhone+18");
  });

  it("preserves Nepali and special characters safely", () => {
    const result = getDiscoveryTarget("preowned", "  नयाँ फोन & 5G  ");
    const url = new URL(result, "https://tamrakarcomplex.com");
    expect(url.pathname).toBe("/marketplace");
    expect(url.searchParams.get("q")).toBe("नयाँ फोन & 5G");
  });

  it("handles empty searches as browse intent", () => {
    expect(getDiscoveryTarget("products", " ")).toBe("/cat/mobiles?tab=buy");
    expect(getDiscoveryTarget("preowned", "")).toBe("/marketplace");
  });

  it("normalizes whitespace without losing search intent", () => {
    expect(getDiscoveryTarget("products", " Samsung \n Galaxy   S24 ")).toBe("/cat/mobiles?tab=buy&q=Samsung+Galaxy+S24");
  });
});
