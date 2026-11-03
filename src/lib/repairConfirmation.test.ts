import { describe, expect, it } from "vitest";
import { parseConfirmedRepair } from "./repairConfirmation";

const serverRecord = {
  tracking_id: "TR-ABC123", device_brand: "Apple", device_model: "iPhone",
  issue_type: "screen", estimated_cost: 3500,
};

describe("repair success confirmation", () => {
  it("accepts only the single server record matching the requested ID", () => {
    expect(parseConfirmedRepair([serverRecord], "tr-abc123")).toEqual({
      trackingId: "TR-ABC123", brand: "Apple", model: "iPhone",
      issue: "screen", estimatedCost: 3500,
    });
  });
  it("does not treat an arbitrary or missing tracking ID as a confirmed booking", () => {
    expect(parseConfirmedRepair([serverRecord], "TR-FAKE")).toBeNull();
    expect(parseConfirmedRepair([serverRecord], "")).toBeNull();
    expect(parseConfirmedRepair([], "TR-ABC123")).toBeNull();
    expect(parseConfirmedRepair(null, "TR-ABC123")).toBeNull();
  });
  it("fails closed for malformed or ambiguous response data", () => {
    expect(parseConfirmedRepair([{ device_model: "Fake" }], "TR-ABC123")).toBeNull();
    expect(parseConfirmedRepair([serverRecord, serverRecord], "TR-ABC123")).toBeNull();
    expect(parseConfirmedRepair("confirmed", "TR-ABC123")).toBeNull();
  });
  it("never treats invalid database estimates as verified prices", () => {
    expect(parseConfirmedRepair([{ ...serverRecord, estimated_cost: "99999" }], "TR-ABC123")?.estimatedCost).toBeNull();
    expect(parseConfirmedRepair([{ ...serverRecord, estimated_cost: -1 }], "TR-ABC123")?.estimatedCost).toBeNull();
    expect(parseConfirmedRepair([{ ...serverRecord, estimated_cost: Infinity }], "TR-ABC123")?.estimatedCost).toBeNull();
  });
  it("copies only allowlisted server fields and truncates excessive text", () => {
    const record = { ...serverRecord, device_brand: "x".repeat(500), total: 1, status: "paid" };
    const value = parseConfirmedRepair([record], "TR-ABC123");
    expect(value?.brand).toHaveLength(200);
    expect(value).not.toHaveProperty("total");
    expect(value).not.toHaveProperty("status");
  });
});
