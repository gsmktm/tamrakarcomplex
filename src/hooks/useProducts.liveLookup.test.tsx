import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useProduct } from "./useProducts";

const mock = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  fallback: {
    id: "fallback-product-1",
    name: "Example Device",
    slug: "example-device",
    brand: "Example",
    price: "NPR 15,000",
    price_value: 15000,
    image: null,
    rating: 4.5,
    category: "Smartphones",
    in_stock: true,
    featured: true,
    source_site: "local-fallback",
  },
}));

vi.mock("@/services/publicFallbackData", () => ({
  getFallbackProducts: () => [mock.fallback],
  getFallbackBrands: () => [],
  queryFallbackProducts: () => ({ items: [], total: 0 }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mock.maybeSingle,
        }),
      }),
    }),
  },
}));

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function TestQueryProvider({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("useProduct live lookup and safe reference placeholder", () => {
  it("queries Supabase immediately despite the 10-minute staleTime", async () => {
    let complete: ((value: unknown) => void) | undefined;
    mock.maybeSingle.mockImplementation(() => new Promise((resolve) => {
      complete = resolve;
    }));

    const { result } = renderHook(() => useProduct("example-device"), { wrapper: wrapper() });

    await waitFor(() => expect(mock.maybeSingle).toHaveBeenCalledTimes(1));
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data).toMatchObject({
      id: "fallback-product-1",
      in_stock: false,
      featured: false,
      rating: null,
    });

    await act(async () => {
      complete?.({
        data: { ...mock.fallback, id: "db-product-1", in_stock: true, featured: true, rating: 4.8 },
        error: null,
      });
    });

    await waitFor(() => expect(result.current.data?.id).toBe("db-product-1"));
    expect(result.current.data?.in_stock).toBe(true);
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it("does not claim stock or featured status when the live lookup fails", async () => {
    mock.maybeSingle.mockResolvedValue({ data: null, error: { message: "network unavailable" } });
    const { result } = renderHook(() => useProduct("example-device"), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false));
    expect(result.current.data).toMatchObject({
      source_site: "local-fallback",
      in_stock: false,
      featured: false,
      rating: null,
    });
  });

  it("returns null for an unknown slug instead of inventing a product", async () => {
    mock.maybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useProduct("unknown-model"), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(mock.maybeSingle).toHaveBeenCalledTimes(1);
  });
});
