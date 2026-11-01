import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../integrations/supabase/client";
import { storeDirectoryService } from "../services/storeDirectoryService";

vi.mock("../integrations/supabase/client", () => ({
  supabase: { from: vi.fn() },
}));

function mockDirectoryResponse(response: { data: unknown[] | null; error: Error | null; count: number | null }) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (value: typeof response) => void) => resolve(response)),
  };
  vi.mocked(supabase.from).mockReturnValue(query as any);
  return query;
}

describe("public store directory fail-closed behavior", () => {
  beforeEach(() => vi.resetAllMocks());

  it("does not append local seeded merchants when the verified query is empty", async () => {
    const query = mockDirectoryResponse({ data: [], error: null, count: 0 });
    const result = await storeDirectoryService.getStoresForDirectory();
    expect(result.data).toEqual([]);
    expect(result.count).toBe(0);
    expect(query.eq).toHaveBeenCalledWith("status", "active");
    expect(query.eq).toHaveBeenCalledWith("public_status", "published");
  });

  it("returns only database-sourced rows, not synthetic verified or subscribed stores", async () => {
    mockDirectoryResponse({
      data: [{ id: "published-store", name: "Staging Store", status: "active", public_status: "published", package_slug: "free", is_verified: false }],
      error: null,
      count: 1,
    });
    const result = await storeDirectoryService.getStoresForDirectory();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe("published-store");
    expect(result.data[0].is_verified).toBe(false);
  });

  it("propagates query failures without an unrestricted legacy retry or seeded fallback", async () => {
    const failure = new Error("staging_store_query_unavailable");
    mockDirectoryResponse({ data: null, error: failure, count: null });
    await expect(storeDirectoryService.getStoresForDirectory()).rejects.toThrow("staging_store_query_unavailable");
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });
});
