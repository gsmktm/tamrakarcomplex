export type MarketplaceContactProduct = {
  id: string;
  title: string;
  price: number;
  condition?: string | null;
  storeName?: string | null;
};

export function normalizeWhatsAppNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("9")) digits = `977${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) digits = `977${digits.slice(1)}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export function buildMarketplacePurchaseMessage(product: MarketplaceContactProduct, listingUrl: string) {
  const lines = [
    "Namaste! I found this product on Tamrakar Complex and would like to buy it:",
    "",
    `Product: ${product.title}`,
    `Price: NPR ${Number(product.price).toLocaleString("en-IN")}`,
  ];
  if (product.condition) lines.push(`Condition: ${product.condition.replace(/_/g, " ")}`);
  if (product.storeName) lines.push(`Store: ${product.storeName}`);
  lines.push(`Listing ID: ${product.id}`, `View: ${listingUrl}`, "", "Is it available? Please confirm the final price and delivery or pickup options.");
  return lines.join("\n");
}

export function buildWhatsAppPurchaseUrl(phone: string | null | undefined, product: MarketplaceContactProduct, listingUrl: string) {
  const number = normalizeWhatsAppNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(buildMarketplacePurchaseMessage(product, listingUrl))}`;
}
