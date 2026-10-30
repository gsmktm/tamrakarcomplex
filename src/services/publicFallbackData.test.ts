import { describe, expect, it } from "vitest";
import { STORES } from "@/data/storeData";
import { getFallbackStoreCards } from "./publicFallbackData";

describe("reference-only fallback store cards", () => {
  it("never asserts verified status, live subscription or merchant-confirmed services", () => {
    const cards = getFallbackStoreCards(100);
    expect(cards.length).toBeGreaterThan(STORES.length);
    expect(cards.every((card) => card.is_verified === false)).toBe(true);
    expect(cards.every((card) => card.subscription_status === null)).toBe(true);
    expect(cards.every((card) => card.services === null)).toBe(true);
  });

  it("retains seed store identity and location for directory discovery", () => {
    const cards = getFallbackStoreCards(STORES.length);
    expect(cards.map(({ id, name, location }) => ({ id, name, location }))).toEqual(
      STORES.map(({ id, name, location }) => ({ id, name, location })),
    );
  });

  it("does not modify the underlying merchant seed data", () => {
    const before = STORES.map((store) => ({
      is_verified: store.is_verified,
      subscription_status: store.subscription_status,
      services: [...store.services],
    }));
    getFallbackStoreCards(100);
    expect(STORES.map((store) => ({
      is_verified: store.is_verified,
      subscription_status: store.subscription_status,
      services: [...store.services],
    }))).toEqual(before);
  });

  it("respects the requested card limit without introducing a verified badge", () => {
    expect(getFallbackStoreCards(2)).toHaveLength(2);
    expect(getFallbackStoreCards(2).every((card) => !card.is_verified)).toBe(true);
  });
});
