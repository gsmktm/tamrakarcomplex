import { describe, expect, it } from "vitest";
import { resolveProductDetailImage } from "./productPresentation";
import type { Product } from "@/hooks/useProducts";

const product: Product = {
  id: "catalog-image-identity",
  name: "Samsung Galaxy S22 Ultra",
  slug: "samsung-galaxy-s22-ultra",
  brand: "Samsung",
  price: "Contact seller",
  price_value: null,
  image: "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s24-ultra-5g-sm-s928.jpg",
  rating: null,
  category: "Smartphones",
  in_stock: false,
};

describe("catalog image identity guard", () => {
  it("does not show a different model's GSMArena image just because the brand matches", () => {
    // No verified S22 Ultra image is mapped in the checked-in catalog.
    // A Samsung S24 Ultra image is not an acceptable fallback for it.
    expect(resolveProductDetailImage(product)).toBe("/default-product.svg");
  });

  it("prefers exact-model verified artwork over a same-brand mismatched import", () => {
    expect(
      resolveProductDetailImage({
        ...product,
        name: "Samsung Galaxy A07",
        slug: "samsung-galaxy-a07",
      }),
    ).toBe("https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a07.jpg");
  });

  it("preserves first-party merchant uploads for unmatched catalog models", () => {
    const uploaded = "https://example.supabase.co/storage/v1/object/public/products/s22-ultra.webp";
    expect(resolveProductDetailImage({ ...product, image: uploaded })).toBe(uploaded);
  });

  it("still rejects an unrelated-brand catalog image", () => {
    expect(
      resolveProductDetailImage({
        ...product,
        image: "https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15.jpg",
      }),
    ).toBe("/default-product.svg");
  });
});
