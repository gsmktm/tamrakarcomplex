"use strict";

// Explicit server runtime configuration only: browser VITE_* variables are build-time values.
function resolveSupabaseRuntimeConfig(env) {
  const rawUrl = typeof env.SUPABASE_URL === "string" ? env.SUPABASE_URL.trim() : "";
  const key = typeof env.SUPABASE_ANON_KEY === "string" ? env.SUPABASE_ANON_KEY.trim() : "";
  let validUrl = false;
  let url = "";
  try {
    const parsed = new URL(rawUrl);
    const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    validUrl = (parsed.protocol === "https:" || (parsed.protocol === "http:" && isLoopback))
      && !parsed.username && !parsed.password && !parsed.search && !parsed.hash
      && (parsed.pathname === "/" || parsed.pathname === "");
    if (validUrl) url = parsed.origin;
  } catch {
    // Invalid or missing URL: do not select any implicit project.
  }
  return { url, key, valid: validUrl && key.length > 0 && !/\s/.test(key) };
}

module.exports = { resolveSupabaseRuntimeConfig };
