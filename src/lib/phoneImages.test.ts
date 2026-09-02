import { describe, expect, it } from "vitest";
import { resolveListingImage } from "./phoneImages";

describe("resolveListingImage", () => {
  it("keeps an uploaded product image as the first choice", () => {
    expect(
      resolveListingImage(
        "Samsung S23 Ultra",
        "Samsung",
        ["https://storage.example/listing.webp"],
        "Galaxy S23 Ultra",
      ),
    ).toBe("https://storage.example/listing.webp");
  });

  it("replaces generic seed artwork with a matching GSMArena image", () => {
    expect(
      resolveListingImage(
        "Samsung S23 Ultra - Like New",
        "Samsung",
        ["https://images.unsplash.com/photo-example"],
        "Galaxy S23 Ultra",
      ),
    ).toBe(
      "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s23-ultra-5g.jpg",
    );
  });

  it("resolves iPhone listings without an uploaded image", () => {
    expect(resolveListingImage("iPhone 13 128GB Blue", "Apple", [], "iPhone 13")).toBe(
      "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13.jpg",
    );
  });
});
