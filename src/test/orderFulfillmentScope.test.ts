import { describe, expect, it } from "vitest";
import { getSingleAuthorizedFulfillment } from "@/lib/orderFulfillmentScope";

const storeA = { id: "fulfillment-a", store_id: "store-a", status: "pending" };
const storeB = { id: "fulfillment-b", store_id: "store-b", status: "processing" };

describe("store-admin fulfillment targeting", () => {
  it("targets only the single authorized store row, not a different store", () => {
    expect(getSingleAuthorizedFulfillment([storeA, storeB], ["store-a"])).toEqual(storeA);
  });

  it("fails closed when the admin manages both stores in the same order", () => {
    expect(getSingleAuthorizedFulfillment([storeA, storeB], ["store-a", "store-b"])).toBeNull();
  });

  it("fails closed when the admin has no authorized store", () => {
    expect(getSingleAuthorizedFulfillment([storeA], [])).toBeNull();
    expect(getSingleAuthorizedFulfillment([storeB], ["store-a"])).toBeNull();
  });

  it("fails closed when the fulfillment list is absent or empty", () => {
    expect(getSingleAuthorizedFulfillment(undefined, ["store-a"])).toBeNull();
    expect(getSingleAuthorizedFulfillment([], ["store-a"])).toBeNull();
  });

  it("fails closed when multiple rows match one authorized store", () => {
    const duplicate = { ...storeA, id: "fulfillment-a-duplicate" };
    expect(getSingleAuthorizedFulfillment([storeA, duplicate], ["store-a"])).toBeNull();
  });
});
