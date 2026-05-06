export type EdgeFunctionAvailability =
  | { ok: true; url: string; status: number; reason?: undefined }
  | { ok: false; url: string; status?: number; reason: "missing" | "unreachable" | "unknown" };

function getSupabaseUrl() {
  const url = import.meta.env.VITE_SUPABASE_URL || "https://tvgmnjuexdgtgtqhrjok.supabase.co";
  return url?.replace(/\/+$/, "") || "";
}

export async function checkEdgeFunctionAvailability(functionName: string): Promise<EdgeFunctionAvailability> {
  const supabaseUrl = getSupabaseUrl();
  const url = supabaseUrl ? `${supabaseUrl}/functions/v1/${functionName}` : "";

  if (!url) return { ok: false, url: "", reason: "unknown" };

  try {
    // We intentionally do a POST request without body or auth. 
    // If the function exists, it will likely return 400, 401, 500, or 200.
    // If it returns 404, it definitely doesn't exist.
    // If network fails (e.g. DNS), it throws.
    const res = await fetch(url, { 
        method: "POST",
        headers: { "Content-Type": "application/json" }
    });
    
    if (res.status === 404) return { ok: false, url, status: res.status, reason: "missing" };
    return { ok: true, url, status: res.status };
  } catch {
    return { ok: false, url, reason: "unreachable" };
  }
}

export async function assertEdgeFunctionAvailable(functionName: string) {
    // Skip check in development if we assume they are running locally or we just want to try invoking
    // But better to check.
    // The issue is that fetch(GET) might not be allowed for some functions that only accept POST.
    // So we use OPTIONS.
    
    // Also, if we are in local dev, the URL might be different if using supabase start
    // but here we rely on VITE_SUPABASE_URL which should point to the API gateway.
    
  const availability = await checkEdgeFunctionAvailability(functionName);
  if (availability.ok) return;

  if (availability.reason === "missing") {
    throw new Error(
      `Edge Function not deployed: ${functionName}. Expected at ${availability.url}. Deploy it in Supabase Functions.`,
    );
  }

  if (availability.reason === "unreachable") {
    throw new Error(
      `Failed to reach the Edge Function: ${functionName}. Check your network and VITE_SUPABASE_URL (${availability.url}).`,
    );
  }
  
  // If we can't determine, just warn and let it try to invoke
  console.warn(`Edge Function check warning: ${functionName}. Reason: ${availability.reason}`);
}
