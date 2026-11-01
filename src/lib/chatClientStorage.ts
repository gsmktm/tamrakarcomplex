// Optional chat preferences must never prevent the storefront or chat from rendering.
const PROFILE_KEY = "tamrakar-chat-profile";
const SESSION_KEY = "tamrakar-chat-session-id";

export type ChatProfile = { name?: string; email?: string };

export function readChatProfile(): ChatProfile {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return {};
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const profile = value as Record<string, unknown>;
    return {
      name: typeof profile.name === "string" ? profile.name : undefined,
      email: typeof profile.email === "string" ? profile.email : undefined,
    };
  } catch {
    return {};
  }
}

export function saveChatProfile(profile: ChatProfile): void {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Browser storage can be unavailable in privacy-restricted contexts.
  }
}

export function readChatSession(): string | null {
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function saveChatSession(sessionId: string): void {
  try {
    window.localStorage.setItem(SESSION_KEY, sessionId);
  } catch {
    // Keep the current session in React state even when persistence fails.
  }
}
