import { describe, expect, it } from "vitest";
import { secureGatewayUrl } from "@/lib/paymentRedirect";

describe("payment gateway outbound URLs", () => {
  it("accepts encrypted external checkout destinations", () => {
    expect(secureGatewayUrl("https://gateway.example/pay?order=123"))
      .toBe("https://gateway.example/pay?order=123");
  });
  it("rejects unencrypted, script, relative, and userinfo redirects", () => {
    for (const bad of [
      "http://gateway.example/pay",
      "javascript:alert(1)",
      "//gateway.example/pay",
      "/order-success?paid=1",
      "https://username:password@gateway.example/pay",
      "",
      null,
    ]) expect(secureGatewayUrl(bad)).toBeNull();
  });
});
