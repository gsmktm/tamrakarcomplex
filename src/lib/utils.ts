import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Safely converts any value to a string for rendering.
 * Prevents "Objects are not valid as a React child" errors.
 */
export function safeText(value: unknown, fallback: string = ""): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    try {
      // If it's a date or has a custom toString, use it
      if (value instanceof Date) return value.toLocaleDateString();
      if (Array.isArray(value)) return value.map(v => safeText(v)).join(", ");
      return JSON.stringify(value);
    } catch (e) {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Safely extracts a display name from user metadata.
 */
export function getSafeDisplayName(user: unknown): string {
  if (!user) return "User";
  const metadata = (user as Record<string, unknown>)?.user_metadata as Record<string, unknown> || {};
  return safeText(
    (metadata.display_name || metadata.full_name || (user as Record<string, unknown>)?.email?.toString()?.split('@')[0]),
    "User"
  );
}

/**
 * Safely gets initials for a name.
 */
export function getSafeInitials(name: unknown): string {
  const text = safeText(name, "U");
  return text
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function hexToHSL(hex: string): string {
  // Remove hash if present
  hex = hex.replace(/^#/, '');

  // Parse r, g, b
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Safe primitive helpers to prevent "Cannot convert object to primitive value" errors
export function safeOptionalText(value: unknown): string | undefined {
  const safe = safeText(value);
  return safe || undefined;
}

export function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && !isNaN(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

export function safeDate(value: unknown, fallback = "—"): string {
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  if (typeof value === "string" || typeof value === "number") {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    } catch {
      // Invalid date
    }
  }
  return fallback;
}

export function safeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }
  if (typeof value === "number") {
    return value === 1;
  }
  return fallback;
}

export function safeId(value: unknown, fallback = ""): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

export function formatEdgeFunctionError(error: unknown) {
  const message =
    typeof (error as { message?: unknown } | null)?.message === "string"
      ? String((error as { message?: unknown }).message)
      : typeof error === "string"
        ? error
        : "Unknown error";

  if (message.includes("Failed to send a request to the Edge Function")) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://tvgmnjuexdgtgtqhrjok.supabase.co";
    const urlHint = supabaseUrl ? ` (${supabaseUrl})` : "";
    return `Failed to reach the Edge Function${urlHint}. Deploy the function to your Supabase project and verify your VITE_SUPABASE_URL points to the correct project.`;
  }

  if (message.startsWith("Edge Function not deployed:")) {
    return message;
  }

  if (message.toLowerCase().includes("not found") || message.includes("404")) {
    return "Edge Function not found. Deploy it in Supabase (supabase functions deploy) and try again.";
  }

  return message;
}

/**
 * Safely parse a product price from either a numeric value or a formatted string.
 * Returns 0 when both inputs are missing/malformed — never NaN.
 */
export function parseProductPrice(
  priceValue: number | null | undefined,
  priceStr: string | null | undefined,
): number {
  if (priceValue != null && Number.isFinite(priceValue)) return priceValue;
  const parsed = parseFloat((priceStr ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Format a number as a Nepalese Rupee string, e.g. "NPR 1,200". */
export function formatNPR(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `NPR ${value.toLocaleString("en-NP")}`;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}
