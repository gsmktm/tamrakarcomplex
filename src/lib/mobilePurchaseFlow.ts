const PURCHASE_WHATSAPP_NUMBER = "9779851091542";

export interface MobilePurchaseRequest {
  modelName: string;
  modelSlug: string;
  variantLabel?: string;
  price?: number;
}

export function buildMobilePurchaseWhatsAppUrl({
  modelName,
  modelSlug,
  variantLabel,
  price,
}: MobilePurchaseRequest): string {
  const productUrl = `${window.location.origin}/mobile/${modelSlug}`;
  const lines = [
    `Hello Tamrakar Complex, I want to buy ${modelName}.`,
    variantLabel ? `Variant: ${variantLabel}` : undefined,
    price && price > 0 ? `Listed price: NPR ${price.toLocaleString("en-NP")}` : undefined,
    `Product: ${productUrl}`,
    "Please confirm stock, store, warranty, and final buying price.",
  ].filter(Boolean);

  return `https://wa.me/${PURCHASE_WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export function formatPhoneVariant(
  variant: { ram?: string | null; storage?: string | null; color?: string | null } | null | undefined,
): string {
  return [variant?.ram, variant?.storage, variant?.color].filter(Boolean).join(" / ");
}
