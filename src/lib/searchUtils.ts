/**
 * Normalizes search text for mobile phone models.
 * Handles common variations like "iPhone 17 Pro Max" vs "iphone17promax"
 */
export function normalizePhoneSearch(text: string): string {
  if (!text) return "";
  
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "") // remove all spaces
    .replace(/[-]/g, "") // remove hyphens
    .replace(/gb$/i, "") // remove GB suffix
    .replace(/tb$/i, ""); // remove TB suffix
}

/**
 * Example usage:
 * normalizePhoneSearch("iPhone 17 Pro Max 256GB") -> "iphone17promax256"
 */

export interface SearchResult {
  id: string;
  type: 'model' | 'accessory' | 'service';
  title: string;
  subtitle?: string;
  image?: string;
  slug: string;
}
