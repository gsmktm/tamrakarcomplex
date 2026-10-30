import { describe, expect, it } from "vitest";
import { getStoreDetailQueryKey } from "./storeDetailQueryKey";

describe("getStoreDetailQueryKey", () => {
  it("separates identical shop numbers in different complex zones", () => {
    const inside = getStoreDetailQueryKey({
      type: "shop_no", value: "G-12", complex_zone: "inside",
    });
    const outside = getStoreDetailQueryKey({
      type: "shop_no", value: "G-12", complex_zone: "outside",
    });

    expect(inside).toEqual(["store-detail", "shop_no", "G-12", "inside"]);
    expect(outside).toEqual(["store-detail", "shop_no", "G-12", "outside"]);
    expect(inside).not.toEqual(outside);
  });

  it("does not reuse an unscoped shop number cache entry for a zone-scoped lookup", () => {
    const unscoped = getStoreDetailQueryKey({ type: "shop_no", value: "G-12" });
    const scoped = getStoreDetailQueryKey({
      type: "shop_no", value: "G-12", complex_zone: "inside",
    });
    expect(unscoped).not.toEqual(scoped);
  });

  it("preserves the existing directory hover-prefetch key for unscoped slug and id", () => {
    expect(getStoreDetailQueryKey({ type: "slug", value: "sample-store" })).toEqual([
      "store-detail", "slug", "sample-store",
    ]);
    expect(getStoreDetailQueryKey({ type: "id", value: "store-uuid" })).toEqual([
      "store-detail", "id", "store-uuid",
    ]);
  });

  it("keeps a zone constraint on local slug lookups too", () => {
    expect(getStoreDetailQueryKey({
      type: "slug", value: "sample-store", complex_zone: "inside",
    })).toEqual(["store-detail", "slug", "sample-store", "inside"]);
  });

  it("returns a stable key for repeated equivalent identifiers", () => {
    const identifier = { type: "shop_no" as const, value: "A-2", complex_zone: "inside" };
    expect(getStoreDetailQueryKey(identifier)).toEqual(getStoreDetailQueryKey({ ...identifier }));
  });
});
