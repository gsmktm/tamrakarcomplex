const RECOVERY_KEY = "tamrakar:chunk-reload";
const RECOVERY_COOLDOWN_MS = 30_000;

export function isChunkLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed|ChunkLoadError/i.test(message);
}

export function recoverFromChunkLoadError(error: unknown) {
  if (typeof window === "undefined" || !isChunkLoadError(error)) return false;

  const lastRecovery = Number(window.sessionStorage.getItem(RECOVERY_KEY) || 0);
  if (Date.now() - lastRecovery < RECOVERY_COOLDOWN_MS) return false;

  window.sessionStorage.setItem(RECOVERY_KEY, String(Date.now()));
  const url = new URL(window.location.href);
  url.searchParams.set("__app_refresh", String(Date.now()));
  window.location.replace(url.toString());
  return true;
}

export function installChunkLoadRecovery() {
  if (typeof window === "undefined") return () => undefined;

  const handlePreloadError = (event: Event) => {
    event.preventDefault();
    const payload = (event as Event & { payload?: unknown }).payload;
    recoverFromChunkLoadError(payload ?? new Error("Failed to fetch dynamically imported module"));
  };
  const handleRejection = (event: PromiseRejectionEvent) => {
    if (recoverFromChunkLoadError(event.reason)) event.preventDefault();
  };

  window.addEventListener("vite:preloadError", handlePreloadError);
  window.addEventListener("unhandledrejection", handleRejection);

  const clearGuard = window.setTimeout(() => {
    window.sessionStorage.removeItem(RECOVERY_KEY);
    const url = new URL(window.location.href);
    if (url.searchParams.has("__app_refresh")) {
      url.searchParams.delete("__app_refresh");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, RECOVERY_COOLDOWN_MS);

  return () => {
    window.clearTimeout(clearGuard);
    window.removeEventListener("vite:preloadError", handlePreloadError);
    window.removeEventListener("unhandledrejection", handleRejection);
  };
}
