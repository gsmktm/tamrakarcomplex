/**
 * Cleans punctuation commonly included when a product URL is copied from a
 * sentence or message. Internal slug characters remain unchanged.
 */
export function normalizeProductSlug(value: string | null | undefined): string {
  if (!value) return "";

  let decoded = value.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // React Router may already have decoded the segment.
  }

  return decoded
    .replace(/^\/+|\/+$/g, "")
    .replace(/[.,;:!?'"”’)\]}]+$/g, "")
    .trim()
    .toLowerCase();
}

