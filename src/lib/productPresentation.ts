import type { Product } from "@/hooks/useProducts";
import { resolveMobileCatalogImage } from "@/data/mobileCatalogImages";

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/\+/g, " plus ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const NON_PRODUCT_IMAGE = /unsplash\.com|apple_logo|wikipedia.*apple|wikimedia.*apple|placeholder/i;

export function isTrustedProductImage(product: Pick<Product, "brand" | "image">, image?: string | null) {
  if (!image) return false;
  if (NON_PRODUCT_IMAGE.test(image)) return false;
  if (image.startsWith("/")) return true;
  if (!image.includes("gsmarena.com")) return true;

  const brand = slugify(product.brand || "");
  if (!brand) return true;
  return image.toLowerCase().includes(`/${brand}-`) || image.toLowerCase().includes(`-${brand}-`);
}

export function resolveProductDetailImage(product: Product) {
  const brand = slugify(product.brand || "");
  const modelName = product.name
    .replace(/\s*\([^)]*(?:gb|tb|ram|rom|\+|\/)\s*[^)]*\)\s*$/i, "")
    .trim();
  const name = slugify(modelName);

  // Uploaded and first-party images take precedence over catalog artwork.
  if (isTrustedProductImage(product, product.image) && !product.image?.includes("gsmarena.com")) {
    return product.image as string;
  }

  const verified = resolveMobileCatalogImage(name, brand);
  if (verified) return verified;
  return isTrustedProductImage(product, product.image) ? product.image : "/default-product.svg";
}

export function getProductAvailability(product: Pick<Product, "in_stock" | "price_value" | "price">) {
  const priceValue = Number(product.price_value);
  const hasPrice = Number.isFinite(priceValue) && priceValue > 0;
  const purchasable = product.in_stock === true && hasPrice;
  return {
    purchasable,
    hasPrice,
    status: purchasable ? "In stock" : "Out of stock",
    priceLabel: purchasable ? "Current selling price" : hasPrice ? "Last listed price" : "Price unavailable",
    displayPrice: hasPrice ? product.price : "Contact a verified seller",
  };
}
