import { beforeEach, describe, expect, it, vi } from "vitest";
import { inventoryService, type InventoryItem } from "./inventoryService";

const mocks = vi.hoisted(() => {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    single: vi.fn(),
    update: vi.fn(),
  };
  return { from: vi.fn(), builder };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

const item: InventoryItem = {
  store_id: "synthetic-store-A",
  model_id: "synthetic-model",
  variant_id: "synthetic-128gb",
  title: "Synthetic Phone",
  storage: "128 GB",
  condition: "new",
  price: 100,
  stock_quantity: 1,
  status: "active",
};

beforeEach(() => {
  vi.resetAllMocks();
  const { builder } = mocks;
  mocks.from.mockReturnValue(builder);
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.insert.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.maybeSingle.mockResolvedValue({ data: null, error: null });
  builder.single.mockResolvedValue({ data: { id: "synthetic-new-row" }, error: null });
});

describe("addToInventory commerce integrity guard", () => {
  it.each([
    ["a different storage variant", { variant_id: "synthetic-256gb", storage: "256 GB" }],
    ["a different condition", { condition: "used" }],
    ["the same variant", {}],
  ])("rejects an existing model-title slug for %s without changing stock or price", async (_label, changes) => {
    mocks.builder.maybeSingle.mockResolvedValue({
      data: { id: "synthetic-existing-row" },
      error: null,
    });
    await expect(inventoryService.addToInventory({ ...item, ...changes }))
      .rejects.toThrow(/Inventory was not changed/);
    expect(mocks.builder.insert).not.toHaveBeenCalled();
    expect(mocks.builder.update).not.toHaveBeenCalled();
  });

  it("fails closed on a lookup error instead of inserting a potentially colliding row", async () => {
    mocks.builder.maybeSingle.mockResolvedValue({
      data: null,
      error: new Error("Synthetic database lookup failure"),
    });
    await expect(inventoryService.addToInventory(item))
      .rejects.toThrow("Synthetic database lookup failure");
    expect(mocks.builder.insert).not.toHaveBeenCalled();
    expect(mocks.builder.update).not.toHaveBeenCalled();
  });

  it("still inserts a new listing after a successful empty lookup scoped to the store", async () => {
    const result = await inventoryService.addToInventory(item);
    expect(result).toEqual({ id: "synthetic-new-row" });
    expect(mocks.from).toHaveBeenCalledWith("store_products");
    expect(mocks.builder.eq).toHaveBeenCalledWith("store_id", "synthetic-store-A");
    expect(mocks.builder.eq).toHaveBeenCalledWith("slug", "synthetic-phone");
    expect(mocks.builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        store_id: "synthetic-store-A",
        variant_id: "synthetic-128gb",
        condition: "new",
        price: 100,
        stock_quantity: 1,
        slug: "synthetic-phone",
      }),
    );
    expect(mocks.builder.update).not.toHaveBeenCalled();
  });

  it("propagates insert errors instead of reporting success", async () => {
    mocks.builder.single.mockResolvedValue({
      data: null,
      error: new Error("Synthetic insert failure"),
    });
    await expect(inventoryService.addToInventory(item))
      .rejects.toThrow("Synthetic insert failure");
  });
});
