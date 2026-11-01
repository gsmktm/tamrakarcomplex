import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkAuthRateLimit,
  clearOAuthRedirect,
  readOAuthRedirect,
  saveOAuthRedirect,
} from "../lib/authClientStorage";

afterEach(() => vi.unstubAllGlobals());

describe("auth browser-storage resilience (no network)", () => {
  it("preserves the 8 attempts / 15-minute limit when storage works", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { values.set(key, value); },
      },
    });
    for (let i = 0; i < 8; i++) expect(checkAuthRateLimit("normal@example.test", 1000)).toBe(true);
    expect(checkAuthRateLimit("normal@example.test", 1000)).toBe(false);
    expect(checkAuthRateLimit("normal@example.test", 1000 + 15 * 60 * 1000 + 1)).toBe(true);
  });

  it("continues with a bounded in-memory limit when storage reads and writes throw", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => { throw new DOMException("Blocked", "SecurityError"); },
        setItem: () => { throw new DOMException("Blocked", "SecurityError"); },
      },
    });
    for (let i = 0; i < 8; i++) expect(checkAuthRateLimit("blocked@example.test", 2000)).toBe(true);
    expect(checkAuthRateLimit("blocked@example.test", 2000)).toBe(false);
  });

  it("does not reset the in-memory count when only writes are blocked", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem: () => { throw new DOMException("Blocked", "SecurityError"); },
      },
    });
    for (let i = 0; i < 8; i++) expect(checkAuthRateLimit("writeblocked@example.test", 3000)).toBe(true);
    expect(checkAuthRateLimit("writeblocked@example.test", 3000)).toBe(false);
  });

  it("recovers from invalid persisted rate-limit JSON", () => {
    const values = new Map([["tc_auth_attempts:corrupt@example.test", "{broken"]]);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { values.set(key, value); },
      },
    });
    expect(checkAuthRateLimit("corrupt@example.test", 4000)).toBe(true);
    expect(JSON.parse(values.get("tc_auth_attempts:corrupt@example.test")!).count).toBe(1);
  });

  it("does not throw on OAuth redirect read/write/remove when storage is blocked", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => { throw new DOMException("Blocked", "SecurityError"); },
        setItem: () => { throw new DOMException("Blocked", "SecurityError"); },
        removeItem: () => { throw new DOMException("Blocked", "SecurityError"); },
      },
    });
    expect(readOAuthRedirect()).toBeNull();
    expect(() => saveOAuthRedirect("/user")).not.toThrow();
    expect(() => clearOAuthRedirect()).not.toThrow();
  });

  it("preserves and clears the OAuth redirect when storage works", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { values.set(key, value); },
        removeItem: (key: string) => { values.delete(key); },
      },
    });
    saveOAuthRedirect("/user/orders");
    expect(readOAuthRedirect()).toBe("/user/orders");
    clearOAuthRedirect();
    expect(readOAuthRedirect()).toBeNull();
  });
});
