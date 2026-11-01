import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../integrations/supabase/client";
import { storeDirectoryService } from "../services/storeDirectoryService";

vi.mock("../integrations/supabase/client", () => ({
  supabase: { from: vi.fn() },
}));

type Row = Record<string, unknown>;
type Response = { data: Row | null; error: Error | null };
type Filter = [string, string];

function mockPublicReads(responses: Response[]) {
  const queries: Filter[][] = [];
  vi.mocked(supabase.from).mockImplementation((() => {
    const filters: Filter[] = [];
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((column: string, value: string) => {
        filters.push([column, value]);
        return builder;
      }),
      maybeSingle: vi.fn(async () => {
        queries.push([...filters]);
        return responses.shift() ?? { data: null, error: null };
      }),
    };
    return builder as any;
  }) as any);
  return queries;
}

const published: Row = {
  id: "published-store",
  name: "Published Test Store",
  slug: "published-test",
  seo_slug: "published-test",
  status: "active",
  public_status: "published",
  package_slug: "free",
  is_verified: false,
};

function expectPublicScope(filters: Filter[]) {
  expect(filters).toContainEqual(["status", "active"]);
  expect(filters).toContainEqual(["public_status", "published"]);
}

describe("public store detail visibility", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns null, not local merchant seed data, for a missing shop number", async () => {
    const queries = mockPublicReads([{ data: null, error: null }]);
    const result = await storeDirectoryService.getPublicStoreByIdentifier({
      type: "shop_no", value: "TEST-123", complex_zone: "inside",
    });
    expect(result).toBeNull();
    expect(queries).toHaveLength(1);
    expectPublicScope(queries[0]);
    expect(queries[0]).toContainEqual(["shop_no", "TEST-123"]);
  });

  it("uses scoped exact-match queries for SEO slug and legacy slug", async () => {
    const queries = mockPublicReads([
      { data: null, error: null },
      { data: published, error: null },
    ]);
    const result = await storeDirectoryService.getPublicStoreByIdentifier({
      type: "slug", value: "published-test",
    });
    expect(result?.id).toBe("published-store");
    expect(queries).toHaveLength(2);
    queries.forEach(expectPublicScope);
    expect(queries[0]).toContainEqual(["seo_slug", "published-test"]);
    expect(queries[1]).toContainEqual(["slug", "published-test"]);
  });

  it("scopes UUID lookup and preserves the real database merchant record", async () => {
    const queries = mockPublicReads([{ data: published, error: null }]);
    const result = await storeDirectoryService.getPublicStoreByIdentifier({
      type: "id", value: "published-store",
    });
    expect(result?.name).toBe("Published Test Store");
    expect(result?.is_verified).toBe(false);
    expectPublicScope(queries[0]);
    expect(queries[0]).toContainEqual(["id", "published-store"]);
  });

  it("propagates query errors instead of falling back to unverified records", async () => {
    const queries = mockPublicReads([{ data: null, error: new Error("public_read_unavailable") }]);
    await expect(storeDirectoryService.getPublicStoreByIdentifier({
      type: "slug", value: "missing-store",
    })).rejects.toThrow("public_read_unavailable");
    expect(queries).toHaveLength(1);
    expectPublicScope(queries[0]);
  });

  it("keeps getPublicStoreBySlug fail-closed", async () => {
    const queries = mockPublicReads([{ data: null, error: null }, { data: null, error: null }]);
    expect(await storeDirectoryService.getPublicStoreBySlug("missing-store")).toBeNull();
    expect(queries).toHaveLength(2);
    queries.forEach(expectPublicScope);
  });

  it("wires public StoreDetail routes to the scoped method without local fallback", () => {
    const source = readFileSync("src/pages/StoreDetail.tsx", "utf8");
    expect(source).toContain("storeDirectoryService.getPublicStoreByIdentifier(");
    expect(source).not.toContain("storeDirectoryService.getStoreByIdentifier(");
    expect(source).not.toContain("localStoreFallback");
    expect(source).not.toContain("SEEDED_FALLBACK_STORES");
  });
});
