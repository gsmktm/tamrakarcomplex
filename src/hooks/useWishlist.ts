import { useCallback, useEffect, useMemo, useState } from "react";
import type { Product } from "@/hooks/useProducts";

const WISHLIST_STORAGE_KEY = "tamrakar:wishlist";

function readWishlist(): Product[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Product[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => Boolean(item?.id && item?.slug && item?.name));
  } catch {
    return [];
  }
}

function writeWishlist(items: Product[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("wishlist-update"));
}

export function useWishlist() {
  const [items, setItems] = useState<Product[]>(() => readWishlist());

  useEffect(() => {
    const syncWishlist = () => setItems(readWishlist());

    window.addEventListener("storage", syncWishlist);
    window.addEventListener("wishlist-update", syncWishlist);

    return () => {
      window.removeEventListener("storage", syncWishlist);
      window.removeEventListener("wishlist-update", syncWishlist);
    };
  }, []);

  const addItem = useCallback((product: Product) => {
    const nextItems = [product, ...readWishlist().filter((item) => item.id !== product.id)];
    writeWishlist(nextItems);
    setItems(nextItems);
  }, []);

  const removeItem = useCallback((productId: string) => {
    const nextItems = readWishlist().filter((item) => item.id !== productId);
    writeWishlist(nextItems);
    setItems(nextItems);
  }, []);

  const toggleItem = useCallback((product: Product) => {
    const currentItems = readWishlist();
    const exists = currentItems.some((item) => item.id === product.id);
    const nextItems = exists
      ? currentItems.filter((item) => item.id !== product.id)
      : [product, ...currentItems];

    writeWishlist(nextItems);
    setItems(nextItems);

    return !exists;
  }, []);

  const clearWishlist = useCallback(() => {
    writeWishlist([]);
    setItems([]);
  }, []);

  const hasItem = useCallback((productId: string) => items.some((item) => item.id === productId), [items]);

  return {
    items,
    count: items.length,
    hasItem,
    addItem,
    removeItem,
    toggleItem,
    clearWishlist,
    itemIds: useMemo(() => new Set(items.map((item) => item.id)), [items]),
  };
}
