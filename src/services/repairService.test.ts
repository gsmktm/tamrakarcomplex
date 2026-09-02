import { describe, expect, it } from "vitest";
import { getAllowedRepairTransitions } from "./repairService";

describe("repair status transitions", () => {
  it("normalizes legacy states", () => {
    expect(getAllowedRepairTransitions("pending")).toEqual(["assigned", "inspection", "cancelled"]);
    expect(getAllowedRepairTransitions("in_progress")).toEqual(["quality_check", "ready", "cancelled"]);
  });

  it("requires quote approval before a quoted repair starts", () => {
    expect(getAllowedRepairTransitions("quote_pending")).toContain("quote_approved");
    expect(getAllowedRepairTransitions("quote_pending")).not.toContain("repairing");
    expect(getAllowedRepairTransitions("quote_approved")).toContain("repairing");
  });

  it("lets the customer decline a pending quote (cancel path)", () => {
    // respond_to_repair_quote maps decline -> cancelled, which must be a legal transition
    expect(getAllowedRepairTransitions("quote_pending")).toContain("cancelled");
  });

  it("locks the quote once responded", () => {
    // after approval the decision cannot be replayed: quote_pending is left
    expect(getAllowedRepairTransitions("quote_approved")).not.toContain("quote_approved");
    expect(getAllowedRepairTransitions("cancelled")).toEqual([]);
  });

  it("makes terminal states immutable", () => {
    expect(getAllowedRepairTransitions("completed")).toEqual([]);
    expect(getAllowedRepairTransitions("cancelled")).toEqual([]);
  });
});
