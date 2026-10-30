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

  it("does not substitute another model's photo for an unverified Pro variant", () => {
    // The OnePlus 11 Pro slug has no verified matching artwork in the catalog.
    expect(resolveMobileCatalogImage("oneplus-11-pro", "oneplus")).toBeUndefined();
    expect(resolveMobileCatalogImage("oneplus-11", "oneplus")).toBe(
      "https://fdn2.gsmarena.com/vv/bigpic/oneplus-11.jpg",
    );
  });

  it("preserves a merchant-uploaded image for a model without verified artwork", () => {
    expect(
      resolveMobileCatalogImage(
        "oneplus-11-pro",
        "oneplus",
        "https://example.com/merchant-confirmed-pro.webp",
      ),
    ).toBe("https://example.com/merchant-confirmed-pro.webp");
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
