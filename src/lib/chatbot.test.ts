import { describe, expect, it } from "vitest";
import { normalizeChatbotConfig, sanitizeChatbotAnswer } from "./chatbot";

describe("chatbot privacy", () => {
  it("locks contact collection and shop-contact display off", () => {
    const config = normalizeChatbotConfig({
      require_contact: true,
      auto_create_customer: true,
      show_store_contacts: true,
      business_info: { phone: "+977 9851091542" },
    });

    expect(config.require_contact).toBe(false);
    expect(config.auto_create_customer).toBe(false);
    expect(config.show_store_contacts).toBe(false);
    expect(config.business_info.phone).toBeUndefined();
  });

  it("replaces a shop contact response and removes shop cards", () => {
    const result = sanitizeChatbotAnswer({
      ok: true,
      intent: "store_contact",
      answer: "Call Example Shop at 9851091542.",
      stores: [{ name: "Example Shop", phone: "9851091542" }],
    });

    expect(result.answer).toContain("does not show individual shop details");
    expect(result.answer).not.toMatch(/9851091542|Example Shop/);
    expect(result.stores).toEqual([]);
  });

  it("keeps useful offer data but strips shop identity and phone numbers", () => {
    const result = sanitizeChatbotAnswer({
      ok: true,
      intent: "price",
      answer: "The price is Rs. 50,000. Call 9800000000.",
      store_offers: [{
        title: "Galaxy S25",
        price_sale: 50000,
        store_name: "Private Shop",
        store_phone: "9800000000",
        store_location: "New Road",
      }],
    });

    expect(result.answer).toBe("The price is Rs. 50,000. Call [contact hidden].");
    expect(result.store_offers).toEqual([{ title: "Galaxy S25", price_sale: 50000 }]);
  });
});
