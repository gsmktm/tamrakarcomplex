/** Preserve admin explicit false while restoring defaults for omitted sections. */
export const DEFAULT_HOME_SECTIONS: Record<string, boolean> = {
  hero: true, search_box: true, quick_actions: true, serviceMatrix: true,
  offers: true, price_finder: true, marketplace_feed: true,
  phone_finder: false, priceDesk: true, featured: true, compare_mini: false,
  repair_form: true, storesAndStories: true, store_spotlight: true,
  trust_stats: true, trust: true, poll: false, chat: true,
};

type Toggle = { key: string; enabled: boolean };
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function booleanValue(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (isRecord(value) && typeof value.enabled === "boolean") return value.enabled;
  return undefined;
}
export function resolveHomepageSections(
  settings: unknown,
  themeSections: readonly Toggle[] = [],
): Record<string, boolean> {
  const resolved = { ...DEFAULT_HOME_SECTIONS };
  for (const section of themeSections) {
    if (section && typeof section.key === "string" && typeof section.enabled === "boolean") {
      resolved[section.key] = section.enabled;
    }
  }
  if (!isRecord(settings)) return resolved;
  const nested = isRecord(settings.sections_control) ? settings.sections_control : {};
  // Both the flat homepage_settings rows and the nested app_settings format exist.
  for (const source of [settings, nested]) {
    for (const [key, value] of Object.entries(source)) {
      const enabled = booleanValue(value);
      if (enabled !== undefined) resolved[key] = enabled;
    }
  }
  return resolved;
}
