import { beforeEach, describe, expect, it, vi } from "vitest";

const { insert, from } = vi.hoisted(() => {
  const insert = vi.fn();
  return {
    insert,
    from: vi.fn(() => ({ insert })),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from },
}));

import { storeDirectoryService } from "./storeDirectoryService";

describe("public store submissions under anonymous RLS", () => {
  beforeEach(() => {
    from.mockClear();
    insert.mockReset();
    insert.mockResolvedValue({ data: null, error: null, status: 201 });
  });

  it.each([
    ["exchange request", "exchange_requests", storeDirectoryService.createExchangeRequest],
    ["repair request", "store_repair_requests", storeDirectoryService.createRepairRequest],
    ["store lead", "store_leads", storeDirectoryService.createStoreLead],
  ] as const)("submits a %s without requesting the inserted row", async (_label, table, submit) => {
    const payload = { name: "Public customer", phone: "9812345678" };

    await expect(submit.call(storeDirectoryService, "store-123", payload)).resolves.toEqual({
      submitted: true,
    });

    expect(from).toHaveBeenCalledWith(table);
    expect(insert).toHaveBeenCalledWith({ ...payload, store_id: "store-123" });

    // Anonymous INSERT policies commonly permit the write but deny SELECT.
    // A direct await on insert() must therefore be the terminal operation.
    const mutation = insert.mock.results[0]?.value;
    expect(mutation).not.toHaveProperty("select");
  });

  it("reports an allowed anonymous insert even when no row is returned", async () => {
    insert.mockResolvedValueOnce({ data: null, error: null, status: 204 });

    await expect(
      storeDirectoryService.createStoreLead("store-123", { message: "Please call me" }),
    ).resolves.toEqual({ submitted: true });
  });

  it("propagates a database rejection instead of showing false success", async () => {
    const databaseError = new Error("row violates row-level security policy");
    insert.mockResolvedValueOnce({ data: null, error: databaseError, status: 403 });

    await expect(
      storeDirectoryService.createRepairRequest("store-123", { issue_type: "screen" }),
    ).rejects.toBe(databaseError);
  });
});
