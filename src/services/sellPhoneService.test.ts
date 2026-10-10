import { describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateFallbackValuation,
  inspectionPriceFactor,
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
    })).resolves.toMatchObject({ estimated_price: 13_600, base_price: 13_600, source: "floor_fallback" });

    expect(rpc).not.toHaveBeenCalled();
    rpc.mockRestore();
  });

  it("applies the full inspection model to the valuation outcome", async () => {
    const rpc = vi.spyOn(supabase, "rpc");

    const baseline = await sellPhoneService.calculateValuation({
      catalog_product_id: "samsung-galaxy-f06-5g",
      storage: "128GB",
      condition: "used",
      defects: [],
      age_months: 12,
    });

    const damaged = await sellPhoneService.calculateValuation({
      catalog_product_id: "samsung-galaxy-f06-5g",
      storage: "128GB",
      condition: "used",
      defects: [],
      age_months: 12,
      inspection: {
        battery_health: 60,
        display_condition: "cracked",
        camera_condition: "faulty",
        biometric_status: "not_working",
        water_damage: true,
        is_repaired: true,
      },
    });

    const wellKept = await sellPhoneService.calculateValuation({
      catalog_product_id: "samsung-galaxy-f06-5g",
      storage: "128GB",
      condition: "used",
      defects: [],
      age_months: 12,
      inspection: {
        battery_health: 98,
        display_condition: "perfect",
        camera_condition: "perfect",
        biometric_status: "working",
        box_available: true,
        bill_available: true,
        warranty_available: true,
        accessories_available: true,
      },
    });

    const exchange = await sellPhoneService.calculateValuation({
      catalog_product_id: "samsung-galaxy-f06-5g",
      storage: "128GB",
      condition: "used",
      defects: [],
      age_months: 12,
      mode: "exchange",
    });

    expect(damaged.estimated_price).toBeLessThan(baseline.estimated_price);
    expect(wellKept.estimated_price).toBeGreaterThan(baseline.estimated_price);
    expect(exchange.estimated_price).toBeGreaterThan(baseline.estimated_price);
    expect(exchange.inspection_factor).toBe(1);
    expect(exchange.exchange_bonus).toBeCloseTo(1.05);

    expect(rpc).not.toHaveBeenCalled();
    rpc.mockRestore();
  });

  it("keeps the inspection price factor within a safe clamp", () => {
    expect(inspectionPriceFactor(undefined)).toBe(1);
    expect(inspectionPriceFactor({ water_damage: true, is_repaired: true, battery_health: 40, display_condition: "cracked", camera_condition: "faulty", biometric_status: "not_working" }))
      .toBe(0.75);
    expect(inspectionPriceFactor({ battery_health: 100, box_available: true, bill_available: true, warranty_available: true, accessories_available: true }))
      .toBeCloseTo(1.04);
  });

  it("does not request a returned row for anonymous lead inserts", async () => {
    const authGetUser = vi.spyOn(supabase.auth, "getUser").mockResolvedValue({ data: { user: null }, error: null } as never);
    const insertResult = Object.assign(Promise.resolve({ data: null, error: null }), {
      select: vi.fn(() => ({ single: vi.fn() })),
    });
    const insert = vi.fn(() => insertResult);
    const from = vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "sell_phone_leads") return { insert } as never;
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) } as never;
    });

    await expect(sellPhoneService.saveLead({
      brand: "Apple",
      model: "iPhone 13",
      storage: "128GB",
      condition: "used",
      defects: [],
      age_months: 12,
      quoted_value: 30000,
      customer_name: "Test User",
      customer_phone: "9812345678",
      customer_email: "test@example.com",
      submission_key: "anonymous-submit-test",
    })).resolves.toBeNull();

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.results[0]?.value?.select).not.toHaveBeenCalled();
    authGetUser.mockRestore();
    from.mockRestore();
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
