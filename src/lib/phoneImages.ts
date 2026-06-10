/**
 * phoneImages.ts
 * Resolve canonical device images from GSMArena.
 * Pattern: https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-{slug}.jpg
 */

const GSMARENA_BASE = "https://fdn2.gsmarena.com/vv/bigpic";

// iPhone model slug map — ordered longest-match first so "pro max" beats "pro"
const IPHONE_SLUGS: [RegExp, string][] = [
  // iPhone 16 family (16e = budget model released 2025, uses iphone-16 art)
  [/iphone\s*16\s+pro\s+max/i,   "apple-iphone-16-pro-max"],
  [/iphone\s*16\s+pro/i,         "apple-iphone-16-pro"],
  [/iphone\s*16\s+plus/i,        "apple-iphone-16-plus"],
  [/iphone\s*16e/i,              "apple-iphone-16e"],
  [/iphone\s*16/i,               "apple-iphone-16"],
  // iPhone Air (thin model, 2025)
  [/iphone\s*(air|thin)/i,       "apple-iphone-air"],
  // iPhone 17 family (upcoming — map to closest existing art until GSMArena adds them)
  [/iphone\s*17\s+pro\s+max/i,   "apple-iphone-16-pro-max"],
  [/iphone\s*17\s+pro/i,         "apple-iphone-16-pro"],
  [/iphone\s*17\s+plus/i,        "apple-iphone-16-plus"],
  [/iphone\s*17e/i,              "apple-iphone-16e"],
  [/iphone\s*17/i,               "apple-iphone-16"],
  // iPhone 15 family
  [/iphone\s*15\s+pro\s+max/i,   "apple-iphone-15-pro-max"],
  [/iphone\s*15\s+pro/i,         "apple-iphone-15-pro"],
  [/iphone\s*15\s+plus/i,        "apple-iphone-15-plus"],
  [/iphone\s*15/i,               "apple-iphone-15"],
  // iPhone 14 family
  [/iphone\s*14\s+pro\s+max/i,   "apple-iphone-14-pro-max"],
  [/iphone\s*14\s+pro/i,         "apple-iphone-14-pro"],
  [/iphone\s*14\s+plus/i,        "apple-iphone-14-plus"],
  [/iphone\s*14/i,               "apple-iphone-14"],
  // iPhone 13 family
  [/iphone\s*13\s+pro\s+max/i,   "apple-iphone-13-pro-max"],
  [/iphone\s*13\s+pro/i,         "apple-iphone-13-pro"],
  [/iphone\s*13\s+mini/i,        "apple-iphone-13-mini"],
  [/iphone\s*13/i,               "apple-iphone-13"],
  // iPhone 12 family
  [/iphone\s*12\s+pro\s+max/i,   "apple-iphone-12-pro-max"],
  [/iphone\s*12\s+pro/i,         "apple-iphone-12-pro"],
  [/iphone\s*12\s+mini/i,        "apple-iphone-12-mini"],
  [/iphone\s*12/i,               "apple-iphone-12"],
  // iPhone 11 family
  [/iphone\s*11\s+pro\s+max/i,   "apple-iphone-11-pro-max"],
  [/iphone\s*11\s+pro/i,         "apple-iphone-11-pro"],
  [/iphone\s*11/i,               "apple-iphone-11"],
  // iPhone X family (Xs Max before Xs, XR, X)
  [/iphone\s*xs?\s+max/i,        "apple-iphone-xs-max"],
  [/iphone\s*xs/i,               "apple-iphone-xs"],
  [/iphone\s*xr/i,               "apple-iphone-xr"],
  [/iphone\s*x\b/i,              "apple-iphone-x"],
  // iPhone SE family
  [/iphone\s*se.*202[23]/i,      "apple-iphone-se-2022"],
  [/iphone\s*se.*2020/i,         "apple-iphone-se-2020"],
  [/iphone\s*se\s*(3rd|3)/i,     "apple-iphone-se-2022"],
  [/iphone\s*se\s*(2nd|2)/i,     "apple-iphone-se-2020"],
  [/iphone\s*se/i,               "apple-iphone-se-2020"],
  // iPhone 8 family
  [/iphone\s*8\s+plus/i,         "apple-iphone-8-plus"],
  [/iphone\s*8/i,                "apple-iphone-8"],
  // iPhone 7 family
  [/iphone\s*7\s+plus/i,         "apple-iphone-7-plus"],
  [/iphone\s*7/i,                "apple-iphone-7"],
  // iPhone 6 family
  [/iphone\s*6s\s+plus/i,        "apple-iphone-6s-plus"],
  [/iphone\s*6s/i,               "apple-iphone-6s"],
  [/iphone\s*6\s+plus/i,         "apple-iphone-6-plus"],
  [/iphone\s*6/i,                "apple-iphone-6"],
];

/**
 * Returns a GSMArena image URL for an iPhone title, or null if unrecognised.
 */
export function resolveIphoneImage(title: string): string | null {
  for (const [pattern, slug] of IPHONE_SLUGS) {
    if (pattern.test(title)) {
      return `${GSMARENA_BASE}/${slug}.jpg`;
    }
  }
  return null;
}

// URLs that are generic placeholders — not actual product photos
const PLACEHOLDER_RE = /unsplash\.com|apple_logo_black\.svg|wikipedia.*apple|wikimedia.*apple/i;

function isPlaceholder(url: string): boolean {
  return PLACEHOLDER_RE.test(url);
}

/**
 * Returns the best image URL for a marketplace listing.
 *
 * Priority:
 * 1. First proper (non-placeholder) image in the existing array
 * 2. GSMArena image resolved from the title (Apple/iPhone)
 * 3. First existing image (even if placeholder)
 * 4. null (SafeImage shows its own placeholder)
 */
export function resolveListingImage(
  title: string | null,
  brand: string | null,
  images: string[] | null
): string | null {
  const imgs = Array.isArray(images) ? images.filter(Boolean) : [];

  // Prefer any already-proper product photo
  const properImage = imgs.find((url) => !isPlaceholder(url));
  if (properImage) return properImage;

  // For Apple / iPhone titles, resolve from GSMArena
  const isApple =
    (brand ?? "").toLowerCase().includes("apple") ||
    (title ?? "").toLowerCase().includes("iphone");

  if (isApple && title) {
    const gsm = resolveIphoneImage(title);
    if (gsm) return gsm;
  }

  // Fall back to existing image (Unsplash placeholder) if any
  return imgs[0] ?? null;
}
