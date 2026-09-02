import { describe, expect, it } from "vitest";
import { normalizeProductSlug } from "./productSlug";

describe("normalizeProductSlug", () => {
  it("removes punctuation copied after a product URL", () => {
    expect(normalizeProductSlug("asus-rog-phone-7-pro-974-c2oxg.")).toBe(
      "asus-rog-phone-7-pro-974-c2oxg",
    );
  });

  it("handles encoded punctuation and surrounding slashes", () => {
    expect(normalizeProductSlug("/iphone-15-pro%21/")).toBe("iphone-15-pro");
  });

  it("keeps valid internal slug characters", () => {
    expect(normalizeProductSlug("Galaxy-S24-Ultra-5G")).toBe("galaxy-s24-ultra-5g");
  });
});

