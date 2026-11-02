import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/hooks/useProducts";
import { useWishlist } from "./useWishlist";

const sample = { id: "synthetic-product-1", slug: "synthetic-product-1", name: "Synthetic test product" } as Product;

describe("useWishlist storage resilience", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps add, toggle, remove and clear functional when storage is denied", () => {
    const { result } = renderHook(() => useWishlist());
    act(() => result.current.clearWishlist());

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage denied", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage denied", "SecurityError");
    });

    act(() => result.current.addItem(sample));
    expect(result.current.count).toBe(1);
    expect(result.current.hasItem(sample.id)).toBe(true);

    act(() => {
      expect(result.current.toggleItem(sample)).toBe(false);
    });
    expect(result.current.count).toBe(0);

    act(() => result.current.addItem(sample));
    act(() => result.current.removeItem(sample.id));
    expect(result.current.count).toBe(0);

    act(() => result.current.addItem(sample));
    act(() => result.current.clearWishlist());
    expect(result.current.count).toBe(0);
  });

  it("synchronizes two mounted hook instances in the same tab without storage", () => {
    const first = renderHook(() => useWishlist());
    act(() => first.result.current.clearWishlist());

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage denied", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage denied", "SecurityError");
    });

    const second = renderHook(() => useWishlist());
    act(() => first.result.current.addItem(sample));
    expect(second.result.current.hasItem(sample.id)).toBe(true);

    act(() => second.result.current.removeItem(sample.id));
    expect(first.result.current.count).toBe(0);
  });

  it("still persists normally when localStorage is available", () => {
    const { result, unmount } = renderHook(() => useWishlist());
    act(() => result.current.addItem(sample));
    expect(JSON.parse(window.localStorage.getItem("tamrakar:wishlist") || "[]")).toEqual([sample]);
    unmount();

    const next = renderHook(() => useWishlist());
    expect(next.result.current.hasItem(sample.id)).toBe(true);
  });
});
