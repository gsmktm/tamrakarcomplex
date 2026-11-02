import { describe, expect, it } from "vitest";
import config from "../../supabase-runtime-config.cjs";

const { resolveSupabaseRuntimeConfig } = config;
const validEnv = {
  SUPABASE_URL: "https://staging.example.test",
  SUPABASE_ANON_KEY: "synthetic-publishable-key",
};

describe("server Supabase runtime configuration", () => {
  it("fails closed when runtime variables are missing even if VITE_* are present", () => {
    const result = resolveSupabaseRuntimeConfig({
      VITE_SUPABASE_URL: "https://unintended.example.test",
      VITE_SUPABASE_PUBLISHABLE_KEY: "synthetic-browser-key",
    });
    expect(result).toEqual({ url: "", key: "", valid: false });
  });

  it("accepts explicit synthetic HTTPS configuration without changing its target", () => {
    expect(resolveSupabaseRuntimeConfig(validEnv)).toEqual({
      url: "https://staging.example.test",
      key: "synthetic-publishable-key",
      valid: true,
    });
  });

  it.each([
    ["missing key", { SUPABASE_URL: validEnv.SUPABASE_URL }],
    ["malformed URL", { ...validEnv, SUPABASE_URL: "not-a-url" }],
    ["insecure remote URL", { ...validEnv, SUPABASE_URL: "http://staging.example.test" }],
    ["URL credentials", { ...validEnv, SUPABASE_URL: "https://name:pass@staging.example.test" }],
    ["URL query", { ...validEnv, SUPABASE_URL: "https://staging.example.test/?project=other" }],
    ["invalid key", { ...validEnv, SUPABASE_ANON_KEY: "has whitespace" }],
  ])("rejects %s", (_name, env) => {
    expect(resolveSupabaseRuntimeConfig(env).valid).toBe(false);
  });

  it("permits explicitly configured loopback for isolated local development", () => {
    expect(resolveSupabaseRuntimeConfig({ ...validEnv, SUPABASE_URL: "http://127.0.0.1:54321" }).valid).toBe(true);
  });
});
