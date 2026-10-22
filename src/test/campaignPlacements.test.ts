import { describe, expect, it } from "vitest";
import {
  isCampaignRunning, safeCampaignImage, safeCampaignPath,
  type MarketingCampaign,
} from "@/hooks/useCampaignPlacement";

const base: MarketingCampaign = {
  id: "demo", title: "Test campaign", subtitle: "Campaign terms",
  image_url: "/festival/tihar-offer.svg", link_url: "/buy",
  button_text: "Explore", placement: "home_hero", is_active: true,
  starts_at: null, ends_at: null, sort_order: 0,
};

describe("campaign public safety", () => {
  it("rejects external links, protocol-relative links and script schemes", () => {
    expect(safeCampaignPath("/buy?brand=Apple")).toBe("/buy?brand=Apple");
    expect(safeCampaignPath("//bad.example")).toBeNull();
    expect(safeCampaignPath("https://bad.example")).toBeNull();
    expect(safeCampaignPath("javascript:alert(1)")).toBeNull();
    expect(safeCampaignPath("/buy\nx")).toBeNull();
  });

  it("allows only root-relative or HTTPS artwork", () => {
    expect(safeCampaignImage("/festival/tihar-offer.svg")).toBe("/festival/tihar-offer.svg");
    expect(safeCampaignImage("https://images.example/test.png")).toBe("https://images.example/test.png");
    expect(safeCampaignImage("http://images.example/test.png")).toBeNull();
    expect(safeCampaignImage("data:image/svg+xml,<svg/>")).toBeNull();
  });

  it("shows a promotion inside inclusive-start exclusive-end window only", () => {
    const start = "2026-11-07T00:00:00.000Z", end = "2026-11-13T00:00:00.000Z";
    const campaign = { ...base, starts_at: start, ends_at: end };
    expect(isCampaignRunning(campaign, Date.parse(start) - 1)).toBe(false);
    expect(isCampaignRunning(campaign, Date.parse(start))).toBe(true);
    expect(isCampaignRunning(campaign, Date.parse(end) - 1)).toBe(true);
    expect(isCampaignRunning(campaign, Date.parse(end))).toBe(false);
    expect(isCampaignRunning({ ...campaign, is_active: false }, Date.parse(start))).toBe(false);
    expect(isCampaignRunning({ ...campaign, ends_at: "bad" }, Date.parse(start))).toBe(false);
  });

  it("supports evergreen campaigns without synthetic end dates", () => {
    expect(isCampaignRunning(base)).toBe(true);
  });
});
