import { describe, expect, it } from "vitest";
import { getProductAvailability, resolveProductDetailImage } from "./productPresentation";
import type { Product } from "@/hooks/useProducts";

const product = {
  id: "oneplus-11",
  name: "OnePlus 11 Pro",
  slug: "oneplus-11-pro-983-bngxh",
  brand: "OnePlus",
  price: "Rs. 46,835",
  price_value: 46835,
  image: "https://fdn2.gsmarena.com/vv/bigpic/google-pixel-8-pro.jpg",
  rating: 0,
  category: "Smartphones",
  in_stock: false,
} satisfies Product;

describe("product presentation", () => {
  it("treats an out-of-stock price as reference information", () => {
    expect(getProductAvailability(product)).toMatchObject({
      purchasable: false,
      status: "Out of stock",
      priceLabel: "Last listed price",
    });
  });

  it("only enables purchase when stock and a valid price are present", () => {
    expect(getProductAvailability({ ...product, in_stock: true }).purchasable).toBe(true);
    expect(getProductAvailability({ ...product, in_stock: true, price_value: 0 }).purchasable).toBe(false);
    expect(getProductAvailability({ ...product, in_stock: null }).purchasable).toBe(false);
    expect(getProductAvailability({ ...product, in_stock: undefined }).purchasable).toBe(false);
    expect(getProductAvailability({ ...product, in_stock: true, price_value: null }).purchasable).toBe(false);
    expect(getProductAvailability({ ...product, in_stock: true, price_value: -1 }).purchasable).toBe(false);
  });

  it("replaces mismatched imported artwork with verified model artwork", () => {
    expect(resolveProductDetailImage(product)).toBe("https://fdn2.gsmarena.com/vv/bigpic/oneplus-11.jpg");
  });

  it("resolves thumbnails when imported names contain RAM and storage suffixes", () => {
    expect(resolveProductDetailImage({
      ...product,
      name: "Xiaomi Redmi Note 15 5G (12+512GB)",
      brand: "Xiaomi",
      image: null,
    })).toBe("https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-15-5g.jpg");

    expect(resolveProductDetailImage({
      ...product,
      name: "Realme Realme C85 Pro (8+128GB)",
      brand: "Realme",
      image: null,
    })).toBe("https://fdn2.gsmarena.com/vv/bigpic/realme-c85-pro.jpg");
  });

  it("keeps an uploaded first-party product thumbnail", () => {
    const uploaded = "https://example.supabase.co/storage/v1/object/public/products/phone.webp";
    expect(resolveProductDetailImage({ ...product, image: uploaded })).toBe(uploaded);
  });
});
