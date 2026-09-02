import { describe, expect, it } from "vitest";
import { resolveMobileCatalogImage } from "./mobileCatalogImages";

describe("resolveMobileCatalogImage", () => {
  it("resolves canonical model slugs", () => {
    expect(resolveMobileCatalogImage("samsung-galaxy-a07", "samsung")).toBe(
      "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a07.jpg",
    );
  });

  it("normalizes duplicated brand prefixes from price-list imports", () => {
    expect(resolveMobileCatalogImage("poco-poco-x8-pro", "poco")).toBe(
      "https://fdn2.gsmarena.com/vv/bigpic/xiaomi-poco-x8-pro.jpg",
    );
    expect(resolveMobileCatalogImage("vivo-vivo-v70-fe", "vivo")).toBe(
      "https://fdn2.gsmarena.com/vv/bigpic/vivo-v70-fe.jpg",
    );
  });

  it("always prefers an admin-uploaded database image", () => {
    expect(
      resolveMobileCatalogImage(
        "poco-poco-x8-pro",
        "poco",
        "https://example.com/uploaded-phone.webp",
      ),
    ).toBe("https://example.com/uploaded-phone.webp");
  });
});
