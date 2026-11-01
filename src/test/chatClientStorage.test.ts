import { afterEach, describe, expect, it, vi } from "vitest";
import { readChatProfile, readChatSession, saveChatProfile, saveChatSession } from "../lib/chatClientStorage";

afterEach(() => vi.unstubAllGlobals());

describe("chat browser-storage resilience (no network)", () => {
  it("persists optional profile and session when storage is available", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { values.set(key, value); },
      },
    });
    saveChatProfile({ name: "Customer", email: "customer@example.test" });
    saveChatSession("session-123");
    expect(readChatProfile()).toEqual({ name: "Customer", email: "customer@example.test" });
    expect(readChatSession()).toBe("session-123");
  });

  it("does not throw when browser storage reads and writes are blocked", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => { throw new DOMException("Blocked", "SecurityError"); },
        setItem: () => { throw new DOMException("Blocked", "SecurityError"); },
      },
    });
    expect(readChatProfile()).toEqual({});
    expect(readChatSession()).toBeNull();
    expect(() => saveChatProfile({ name: "Customer" })).not.toThrow();
    expect(() => saveChatSession("session-123")).not.toThrow();
  });

  it("recovers from invalid JSON and ignores malformed profile fields", () => {
    const values = new Map([["tamrakar-chat-profile", "{broken"]]);
    vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) ?? null } });
    expect(readChatProfile()).toEqual({});
    values.set("tamrakar-chat-profile", JSON.stringify({ name: 42, email: ["not-an-email"] }));
    expect(readChatProfile()).toEqual({ name: undefined, email: undefined });
  });

  it("does not trust null, array, or string profile values", () => {
    const values = new Map([["tamrakar-chat-profile", "null"]]);
    vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) ?? null } });
    expect(readChatProfile()).toEqual({});
    values.set("tamrakar-chat-profile", "[]");
    expect(readChatProfile()).toEqual({});
    values.set("tamrakar-chat-profile", JSON.stringify("invalid"));
    expect(readChatProfile()).toEqual({});
  });
});
