// Browser storage is an optional UX aid, not a security boundary.
// Server-side/Supabase rate limits must protect authentication endpoints.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const MAX_MEMORY_IDENTIFIERS = 256;

type Attempt = { count: number; startedAt: number };
const memoryAttempts = new Map<string, Attempt>();

function rememberAttempt(key: string, attempt: Attempt) {
  if (!memoryAttempts.has(key) && memoryAttempts.size >= MAX_MEMORY_IDENTIFIERS) {
    const oldestKey = memoryAttempts.keys().next().value;
    if (oldestKey !== undefined) memoryAttempts.delete(oldestKey);
  }
  memoryAttempts.set(key, attempt);
}

export function checkAuthRateLimit(identifier: string, now = Date.now()): boolean {
  if (typeof window === "undefined") return true;

  const key = `tc_auth_attempts:${identifier}`;
  let current: Attempt | null = memoryAttempts.get(key) ?? null;

  if (!current) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Attempt>;
        if (
          Number.isInteger(parsed.count) &&
          Number.isFinite(parsed.startedAt) &&
          (parsed.count ?? -1) >= 0
        ) {
          current = { count: parsed.count!, startedAt: parsed.startedAt! };
        }
      }
    } catch {
      // Storage can be blocked by browser privacy settings or malformed data.
    }
  }

  const next = !current || now < current.startedAt || now - current.startedAt > WINDOW_MS
    ? { count: 1, startedAt: now }
    : { count: current.count + 1, startedAt: current.startedAt };

  try {
    window.localStorage.setItem(key, JSON.stringify(next));
    memoryAttempts.delete(key);
  } catch {
    // Preserve the best-effort client UX limit for this tab/session.
    rememberAttempt(key, next);
  }

  return next.count <= MAX_ATTEMPTS;
}

export function readOAuthRedirect(): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem("tc_oauth_redirect");
  } catch {
    return null;
  }
}

export function saveOAuthRedirect(path: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem("tc_oauth_redirect", path);
  } catch {
    // OAuth must remain available even when redirect preference cannot persist.
  }
}

export function clearOAuthRedirect(): void {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem("tc_oauth_redirect");
  } catch {
    // Never block post-login navigation or error handling on storage cleanup.
  }
}
