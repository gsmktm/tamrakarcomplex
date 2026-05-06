import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { assertAllowedOrigin, getCorsHeaders } from "../_shared/cors.ts";

const jsonHeaders = (req: Request) => ({ ...getCorsHeaders(req), "Content-Type": "application/json" });

function getJwtUserId(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const token = authorizationHeader.replace("Bearer ", "").trim();
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;

  const payload = parts[1];
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const json = atob(padded);
  const parsed = JSON.parse(json) as { sub?: string };
  return parsed.sub ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders(req),
    });
  }

  try {
    assertAllowedOrigin(req);
    if (Deno.env.get("BOOTSTRAP_ADMIN_ENABLED") !== "true") {
      return new Response(JSON.stringify({ error: "Bootstrap disabled" }), {
        status: 403,
        headers: jsonHeaders(req),
      });
    }
    const authorization = req.headers.get("Authorization");
    const userId = getJwtUserId(authorization);

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: jsonHeaders(req),
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: jsonHeaders(req),
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: existingAdmins, error: existsError } = await admin
      .from("user_roles")
      .select("id")
      .eq("role", "suadmin")
      .limit(1);
    if (existsError) throw existsError;

    if ((existingAdmins ?? []).length > 0) {
      return new Response(JSON.stringify({ error: "Super admin already exists" }), {
        status: 409,
        headers: jsonHeaders(req),
      });
    }

    // Confirm email via Auth Admin API
    try {
      await admin.auth.admin.updateUserById(userId, { 
        email_confirm: true,
        user_metadata: { email_verified: true }
      });
    } catch (err) {
      console.warn("Auth update failed:", err);
    }

    // First bootstrap user or blessed user becomes super admin (suadmin)
    const { error: insertError } = await admin
      .from("user_roles")
      .insert({ user_id: userId, role: "suadmin" })
      .select();
    
    // If already has role, ignore error or update
    if (insertError && !insertError.message.includes('unique_violation')) throw insertError;

    return new Response(JSON.stringify({ ok: true }), {
      headers: jsonHeaders(req),
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message ?? "Unknown error" }), {
      status: 500,
      headers: jsonHeaders(req),
    });
  }
});
