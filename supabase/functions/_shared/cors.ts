const configuredOrigins = (Deno.env.get("ALLOWED_ORIGINS") || Deno.env.get("ALLOWED_ORIGIN") || "https://tamrakarcomplex.com")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = configuredOrigins.includes(origin) ? origin : configuredOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": configuredOrigins[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Vary": "Origin",
};

export function assertAllowedOrigin(req: Request) {
  const origin = req.headers.get("Origin");
  if (!origin || configuredOrigins.includes(origin)) return;

  throw new Error("Origin not allowed");
}

export async function requireUser(req: Request, supabaseUrl: string, anonKey: string) {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Authentication required");

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Authentication required");
  return data.user;
}
