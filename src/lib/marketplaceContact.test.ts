import { describe, expect, it } from "vitest";
import { buildMarketplacePurchaseMessage, buildWhatsAppPurchaseUrl, normalizeWhatsAppNumber } from "./marketplaceContact";

describe("marketplace WhatsApp contact", () => {
  it("normalizes common Nepal phone formats", () => {
    expect(normalizeWhatsAppNumber("9851091542")).toBe("9779851091542");
    expect(normalizeWhatsAppNumber("+977-9851091542")).toBe("9779851091542");
    expect(normalizeWhatsAppNumber("invalid")).toBeNull();
  });

  it("includes the exact product context in a purchase message", () => {
    const message = buildMarketplacePurchaseMessage({ id: "abc", title: "iPhone 17 Pro Max", price: 199999, condition: "Brand New", storeName: "EvoStore" }, "https://tamrakarcomplex.com/marketplace/listing/abc");
    expect(message).toContain("iPhone 17 Pro Max");
    expect(message).toContain("NPR 1,99,999");
    expect(message).toContain("Listing ID: abc");
    expect(message).toContain("Is it available?");
  });

  it("encodes the message into a wa.me deep link", () => {
    const url = buildWhatsAppPurchaseUrl("9851091542", { id: "abc", title: "Phone", price: 1000 }, "https://example.com/abc");
    expect(url).toMatch(/^https:\/\/wa\.me\/9779851091542\?text=/);
  });
});
