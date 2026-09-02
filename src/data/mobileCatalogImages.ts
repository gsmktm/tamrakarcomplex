/**
 * Verified GSMArena device artwork.
 *
 * Only CDN paths that returned HTTP 200 are listed. This deliberately avoids
 * showing a different phone for Nepal-only or not-yet-indexed catalog models.
 * An admin-uploaded database image always has highest priority.
 */
const GSM_IMAGE_BASE = "https://fdn2.gsmarena.com/vv/bigpic";

const GSM_IMAGE_FILES: Record<string, string> = {
  "iphone-15": "apple-iphone-15",
  "iphone-16": "apple-iphone-16",
  "redmi-note-13": "xiaomi-redmi-note-13",
  "oneplus-13": "oneplus-13",
  "samsung-galaxy-a07": "samsung-galaxy-a07",
  "samsung-galaxy-a17": "samsung-galaxy-a17",
  "samsung-galaxy-a37": "samsung-galaxy-a37",
  "samsung-galaxy-a57": "samsung-galaxy-a57",
  "samsung-galaxy-s25-fe": "samsung-galaxy-s25-fe",
  "samsung-galaxy-s24-ultra": "samsung-galaxy-s24-ultra-5g-sm-s928",
  "samsung-galaxy-s23-ultra": "samsung-galaxy-s23-ultra-5g",
  "samsung-galaxy-a55": "samsung-galaxy-a55",
  "samsung-galaxy-s26": "samsung-galaxy-s26",
  "samsung-galaxy-s26-plus": "samsung-galaxy-s26-plus",
  "samsung-galaxy-s26-ultra": "samsung-galaxy-s26-ultra",
  "samsung-galaxy-z-fold7": "samsung-galaxy-z-fold7",
  "samsung-galaxy-z-flip7": "samsung-galaxy-z-flip7",
  "apple-iphone-15": "apple-iphone-15",
  "apple-iphone-16e": "apple-iphone-16e",
  "apple-iphone-16": "apple-iphone-16",
  "apple-iphone-17e": "apple-iphone-17e",
  "apple-iphone-17": "apple-iphone-17",
  "apple-iphone-air": "apple-iphone-air",
  "apple-iphone-17-pro": "apple-iphone-17-pro",
  "apple-iphone-17-pro-max": "apple-iphone-17-pro-max",
  "xiaomi-redmi-a7-pro": "xiaomi-redmi-a7-pro",
  "xiaomi-redmi-15c": "xiaomi-redmi-15c",
  "xiaomi-redmi-note-15-5g": "xiaomi-redmi-note-15-5g",
  "xiaomi-redmi-note-15-pro-5g": "xiaomi-redmi-note-15-pro-5g",
  "xiaomi-17t": "xiaomi-17t",
  "xiaomi-17-ultra": "xiaomi-17-ultra",
  "xiaomi-14-ultra": "xiaomi-14-ultra-new",
  "poco-x7-pro": "xiaomi-poco-x7-pro",
  "poco-x8-pro": "xiaomi-poco-x8-pro",
  "poco-f7": "xiaomi-poco-f7",
  "poco-x8-pro-max": "xiaomi-poco-x8-pro-max",
  "poco-f8-pro": "xiaomi-poco-f8-pro",
  "honor-play10": "honor-play10",
  "honor-x6c": "honor-x6c",
  "honor-x8d": "honor-x8d",
  "honor-600-lite": "honor-600-lite",
  "honor-600": "honor-600",
  "honor-600-pro": "honor-600-pro",
  "honor-magic-v5": "honor-magic-v5",
  "vivo-y05": "vivo-y05",
  "vivo-y31d": "vivo-y31d",
  "vivo-v60-lite-4g": "vivo-v60-lite-4g",
  "vivo-v70-fe": "vivo-v70-fe",
  "vivo-x300-pro": "vivo-x300-pro",
  "nothing-cmf-phone-2-pro": "nothing-cmf-phone-2-pro",
  "nothing-phone-2a-plus": "nothing-phone-2a-plus",
  "nothing-phone-4a": "nothing-phone-4a",
  "nothing-phone-4a-pro": "nothing-phone-4a-pro",
  "nothing-phone-3": "nothing-phone-3",
  "oneplus-13r": "oneplus-13r",
  "oneplus-12": "oneplus-12",
  "oneplus-11": "oneplus-11",
  "oneplus-11-pro": "oneplus-11",
  "oneplus-15r": "oneplus-15r",
  "oneplus-15": "oneplus-15",
  "google-pixel-8-pro": "google-pixel-8-pro",
  "realme-note-60x": "realme-note-60x",
  "realme-c75": "realme-c75",
  "realme-c85": "realme-c85",
  "realme-c85-pro": "realme-c85-pro",
  "realme-14t": "realme-14t",
  "realme-15-pro": "realme-15-pro",
  "oppo-a6c": "oppo-a6c",
  "oppo-a5-4g": "oppo-a5-4g",
  "oppo-a6": "oppo-a6",
  "oppo-a6-pro-4g": "oppo-a6-pro-4g",
  "oppo-find-n5": "oppo-find-n5",
  "infinix-smart-10": "infinix-smart-10",
  "infinix-hot-60i": "infinix-hot-60i",
  "infinix-note-edge": "infinix-note-edge",
  "motorola-moto-g06-power": "motorola-moto-g06-power",
  "motorola-moto-g64": "motorola-moto-g64",
  "motorola-moto-g85": "motorola-moto-g85",
  "zte-blade-a55": "zte-blade-a55",
  "zte-nubia-a36": "zte-nubia-a36",
  "zte-nubia-air": "zte-nubia-air",
  "tecno-spark-30c": "tecno-spark-30c",
  "tecno-spark-30": "tecno-spark-30",
  "tecno-pova-6": "tecno-pova-6",
  "itel-a05s": "itel-a05s",
  "itel-a50c": "itel-a50c",
  "itel-a50": "itel-a50",
  "itel-a70": "itel-a70",
  "itel-a80": "itel-a80",
  "itel-p55": "itel-p55",
  "coolpad-c16": "coolpad-c16",
  "coolpad-c15": "coolpad-c15",
  "coolpad-x100": "coolpad-x100",
};

export function resolveMobileCatalogImage(
  slug: string,
  brandSlug?: string | null,
  databaseImage?: string | null,
): string | undefined {
  if (databaseImage) return databaseImage;

  // Price-list imports use globally unique slugs and may repeat the brand
  // prefix (for example "poco-poco-x8-pro"). GSMArena filenames and the
  // verified map use the normalized single-prefix form.
  const normalizedBrand = brandSlug?.trim().toLowerCase();
  const normalizedSlug = slug.trim().toLowerCase();
  const candidates = [normalizedSlug];
  if (normalizedBrand && normalizedSlug.startsWith(`${normalizedBrand}-${normalizedBrand}-`)) {
    candidates.push(normalizedSlug.slice(normalizedBrand.length + 1));
  }

  const imageFile = candidates.map((candidate) => GSM_IMAGE_FILES[candidate]).find(Boolean);
  return imageFile ? `${GSM_IMAGE_BASE}/${imageFile}.jpg` : undefined;
}

export const mobileCatalogModelImageCount = Object.keys(GSM_IMAGE_FILES).length;
