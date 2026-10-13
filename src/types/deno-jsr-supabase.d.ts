/**
 * Type-only bridge for Supabase Edge Functions checked by the browser-side
 * TypeScript CI. Deno resolves jsr: specifiers at execution time; TypeScript
 * bundler mode cannot resolve JSR syntax. Reuse the installed supabase-js
 * signatures rather than declaring `any` or disabling checking.
 *
 * This file does not rewrite function imports or affect production runtime.
 */
declare module "jsr:@supabase/supabase-js@2" {
  export { createClient } from "@supabase/supabase-js";
}
