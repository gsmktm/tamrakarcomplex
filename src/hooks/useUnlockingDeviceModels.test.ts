import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn() } }));

import { mergeUnlockingModels, type UnlockingModel } from "./useUnlockingDeviceModels";

const device = (brand: string, model: string, features: string[] = [], source: UnlockingModel["catalog_source"] = "phone_models"): UnlockingModel => ({
  id: `${brand}-${model}`, brand, model, variant: null, release_year: 2026,
  supported_features: features, is_premium: false, created_at: "",
  catalog_source: source,
});

describe("automatic /unlocking model catalog", () => {
  it("shows every device even when no unlock capability is listed", () => {
    const models = mergeUnlockingModels([
      device("Apple", "iPhone 17"),
      device("Samsung", "Galaxy S25"),
      device("Black Shark", "Black Shark 4"),
    ], []);
    expect(models).toHaveLength(3);
    expect(models.every(model => model.supported_features.length === 0)).toBe(true);
  });

  it("merges overlapping devices and preserves real capability listings", () => {
    const models = mergeUnlockingModels(
      [device("Apple", "iPhone 17")],
      [device("APPLE", "iPhone-17", ["Network Unlock"], "unlock_catalog")],
    );
    expect(models).toHaveLength(1);
    expect(models[0].brand).toBe("Apple");
    expect(models[0].supported_features).toEqual(["Network Unlock"]);
  });

  it("includes unlock-catalog-only models without inventing support", () => {
    const models = mergeUnlockingModels([], [
      device("Google", "Pixel 9", [], "unlock_catalog"),
    ]);
    expect(models).toHaveLength(1);
    expect(models[0].catalog_source).toBe("unlock_catalog");
    expect(models[0].supported_features).toEqual([]);
  });
});
