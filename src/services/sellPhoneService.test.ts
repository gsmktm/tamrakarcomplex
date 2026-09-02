import { describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateFallbackValuation,
  isDatabaseCatalogId,
  sellPhoneService,
} from "./sellPhoneService";

describe("sell phone valuation flow", () => {
  it("only sends canonical UUID catalog IDs to the database RPC", () => {
    expect(isDatabaseCatalogId("f17b5f67-b29c-4c74-8a75-5489d5462d8c")).toBe(true);
    expect(isDatabaseCatalogId("arko-400000")).toBe(false);
    expect(isDatabaseCatalogId("samsung-galaxy-f06-5g")).toBe(false);
  });

  it("applies condition, age, storage, and defect deductions", () => {
    expect(calculateFallbackValuation(100_000, {
      storage: "256GB",
      condition: "used",
      defects: ["battery_weak"],
      age_months: 12,
    })).toBe(58_234);
  });

  it("clamps invalid age and very low estimates safely", () => {
    expect(calculateFallbackValuation(6_000, {
      storage: "64GB",
      condition: "fair",
      defects: ["screen_crack"],
      age_months: 999,
    })).toBe(5_000);
  });

  it("completes an offline Samsung valuation without calling the UUID RPC", async () => {
    const rpc = vi.spyOn(supabase, "rpc");

    await expect(sellPhoneService.calculateValuation({
      catalog_product_id: "samsung-galaxy-f06-5g",
      storage: "128GB",
      condition: "used",
      defects: [],
      age_months: 12,
    })).resolves.toBe(13_600);

    expect(rpc).not.toHaveBeenCalled();
    rpc.mockRestore();
  });

  it("keeps phones, tablets, and watches in separate catalog flows", () => {
    const applePhones = sellPhoneService.getLocalDevicesByBrand("Apple", "phone");
    const appleTablets = sellPhoneService.getLocalDevicesByBrand("Apple", "tablet");
    const appleWatches = sellPhoneService.getLocalDevicesByBrand("Apple", "watch");

    expect(applePhones.some((device) => device.model?.name.startsWith("iPhone 17e"))).toBe(true);
    expect(applePhones.some((device) => device.model?.name.includes("iPad"))).toBe(false);
    expect(appleTablets.some((device) => device.model?.name === "iPad (2025)")).toBe(true);
    expect(appleTablets.every((device) => device.category === "tablet")).toBe(true);
    expect(appleWatches.some((device) => device.model?.name === "Watch Ultra 3")).toBe(true);
    expect(appleWatches.every((device) => device.category === "watch")).toBe(true);
  });

  it("provides an image for every iPhone generation in the local sell catalog", () => {
    const applePhones = sellPhoneService.getLocalDevicesByBrand("Apple", "phone");

    expect(applePhones.length).toBeGreaterThan(20);
    expect(applePhones.every((device) => Boolean(device.image_url))).toBe(true);
    expect(applePhones.find((device) => device.model?.name === "iPhone 12 Pro Max")?.image_url)
      .toBe("https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-12-pro-max.jpg");
    expect(applePhones.find((device) => device.model?.name === "iPhone 3GS")?.image_url)
      .toBe("https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-3gs.jpg");
  });

  it("shows one model card instead of duplicating storage variants", () => {
    const applePhones = sellPhoneService.getLocalDevicesByBrand("Apple", "phone");
    const modelNames = applePhones.map((device) => device.model?.name);

    expect(modelNames.filter((name) => name === "iPhone 17e")).toHaveLength(1);
    expect(modelNames.filter((name) => name === "iPhone 17 Pro Max")).toHaveLength(1);
    expect(modelNames.some((name) => name?.includes("(256GB)"))).toBe(false);
    expect(new Set(modelNames).size).toBe(modelNames.length);
  });
});
