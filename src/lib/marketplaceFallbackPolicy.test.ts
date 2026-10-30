import { describe, expect, it } from "vitest";
import { assertMarketplaceSourcesAvailable, emptyMarketplaceResult } from "./marketplaceFallbackPolicy";

describe("marketplace fail-closed policy", () => {
  it("does not synthesize offers when the marketplace has no records", () => {
    expect(emptyMarketplaceResult<{ id: string; status: string }>()).toEqual({
      listings: [],
      total: 0,
    });
  });

  it("reports an outage when both real listing sources fail", () => {
    expect(() => assertMarketplaceSourcesAvailable(new Error("store products unavailable"), new Error("user listings unavailable")))
      .toThrow("Marketplace listings are temporarily unavailable");
  });

  it("allows real user listings if only store products are unavailable", () => {
    expect(() => assertMarketplaceSourcesAvailable(new Error("store products unavailable"), null)).not.toThrow();
  });

  it("allows real store products if only user listings are unavailable", () => {
    expect(() => assertMarketplaceSourcesAvailable(null, new Error("user listings unavailable"))).not.toThrow();
  });

  it("does not treat two successful empty sources as an outage", () => {
    expect(() => assertMarketplaceSourcesAvailable(null, null)).not.toThrow();
  });
});
