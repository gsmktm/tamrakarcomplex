import { describe, expect, it, vi } from "vitest";
import { buildMobilePurchaseWhatsAppUrl, formatPhoneVariant } from "./mobilePurchaseFlow";

describe("mobile purchase flow", () => {
  it("formats the selected variant without empty separators", () => {
    expect(formatPhoneVariant({ ram: "4GB", storage: "64GB", color: null })).toBe("4GB / 64GB");
  });

  it("builds a prefilled WhatsApp buying request with model, variant, price, and URL", () => {
    vi.stubGlobal("window", { location: { origin: "http://127.0.0.1:4173" } });

    const url = buildMobilePurchaseWhatsAppUrl({
      modelName: "Galaxy A07",
      modelSlug: "samsung-galaxy-a07",
      variantLabel: "4GB / 64GB",
      price: 18999,
    });

    expect(url).toContain("https://wa.me/9779851091542?text=");
    const message = decodeURIComponent(url.split("?text=")[1]);
    expect(message).toContain("Galaxy A07");
    expect(message).toContain("4GB / 64GB");
    expect(message).toContain("NPR 18,999");
    expect(message).toContain("http://127.0.0.1:4173/mobile/samsung-galaxy-a07");
  });
});
